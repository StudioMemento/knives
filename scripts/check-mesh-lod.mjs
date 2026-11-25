import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {createHash} from 'node:crypto';
import {Matrix4,Mesh,MeshPhysicalMaterial,Vector3,AnimationMixer,LoopOnce} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {MeshDetail,addStockCoordinates} from '../app/lib/mesh-detail.ts';
import {AssembledHardware} from '../app/lib/assembled-hardware.ts';
import {createExplosion,sampleExplosion} from '../app/lib/explosion.ts';

globalThis.window={setTimeout,clearTimeout};
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const manifest=JSON.parse(await readFile('public/models/v73/manifest.json'));
async function parse(url) {
 const bytes=await readFile('public'+url);
 return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
}
const meshesOf=root=>{const output=[];root.traverse(n=>{if(n instanceof Mesh)output.push(n);});return output;};
const triangles=g=>g.index.count/3;
const sum=meshes=>meshes.reduce((n,m)=>n+triangles(m.geometry),0);
const pos=new Vector3(), uvKey=(g,i)=>{
 const p=g.attributes.position,u=g.attributes.uv,t=g.attributes.tangent;
 return [p.getX(i),p.getY(i),p.getZ(i),u.getX(i),u.getY(i),t.getW(i)].join('/');
};
function meshSignature(g,ids) {
 const keys=[];
 for (let i=0;i<g.index.count;i+=3) {
  const a=ids[g.index.getX(i)],b=ids[g.index.getX(i+1)],c=ids[g.index.getX(i+2)];
  const key=a<b&&a<c?[a,b,c]:b<c?[b,c,a]:[c,a,b];
  keys.push(key.join('/'));
 }
 return createHash('sha256').update([...new Set(keys)].sort().join(';')).digest('hex');
}
function geometryCheck(source, candidate, full) {
 const vertices=source.attributes.position.count, buckets=new Map(), baselineIds=[];
 for(let i=0;i<vertices;i++){
  const key=uvKey(source,i);
  if(!buckets.has(key)) buckets.set(key,{id:buckets.size,items:[]});
  const bucket=buckets.get(key);bucket.items.push(i);baselineIds.push(bucket.id);
 }
 const ids=[], a=new Vector3(),b=new Vector3(),c=new Vector3(),d=new Vector3();let maxAngle=0;
 for(let i=0;i<candidate.attributes.position.count;i++){
  const bucket=buckets.get(uvKey(candidate,i));assert.ok(bucket,'UV0, position or tangent sign changed');ids.push(bucket.id);
  a.fromBufferAttribute(candidate.attributes.normal,i);b.fromBufferAttribute(candidate.attributes.tangent,i);
  let angle=Infinity;
  for(const j of bucket.items){
   c.fromBufferAttribute(source.attributes.normal,j);d.fromBufferAttribute(source.attributes.tangent,j);
   angle=Math.min(angle,Math.max(a.angleTo(c),b.angleTo(d)));
  }
  maxAngle=Math.max(maxAngle,angle*180/Math.PI);
 }
 assert.ok(maxAngle<.012,'Normal/tangent packing exceeded its angular tolerance: '+maxAngle);
 if(full) assert.equal(meshSignature(source,baselineIds),meshSignature(candidate,ids),'Full oriented triangle set changed');
 for(let i=0;i<candidate.index.count;i+=3){
  const ix=[candidate.index.getX(i),candidate.index.getX(i+1),candidate.index.getX(i+2)];
  assert.ok(ix.every(k=>k>=0&&k<ids.length));
  a.fromBufferAttribute(candidate.attributes.position,ix[0]);b.fromBufferAttribute(candidate.attributes.position,ix[1]);c.fromBufferAttribute(candidate.attributes.position,ix[2]);
  b.sub(a).cross(c.sub(a));assert.ok(b.lengthSq()>0,'Degenerate triangle');b.normalize();
  for(const k of ix)assert.ok(b.dot(d.fromBufferAttribute(candidate.attributes.normal,k))>=-.00015,'Inverted shading normal');
 }
 return maxAngle;
}
async function until(test,message) {
 for(let i=0;i<1000;i++){if(test())return;await delay(2);}
 assert.fail(message);
}
for(const meta of manifest.models){
 const [old,stage]=await Promise.all([parse(meta.url.replace('/v73/','/v72/')),parse(meta.url)]);
 const original=new Map(meshesOf(old.scene).map(m=>[m.name,m])), meshes=meshesOf(stage.scene);
 assert.equal(meshes.length,original.size);assert.equal(sum(meshes),meta.triangles);
 assert.deepEqual(stage.parser.json.nodes,old.parser.json.nodes);
 for(const c of old.animations){const next=stage.animations.find(k=>k.name===c.name);assert.equal(next.tracks.length,c.tracks.length);
  for(let i=0;i<c.tracks.length;i++){assert.equal(next.tracks[i].name,c.tracks[i].name);assert.deepEqual(next.tracks[i].times,c.tracks[i].times);assert.deepEqual(next.tracks[i].values,c.tracks[i].values);}}
 let allowLoad,requests=0;
 const lod=new MeshDetail(meta.detail,url=>{requests++;return new Promise(resolve=>{allowLoad=()=>resolve(parse(url));});});
 const base=new Map(),bound=new Map(),mirrors=new Map(),shared=new Map();let angle=0;
 stage.scene.updateMatrixWorld(true);
 const toRoot=stage.scene.matrixWorld.clone().invert();
 for(const m of meshes){
  const rest=new Matrix4().multiplyMatrices(toRoot,m.matrixWorld);bound.set(m.name,rest);base.set(m.name,m.geometry);
  addStockCoordinates(m.geometry,rest);m.userData.surface=m.userData.materialRole;
  const key=m.userData.surface==='metals'&&meta.id==='TRIS'&&m.name.includes('__clip_back__')?'transmitting':m.userData.surface;
  if(!shared.has(key))shared.set(key,new MeshPhysicalMaterial({transmission:key==='transmitting'?.5:0}));m.material=shared.get(key);
  const mirror=m.userData.surface==='metals'?undefined:new Mesh(m.geometry);
  if(mirror)mirrors.set(m.name,mirror);
  lod.register(m,rest,mirror);
  assert.ok(!m.geometry.hasAttribute('uv1'));angle=Math.max(angle,geometryCheck(original.get(m.name).geometry,m.geometry,false));
 }
 const hardware=new AssembledHardware(stage.scene,meshes);
 const mixer=new AnimationMixer(stage.scene),clip=stage.animations.find(c=>c.name===meta.motion.openCloseClip);
 const open=mixer.clipAction(clip);open.setLoop(LoopOnce,1);open.play();open.paused=true;
 const parts=createExplosion(stage.scene,stage.animations.find(c=>c.name===meta.motion.explodeClip),meta.motion.explodePeakTime);
 open.time=0;mixer.update(0);sampleExplosion(parts,0);stage.scene.updateMatrixWorld(true);
 for(const m of meshes){const world=m.matrixWorld.elements,bind=bound.get(m.name).elements;
  if(m.userData.surface==='metals')assert.ok(world.every((x,i)=>Math.abs(x-bind[i])<2e-6),'Assembled batch rest pose mismatch '+m.name);}
 async function batchCheck(level){
  hardware.update(true,level);await until(()=>{hardware.update(true,level);return hardware.drawSavings>0;},'Rest batch unavailable');
  const visible=[];stage.scene.traverseVisible(n=>{if(n instanceof Mesh)visible.push(n);});
  assert.equal(sum(visible),sum(meshes));assert.equal(visible.length,meshes.length-hardware.drawSavings);
  const draws=visible.length;
  hardware.update(false,level);assert.ok(meshes.every(m=>m.visible));return draws;
 }
 const draws=await batchCheck(false);
 // The optional response completes after the visitor has switched away. The next frame chooses the level.
 lod.update(true,performance.now());lod.update(false,performance.now());allowLoad();await delay(16);
 assert.ok(!lod.active);assert.ok(meshes.every(m=>m.geometry===base.get(m.name)));
 open.time=meta.motion.closedTime*.73;mixer.update(0);sampleExplosion(parts,.66);stage.scene.updateMatrixWorld(true);
 await until(()=>{lod.update(true,performance.now());return lod.active;},'Refinement unavailable');
 assert.equal(sum(meshes),meta.inspectionTriangles);assert.equal(requests,1);
 for(const m of meshes){const g=m.geometry,rest=bound.get(m.name),stock=g.attributes.stock;angle=Math.max(angle,geometryCheck(original.get(m.name).geometry,g,true));
  for(let i=0;i<stock.count;i+=41){pos.fromBufferAttribute(g.attributes.position,i).applyMatrix4(rest).multiplyScalar(1000);assert.ok(pos.distanceTo(new Vector3().fromBufferAttribute(stock,i))<.00003);}
  if(mirrors.has(m.name))assert.equal(mirrors.get(m.name).geometry,g);
 }
 open.time=0;mixer.update(0);sampleExplosion(parts,0);stage.scene.updateMatrixWorld(true);assert.equal(await batchCheck(true),draws);
 for(let i=0;i<3;i++){lod.update(false,performance.now());assert.ok(meshes.every(m=>m.geometry===base.get(m.name)));lod.update(true,performance.now());assert.equal(sum(meshes),meta.inspectionTriangles);}
 assert.equal(requests,1);
 console.log(`${meta.id}: ${meta.triangles}/${meta.inspectionTriangles} triangles, ${meshes.length} → ${draws} assembled product draws, max tangent-frame deviation ${angle.toFixed(5)}°`);
 if(meta.id==='HYPER'){
  // Simulate an interrupted optional download. The previous tier stays usable and a later request recovers.
  lod.update(false,performance.now());
  let attempts=0;
  const retry=new MeshDetail(meta.detail,async url=>{
   if(++attempts===1)throw Error('offline test fixture');
   return parse(url);
  });
  for(const m of meshes)retry.register(m,bound.get(m.name));
  const warn=console.warn;
  try{console.warn=()=>{};retry.update(true,performance.now());await delay(2);}finally{console.warn=warn;}
  retry.update(true,performance.now());assert.equal(attempts,1);assert.equal(sum(meshes),meta.triangles);
  const later=performance.now()+13000;
  await until(()=>{retry.update(true,later);return retry.active;},'Optional geometry did not recover');
  assert.equal(attempts,2);assert.equal(sum(meshes),meta.inspectionTriangles);retry.dispose();
 }
 hardware.dispose();lod.dispose();
}
