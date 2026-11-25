import * as THREE from 'three';
import overrides from './pbr-overrides.json' with {type:'json'};
import directions from './pbr-directions.json' with {type:'json'};
import type {Finish,Surface,KNIVES} from './state';

type Knife=typeof KNIVES[number];
export type TextureLevel='lo'|'web';
type Entry={texture:Promise<THREE.Texture>;uses:number;pixels:number;last:number;ready?:THREE.Texture};
type Lease={texture:Promise<THREE.Texture>;release:()=>void};
type Override={optics?:boolean;direction?:boolean};
const overridePairs:Record<string,Override>=overrides;
const numberId=(value:number)=>String(value+1).padStart(2,'0');

async function loadMap(url:string,anisotropy:number){
 let texture:THREE.Texture;
 if(typeof createImageBitmap==='function'){
  const response=await fetch(url);
  if(!response.ok)throw Error('Missing material map '+url+' ('+response.status+')');
  const blob=await response.blob();
  try{
   const bitmap=await createImageBitmap(blob,{imageOrientation:'none',premultiplyAlpha:'none',colorSpaceConversion:'none'});
   texture=new THREE.Texture(bitmap);
  }catch{
   const objectURL=URL.createObjectURL(blob);
   try{texture=await new THREE.TextureLoader().loadAsync(objectURL);}
   finally{URL.revokeObjectURL(objectURL);}
  }
 }else{
  texture=await new THREE.TextureLoader().loadAsync(url);
 }
 texture.name=url;texture.flipY=false;texture.premultiplyAlpha=false;texture.anisotropy=anisotropy;
 texture.colorSpace=url.endsWith('BaseColor.webp')?THREE.SRGBColorSpace:THREE.NoColorSpace;
 texture.needsUpdate=true;
 return texture;
}

export class TextureBank {
 private entries=new Map<string,Entry>();
 private clock=0;
 private disposed=false;
 private readonly anisotropy:number;
 constructor(anisotropy:number){this.anisotropy=anisotropy;}
 private free(entry:Entry){
  const t=entry.ready;if(!t)return;
  t.dispose();
  if(typeof ImageBitmap!=='undefined'&&t.image instanceof ImageBitmap)t.image.close();
 }
 private trim(){
  const idle=[...this.entries].filter(([,e])=>!e.uses&&e.ready).sort((a,b)=>a[1].last-b[1].last);
  let pixels=idle.reduce((n,[,e])=>n+e.pixels,0);
  for(const [url,e] of idle){
   if(pixels<=2*1024*1024)break;
   this.free(e);this.entries.delete(url);pixels-=e.pixels;
  }
 }
 acquire(url:string):Lease{
  let entry=this.entries.get(url);
  if(!entry){
   const texture=loadMap(url,this.anisotropy);
   const item:Entry={texture,uses:0,pixels:0,last:0};
   entry=item;this.entries.set(url,item);
   texture.then(t=>{
    const size=t.image as {width:number;height:number};
    item.ready=t;item.pixels=size.width*size.height;
    if(this.disposed)this.free(item);else this.trim();
   },()=>{if(this.entries.get(url)===item)this.entries.delete(url);});
  }
  const retained=entry;retained.uses++;retained.last=++this.clock;
  return {texture:retained.texture,release:()=>{retained.uses--;retained.last=++this.clock;this.trim();}};
 }
 dispose(){this.disposed=true;for(const e of this.entries.values())this.free(e);this.entries.clear();}
}

export function materialPaths(knife:Knife,role:Surface,finish:Finish,level:TextureLevel,flat?:Override){
 const color='C'+numberId(finish.color),style='S'+numberId(finish.style);
 const root='/pbr/'+knife.toLowerCase()+'/'+role;
 const override=flat??overridePairs[[knife,role,color,style].join('/')];
 const folder=override?root+'/overrides/'+color+'_'+style+'/'+level:root+'/'+level;
 const stem=override?'':color+'_';
 const physical=override?'':style+'_';
 const native=root+'/'+level+'/';
 const optics=override?.optics?folder+'/Optics.webp':knife==='VERTEX'?native+color+'_Optics.webp':knife==='TRIS'&&role!=='blade'?native+'Optics.webp':null;
 const directionPreset=directions[knife][role][finish.style];
 const direction=override?.direction?folder+'/Anisotropy.webp':directionPreset?native+'Direction_'+directionPreset[0]+'.webp':null;
 const anisotropy=directionPreset?Number(directionPreset[1]):override?.direction?1:0;
 return {direction,anisotropy,base:folder+'/'+stem+'BaseColor.webp',normal:folder+'/'+physical+'NormalGL.webp',orm:folder+'/'+physical+'ORM.webp',optics,override};
}

export class MaterialBinding {
 readonly material:THREE.MeshPhysicalMaterial;
 private leases:Lease[]=[];
 private generation=0;
 private lift={value:0};
 private scattering={value:0};
 private useFilmSubstrate={value:1};

