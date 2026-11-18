import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3,Group,Plane,Quaternion} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {Carousel} from '../app/lib/carousel.ts';
import {animateBackdrop,assemblyWeight,HERO_PERIOD,HERO_HOLD} from '../app/lib/choreography.ts';
import {createExplosion,sampleExplosion,compactExplosion} from '../app/lib/explosion.ts';
import {setCutPlane,CUT_DIRECTIONS} from '../app/lib/cut-surface.ts';
import {SectionSnap,swipeDestination,nearestChapter} from '../app/lib/navigation.ts';
import {bindGestures} from '../app/lib/gestures.ts';
import {createState,mod} from '../app/lib/state.ts';

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

class TestCanvas extends EventTarget{
 clientWidth=390;clientHeight=844;captures=new Set();
 setPointerCapture(id){this.captures.add(id);}hasPointerCapture(id){return this.captures.has(id);}releasePointerCapture(id){this.captures.delete(id);}
 send(type,id,x,y,ms){const e=new Event(type);Object.defineProperties(e,Object.fromEntries(Object.entries({pointerId:id,clientX:x,clientY:y,button:0,timeStamp:ms,pointerType:'touch'}).map(([key,value])=>[key,{value}])));this.dispatchEvent(e);}
}
globalThis.window=new EventTarget();
const canvas=new TestCanvas(),s=createState();s.ready=[0,1,2,3,4];s.orbit=12;
let hit=false,focusCount=0;const chapters=[],slots=[];
const unbind=bindGestures(canvas,s,{hitsProduct:()=>hit,focus:()=>focusCount++,chapter:n=>{s.target=n;chapters.push(n);},select:n=>slots.push(n),renderUI(){}});
canvas.send('pointerdown',1,350,270,0);canvas.send('pointermove',1,15,270,30);canvas.send('pointerup',1,1,270,40);
assert.deepEqual(slots,[13]);assert.equal(s.dragging,false);
canvas.send('pointerdown',1,20,200,100);canvas.send('pointermove',1,24,350,140);assert.ok(s.target>0);canvas.send('pointerup',1,24,660,180);assert.deepEqual(chapters,[1]);
s.progress=s.target=1;canvas.send('pointerdown',1,15,600,200);canvas.send('pointermove',1,11,310,230);canvas.send('pointerup',1,8,110,245);assert.deepEqual(chapters,[1,0]);
hit=true;s.progress=s.target=0;
canvas.send('pointerdown',1,190,400,300);canvas.send('pointermove',1,380,710,335);canvas.send('pointerup',1,385,730,350);assert.ok(s.yaw<=.56&&s.pitch<=.34);assert.equal(chapters.length,2);
canvas.send('pointerdown',1,190,400,400);canvas.send('pointerup',1,190,400,425);assert.equal(chapters.at(-1),1);
s.progress=s.target=4;
canvas.send('pointerdown',1,170,400,500);canvas.send('pointerdown',2,220,405,525);
canvas.send('pointermove',2,270,440,555);canvas.send('pointerup',2,270,440,580);canvas.send('pointerup',1,170,400,590);
assert.equal(focusCount,1);assert.equal(s.zoom,1);assert.equal(slots.length,1);assert.equal(chapters.length,3);
canvas.send('pointerdown',1,180,400,700);canvas.send('pointerup',1,180,400,725);
canvas.send('pointerdown',1,181,401,820);canvas.send('pointerup',1,181,401,840);assert.equal(focusCount,2);unbind();

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
 for(const axis of [0,1,2]){
  const direction=CUT_DIRECTIONS[axis];assert.equal(direction.getComponent(axis),axis===2?1:-1);
  const plane=new Plane(),a=new Plane(),b=new Plane(),q=new Quaternion();
  setCutPlane(a,axis,0,q,meshes);setCutPlane(b,axis,1,q,meshes);setCutPlane(plane,axis,.5,q,meshes);
  assert.ok(a.constant>plane.constant&&plane.constant>b.constant);
  assert.ok(Math.abs(plane.constant-(a.constant+b.constant)/2)<1e-8);
 }
}
console.log('PASS — 8-second cycles at six frame rates, '+swipes+' one-item releases, touch ownership, XYZ directions and compact motion for five models');
