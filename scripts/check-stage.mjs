import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3,Group,Plane,Quaternion,AnimationMixer,LoopOnce,ExtrudeGeometry,Path,Shape} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {Carousel} from '../app/lib/carousel.ts';
import {openBladeTip,railPoint,slotOffset,stationWeight,HERO_PERIOD,HERO_HOLD,RAIL} from '../app/lib/choreography.ts';
import {createExplosion,sampleExplosion,compactExplosion} from '../app/lib/explosion.ts';
import {setCutPlane,CUT_DIRECTIONS,sectionGeometry} from '../app/lib/cut-surface.ts';
import {nearestChapter} from '../app/lib/navigation.ts';
import {bindGestures,ZOOM_LIMITS} from '../app/lib/gestures.ts';
import {inspectionParts,partCenter} from '../app/lib/inspection.ts';
import {createLightStage,STAGE_COLORS} from '../app/lib/lighting.ts';
import {createState,hasManualRotation,mod} from '../app/lib/state.ts';

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
const reversing=new Carousel();reversing.request(1);reversing.step(1.3,false,false,false);
reversing.request(0);reversing.step(.55,false,false,false);reversing.request(1);
for(let f=0;f<180;f++){
 reversing.step(1/120,false,false,false);
 assert.ok(Math.abs(reversing.velocity)<3,'Reversing at mid-arc must leave enough time to brake');
}
assert.equal(reversing.phase,1);
for(let i=-15;i<15;i++)for(let n=0;n<5;n++)assert.equal(mod(nearestChapter(i+.1,n)),n);
// Sampling either side of the selection boundary and the catalogue wrap
// must give neighbouring positions for every carrier, in both directions.
for(const direction of [-1,1])for(const boundary of [.5,2.5,4.5,5,5.5])for(let i=0;i<5;i++){
 const at=t=>railPoint(slotOffset(i,t),1.2,2.3,-1.7);
 const left=at(boundary-direction*.00001),on=at(boundary),right=at(boundary+direction*.00001);
 assert.ok(left.distanceTo(right)<.001);
 assert.ok(on.clone().sub(left).sub(right.clone().sub(on)).length()<1e-7);
 assert.ok(at(boundary+5).distanceTo(on)<1e-10);
}
assert.equal(stationWeight(0),1);assert.equal(stationWeight(1.3),0);
assert.ok(stationWeight(.49)>.5&&stationWeight(.51)>.5);

const stageLight=createLightStage();stageLight.update(0,1);stageLight.group.updateMatrixWorld(true);
const exterior=stageLight.group.getObjectByName('Stage exterior'),interior=stageLight.group.getObjectByName('Stage interior'),rail=stageLight.group.getObjectByName('Recessed light');
assert.ok(exterior.geometry.parameters.outerRadius>100&&exterior.position.y===interior.position.y);
assert.ok(rail.position.y<interior.position.y&&rail.geometry.parameters.outerRadius<exterior.geometry.parameters.innerRadius);
assert.ok(rail.geometry.parameters.innerRadius>interior.geometry.parameters.radius);
const stageMatrix=stageLight.group.matrixWorld.clone(),lamps=stageLight.group.children.filter(o=>o.isPointLight);
assert.ok(lamps.length>=4&&lamps.every(l=>l.intensity>0&&l.decay===2));const spot=stageLight.rig.children.find(o=>o.isSpotLight);
assert.ok(spot&&spot.penumbra>0&&spot.position.y>spot.target.position.y&&spot.decay===2);
assert.equal(new Set(Object.values(STAGE_COLORS)).size,5);
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
// Up, down, sideways and diagonal movements may rotate on any chapter, without switching chapters.

for(const chapter of [0,1,2,3,4])for(const onModel of [true,false])for(const [dx,dy] of [[0,310],[0,-310],[290,0],[155,-205]]){
 hit=onModel;s.progress=s.target=chapter;s.rotation.identity();
 canvas.send('pointerdown',1,170,400,10);canvas.send('pointermove',1,170+dx,400+dy,90);
 assert.equal(s.target,chapter);assert.ok(s.rotation.angleTo(new Quaternion())>1);
 canvas.send('pointerup',1,170+dx,400+dy,115);
 assert.equal(s.target,chapter);assert.equal(s.knifeRequest,null);assert.equal(s.orbit,12);assert.equal(s.interacting,false);

}
assert.deepEqual(chapters,[]);
hit=true;s.progress=s.target=0;s.rotation.identity();
canvas.send('pointerdown',1,180,430,200);canvas.send('pointerup',1,180,125,220);
assert.equal(chapters.length,0);assert.ok(hasManualRotation(s),'A release may contain the only non-zero drag delta');
canvas.send('pointerdown',1,180,430,300);canvas.send('pointercancel',1,180,430,320);
assert.equal(chapters.length,0);assert.equal(canvas.captures.size,0);
canvas.send('pointerdown',1,180,430,400);canvas.send('pointerup',1,182,428,420);assert.deepEqual(chapters,[1]);

