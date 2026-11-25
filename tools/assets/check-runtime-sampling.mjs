import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {AnimationMixer,LoopOnce,Vector3} from 'three';
import {createExplosion,sampleExplosion} from '../../app/lib/explosion.ts';
const path='public/models/v72/manifest.json';
const meta=JSON.parse(fs.readFileSync(path)).models;
for(const m of meta){
 const bytes=fs.readFileSync(`public${m.url}`);
 const {scene,animations}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const fold=animations.find(c=>c.name===m.motion.openCloseClip),explosion=animations.find(c=>c.name===m.motion.explodeClip);
 assert.equal(fold.tracks.filter(t=>explosion.tracks.some(e=>e.name===t.name)).length,0,'Fold and explode must affect independent channels');
 const mixer=new AnimationMixer(scene),open=mixer.clipAction(fold);
 open.setLoop(LoopOnce,1);open.clampWhenFinished=true;open.play();open.paused=true;
 const parts=createExplosion(scene,explosion,m.motion.explodePeakTime);
 assert.equal(parts.length,explosion.tracks.length,'Every authored exploded component participates');
 let syncError=0,drift=0,moved=0,legacySkew=0;
 for(let frame=0;frame<360;frame++){
  const amount=(1-Math.cos(frame/359*Math.PI*4))/2;
  open.time=frame/359*m.motion.closedTime;mixer.update(0);sampleExplosion(parts,amount);
  for(const part of parts){
   const direction=new Vector3().subVectors(part.exploded,part.assembled);
   const expected=new Vector3().copy(part.assembled).addScaledVector(direction,amount);
   drift=Math.max(drift,part.node.position.distanceTo(expected));
   if(direction.lengthSq()>1e-14){const progress=part.node.position.clone().sub(part.assembled).dot(direction)/direction.lengthSq();syncError=Math.max(syncError,Math.abs(progress-amount));moved++;}
  }
  for(const track of fold.tracks){const node=scene.getObjectByName(track.name.slice(0,track.name.lastIndexOf('.'))),property=track.name.slice(track.name.lastIndexOf('.')+1),expected=track.createInterpolant().evaluate(open.time),actual=node[property].toArray();for(let i=0;i<actual.length;i++)assert.ok(Math.abs(expected[i]-actual[i])<1e-7,'Fold pose changed by exploded sampling');}
 }
 for(let i=0;i<parts.length;i++){const p=parts[i],direction=new Vector3().subVectors(p.exploded,p.assembled);if(direction.lengthSq()<1e-14)continue;const legacy=new Vector3().fromArray(explosion.tracks[i].createInterpolant().evaluate(m.motion.explodePeakTime*.5));legacySkew=Math.max(legacySkew,Math.abs(legacy.sub(p.assembled).dot(direction)/direction.lengthSq()-.5));}
 // Positive control: the supplied staggered clip must actually fail synchronization.
 assert.ok(legacySkew>.05,'Control fixture must expose the previous stagger');
 sampleExplosion(parts,0);assert.ok(parts.every(p=>p.node.position.distanceTo(p.assembled)===0),'Reverse must return exactly to assembled positions');
 assert.ok(moved>0&&syncError<1e-10&&drift<1e-12);
 console.log(`PASS — ${m.id}: ${parts.length} synchronized parts, reverse drift ${drift.toExponential(1)}, legacy stagger detected ${legacySkew.toFixed(2)}`);
 mixer.stopAllAction();mixer.uncacheRoot(scene);
}
