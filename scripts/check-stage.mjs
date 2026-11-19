import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3,Group,Plane,Quaternion,AnimationMixer,LoopOnce,ExtrudeGeometry,Path,Shape,PerspectiveCamera} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {Carousel} from '../app/lib/carousel.ts';
import {animateBackdrop,assemblyWeight,HERO_PERIOD,HERO_HOLD} from '../app/lib/choreography.ts';
import {createExplosion,sampleExplosion,compactExplosion} from '../app/lib/explosion.ts';
import {setCutPlane,CUT_DIRECTIONS,sectionGeometry} from '../app/lib/cut-surface.ts';
import {SectionSnap,swipeDestination,nearestChapter} from '../app/lib/navigation.ts';
import {bindGestures} from '../app/lib/gestures.ts';
import {createLightStage} from '../app/lib/lighting.ts';
import {RAIL} from '../app/lib/choreography.ts';
import {slideTravel} from '../app/lib/framing.ts';
import {createState,mod,TILT_LIMIT} from '../app/lib/state.ts';

assert.equal(HERO_PERIOD,8);
for(const hz of [15,24,30,60,120,144]){
 const ring=new Carousel();
 for(let k=1;k<=10;k++){
  for(let i=0;i<HERO_PERIOD*hz;i++)ring.step(1/hz,true,false,false);
  assert.ok(Math.abs(ring.phase-k)<1e-7&&Math.abs(ring.velocity)<1e-7);
 }
}
let swipes=0;
for(const hz of [20,30,60,120,144])for(const time of [0,HERO_HOLD,6.55,6.91,7.14,7.55,8,15.13,23.8])for(const dir of [-1,1])for(const frames of [1,2,5,10,20,45])for(const travel of [.1,.3,.55,.92]){
 const ring=new Carousel();ring.step(time,true,false,false);
 const held=ring.phase,anchor=Math.round(held),dest=anchor+dir;
 for(let j=0;j<frames;j++)ring.dragTo(Math.min(anchor+.92,Math.max(anchor-.92,held+travel*dir*(j+1)/frames)),1/hz);
 const initial=[ring.phase,ring.velocity,ring.acceleration];
 ring.request(dest);
 assert.deepEqual([ring.phase,ring.velocity,ring.acceleration],initial);
 for(let j=0;j<hz*2;j++){
  ring.step(1/hz,true,true,false);
  const current=Math.round(ring.phase);
  assert.ok(current===anchor||current===dest,'A drag release crossed an extra model');
 }
 assert.equal(ring.phase,dest);assert.equal(ring.velocity,0);assert.equal(ring.acceleration,0);swipes++;
}
const snap=new SectionSnap();let moves=0;for(let i=0;i<360;i++)moves+=snap.wheel(20,i*16);
assert.equal(moves,1);assert.equal(snap.wheel(-70,7000),-1);
for(let i=-15;i<15;i++)for(let n=0;n<5;n++)assert.equal(mod(nearestChapter(i+.1,n)),n);
assert.equal(swipeDestination(9.1,-2400,320,-7),10);assert.equal(swipeDestination(9.1,2400,320,7),8);
assert.equal(assemblyWeight(0),1);assert.equal(assemblyWeight(1),0);

const stageLight=createLightStage();stageLight.group.updateMatrixWorld(true);
const stageMatrix=stageLight.group.matrixWorld.clone(),lamps=stageLight.group.children.filter(o=>o.isPointLight);
assert.ok(lamps.length>=4&&lamps.every(l=>l.intensity>0&&l.decay===2));assert.ok(!stageLight.group.children.some(o=>o.isSpotLight));
assert.ok(lamps.every(l=>Math.abs(Math.hypot(l.position.x,l.position.z)-RAIL.radius)<1e-7));
for(let i=0;i<5;i++){stageLight.update(i,1);stageLight.group.updateMatrixWorld(true);assert.ok(stageMatrix.equals(stageLight.group.matrixWorld));}
stageLight.dispose();

class TestCanvas extends EventTarget{
 clientWidth=390;clientHeight=844;captures=new Set();
 setPointerCapture(id){this.captures.add(id);}hasPointerCapture(id){return this.captures.has(id);}releasePointerCapture(id){this.captures.delete(id);}
 send(type,id,x,y,ms){const e=new Event(type);Object.defineProperties(e,Object.fromEntries(Object.entries({pointerId:id,clientX:x,clientY:y,button:0,timeStamp:ms,pointerType:'touch'}).map(([key,value])=>[key,{value}])));this.dispatchEvent(e);}
}
globalThis.window=new EventTarget();
const canvas=new TestCanvas(),s=createState();s.ready=[0,1,2,3,4];s.orbit=12;
let hit=false,focusCount=0;const chapters=[];
const unbind=bindGestures(canvas,s,{hitsProduct:()=>hit,focus:()=>focusCount++,chapter:n=>{s.target=n;chapters.push(n);},renderUI(){}});
for(const onModel of [false,true]){
 hit=onModel;s.progress=s.target=1;
 canvas.send('pointerdown',1,350,270,0);canvas.send('pointermove',1,15,276,30);canvas.send('pointerup',1,1,278,40);
 assert.ok(Math.abs(s.yaw)>2);assert.equal(s.orbit,12);assert.equal(s.knifeRequest,null);assert.equal(s.target,1);
 canvas.send('pointerdown',1,20,600,100);canvas.send('pointermove',1,24,420,140);assert.ok(s.target>1);canvas.send('pointerup',1,24,320,180);assert.equal(chapters.at(-1),2);
 s.progress=2;canvas.send('pointerdown',1,15,200,200);canvas.send('pointermove',1,11,410,230);canvas.send('pointerup',1,8,510,245);assert.equal(chapters.at(-1),1);
 canvas.send('pointerdown',1,15,210,250);canvas.send('pointermove',1,18,295,275);canvas.send('pointercancel',1,18,295,290);assert.equal(s.target,1);
}
s.progress=s.target=0;hit=true;
canvas.send('pointerdown',1,190,400,300);canvas.send('pointermove',1,300,402,320);canvas.send('pointermove',1,380,750,335);canvas.send('pointerup',1,385,760,350);
assert.equal(s.pitch,TILT_LIMIT);assert.equal(s.target,0);
canvas.send('pointerdown',1,190,400,400);canvas.send('pointerup',1,190,400,425);assert.equal(chapters.at(-1),1);
s.progress=s.target=4;
canvas.send('pointerdown',1,170,400,500);canvas.send('pointerdown',2,220,405,525);
canvas.send('pointermove',2,270,440,555);canvas.send('pointerup',2,270,440,580);canvas.send('pointerup',1,170,400,590);
assert.equal(focusCount,1);assert.equal(s.zoom,1);
canvas.send('pointerdown',1,180,400,700);canvas.send('pointerup',1,180,400,725);
canvas.send('pointerdown',1,181,401,820);canvas.send('pointerup',1,181,401,840);assert.equal(focusCount,2);unbind();

