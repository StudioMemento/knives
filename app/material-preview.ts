import * as THREE from 'three';
import {MATERIALS,type MaterialId} from './configuration';

/** Render the actual roughness/metalness choices with one shared WebGL context. */
export function createMaterialPreview(renderer:THREE.WebGLRenderer,environment:THREE.Texture){
 const ids=Object.keys(MATERIALS) as MaterialId[],size=128;
 const scene=new THREE.Scene();scene.environment=environment;
 const camera=new THREE.OrthographicCamera(-5,5,1,-1,.1,20);camera.position.z=5;
 const key=new THREE.DirectionalLight(0xffffff,3.1);key.position.set(-3,5,6);
 const fill=new THREE.DirectionalLight(0xbbd8f2,.6);fill.position.set(4,-1,3);scene.add(key,fill,new THREE.AmbientLight(0xffffff,.15));
 const geometry=new THREE.SphereGeometry(.81,40,28);
 const spheres=ids.map((id,index)=>{const m=MATERIALS[id];const sphere=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xc7cbcc,roughness:m.roughness,metalness:m.metalness,envMapIntensity:1.15}));sphere.position.x=(index-2)*2;scene.add(sphere);return sphere;});
 const target=new THREE.WebGLRenderTarget(size*ids.length,size,{depthBuffer:true,stencilBuffer:false});
 target.texture.colorSpace=THREE.SRGBColorSpace;
 const pixels=new Uint8Array(size*ids.length*size*4),cache=new Map<string,Record<MaterialId,string>>();
 return {render(color:string){
  if(cache.has(color))return cache.get(color)!;
  spheres.forEach((sphere,index)=>sphere.material.color.set(index===0?'#c7cbcc':color));
  const previous=renderer.getRenderTarget(),clear=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha(),exposure=renderer.toneMappingExposure;
  try{renderer.setRenderTarget(target);renderer.setClearColor(0x000000,0);renderer.toneMappingExposure=1;renderer.clear();renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,size*ids.length,size,pixels);}
  finally{renderer.setRenderTarget(previous);renderer.setClearColor(clear,alpha);renderer.toneMappingExposure=exposure;}
  const result={} as Record<MaterialId,string>,canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d')!;
  ids.forEach((id,index)=>{const data=ctx.createImageData(size,size);for(let y=0;y<size;y++)data.data.set(pixels.subarray(((size-1-y)*size*ids.length+index*size)*4,((size-1-y)*size*ids.length+(index+1)*size)*4),y*size*4);ctx.putImageData(data,0,0);result[id]=canvas.toDataURL('image/webp',.88);});
  if(cache.size>=8)cache.delete(cache.keys().next().value!);cache.set(color,result);return result;
 },dispose(){geometry.dispose();spheres.forEach(s=>s.material.dispose());target.dispose();cache.clear();}};
}
