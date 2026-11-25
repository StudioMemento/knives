import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createExplosion,sampleExplosion} from '../app/lib/explosion.ts';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AnimationMixer,LoopOnce,Vector2,Vector3,Quaternion,Euler,Group,PerspectiveCamera} from 'three';
import {stageFrame,chapterFrame,productArea} from '../app/lib/presentation.ts';
import {compactExplosion} from '../app/lib/explosion.ts';
import {fitBoundsScale} from '../app/lib/framing.ts';
import {alignStageCamera,centerLens,focusLens} from '../app/lib/optics.ts';
import {createSilhouetteMeter} from '../app/lib/optical-center.ts';
const metas=JSON.parse(fs.readFileSync('public/models/v71/manifest.json')).models;
const canonical=new Quaternion(0,1,0,0),point=new Vector3();
const rotation=(x,y,z)=>new Quaternion().setFromEuler(new Euler(x,y,z));
const report=[];
for(const [width,height] of [[320,568],[390,844],[768,1024],[1440,900],[2048,774],[3440,1440],[3840,1080]]){
 const [left,top,right,bottom]=productArea(width/height);
 assert.ok(Math.abs(left+right-1)<1e-12&&Math.abs(top+bottom-1)<1e-12);
 assert.ok((right-left)*width<=height*1.181);
}
for(const meta of metas){
 const bytes=fs.readFileSync(`public${meta.url}`);
 const {scene,animations}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const group=new Group(),normalization=new Group(),content=new Group();group.add(normalization);normalization.add(content);content.add(scene);
 normalization.scale.setScalar(4.2/meta.bounds.size[0]);content.position.set(...meta.focusPoints.assembled).negate();
 const mixer=new AnimationMixer(scene),open=mixer.clipAction(animations.find(c=>c.name===meta.motion.openCloseClip)),parts=createExplosion(scene,animations.find(c=>c.name===meta.motion.explodeClip),meta.motion.explodePeakTime);
 for(const action of [open]){action.setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;action.setEffectiveWeight(1);}
 group.updateMatrixWorld(true);const compact=compactExplosion(parts,4.2);
 const meshes=[];scene.traverse(mesh=>{if(mesh.isMesh){
  mesh.geometry.computeBoundingBox();mesh.userData.surface=mesh.material.name.split('__').at(-1).toLowerCase();meshes.push(mesh);
 }});
 const measure=createSilhouetteMeter(meta.id,meshes),center=new Vector2();
 for(const [w,h] of [[390,844],[768,1024],[1440,900],[3440,1440]]){
  const base=new PerspectiveCamera(34,w/h,.05,80);base.position.z=9.5;
  alignStageCamera(base,w,h,.64);
  const lens=base.clone(),floorProjection=base.projectionMatrix.clone();
  for(const [closed,exploded,zoom] of [[0,0,1],[1,0,1],[0,1,.8],[.45,.65,2.8]]){
   open.time=closed*meta.motion.closedTime;mixer.update(0);sampleExplosion(parts,exploded*compact);
   group.position.set(.9,-.35,0);group.quaternion.copy(rotation(.18,-.21,.56));group.updateMatrixWorld(true);
   for(const subject of ['product','blade','handle']){
    focusLens(lens,base,group.position,zoom);measure(lens,subject,center);
    assert.ok(center.length()>.01,`${meta.id} ${subject} has a measurable offset`);
    centerLens(lens,center);measure(lens,subject,center);
    assert.ok(center.length()<1e-7,`${meta.id} ${subject} drifts from the viewport center`);
    assert.ok(base.projectionMatrix.equals(floorProjection),'Centering a product must keep the ring in place');
   }
  }
 }
 let scenarios=0,vertices=0,maxOverflow=0;
 for(const [width,height] of [[2752,1008],[1363,936],[390,844]]){
  const mobile=width<700,camera=new PerspectiveCamera(34,width/height,.05,80);camera.position.set(0,0,9.5);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const viewWidth=2*Math.tan(34*Math.PI/360)*9.5*width/height;
  const rect=[.05,.075,.95,.925];
  const viewHeight=viewWidth*height/width;
  const shot=chapterFrame(4,meta,stageFrame(meta,viewWidth,viewHeight,mobile),viewWidth,viewHeight,mobile);group.position.copy(shot.position);
  for(const fold of [0,.5,1])for(const amount of [0,.5,1])for(const [vp,vy] of [[0,0],[Math.PI/2,0],[0,Math.PI/2],[-.33,.56]])for(const pitch of [-1.05,0,1.05])for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
   open.time=fold*meta.motion.closedTime;mixer.update(0);sampleExplosion(parts,amount*compact);
   group.quaternion.copy(canonical).multiply(rotation(vp+pitch,vy+yaw,0));
   group.scale.setScalar(shot.scale);group.updateMatrixWorld(true);
   const cap=fitBoundsScale(camera,group,meshes,rect);group.scale.multiplyScalar(cap);group.updateMatrixWorld(true);
   for(const mesh of meshes){const box=mesh.geometry.boundingBox;for(let k=0;k<8;k++){
    point.set(k&1?box.max.x:box.min.x,k&2?box.max.y:box.min.y,k&4?box.max.z:box.min.z).applyMatrix4(mesh.matrixWorld).project(camera);
    const x=(point.x+1)/2,y=(1-point.y)/2;maxOverflow=Math.max(maxOverflow,rect[0]-x,x-rect[2],rect[1]-y,y-rect[3]);vertices++;
   }}
   scenarios++;
  }
 }
 assert.ok(maxOverflow<1e-9,`${meta.id}: model exceeds its product area`);
 report.push({model:meta.id,scenarios,projectedBoundsCorners:vertices,maxOverflow});
 console.log(`PASS — ${meta.id}: ${scenarios} animated framing cases across ultrawide, desktop and mobile`);
 mixer.stopAllAction();mixer.uncacheRoot(scene);
}
assert.equal(report.length,5);
