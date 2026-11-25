import * as THREE from 'three';
import {gBufferHeader} from './product-post.ts';
import {microFinishes,surfaceHeader} from './surface-detail.ts';
import catalogue from './catalogue-data.json' with {type:'json'};
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
 const curvature=native+'Curvature.webp';
 const timber=!override&&role==='handle'&&(knife==='TRIS'||knife==='QUAD')?native+color+'_GrainNormal.webp':null;
 return {direction,anisotropy,curvature,timber,base:folder+'/'+stem+'BaseColor.webp',normal:folder+'/'+physical+'NormalGL.webp',orm:folder+'/'+physical+'ORM.webp',optics,override};
}

export class MaterialBinding {
 readonly material:THREE.MeshPhysicalMaterial;
 readonly renderMaterials:THREE.MeshPhysicalMaterial[];
 private readonly hardware:THREE.MeshPhysicalMaterial|null;
 private leases:Lease[]=[];
 private generation=0;
 private lift={value:0};
 private scattering={value:0};
 private useFilmSubstrate={value:1};

 private readonly detail={
  finishCurvature:{value:null as THREE.Texture|null},timberNormal:{value:null as THREE.Texture|null},
  finishTint:{value:new THREE.Color(1,1,1)},microKind:{value:0},microStrength:{value:0},microSeed:{value:0},
  grainMix:{value:0},volumeStyle:{value:0},curvatureStrength:{value:1},
 };
 private readonly knife:Knife;
 private readonly role:Surface;
 private readonly textures:TextureBank;
 constructor(knife:Knife,role:Surface,textures:TextureBank){
  this.knife=knife;this.role=role;this.textures=textures;
  this.material=new THREE.MeshPhysicalMaterial({
   name:knife+'_'+role.toUpperCase(),color:0xffffff,roughness:1,metalness:1,
   envMapIntensity:1.16,side:THREE.DoubleSide,transparent:false,depthWrite:true,forceSinglePass:true,
  });
  this.material.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,this.detail);
   shader.vertexShader='attribute vec3 stock; varying vec3 vStock;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vStock=stock;');
   shader.fragmentShader=gBufferHeader+surfaceHeader+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
    #include <opaque_fragment>
    surfaceData=vec4(packSurfaceNormal(normal),clamp(roughnessFactor,0.,1.),clamp(metalnessFactor,0.,1.));`);
   shader.uniforms.pbrLift=this.lift;
   shader.uniforms.pbrScatter=this.scattering;
   shader.uniforms.pbrFilmSubstrate=this.useFilmSubstrate;
   shader.fragmentShader='uniform float pbrLift;\nuniform float pbrScatter;\nuniform float pbrFilmSubstrate;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`
    #include <roughnessmap_fragment>
    #ifdef USE_ROUGHNESSMAP
     vec3 curvature=texture2D(finishCurvature,vRoughnessMapUv).rgb*curvatureStrength;
     #ifdef USE_TRANSMISSIONMAP
      vec4 volumeData=texture2D(transmissionMap,vTransmissionMapUv);
     #endif
     #ifdef USE_IRIDESCENCEMAP
      vec4 filmData=texture2D(iridescenceMap,vIridescenceMapUv);
     #endif
     roughnessFactor=clamp(roughnessFactor-.048*curvature.r+.025*curvature.g,.068,.95);
     diffuseColor.rgb*=finishTint;
     vec3 chip=sRGBTransferOETF(vec4(diffuseColor.rgb,1.0)).rgb;
     vec3 conductor=sRGBTransferEOTF(vec4(0.185+0.78*sqrt(max(chip,vec3(0.0))),1.0)).rgb;
     diffuseColor.rgb=mix(diffuseColor.rgb,conductor,pbrLift)*texelRoughness.a;
     #ifdef USE_IRIDESCENCEMAP
      float oxideMask=filmData.r;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.37,0.385,0.40)*texelRoughness.a,oxideMask*pbrFilmSubstrate);
     #endif
    #endif`);
   // All surface presets pack metallic with roughness, and each optical family shares one texture.
   // Reuse the samples to keep the physical shader inside mobile sampler budgets.
   const metallic=THREE.ShaderChunk.metalnessmap_fragment.replace('texture2D( metalnessMap, vMetalnessMapUv )','texelRoughness');
   const physical=THREE.ShaderChunk.lights_physical_fragment
    .replace('texture2D( clearcoatMap, vClearcoatMapUv ).x','volumeData.r')
    .replace('texture2D( iridescenceMap, vIridescenceMapUv ).r','filmData.r')
    .replace('texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g','filmData.g');
   const transmission=THREE.ShaderChunk.transmission_fragment
    .replace('texture2D( transmissionMap, vTransmissionMapUv ).r','volumeData.r')
    .replace('texture2D( thicknessMap, vThicknessMapUv ).g','volumeData.g');
   shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',physical);
   shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',`
    ${metallic}
    #ifdef USE_ROUGHNESSMAP
     diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.62,.65,.69),curvature.b*.84);
     metalnessFactor=mix(metalnessFactor,1.,curvature.b);
    #endif`);
   const normalChunk=THREE.ShaderChunk.normal_fragment_maps.replace('mapN.xy *= normalScale;',`
    if(grainMix>.001){
     vec3 wood=texture2D(timberNormal,vNormalMapUv).xyz*2.-1.;
     mapN=normalize(vec3(mapN.xy/max(.25,mapN.z)+wood.xy/max(.25,wood.z)*grainMix,1.));
    }
    mapN.xy *= normalScale;`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',normalChunk+`
    #ifdef USE_NORMALMAP_TANGENTSPACE
     float polish=curvature.b;
     float heightMm=microHeight(vStock,polish);
     #ifdef USE_TRANSMISSIONMAP
      float resinSurface=volumeData.r;
      heightMm=mix(heightMm,filteredStock(vStock*(8.4+volumeStyle))* (.00075+.0002*volumeStyle),resinSurface);
     #endif
     normal=microNormal(-vViewPosition,normal,heightMm);
    #endif`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <transmission_fragment>',`
    #ifdef USE_CLEARCOATMAP
     vec3 optical=volumeData.rgb;
     float rim=pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),2.0);
     totalDiffuse+=pbrScatter*optical.b*(0.25+0.75*rim)*(reflectedLight.indirectDiffuse+0.3*reflectedLight.directDiffuse);
    #endif
    ${transmission}
    #if defined(USE_TRANSMISSIONMAP) && defined(USE_CLEARCOATMAP)
     // Refraction sees the opaque liners. The second sample is displaced along the refracted view
     // through the stock, giving inclusions parallax and depth as the product rotates.
     vec3 px=dFdx(vStock),py=dFdy(vStock);
     vec3 nx=dFdx(-vViewPosition),ny=dFdy(-vViewPosition);
     vec3 viewDir=normalize(vViewPosition);
     vec3 ray=normalize(px*dot(viewDir,normalize(nx))+py*dot(viewDir,normalize(ny))+vec3(.0001));
     vec3 interior=vStock-ray*(.32+optical.g*2.3);
     float vein=stockNoise(interior*vec3(.10,.30,.34)+vec3(volumeStyle*6.3,1.,2.));
     float filament=1.-smoothstep(.014,.11,abs(vein-.50));
     float cloud=volumeStyle<1.5?vein*.22:volumeStyle<2.5?(.28+.62*vein):volumeStyle<4.5?filament:vein*.42;
     material.transmissionAlpha=mix(1.,material.transmissionAlpha,.18);
     vec3 illumination=reflectedLight.indirectDiffuse+.31*reflectedLight.directDiffuse;
     totalDiffuse+=optical.r*pbrScatter*(.20+cloud)*illumination*(.49+.51*rim);
    #endif`);
  };
  this.material.customProgramCacheKey=()=> 'memento-pbr-72';
  this.hardware=knife==='TRIS'&&role==='metals'?this.material.clone():null;
  this.renderMaterials=this.hardware?[this.material,this.hardware]:[this.material];
 }
 forPart(name:string){
  return this.hardware&&!name.toLowerCase().includes('__clip_back__')?this.hardware:this.material;
 }
 private syncHardware(){
  if(!this.hardware)return;
  // Opaque fittings participate in the refraction prepass behind the resin insert.
  this.hardware.copy(this.material);this.hardware.onBeforeCompile=this.material.onBeforeCompile;
  this.hardware.customProgramCacheKey=this.material.customProgramCacheKey;
  this.hardware.transmission=0;this.hardware.transmissionMap=null;this.hardware.thicknessMap=null;
  this.hardware.clearcoat=0;this.hardware.clearcoatMap=null;this.hardware.needsUpdate=true;
 }

 async select(finish:Finish,level:TextureLevel){
  const serial=++this.generation;
  const {knife,role}=this,m=this.material;
  const paths=materialPaths(knife,role,finish,level);
  const slots=[paths.base,paths.normal,paths.orm,paths.optics,paths.direction,paths.curvature,paths.timber].map(url=>url?this.textures.acquire(url):null);
  const leases=slots.filter((lease):lease is Lease=>lease!==null);
  let applied=false;
  try{
   const [base,normal,orm,optics,direction,curvature,timber]=await Promise.all(slots.map(l=>l?.texture??null));
   if(serial!==this.generation)return;
   const s=finish.style;
   const film=knife==='VERTEX'&&!(role==='handle'&&s===5);
   const resin=knife==='TRIS'&&role!=='blade';
   const polishedResin=resin&&(role==='handle'?[1,2,4,5].includes(s):[0,2].includes(s));
   this.detail.finishCurvature.value=curvature;this.detail.timberNormal.value=timber??normal;
   this.detail.microKind.value=microFinishes[knife][role][s];this.detail.microSeed.value=(role==='handle'?13:5)+s*7.9;
   this.detail.microStrength.value=paths.override?0:(role==='handle'?.010:role==='metals'?.006:.005)*(this.detail.microKind.value===4?.42:1);
   this.detail.grainMix.value=timber?([.88,1.05,.72,1.38,.67,.52][s]):0;
   this.detail.curvatureStrength.value=paths.override?0:1;this.detail.volumeStyle.value=s;
   const metals:Record<Knife,string[]>={HYPER:['#e8eef5','#f5f5f8','#e6e9ec','#fff8ee','#e1e4e6','#e9ecf4'],
    QUAD:['#fff8ea','#fffcf8','#ffd5a7','#ffdb93','#f1f3ff','#fff1d2'],EDGE:['#f0f3ff','#f2f4f4','#e0e6ea','#dddfe2','#f1eeee','#f7fcff'],
    VERTEX:['#e6e9ff','#fff8ff','#e1f3ef','#eff0ff','#edfaff','#ececf6'],TRIS:['#f3f5f6','#fff6e8','#e6e9ec','#ffe8cb','#faffff','#e8f4fa']};
   this.detail.finishTint.value.set(role==='metals'&&!paths.override?metals[knife][s]:'#ffffff');
   const previousFlags=[!!m.map,!!m.iridescenceMap,!!m.clearcoatMap,!!m.transmissionMap,!!m.anisotropyMap].join();
   m.anisotropy=paths.anisotropy;m.anisotropyMap=direction;
   m.map=base;m.normalMap=normal;m.roughnessMap=orm;m.metalnessMap=orm;m.aoMap=null;
   m.iridescence=film ? .87 : 0;m.iridescenceIOR=1.84;m.iridescenceThicknessRange=[70,490];
   m.iridescenceMap=film?optics:null;m.iridescenceThicknessMap=film?optics:null;
   m.clearcoat=resin ? .64 : 0;m.clearcoatMap=resin?optics:null;m.clearcoatRoughness=polishedResin ? .18 : .32;
   m.transmission=resin?[.62,.86,.54,.66,.78,.70][s]:0;m.transmissionMap=resin?optics:null;
   m.thickness=.012;m.thicknessMap=resin?optics:null;m.ior=1.50;m.attenuationDistance=.13;
   const palette=catalogue[knife][role].colors[finish.color].hex;
   m.attenuationColor.set(resin?palette[Math.min(1,palette.length-1)]:'#ffffff').lerp(new THREE.Color(1,1,1),.47);
   this.scattering.value=resin?[.28,.15,.68,.33,.40,.22][s]:0;
   this.useFilmSubstrate.value=paths.override?0:1;
   this.lift.value=!paths.override&&knife==='HYPER'&&((role==='blade'&&s===5)||(role==='handle'&&[2,3,4].includes(s)))?1:0;
   const flags=[!!m.map,!!m.iridescenceMap,!!m.clearcoatMap,!!m.transmissionMap,!!m.anisotropyMap].join();
   if(flags!==previousFlags)m.needsUpdate=true;
   m.userData.preset=paths.base+'|'+paths.orm;this.syncHardware();
   this.leases.forEach(l=>l.release());this.leases=leases;applied=true;
  }catch(error){if(serial===this.generation)throw error;}
  finally{if(!applied)leases.forEach(l=>l.release());}
 }
 dispose(){this.generation++;this.leases.forEach(l=>l.release());this.leases=[];this.material.dispose();this.hardware?.dispose();}
}
