import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {MeshoptSimplifier} from 'meshoptimizer';
import {Box3, Vector3, MeshStandardMaterial, BufferAttribute, Quaternion} from 'three';

globalThis.FileReader=class {
 async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}
 async readAsDataURL(blob){this.result=`data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;this.onloadend?.();}
};
const INPUT=path.resolve(import.meta.dirname,'../../../upload');
const OUTPUT=path.resolve(import.meta.dirname,'../../public/models/v46');
const wanted=process.argv.slice(2);
const sources=[['HYPER','HYPER(1).fbx'],['VERTEX','VERTEX.fbx'],['QUAD','QUAD.fbx'],['EDGE','EDGE.fbx'],['TRIS','TRIS.fbx']].filter(([id])=>!wanted.length||wanted.includes(id));
fs.mkdirSync(OUTPUT,{recursive:true});
await MeshoptSimplifier.ready;
const vec=()=>new Vector3();
const round=x=>Math.round(x*1e9)/1e9;
const arr=x=>x.map(round);
function bounds(scene){const b=new Box3().setFromObject(scene);return {min:arr(b.min.toArray()),max:arr(b.max.toArray()),center:arr(b.getCenter(vec()).toArray()),size:arr(b.getSize(vec()).toArray())};}
function role(name){return name.endsWith('__BLADE')?'blade':name.endsWith('__HANDLE')?'handle':'metals';}
function peakTime(clip){
 let max=0,at=0;
 for(let frame=0;frame<=Math.ceil(clip.duration*30);frame++){
  const t=Math.min(clip.duration,frame/30);let score=0;
  for(const track of clip.tracks){const p=track.createInterpolant().evaluate(t);for(let k=0;k<p.length;k++)score+=(p[k]-track.values[k])**2;}
  if(score>max+1e-10){max=score;at=t;}
 }
 return at;
}
function snapshot(scene){const out={};scene.traverse(n=>{out[n.name]={p:n.position.clone(),q:n.quaternion.clone(),s:n.scale.clone()};});return out;}
function reset(scene,rest){scene.traverse(n=>{const r=rest[n.name];if(r){n.position.copy(r.p);n.quaternion.copy(r.q);n.scale.copy(r.s);}});}
function applyClip(scene,clip,time){
 for(const tr of clip.tracks){const dot=tr.name.lastIndexOf('.');const n=scene.getObjectByName(tr.name.slice(0,dot));const prop=tr.name.slice(dot+1);if(!n?.[prop])throw Error(`Missing target ${tr.name}`);n[prop].fromArray(tr.createInterpolant().evaluate(time));}
 scene.updateMatrixWorld(true);
}
function simplifyGeometry(mesh,id){
 const original=mesh.geometry;const before=(original.index?.count??original.attributes.position.count)/3;
 let g=mergeVertices(original,1e-8);g.clearGroups();
 let target=before;let relativeError=0;
 if(id==='HYPER' && !mesh.material.name.endsWith('__BLADE') && !mesh.material.name.endsWith('__HANDLE')){
  target=Math.min(before,/ball_/.test(mesh.name)?192:/clip__|tail_insert/.test(mesh.name)?4500:/pivot_/.test(mesh.name)?2500:1500);
 }
 if(target<before){
  const attrs=g.attributes;const count=attrs.position.count;
  const combined=new Float32Array(count*5);
  for(let i=0;i<count;i++){
   combined[i*5]=attrs.normal?.getX(i)??0;combined[i*5+1]=attrs.normal?.getY(i)??0;combined[i*5+2]=attrs.normal?.getZ(i)??1;
   combined[i*5+3]=attrs.uv?.getX(i)??0;combined[i*5+4]=attrs.uv?.getY(i)??0;
  }
  const maxError=/ball_/.test(mesh.name)?0.008:0.002;
  const [idx,error]=MeshoptSimplifier.simplifyWithAttributes(new Uint32Array(g.index.array),attrs.position.array,3,combined,5,[0.2,0.2,0.2,0.05,0.05],null,target*3,maxError,['LockBorder']);
  const [remap,newCount]=MeshoptSimplifier.compactMesh(idx);
  for(const [key,attribute] of Object.entries(attrs)){
   const next=new attribute.array.constructor(newCount*attribute.itemSize);
   for(let i=0;i<remap.length;i++)if(remap[i]!==0xffffffff)for(let k=0;k<attribute.itemSize;k++)next[remap[i]*attribute.itemSize+k]=attribute.array[i*attribute.itemSize+k];
   g.setAttribute(key,new BufferAttribute(next,attribute.itemSize,attribute.normalized));
  }
  g.setIndex(new BufferAttribute(newCount<65536?new Uint16Array(idx):idx,1));relativeError=error;
 }
 g.computeBoundingBox();g.computeBoundingSphere();mesh.geometry=g;
 return {name:mesh.name,role:role(mesh.material.name),trianglesBefore:before,triangles:g.index.count/3,vertices:g.attributes.position.count,relativeSimplificationError:relativeError};
}
function reduceTrack(track){
 // Preserve all baked motion samples unless a middle key lies on its exact interpolation.
 const stride=track.getValueSize(),count=track.times.length;if(count<3)return track;
 const keep=new Set([0,count-1]);const isQuat=stride===4&&track.ValueTypeName==='quaternion';
 const qa=new Quaternion(),qb=new Quaternion(),qm=new Quaternion(),qi=new Quaternion();
 const tolerance=isQuat?2e-6:1e-8;
 function visit(a,b){if(b<=a+1)return;let max=0,at=-1;
  for(let i=a+1;i<b;i++){
   const t=(track.times[i]-track.times[a])/(track.times[b]-track.times[a]);let error=0;
   if(isQuat){qa.fromArray(track.values,a*stride);qb.fromArray(track.values,b*stride);qm.copy(qa).slerp(qb,t);qi.fromArray(track.values,i*stride);error=qm.angleTo(qi);}
   else for(let k=0;k<stride;k++)error=Math.max(error,Math.abs(track.values[a*stride+k]*(1-t)+track.values[b*stride+k]*t-track.values[i*stride+k]));
   if(error>max){max=error;at=i;}
  }
  if(max>tolerance&&at>0){keep.add(at);visit(a,at);visit(at,b);}
 }
 visit(0,count-1);const order=[...keep].sort((a,b)=>a-b);
 track.times=new Float32Array(order.map(i=>track.times[i]));track.values=new Float32Array(order.flatMap(i=>Array.from(track.values.slice(i*stride,(i+1)*stride))));return track;
}
for(const [id,filename] of sources){
 console.log(`Loading ${id}`);const bytes=fs.readFileSync(path.join(INPUT,filename));
 const scene=new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 scene.updateMatrixWorld(true);const rest=snapshot(scene);const initialBounds=bounds(scene);
 const open=scene.animations.find(c=>c.name.includes('__OPEN_CLOSE'));
 const explode=scene.animations.find(c=>c.name.includes('__EXPLODE'));
 if(!open||!explode)throw Error(`${id}: missing independent clips`);
 const explodePeak=peakTime(explode);const initialTris=[];const materials=new Map();
 scene.traverse(n=>{
  n.userData={};
  if(!n.isMesh)return;
  if(Array.isArray(n.material))throw Error(`${id}: unexpected multi-material ${n.name}`);
  const old=n.material;initialTris.push(simplifyGeometry(n,id));
  if(!materials.has(old.name)){
   const r=role(old.name);const m=new MeshStandardMaterial({name:old.name,color:r==='handle'?0x34312e:r==='blade'?0xaaa7a1:0x88847e,metalness:r==='handle'?0.18:1,roughness:r==='blade'?0.3:r==='handle'?0.5:0.34});
   materials.set(old.name,m);
  }
  n.material=materials.get(old.name);n.userData={partId:n.name,materialRole:role(old.name)};n.castShadow=true;n.receiveShadow=true;
 });
 const rawClips=scene.animations.map(c=>c.clone());
 const clipsBefore=scene.animations.map(c=>({name:c.name,keys:c.tracks.reduce((a,t)=>a+t.times.length,0)}));
 for(const clip of scene.animations)for(const track of clip.tracks)reduceTrack(track);
 let maxReducedPositionErrorM=0,maxReducedAngularErrorRad=0;
 for(let ci=0;ci<rawClips.length;ci++)for(let ti=0;ti<rawClips[ci].tracks.length;ti++){
  const raw=rawClips[ci].tracks[ti],web=scene.animations[ci].tracks[ti],a=raw.createInterpolant(),b=web.createInterpolant();
  for(const time of raw.times){
   const av=a.evaluate(time),bv=b.evaluate(time);
   if(raw.ValueTypeName==='quaternion'){
    const q1=new Quaternion().fromArray(av).normalize(),q2=new Quaternion().fromArray(bv).normalize();
    maxReducedAngularErrorRad=Math.max(maxReducedAngularErrorRad,q1.angleTo(q2));
   } else for(let k=0;k<av.length;k++)maxReducedPositionErrorM=Math.max(maxReducedPositionErrorM,Math.abs(av[k]-bv[k]));
  }
 }
 const qaStatus=id==='HYPER'?'source_motion_pass':'source_motion_qa_failed';
 scene.userData={modelId:id,sourceMotionQA:qaStatus,nominalLengthM:0.25};
 reset(scene,rest);scene.updateMatrixWorld(true);
 const buffer=await new GLTFExporter().parseAsync(scene,{binary:true,animations:scene.animations,onlyVisible:false,trs:true});
 const destination=path.join(OUTPUT,`${id.toLowerCase()}.glb`);fs.writeFileSync(destination,Buffer.from(buffer));
 const loaded=await new GLTFLoader().parseAsync(buffer,'');loaded.scene.updateMatrixWorld(true);
 const outputRest=snapshot(loaded.scene);const samples=[];let maxPositionError=0,maxMatrixError=0;
 const pairs=[[0,0],[6,0],[12,0],[0,explodePeak],[6,explodePeak],[3,explodePeak*0.5]];
 for(const [openTime,explodeTime] of pairs){
  reset(scene,rest);reset(loaded.scene,outputRest);
  applyClip(scene,open,openTime);applyClip(scene,explode,explodeTime);
  applyClip(loaded.scene,loaded.animations.find(c=>c.name===open.name),openTime);applyClip(loaded.scene,loaded.animations.find(c=>c.name===explode.name),explodeTime);
  let sampleError=0;scene.traverse(n=>{if(!n.name)return;const target=loaded.scene.getObjectByName(n.name);if(!target)throw Error(`Missing exported node ${n.name}`);for(let k=0;k<16;k++)maxMatrixError=Math.max(maxMatrixError,Math.abs(n.matrixWorld.elements[k]-target.matrixWorld.elements[k]));const error=n.getWorldPosition(vec()).distanceTo(target.getWorldPosition(vec()));sampleError=Math.max(sampleError,error);});
  maxPositionError=Math.max(maxPositionError,sampleError);samples.push({openTime,explodeTime,maxNodePositionErrorM:sampleError,bounds:bounds(loaded.scene)});
 }
 reset(scene,rest);scene.updateMatrixWorld(true);
 const hinge=scene.getObjectByName(`${id}__BLADE_HINGE`);
 const meta={id,url:`/models/v46/${id.toLowerCase()}.glb`,sourceFilename:filename,sourceBytes:bytes.length,sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),outputBytes:buffer.byteLength,meshCount:initialTris.length,trianglesBefore:initialTris.reduce((a,n)=>a+n.trianglesBefore,0),triangles:initialTris.reduce((a,n)=>a+n.triangles,0),bounds:initialBounds,coordinateSystem:{tip:'+X',spine:'+Y',thickness:'Z',nominalLengthM:0.25},hinge:{name:hinge.name,position:arr(hinge.getWorldPosition(vec()).toArray())},materialNames:[...materials.keys()],motion:{openCloseClip:open.name,openTime:0,closedTime:6,reopenedTime:12,explodeClip:explode.name,explodePeakTime:explodePeak,explodeDuration:explode.duration,combinedClip:scene.animations.find(c=>c.name.includes('__COMBINED'))?.name},sourceMotionQA:qaStatus,sourceLimitations:id==='HYPER'?[]:[id==='TRIS'?'Source reports closed blade protrusion (~1.745 mm) and pivot/spacer intersections.':'Source reports component intersections during closure and explosion path.'],derivativeNotes:id==='HYPER'?['Hardware geometry simplified with meshoptimizer; blade and handle triangle topology retained.','All moving parts, named hierarchy, UVs, normals and independent motion channels retained.','This web derivative does not re-certify collision clearance.']:['Geometry indexed/welded only; source triangles retained.','This conversion does not repair source motion intersections.'],clips:scene.animations.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length,keys:c.tracks.reduce((a,t)=>a+t.times.length,0),originalKeys:clipsBefore.find(x=>x.name===c.name).keys})),animationReductionValidation:{maxPositionErrorM:maxReducedPositionErrorM,maxAngularErrorRad:maxReducedAngularErrorRad},roundTripValidation:{maxNodePositionErrorM:maxPositionError,maxMatrixElementError:maxMatrixError,samples},parts:initialTris};
 fs.writeFileSync(path.join(OUTPUT,`${id.toLowerCase()}.json`),JSON.stringify(meta,null,2));
 console.log(JSON.stringify({id,outputBytes:meta.outputBytes,triangles:meta.triangles,sourceTriangles:meta.trianglesBefore,explodePeakTime:explodePeak,roundTripPositionError:maxPositionError}));
}
const manifests=['HYPER','VERTEX','QUAD','EDGE','TRIS'].map(id=>path.join(OUTPUT,`${id.toLowerCase()}.json`)).filter(fs.existsSync).map(p=>JSON.parse(fs.readFileSync(p,'utf8')));
fs.writeFileSync(path.join(OUTPUT,'manifest.json'),JSON.stringify({version:46,generatedAt:new Date().toISOString(),models:manifests},null,2));