 private readonly knife:Knife;
 private readonly role:Surface;
 private readonly textures:TextureBank;
 constructor(knife:Knife,role:Surface,textures:TextureBank){
  this.knife=knife;this.role=role;this.textures=textures;
  this.material=new THREE.MeshPhysicalMaterial({
   name:knife+'_'+role.toUpperCase(),color:0xffffff,roughness:1,metalness:1,
   envMapIntensity:1.16,side:THREE.DoubleSide,transparent:true,depthWrite:true,forceSinglePass:true,
  });
  this.material.onBeforeCompile=shader=>{
   shader.uniforms.pbrLift=this.lift;
   shader.uniforms.pbrScatter=this.scattering;
   shader.uniforms.pbrFilmSubstrate=this.useFilmSubstrate;
   shader.fragmentShader='uniform float pbrLift;\nuniform float pbrScatter;\nuniform float pbrFilmSubstrate;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`
    #include <roughnessmap_fragment>
    #ifdef USE_ROUGHNESSMAP
     vec3 chip=sRGBTransferOETF(vec4(diffuseColor.rgb,1.0)).rgb;
     vec3 conductor=sRGBTransferEOTF(vec4(0.185+0.78*sqrt(max(chip,vec3(0.0))),1.0)).rgb;
     diffuseColor.rgb=mix(diffuseColor.rgb,conductor,pbrLift)*texelRoughness.a;
     #ifdef USE_IRIDESCENCEMAP
      float oxideMask=texture2D(iridescenceMap,vIridescenceMapUv).r;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.37,0.385,0.40)*texelRoughness.a,oxideMask*pbrFilmSubstrate);
     #endif
    #endif`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <transmission_fragment>',`
    #ifdef USE_CLEARCOATMAP
     vec3 optical=texture2D(clearcoatMap,vClearcoatMapUv).rgb;
     float rim=pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),2.0);
     totalDiffuse+=pbrScatter*optical.b*(0.25+0.75*rim)*(reflectedLight.indirectDiffuse+0.3*reflectedLight.directDiffuse);
    #endif
    #include <transmission_fragment>`);
  };
  this.material.customProgramCacheKey=()=> 'memento-pbr-71';
 }

 async select(finish:Finish,level:TextureLevel){
  const serial=++this.generation;
  const {knife,role}=this,m=this.material;
  const paths=materialPaths(knife,role,finish,level);
  const slots=[paths.base,paths.normal,paths.orm,paths.optics,paths.direction].map(url=>url?this.textures.acquire(url):null);
  const leases=slots.filter((lease):lease is Lease=>lease!==null);
  let applied=false;
  try{
   const [base,normal,orm,optics,direction]=await Promise.all(slots.map(l=>l?.texture??null));
   if(serial!==this.generation)return;
   const s=finish.style;
   const film=knife==='VERTEX'&&!(role==='handle'&&s===5);
   const resin=knife==='TRIS'&&role!=='blade';
   const polishedResin=resin&&(role==='handle'?[1,2,4,5].includes(s):[0,2].includes(s));
   const previousFlags=[!!m.map,!!m.iridescenceMap,!!m.clearcoatMap,!!m.transmissionMap,!!m.anisotropyMap].join();
   m.anisotropy=paths.anisotropy;m.anisotropyMap=direction;
   m.map=base;m.normalMap=normal;m.roughnessMap=orm;m.metalnessMap=orm;m.aoMap=orm;
   m.iridescence=film ? .87 : 0;m.iridescenceIOR=1.84;m.iridescenceThicknessRange=[70,490];
   m.iridescenceMap=film?optics:null;m.iridescenceThicknessMap=film?optics:null;
   m.clearcoat=resin ? .36 : 0;m.clearcoatMap=resin?optics:null;m.clearcoatRoughness=polishedResin ? .18 : .32;
   m.transmission=polishedResin ? .19 : 0;m.transmissionMap=polishedResin?optics:null;
   m.thickness=.012;m.thicknessMap=polishedResin?optics:null;m.ior=1.49;m.attenuationDistance=.16;
   m.attenuationColor.set('#c2d5d3');
   this.scattering.value=resin?(s===2 ? .62 : .17):0;
   this.useFilmSubstrate.value=paths.override?0:1;
   this.lift.value=!paths.override&&knife==='HYPER'&&((role==='blade'&&s===6)||(role==='handle'&&[2,3,4].includes(s)))?1:0;
   const flags=[!!m.map,!!m.iridescenceMap,!!m.clearcoatMap,!!m.transmissionMap,!!m.anisotropyMap].join();
   if(flags!==previousFlags)m.needsUpdate=true;
   m.userData.preset=paths.base+'|'+paths.orm;
   this.leases.forEach(l=>l.release());this.leases=leases;applied=true;
  }catch(error){if(serial===this.generation)throw error;}
  finally{if(!applied)leases.forEach(l=>l.release());}
 }
 dispose(){this.generation++;this.leases.forEach(l=>l.release());this.leases=[];this.material.dispose();}
}
