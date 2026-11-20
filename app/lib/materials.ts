import * as THREE from 'three';
import {COLORS,type Finish,type Surface} from './state';
export function makeTextures(){
 const output:THREE.CanvasTexture[]=[];
 for(let style=0;style<4;style++){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d')!;const data=ctx.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
   const seed=Math.sin(x*127.1+y*311.7)*43758.5453,noise=seed-Math.floor(seed);
   let value=220+noise*18;
   if(style===1)value=202+Math.sin(y*2.7)*13+noise*12;
   if(style===2)value=185+noise*45+Math.sin(x*.31+y*.7)*8;
   if(style===3){const a=Math.floor(x/16),b=Math.floor(y/16),weave=(a+b)%2===0;const t=(weave?x:y)%16/16;value=65+Math.sin(t*Math.PI)*100+(weave?16:0)+noise*8;}
   const k=(y*512+x)*4;data.data[k]=data.data[k+1]=data.data[k+2]=value;data.data[k+3]=255;
  }
  ctx.putImageData(data,0,0);const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(style===3?5:2,style===3?5:2);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;output.push(tex);
 }
 return output;
}
export function makeMaterial(role:Surface){
 const material=new THREE.MeshStandardMaterial({name:role,color:role==='handle'?'#34363b':'#b1b5b8',roughness:role==='handle'?.46:.28,metalness:role==='handle'?.15:1,envMapIntensity:1.7,side:THREE.DoubleSide});
 return material;
}
export function finishMaterial(material:THREE.MeshStandardMaterial,role:Surface,finish:Finish,textures:THREE.Texture[]){
 material.color.set(COLORS[finish.color].hex);material.map=textures[finish.style];material.bumpMap=textures[finish.style];material.bumpScale=finish.style===3?.00006:finish.style===2?.000012:.000003;
 material.roughness=[.27,.35,.51,.43][finish.style];material.metalness=finish.style===3?.2:role==='handle'?.72:1;material.envMapIntensity=finish.style===3?1.35:1.75;material.needsUpdate=true;
}
