import * as THREE from 'three';
import {MATERIALS,type Configuration} from './configuration';
/** Asset coordinates -> common frame: tip +Y, broad face +Z. Original root transforms stay intact. */
export function canonicalMatrix(index:number){
 const m=new THREE.Matrix4();
 if(index===0)m.set(0,-1,0,0,0,0,1,0,-1,0,0,0,0,0,0,1);
 else if(index===1||index===2)m.makeRotationZ(-Math.PI/2);
 else m.makeRotationZ(-.43).multiply(new THREE.Matrix4().makeRotationX(-Math.PI/2));
 return m;
}
export function surfacePart(index:number,name:string,world:THREE.Vector3){
 if(index===0)return world.z>5.12?1:world.z<4.15?2:0;
 if(index===1)return name.startsWith('blade')?1:name.startsWith('grip')?2:0;
 if(index===2)return name.startsWith('pCube7')?(world.x<.4?1:0):name.startsWith('polySurface2_')?2:0;
 return name.startsWith('Blade_')?1:name.startsWith('Handle_Knife')?2:0;
}
export function calibrateModel(source:THREE.Object3D,index:number){
 const rig=source.userData.mementoRig;
 // Gerber's authored open pose has its spine below its edge. Turn the real
 // geometry around its length, including the hinge axis; never mirror UVs.
 source.updateMatrixWorld(true);const frame=rig?(index===3?new THREE.Matrix4().makeRotationY(Math.PI):new THREE.Matrix4()):canonicalMatrix(index);const model=new THREE.Group();
 source.traverse(o=>{
  if(!(o instanceof THREE.Mesh))return;
  const geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
  // GLBs use KHR_mesh_quantization: bake transforms into float attributes, never into integer storage.
  for(const key of ['position','normal','tangent']){const attribute=geometry.getAttribute(key);if(!attribute)continue;const values=new Float32Array(attribute.count*attribute.itemSize);for(let i=0;i<attribute.count;i++)for(let j=0;j<attribute.itemSize;j++)values[i*attribute.itemSize+j]=attribute.getComponent(i,j);geometry.setAttribute(key,new THREE.BufferAttribute(values,attribute.itemSize));}
  const a=geometry.attributes.position;const part=new Float32Array(a.count);const v=new THREE.Vector3(),vertex=new THREE.Vector3();
  for(let i=0;i<a.count;i+=3){v.set(0,0,0);for(let j=0;j<3;j++)v.add(vertex.fromBufferAttribute(a,i+j).applyMatrix4(o.matrixWorld));v.multiplyScalar(1/3);const region=rig?(o.userData.knifePart??0):surfacePart(index,o.name,v);part[i]=part[i+1]=part[i+2]=region;}
  geometry.setAttribute('knifePart',new THREE.BufferAttribute(part,1));
  geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(frame,o.matrixWorld));
  const original=Array.isArray(o.material)?o.material:[o.material];const materials=original.map(m=>m.clone());
  const mesh=new THREE.Mesh(geometry,Array.isArray(o.material)?materials:materials[0]);mesh.name=o.name;mesh.userData={...o.userData,knifeSurface:true};model.add(mesh);
 });
 const box=new THREE.Box3().setFromObject(model);const center=box.getCenter(new THREE.Vector3());const size=box.getSize(new THREE.Vector3());const scale=4.5/size.y;
 const normalization=new THREE.Matrix4().makeScale(scale,scale,scale).multiply(new THREE.Matrix4().makeTranslation(-center.x,-center.y,-center.z));
 model.children.forEach(o=>{const mesh=o as THREE.Mesh;mesh.geometry.applyMatrix4(normalization);mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();});
 model.userData.calibration={length:4.5,index};
 if(rig)model.userData.rig={pivot:new THREE.Vector3(...rig.pivot as [number,number,number]).applyMatrix4(frame).applyMatrix4(normalization),axis:new THREE.Vector3(...rig.axis as [number,number,number]).transformDirection(frame),closedAngle:rig.closedAngle};
 return model;
}