// A ring-shaped solid must expose its metal and keep its central hole empty.
const outline=new Shape();outline.moveTo(-2,-2);outline.lineTo(2,-2);outline.lineTo(2,2);outline.lineTo(-2,2);outline.closePath();
const hole=new Path();hole.moveTo(-1,-1);hole.lineTo(-1,1);hole.lineTo(1,1);hole.lineTo(1,-1);hole.closePath();outline.holes.push(hole);
const ring=new ExtrudeGeometry(outline,{depth:2,bevelEnabled:false});
const section=sectionGeometry(ring,new Plane(new Vector3(0,0,1),-1));
let area=0;for(let i=0;i<section.faces.length;i+=9){
 const a=new Vector3().fromArray(section.faces,i),b=new Vector3().fromArray(section.faces,i+3),c=new Vector3().fromArray(section.faces,i+6);
 area+=b.sub(a).cross(c.sub(a)).length()/2;assert.equal(a.z,1);
}
assert.ok(Math.abs(area-12)<1e-6);assert.ok(section.lines.length>0);
assert.deepEqual(sectionGeometry(ring,new Plane(new Vector3(0,0,1),-3)),{lines:[],faces:[]});

const manifest=JSON.parse(readFileSync('public/models/v48/manifest.json'));
for(const meta of manifest.models){
 const bytes=readFileSync('public'+meta.url);
 const {scene,animations}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const group=new Group();group.add(scene);group.scale.setScalar(4.2/meta.bounds.size[0]);group.updateMatrixWorld(true);
 const parts=createExplosion(scene,animations.find(c=>c.name===meta.motion.explodeClip),meta.motion.explodePeakTime);
 const amount=compactExplosion(parts,4.2);assert.ok(amount>0&&amount<=.54);
 sampleExplosion(parts,amount);
 for(const part of parts){
  const travel=part.node.position.clone().sub(part.assembled).multiply(part.node.parent.getWorldScale(new Vector3())).length();
  assert.ok(travel<=4.2*.16+1e-7);
 }
 sampleExplosion(parts,0);animateBackdrop(parts,0,40,2);assert.ok(parts.every(p=>p.node.position.equals(p.assembled)));
 const meshes=[];scene.traverse(o=>{if(o.isMesh)meshes.push(o);});group.updateMatrixWorld(true);
 const handle=meshes.find(o=>String(o.userData.materialRole||o.material.name).toLowerCase().includes('handle'));
 assert.ok(handle);const home=handle.matrixWorld.clone(),mixer=new AnimationMixer(scene);
 const action=mixer.clipAction(animations.find(c=>c.name===meta.motion.openCloseClip));
 action.setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;
 for(const value of [.12,.5,1,.33,0]){
  action.time=meta.motion.closedTime*value;mixer.update(0);sampleExplosion(parts,0);group.updateMatrixWorld(true);
  assert.ok(home.elements.every((n,i)=>Math.abs(n-handle.matrixWorld.elements[i])<1e-7),meta.id+' handle pivot moved');
 }
 for(const aspect of [.46,1.78,2.54]){
  const camera=new PerspectiveCamera(34,aspect,.05,80);camera.position.z=9.5;camera.updateMatrixWorld();
  for(const direction of [-1,1]){
   const travel=slideTravel(camera,meshes,direction);
   for(const mesh of meshes){
    const box=mesh.geometry.boundingBox;
    for(let i=0;i<8;i++){
     const p=new Vector3(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z).applyMatrix4(mesh.matrixWorld);
     p.x+=direction*travel;p.project(camera);assert.ok(direction*p.x>1.001);
    }
   }
  }
 }
 for(const axis of [0,1,2]){
  const direction=CUT_DIRECTIONS[axis];assert.equal(direction.getComponent(axis),axis===2?1:-1);
  const plane=new Plane(),a=new Plane(),b=new Plane(),q=new Quaternion();
  setCutPlane(a,axis,0,q,meshes);setCutPlane(b,axis,1,q,meshes);setCutPlane(plane,axis,.5,q,meshes);
  assert.ok(a.constant>plane.constant&&plane.constant>b.constant);
  assert.ok(Math.abs(plane.constant-(a.constant+b.constant)/2)<1e-8);
 }
}
console.log('PASS — 8-second cycles at six frame rates, '+swipes+' one-item releases, axis-locked gestures, actual section holes, anchored handles and offscreen travel for five models');
