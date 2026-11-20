import * as THREE from 'three';
import {CATALOGUE} from './catalogue';
import {KNIVES, type Finish, type Surface} from './state';

const finishes = {
 satin: [.31,.92], polish: [.15,.98], grain: [.54,.78], stone: [.47,.82],
 brush: [.35,.96], weave: [.36,.24], wave: [.30,.91], wood: [.42,.17], resin: [.25,.30]
} as const;
type Pattern=keyof typeof finishes;

function patternFor(name:string,motif?:string):Pattern {
 const key=(name+' '+(motif??'')).toLowerCase();
 if(/carbon|weave|trama/.test(key))return 'weave';
 if(/wood|legno|oliato|cerato|poro|stabilizz/.test(key))return 'wood';
 if(/damasco|onda|onde|wave|radiale|mokume|timas|ladder|raindrop|venato|vein/.test(key))return 'wave';
 if(/resina|opal|nuvola|goccia/.test(key))return 'resin';
 if(/stone|fresat/.test(key))return 'stone';
 if(/micr|blast|perlé|grana|matte|opaco|nebbia|cristall/.test(key))return 'grain';
 if(/lucid|polish|specchio|film/.test(key))return 'polish';
 if(/spazz|brush|incroci|doppio|doppia|contrasto/.test(key))return 'brush';
 return 'satin';
}

export function makeTextures(){
 const size=256;
 const textures={} as Record<Pattern,THREE.CanvasTexture>;
 for(const kind of Object.keys(finishes) as Pattern[]){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d')!,data=ctx.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const h=Math.sin(x*127.1+y*311.7)*43758.5453,noise=h-Math.floor(h);
   let level=238+noise*8;
   if(kind==='satin'||kind==='brush') level=229+Math.sin(y*(kind==='satin'?2.6:1.55))*10+noise*10;
   if(kind==='grain')level=210+noise*42;
   if(kind==='stone')level=208+noise*24+16*Math.sin(x*.31+y*.69+Math.sin(y*.2));
   if(kind==='weave'){
    const over=(Math.floor(x/8)+Math.floor(y/8))%4<2;
    const thread=(over?x:y)%8;
    level=161+Math.sin(thread*Math.PI/8)*46+(over?12:0)+Math.sin(thread*3.1)*4+noise*5;
   }
   if(kind==='wave'||kind==='wood'){
    const wave=Math.sin(x*.12+y*.022+1.6*Math.sin(y*.071)+.77*Math.sin(y*.17+x*.019));
    level=kind==='wood'?215+wave*21+noise*9:195+Math.tanh(wave*3)*34+noise*7;
   }
   if(kind==='resin')level=229+9*Math.sin(x*.055+.85*Math.sin(y*.073))+noise*7;
   const i=(y*size+x)*4;data.data[i]=data.data[i+1]=data.data[i+2]=level;data.data[i+3]=255;
  }
  ctx.putImageData(data,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.setScalar(kind==='weave'?9:2);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  textures[kind]=texture;
 }
 return textures;
}

export function makeMaterial(role:Surface){
 const material=new THREE.MeshStandardMaterial({name:role,side:THREE.DoubleSide,transparent:true,depthWrite:true,forceSinglePass:true});
 const palette={secondary:{value:new THREE.Color()},accent:{value:new THREE.Color()},multitone:{value:0},hardware:{value:role==='metals'?1:0}};
 material.userData.palette=palette;
 material.onBeforeCompile=shader=>{
  shader.uniforms.uSecond=palette.secondary;shader.uniforms.uAccent=palette.accent;
  shader.uniforms.uTones=palette.multitone;shader.uniforms.uHardware=palette.hardware;
  shader.fragmentShader='uniform vec3 uSecond,uAccent; uniform float uTones,uHardware;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
   float grazing=1.-abs(dot(normalize(vNormal),normalize(vViewPosition)));
   float band=smoothstep(.15,.83,grazing);
   if(uHardware>.5) band=smoothstep(.14,.80,grazing+.12);
   diffuseColor.rgb=mix(diffuseColor.rgb,uSecond,band*step(1.5,uTones));
   diffuseColor.rgb=mix(diffuseColor.rgb,uAccent,smoothstep(.62,.95,grazing)*step(2.5,uTones));
   #include <map_fragment>
  `);
 };
 return material;
}

export function finishMaterial(material:THREE.MeshStandardMaterial,model:number,role:Surface,finish:Finish,textures:ReturnType<typeof makeTextures>){
 const options=CATALOGUE[KNIVES[model]][role];
 const style=options.styles[finish.style],colours=options.colors[finish.color].hex!;
 const kind=patternFor(style.name,style.motif),[roughness,metalness]=finishes[kind];
 const palette=material.userData.palette;
 const lift=role==='blade'?.13:role==='metals'?.085:.012;
 const silver=new THREE.Color('#f0f3f5');
 material.color.set(colours[0]).lerp(silver,lift);palette.secondary.value.set(colours[1]??colours[0]).lerp(silver,lift);
 palette.accent.value.set(colours[2]??colours[0]).lerp(silver,lift);palette.multitone.value=colours.length;
 material.map=material.bumpMap=textures[kind];
 material.bumpScale=kind==='weave'?.000014:kind==='wood'||kind==='wave'?.000016:.000006;
 // Variants of a finish retain their own highlight width.
 material.roughness=roughness+.009*finish.style;
 material.metalness=metalness;material.envMapIntensity=role==='blade'?1.62:1.42;
}
