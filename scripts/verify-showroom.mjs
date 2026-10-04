import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
globalThis.ProgressEvent??=class ProgressEvent {constructor(type,event){this.type=type;Object.assign(this,event);}};
const root=process.cwd(),temporary=mkdtempSync(path.join(root,'.geometry-test-'));
try{
 for(const name of ['catalog','configuration','model','navigation','motion','laser','session']){
  const source=readFileSync(path.join(root,'app',name+'.ts'),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${p}.mjs'`);
  writeFileSync(path.join(temporary,name+'.mjs'),compiled);
 }
 const {KNIVES}=await import(pathToFileURL(path.join(temporary,'catalog.mjs')));
 const {calibrateModel,getKnifeMeshes,foldMatrix,updateFold,surfaceBounds}=await import(pathToFileURL(path.join(temporary,'model.mjs')));
 const {heroPose,sectionFrame,HeroCarousel}=await import(pathToFileURL(path.join(temporary,'motion.mjs')));
 const {restoreSession}=await import(pathToFileURL(path.join(temporary,'session.mjs')));
 const {originalConfiguration}=await import(pathToFileURL(path.join(temporary,'configuration.mjs')));
 const removeTextureReferences=value=>{if(!value||typeof value!=='object')return;for(const key of Object.keys(value)){if(key.endsWith('Texture'))delete value[key];else removeTextureReferences(value[key]);}};
 let totalTriangles=0;
 for(let index=0;index<KNIVES.length;index++){
  const file=path.join(root,'public',KNIVES[index].model);const document=JSON.parse(readFileSync(file,'utf8'));
  for(const image of document.images??[]){if(image.uri&&!image.uri.startsWith('data:'))assert.ok(readFileSync(path.resolve(path.dirname(file),image.uri)).length>0);}
  for(const buffer of document.buffers){if(!buffer.uri)continue;const b=readFileSync(path.resolve(path.dirname(file),buffer.uri));assert.equal(b.byteLength,buffer.byteLength);buffer.uri='data:application/octet-stream;base64,'+b.toString('base64');}
  for(const material of document.materials??[])removeTextureReferences(material);document.images=[];document.textures=[];
  const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);const gltf=await loader.parseAsync(JSON.stringify(document),'');
  const model=calibrateModel(gltf.scene,index),meshes=getKnifeMeshes(model);model.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());assert.ok(Math.abs(size.y-4.5)<1e-5);assert.ok(box.getCenter(new THREE.Vector3()).length()<1e-5);
  const blade=surfaceBounds(meshes,1),handle=surfaceBounds(meshes,2);assert.ok(!blade.isEmpty()&&!handle.isEmpty());assert.ok(blade.getCenter(new THREE.Vector3()).y>handle.getCenter(new THREE.Vector3()).y);
  const bladeMeshes=meshes.filter(m=>m.userData.movingBlade);assert.equal(bladeMeshes.length,[0,1,2,2][index]);if(index===3)assert.equal(meshes.length,13,'one Gerber copy');
  let triangles=0,uvVertices=0;
  for(const mesh of meshes){const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;assert.ok(uv&&n&&g.attributes.knifePart);triangles+=p.count/3;uvVertices+=uv.count;for(const v of p.array)assert.ok(Number.isFinite(v));for(let i=0;i<n.count;i++)assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.015);}
  totalTriangles+=triangles;
  if(index>0){
   assert.ok(model.userData.rig.axis.z*model.userData.rig.closedAngle>0,'all blades close counter-clockwise from the front');
   const hinge=model.userData.rig.pivot.clone();const before=new Map(meshes.filter(m=>!m.userData.movingBlade).map(m=>[m,m.matrix.clone()]));
   for(const amount of [0,.15,.5,.85,1]){const matrix=foldMatrix(model,amount);assert.ok(hinge.clone().applyMatrix4(matrix).distanceTo(hinge)<1e-8);updateFold(model,amount);model.updateMatrixWorld(true);for(const [mesh,baseline]of before)assert.deepEqual(mesh.matrix,baseline);}
   const closed=new THREE.Box3().setFromObject(model);assert.ok(closed.getSize(new THREE.Vector3()).y<2.9,'blade folds into the handle length');updateFold(model,0);model.updateMatrixWorld(true);
  }
  for(const [w,h]of [[2560,1080],[1440,900],[1024,768],[768,1024],[390,844],[844,390],[640,360],[320,568]]){
   const orbit=new HeroCarousel();orbit.reset(index);const height=2*Math.tan(34*Math.PI/360)*9.5;const pose=heroPose(index,orbit,height*w/h,height,w<800,false);const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.pitch,pose.yaw,pose.roll));
   const bc=blade.getCenter(new THREE.Vector3()).applyQuaternion(q),hc=handle.getCenter(new THREE.Vector3()).applyQuaternion(q);assert.ok(bc.x<hc.x,'blade stays on the left');
   const camera=new THREE.PerspectiveCamera(34,w/h,.05,80);camera.position.z=9.5;camera.updateMatrixWorld();
   const xs=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])xs.push(new THREE.Vector3(x,y,z).multiplyScalar(pose.scale).applyQuaternion(q).add(new THREE.Vector3(pose.x,pose.y,pose.z)).project(camera).x);
   assert.ok(Math.min(...xs)>-1.01&&Math.max(...xs)<1.01,'whole hero knife fits');
   for(const adjacent of [(index+1)%4,(index+3)%4]){const side=heroPose(adjacent,orbit,height*w/h,height,w<800,false);const left=(side.x-2.25*side.scale)*9.5/(9.5-side.z)/(height*w/h)*2,right=(side.x+2.25*side.scale)*9.5/(9.5-side.z)/(height*w/h)*2;assert.ok(Math.min(1,right)-Math.max(-1,left)>.08,'adjacent knife visibly peeks into the hero');}
   const config=sectionFrame(w,h,2,true);assert.equal(config.roll,Math.PI/2);
  }
  console.log(`${KNIVES[index].name}: ${meshes.length} surfaces, ${triangles} triangles, ${uvVertices} UV vertices; orientation / pivot / folding / eight viewports passed.`);
 }
 const session=restoreSession(JSON.stringify({version:34,configurations:KNIVES.map((_,i)=>originalConfiguration(i)),bag:[]}));assert.equal(session.configurations.length,4);assert.throws(()=>restoreSession(JSON.stringify({version:30})),/Unsupported/);
 console.log(`Asset checks passed: ${totalTriangles} original triangles; valid local buffers and textures; no duplicate Gerber, fixed Combat unchanged.`);
}finally{rmSync(temporary,{recursive:true,force:true});}
