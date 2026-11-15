import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Group,Vector3,Matrix4} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {assemblyWeight,turnTarget,turnPose,railPoint,anchorTip,animateBackdrop,HERO_HOLD,TAU,RAIL_DEPTH} from '../app/lib/choreography.ts';
import {Carousel} from '../app/lib/carousel.ts';
import {SectionSnap,swipeDestination,nearestChapter} from '../app/lib/navigation.ts';
import {createExplosion,sampleExplosion} from '../app/lib/explosion.ts';
import {presentation} from '../app/lib/presentation.ts';
import {orbitAngle} from '../app/lib/motion.ts';
assert.equal(assemblyWeight(0),1);assert.equal(assemblyWeight(.18),1);assert.equal(assemblyWeight(.9),0);
for(let d=0;d<1;d+=.005)assert.ok(assemblyWeight(d)>=assemblyWeight(d+.005));
assert.equal(turnTarget(0),0);assert.equal(turnTarget(HERO_HOLD),TAU);
for(let t=0;t<HERO_HOLD;t+=.01)assert.ok(turnTarget(t+.01)>=turnTarget(t)-1e-12);
assert.ok(turnPose(0).angleTo(turnPose(TAU))<1e-7);
assert.ok(turnPose(0).angleTo(turnPose(Math.PI))>3,'Positive control: back face is actually visited');
const carousel=new Carousel();for(let i=0;i<60;i++)carousel.dragTo(.7,i?1/60:0);
assert.ok(carousel.phase>.69&&carousel.phase<.71,'Mouse drag follows the hand');
const before=[carousel.phase,carousel.velocity,carousel.acceleration];carousel.request(1);
assert.deepEqual([carousel.phase,carousel.velocity,carousel.acceleration],before,'Release keeps continuous motion');
for(let i=0;i<180;i++)carousel.step(1/60,true,true,false);assert.equal(carousel.phase,1);
assert.equal(swipeDestination(0,-150,1363,-.6),1);assert.equal(swipeDestination(1,150,1363,.6),0);assert.equal(swipeDestination(1,5,1363,0),1);
const snap=new SectionSnap();let moves=0;
for(let i=0;i<400;i++)moves+=snap.wheel(20,i*16);assert.equal(moves,1,'A long inertial burst must not skip sections');
assert.equal(snap.wheel(-80,7500),-1,'Fresh deliberate reverse gesture works after settling');
assert.equal(snap.wheel(120,7520),0,'Positive control: repeated event is locked');
for(let i=-10;i<10;i++)for(let section=0;section<5;section++){const target=nearestChapter(i+.12,section);assert.ok(Number.isInteger(target));assert.equal(((target%5)+5)%5,section);}
let cases=0,maxRailError=0,legacyError=0;const manifest=JSON.parse(fs.readFileSync('public/models/v48/manifest.json'));
for(const [index,meta] of manifest.models.entries()){
 const bytes=fs.readFileSync('public'+meta.url),{scene,animations}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const group=new Group(),normal=new Group();group.add(normal);normal.add(scene);normal.scale.setScalar(4.2/meta.bounds.size[0]);
 const parts=createExplosion(scene,animations.find(c=>c.name===meta.motion.explodeClip),meta.motion.explodePeakTime);
 scene.updateMatrixWorld(true);const inverse=scene.matrixWorld.clone().invert();let highest=-Infinity,tipMesh,tipLocal;
 scene.traverse(mesh=>{if(!mesh.isMesh||!String(mesh.userData.materialRole||mesh.material.name||mesh.name).toLowerCase().includes('blade'))return;const a=mesh.geometry.getAttribute('position'),m=new Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);for(let n=0;n<a.count;n++){const local=new Vector3().fromBufferAttribute(a,n),p=local.clone().applyMatrix4(m);if(p.x>highest){highest=p.x;tipMesh=mesh;tipLocal=local;}}});
 assert.ok(tipMesh&&tipLocal);
 for(const amount of [0,.3,.82])for(let slot=0;slot<5;slot+=.5)for(const turn of [0,Math.PI/2,Math.PI,TAU]){
  const time=slot+turn,angle=orbitAngle(slot)-.28,target=railPoint(angle,3.7,-1.3,-1.5);
  sampleExplosion(parts,amount);animateBackdrop(parts,amount,time,index);
  group.position.set(0,0,0);group.quaternion.copy(presentation(.05,-.1,.97).multiply(turnPose(turn)));group.scale.setScalar(.7);group.updateMatrixWorld(true);
  legacyError=Math.max(legacyError,tipLocal.clone().applyMatrix4(tipMesh.matrixWorld).distanceTo(target));
  anchorTip(group,tipMesh,tipLocal,target,1);
  const tip=tipLocal.clone().applyMatrix4(tipMesh.matrixWorld),error=tip.distanceTo(target);maxRailError=Math.max(maxRailError,error);
  assert.ok(error<1e-10&&Math.abs(((tip.x+1.3)/3.7)**2+(tip.z/RAIL_DEPTH)**2-1)<1e-9);cases++;
 }
 sampleExplosion(parts,0);animateBackdrop(parts,0,44,index);assert.ok(parts.every(p=>p.node.position.equals(p.assembled)),'No scenic motion reaches the focused assembly');
}
assert.ok(legacyError>.01,'Control must detect an unanchored blade');
fs.writeFileSync('tools/assets/choreography-v49.json',JSON.stringify({cases,maxRailError,legacyError,holdSeconds:HERO_HOLD,turnRadians:turnTarget(HERO_HOLD),wheelGestureMoves:moves},null,2));
console.log('V49 choreography and navigation verified');
