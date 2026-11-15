import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {parseGlb,decodeViews,accessor,protectedPart,sha256,packUncompressed} from './glb.mjs';
import {makeBvh,sampleSurface} from './surface-distance.mjs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
const root=path.resolve(import.meta.dirname,'../../..');const qa=path.join(import.meta.dirname,'qa');fs.mkdirSync(qa,{recursive:true});
const source=parseGlb(path.join(root,'public/models/v46/hyper.glb')),target=parseGlb(path.join(root,'public/models/v48/hyper.glb'));
const av=await decodeViews(source),bv=await decodeViews(target),a=source.json,b=target.json;
const bytes=x=>Buffer.from(x.buffer,x.byteOffset,x.byteLength);
const equality=(x,y,label)=>assert.ok(bytes(x).equals(bytes(y)),label+' differs');
const getA=i=>accessor(a,av,i),getB=i=>accessor(b,bv,i);
assert.deepEqual(a.nodes,b.nodes,'node identities, hierarchy and transforms');assert.deepEqual(a.scenes,b.scenes);assert.deepEqual(a.materials,b.materials,'semantic material identity');assert.deepEqual(a.animations,b.animations,'animation references/timing schema');
for(const animation of a.animations)for(const sampler of animation.samplers){equality(getA(sampler.input),getB(sampler.input),animation.name+' times');equality(getA(sampler.output),getB(sampler.output),animation.name+' values');}
assert.equal(a.meshes.length,b.meshes.length);const protectedHashes=[],parts=[];let trianglesBefore=0,triangles=0,maxSurfaceErrorM=0;
const minmax=(p)=>{const bounds=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];for(let i=0;i<p.length;i++) {const k=i%3;bounds[k]=Math.min(bounds[k],p[i]);bounds[k+3]=Math.max(bounds[k+3],p[i]);}return bounds;};
let protectedNegativeControl=false;
for(let i=0;i<a.meshes.length;i++){
 const name=a.nodes.find(n=>n.mesh===i).name,pa=a.meshes[i].primitives[0],pb=b.meshes[i].primitives[0],p0=getA(pa.attributes.POSITION),p1=getB(pb.attributes.POSITION),i0=getA(pa.indices),i1=getB(pb.indices);
 assert.deepEqual(pa,pb,'primitive semantic layout '+name);trianglesBefore+=i0.length/3;triangles+=i1.length/3;
 for(const [id,value] of [...i1.entries()])assert.ok(value<p1.length/3,name+' index '+id+' in bounds');
 for(const x of p1)assert.ok(Number.isFinite(x),name+' finite geometry');
 assert.deepEqual(minmax(p0),minmax(p1),'exact extrema '+name);
 if(protectedPart(name)){
  const hashes={name,triangles:i1.length/3,attributes:{},indices:sha256(bytes(i1))};
  equality(i0,i1,name+' indices');
  for(const [semantic,index] of Object.entries(pa.attributes)){equality(getA(index),getB(index),name+' '+semantic);hashes.attributes[semantic]=sha256(bytes(getB(index)));}
  protectedHashes.push(hashes);
  if(!protectedNegativeControl){const changed=getB(pa.attributes.POSITION).slice();changed[0]+=0.001;assert.throws(()=>equality(getA(pa.attributes.POSITION),changed,'control'),/differs/);protectedNegativeControl=true;}
  parts.push({name,protected:true,trianglesBefore:i0.length/3,triangles:i1.length/3,surfaceErrorM:0});continue;
 }
 // Every retained hardware vertex, normal and UV is copied exactly from source.
 const keyAt=(positions,normals,uv,i)=>[...positions.subarray(i*3,i*3+3),...normals.subarray(i*3,i*3+3),...uv.subarray(i*2,i*2+2)].join(',');
 const n0=getA(pa.attributes.NORMAL),n1=getB(pb.attributes.NORMAL),uv0=getA(pa.attributes.TEXCOORD_0),uv1=getB(pb.attributes.TEXCOORD_0),known=new Set();for(let v=0;v<p0.length/3;v++)known.add(keyAt(p0,n0,uv0,v));for(let v=0;v<p1.length/3;v++)assert.ok(known.has(keyAt(p1,n1,uv1,v)),name+' retained vertex attributes must be original');
 const changed=!bytes(i0).equals(bytes(i1));let forward={maxM:0,rmsM:0,samples:0},backward=forward;
 if(changed){const bvh0=makeBvh(p0,i0),bvh1=makeBvh(p1,i1);forward=sampleSurface(p0,i0,bvh1);backward=sampleSurface(p1,i1,bvh0);}
 const error=Math.max(forward.maxM,backward.maxM);maxSurfaceErrorM=Math.max(maxSurfaceErrorM,error);
 assert.ok(error<=0.0000101,name+' sampled surface error '+error+' exceeds 10µm');
 parts.push({name,protected:false,trianglesBefore:i0.length/3,triangles:i1.length/3,forward,backward,surfaceErrorM:error});
}
assert.equal(protectedHashes.length,4);assert.ok(protectedNegativeControl);assert.ok(triangles<trianglesBefore);assert.ok(target.bytes.length<source.bytes.length);
// Negative control exercises the independent distance implementation.
const plane=makeBvh(new Float32Array([0,0,0,1,0,0,0,1,0]),new Uint16Array([0,1,2]));assert.ok(Math.abs(Math.sqrt(plane.distanceSq(.25,.25,.001))-.001)<1e-12);
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);const gltf=await loader.parseAsync(target.bytes.buffer.slice(target.bytes.byteOffset,target.bytes.byteOffset+target.bytes.byteLength),'');
assert.equal(gltf.animations.length,3);let loadedMeshes=0;gltf.scene.traverse(n=>{if(n.isMesh)loadedMeshes++;});assert.equal(loadedMeshes,52);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/models/v48/manifest.json'))),baseManifest=JSON.parse(fs.readFileSync(path.join(root,'public/models/v46/manifest.json'))),meta=JSON.parse(fs.readFileSync(path.join(root,'public/models/v48/hyper.json')));
assert.equal(manifest.version,48);assert.deepEqual(manifest.models.slice(1),baseManifest.models.slice(1));assert.equal(meta.triangles,triangles);assert.equal(meta.outputBytes,target.bytes.length);assert.equal(manifest.models[0].url,'/models/v48/hyper.glb');assert.deepEqual(meta.focusPoints,baseManifest.models[0].focusPoints);assert.deepEqual(meta.coordinateSystem,baseManifest.models[0].coordinateSystem);assert.deepEqual(meta.motion,baseManifest.models[0].motion);
for(const model of manifest.models)assert.ok(fs.existsSync(path.join(root,'public',model.url)),model.id+' asset exists');
const report={version:48,baselineSha256:sha256(source.bytes),outputSha256:sha256(target.bytes),bytesBefore:source.bytes.length,bytes:target.bytes.length,payloadReductionPct:100*(1-target.bytes.length/source.bytes.length),trianglesBefore,triangles,triangleReductionPct:100*(1-triangles/trianglesBefore),meshCount:loadedMeshes,protectedHashes,exactNodes:a.nodes.length,exactAnimationClips:a.animations.length,maxSampledSurfaceErrorM:maxSurfaceErrorM,sampling:'Every vertex plus every triangle centre and edge midpoint, both directions. Sampled values are not an exact Hausdorff guarantee.',negativeControls:{protectedMutationRejected:protectedNegativeControl,distanceOffsetDetected:true},parts};
fs.writeFileSync(path.join(qa,'verification.json'),JSON.stringify(report,null,2)+'\n');
if(process.argv.includes('--render-inputs')){fs.writeFileSync(path.join(qa,'hyper-v48-decoded.glb'),packUncompressed(target,bv));}
console.log(JSON.stringify({trianglesBefore,triangles,bytesBefore:source.bytes.length,bytes:target.bytes.length,protectedMeshes:protectedHashes.length,maxSampledSurfaceErrorM:maxSurfaceErrorM}));
console.log('HYPER V48 verification passed');
