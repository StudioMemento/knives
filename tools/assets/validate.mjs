import fs from 'node:fs';
import path from 'node:path';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3,Vector3} from 'three';
const dir=path.resolve(import.meta.dirname,'../../public/models/v46');
const all=[];
for(const id of ['hyper','vertex','quad','edge','tris']){
 const file=path.join(dir,id+'.glb');const b=fs.readFileSync(file);
 if(b.readUInt32LE(0)!==0x46546c67||b.readUInt32LE(4)!==2||b.readUInt32LE(8)!==b.length)throw Error(`Invalid GLB ${id}`);
 const gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.length),'');
 const root=gltf.scene;root.updateMatrixWorld(true);
 const groups={blade:new Box3(),handle:new Box3(),metals:new Box3()};
 const summary={id,meshes:0,triangles:0,vertices:0,normalLengthMin:Infinity,normalLengthMax:0,finite:true,indexRangesValid:true,positiveDeterminants:true,materials:new Set()};
 root.traverse(n=>{
  if(n.matrixWorld.determinant()<=0)throw Error(`${id}: nonpositive determinant at ${n.name}`);
  if(!n.isMesh)return;
  summary.meshes++;summary.materials.add(n.material.name);const g=n.geometry;
  summary.triangles+=(g.index?.count??g.attributes.position.count)/3;summary.vertices+=g.attributes.position.count;
  for(const a of Object.values(g.attributes))for(const x of a.array)if(!Number.isFinite(x))throw Error(`${id}: nonfinite attribute ${n.name}`);
  if(g.index)for(const x of g.index.array)if(x<0||x>=g.attributes.position.count)throw Error(`${id}: invalid index ${n.name}`);
  if(g.attributes.normal)for(let i=0;i<g.attributes.normal.count;i++){
   const len=new Vector3().fromBufferAttribute(g.attributes.normal,i).length();
   summary.normalLengthMin=Math.min(summary.normalLengthMin,len);summary.normalLengthMax=Math.max(summary.normalLengthMax,len);
  }
  groups[n.userData.materialRole].expandByObject(n,true);
 });
 summary.materials=[...summary.materials];
 const roleBounds=Object.fromEntries(Object.entries(groups).map(([key,box])=>[key,{min:box.min.toArray(),max:box.max.toArray(),center:box.getCenter(new Vector3()).toArray(),size:box.getSize(new Vector3()).toArray()}]));
 const fileMeta=path.join(dir,id+'.json');const meta=JSON.parse(fs.readFileSync(fileMeta));
 meta.roleBounds=roleBounds;
 meta.focusPoints={assembled:meta.bounds.center,blade:roleBounds.blade.center,handle:roleBounds.handle.center,metals:meta.hinge.position};
 meta.bufferValidation=summary;
 fs.writeFileSync(fileMeta,JSON.stringify(meta,null,2));all.push(meta);
 console.log(JSON.stringify({id,triangles:summary.triangles,bytes:b.length,normalLengths:[summary.normalLengthMin,summary.normalLengthMax],animationReduction:meta.animationReductionValidation}));
}
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({version:46,generatedAt:new Date().toISOString(),models:all},null,2));
fs.writeFileSync(path.join(dir,'validation.json'),JSON.stringify({status:'passed',scope:'Binary GLB integrity, finite vertex attributes, valid indices, positive transforms, roundtrip animation node transforms; not collision clearance or visual render approval.',totalBytes:all.reduce((a,m)=>a+m.outputBytes,0),totalTriangles:all.reduce((a,m)=>a+m.triangles,0),maxRoundTripNodePositionErrorM:Math.max(...all.map(m=>m.roundTripValidation.maxNodePositionErrorM)),maxAnimationReductionPositionErrorM:Math.max(...all.map(m=>m.animationReductionValidation.maxPositionErrorM)),maxAnimationReductionAngularErrorRad:Math.max(...all.map(m=>m.animationReductionValidation.maxAngularErrorRad)),models:all.map(m=>({id:m.id,sourceMotionQA:m.sourceMotionQA,sourceTriangles:m.trianglesBefore,webTriangles:m.triangles,bytes:m.outputBytes,meshCount:m.meshCount}))},null,2));