s.progress=s.target=4;
canvas.send('pointerdown',1,170,400,500);canvas.send('pointerdown',2,220,405,525);
canvas.send('pointermove',2,270,440,555);canvas.send('pointerup',2,270,440,580);canvas.send('pointerup',1,170,400,590);
assert.equal(focusCount,0,'Moving two fingers cannot cause a surprise refocus');
s.rotation.identity();
const halfTurn=canvas.clientWidth*.86;
canvas.send('pointerdown',1,150,75,591);
canvas.send('pointermove',1,150,75+halfTurn,594);
assert.ok(new Vector3(0,1,0).applyQuaternion(s.rotation).y<-.99999,'The top can rotate past the pole');
canvas.send('pointerup',1,150,75+2*halfTurn,598);
assert.ok(!hasManualRotation(s),'A full vertical revolution returns to the starting pose');
assert.equal(s.target,4);
canvas.send('pointerdown',1,170,400,600);canvas.send('pointerdown',2,220,405,605);
canvas.send('pointerup',2,220,405,625);canvas.send('pointerup',1,170,400,640);assert.equal(focusCount,1);
canvas.send('pointerdown',1,180,400,700);canvas.send('pointerup',1,180,400,725);
canvas.send('pointerdown',1,181,401,820);canvas.send('pointerup',1,181,401,840);assert.equal(focusCount,2);
s.rotation.identity();
for(const ctrlKey of [true,false]){
 s.zoom=1;
 const e=new Event('wheel',{cancelable:true});Object.assign(e,{deltaX:0,deltaY:-350,deltaMode:0,ctrlKey,metaKey:false});
 canvas.dispatchEvent(e);assert.equal(e.defaultPrevented,true);assert.ok(s.zoom>1&&s.zoom<=ZOOM_LIMITS.max);
 assert.equal(hasManualRotation(s),false);assert.equal(s.target,4);
}
s.zoom=1;
canvas.send('pointerdown',1,100,300,850);canvas.send('pointerdown',2,200,300,851);
canvas.send('pointermove',2,250,300,856);assert.equal(s.zoom,1.5);
canvas.send('pointermove',2,175,300,859);assert.equal(s.zoom,.75);
canvas.send('pointermove',2,110,300,861);assert.equal(s.zoom,ZOOM_LIMITS.min);
canvas.send('pointermove',2,700,300,863);assert.equal(s.zoom,ZOOM_LIMITS.max);
canvas.send('pointerup',2,700,300,867);canvas.send('pointerup',1,100,300,870);
assert.equal(hasManualRotation(s),false);assert.equal(focusCount,2);
canvas.send('pointerdown',1,170,400,900);window.dispatchEvent(new Event('blur'));
assert.equal(canvas.captures.size,0);assert.equal(s.interacting,false);unbind();

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
 sampleExplosion(parts,0);assert.ok(parts.every(p=>p.node.position.equals(p.assembled)));
 const meshes=[];scene.traverse(o=>{if(o.isMesh)meshes.push(o);});group.updateMatrixWorld(true);
 const details=inspectionParts(scene,meshes,meta.focusPoints.handle[2]);
 for(const part of Object.values(details)){
  assert.ok(part.span>0&&part.span<meta.bounds.size[0]);assert.ok(partCenter(scene,part).toArray().every(Number.isFinite));
 }
 assert.ok(details.screw.mesh.name.includes('screw'));
 assert.ok(details.clip.mesh.name.includes(meta.id==='EDGE'?'tail_loop':'clip'));
 const handle=meshes.find(o=>String(o.userData.materialRole||o.material.name).toLowerCase().includes('handle'));
 assert.ok(handle);const home=handle.matrixWorld.clone(),mixer=new AnimationMixer(scene);
 const action=mixer.clipAction(animations.find(c=>c.name===meta.motion.openCloseClip));
 action.setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;
 for(const value of [.12,.5,1,.33,0]){
  action.time=meta.motion.closedTime*value;mixer.update(0);sampleExplosion(parts,0);group.updateMatrixWorld(true);
  assert.ok(home.elements.every((n,i)=>Math.abs(n-handle.matrixWorld.elements[i])<1e-7),meta.id+' handle pivot moved');
 }
 for(const mesh of meshes)mesh.userData.surface=String(mesh.userData.materialRole||mesh.material.name).toLowerCase().includes('blade')?'blade':'other';
 const tip=openBladeTip(scene,meshes);
 assert.ok(Math.abs(tip.x-meta.roleBounds.blade.max[0])<.00002,meta.id+' track contact is an actual open blade vertex');
 for(const axis of [0,1,2]){
  const direction=CUT_DIRECTIONS[axis];assert.equal(direction.getComponent(axis),axis===2?1:-1);
  const plane=new Plane(),a=new Plane(),b=new Plane(),q=new Quaternion();
  setCutPlane(a,axis,0,q,meshes);setCutPlane(b,axis,1,q,meshes);setCutPlane(plane,axis,.5,q,meshes);
  assert.ok(a.constant>plane.constant&&plane.constant>b.constant);
  assert.ok(Math.abs(plane.constant-(a.constant+b.constant)/2)<1e-8);
 }
}
console.log('PASS — 8-second cycles at six frame rates, '+swipes+' one-item releases, independent two-axis orbit, bounded pinch and wheel zoom, actual section holes, anchored handles, continuous carriers and five measured blade contacts');