/** The root stays fixed in the open calibrated frame; only blade-bound surfaces move. */
export function foldMatrix(model:THREE.Group,amount:number){
 const rig=model.userData.rig;if(!rig)return new THREE.Matrix4();
 const p=rig.pivot as THREE.Vector3;
 return new THREE.Matrix4().makeTranslation(p.x,p.y,p.z)
  .multiply(new THREE.Matrix4().makeRotationAxis(rig.axis,rig.closedAngle*THREE.MathUtils.clamp(amount,0,1)))
  .multiply(new THREE.Matrix4().makeTranslation(-p.x,-p.y,-p.z));
}
export function updateFold(model:THREE.Group,amount:number){
 if(!model.userData.rig)return;
 const pose=foldMatrix(model,amount);
 model.traverse(o=>{if(o instanceof THREE.Mesh&&o.userData.movingBlade){o.matrixAutoUpdate=false;o.matrix.copy(pose);o.matrixWorldNeedsUpdate=true;}});
}
/** Snapshot the knife surfaces before decoration groups are attached to the scene. */
export function getKnifeMeshes(model:THREE.Group):THREE.Mesh[]{
 return model.children.filter((child):child is THREE.Mesh=>child instanceof THREE.Mesh);
}
export function installFinish(material:THREE.MeshStandardMaterial){
 const uniforms={uBladeColor:{value:new THREE.Color()},uHandleColor:{value:new THREE.Color()},uBladeMix:{value:0},uHandleMix:{value:0},uBladeRough:{value:.4},uHandleRough:{value:.8},uBladeMetal:{value:1},uHandleMetal:{value:0},uScanActive:{value:0},uScanLevel:{value:0},uScanAxis:{value:new THREE.Vector3(0,0,1)},uScanColor:{value:new THREE.Color('#45e3cf')}};
 material.userData.finishUniforms=uniforms;
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float knifePart; varying float vKnifePart; varying vec3 vKnifePosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvKnifePart = knifePart; vKnifePosition = position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying float vKnifePart;varying vec3 vKnifePosition;uniform float uScanActive;uniform float uScanLevel;uniform vec3 uScanAxis;uniform vec3 uScanColor;uniform vec3 uBladeColor;uniform vec3 uHandleColor;uniform float uBladeMix;uniform float uHandleMix;uniform float uBladeRough;uniform float uHandleRough;uniform float uBladeMetal;uniform float uHandleMetal;`)
  .replace('#include <map_fragment>',`#include <map_fragment>
   float bladeMask = (1.0-step(0.45,abs(vKnifePart-1.0)))*uBladeMix;
   float handleMask = step(1.55,vKnifePart)*uHandleMix;
   float detail = clamp(dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722))*1.3+0.4,0.4,1.1);
   diffuseColor.rgb = mix(diffuseColor.rgb,uBladeColor*detail,bladeMask);
   diffuseColor.rgb = mix(diffuseColor.rgb,uHandleColor*detail,handleMask);`)
  .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=mix(roughnessFactor,uBladeRough,bladeMask);
   roughnessFactor=mix(roughnessFactor,uHandleRough,handleMask);`)
  .replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
   metalnessFactor=mix(metalnessFactor,uBladeMetal,bladeMask);
   metalnessFactor=mix(metalnessFactor,uHandleMetal,handleMask);`)
  .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   float laserEdge=exp(-abs(dot(vKnifePosition,uScanAxis)-uScanLevel)*280.0)*uScanActive;
   totalEmissiveRadiance+=uScanColor*laserEdge*3.0;`);
 };
 material.customProgramCacheKey=()=> 'memento-surface-v41';material.needsUpdate=true;
}
export function updateFinish(material:THREE.Material,config:Configuration){
 const u=material.userData.finishUniforms;if(!u)return;
 u.uBladeColor.value.set(config.blade.color);u.uHandleColor.value.set(config.handle.color);
 for(const [surface,label] of [['blade','Blade'],['handle','Handle']] as const){const finish=config[surface];const definition=MATERIALS[finish.material];u[`u${label}Mix`].value=finish.material==='original'?0:1;u[`u${label}Rough`].value=definition.roughness;u[`u${label}Metal`].value=definition.metalness;}
}

export function surfaceBounds(meshes:THREE.Mesh[],part:number){
 const box=new THREE.Box3();const point=new THREE.Vector3();
 for(const mesh of meshes){const a=mesh.geometry.attributes.position,mask=mesh.geometry.attributes.knifePart;for(let i=0;i<a.count;i++)if(Math.abs(mask.getX(i)-part)<.4)box.expandByPoint(point.fromBufferAttribute(a,i));}
 return box;
}
