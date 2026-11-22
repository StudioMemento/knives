import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createExplosion,sampleExplosion} from '../app/lib/explosion.ts';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AnimationMixer,LoopOnce,Vector3,Quaternion,Euler,Group,PerspectiveCamera} from 'three';
import {stageFrame,chapterFrame,clearProductArea,productArea} from '../app/lib/presentation.ts';
import {compactExplosion} from '../app/lib/explosion.ts';
import {fitBoundsScale} from '../app/lib/framing.ts';
const metas=JSON.parse(fs.readFileSync(fs.existsSync('public/models/v48/manifest.json')?'public/models/v48/manifest.json':'public/models/v46/manifest.json')).models;
const canonical=new Quaternion(0,1,0,0),point=new Vector3();
const rotation=(x,y,z)=>new Quaternion().setFromEuler(new Euler(x,y,z));
const report=[];
// The list, the right-aligned amount and the model must each have clear space.
for(const [width,height,listRight,listBottom,priceLeft,priceBottom,ring] of [
 [390,844,225,351,235,146,570],[1440,900,462,438,869,318,608],
 [2048,774,553,384,1354,325,522],[844,390,472,178,575,124,248],
]){
 const gap=Math.min(24,Math.max(8,width*.012)),base=productArea(height>width,ring/height);
 const left=(listRight+gap)/width,below=(listBottom+gap)/height;
 const right=(priceLeft-gap)/width,under=(priceBottom+gap)/height;
 const [x,y,x2,y2]=clearProductArea(base,left,below,right,under);
 assert.ok(x>=left||y>=below);assert.ok(x2<=right||y>=under);
 assert.ok(x>=base[0]&&y>=base[1]&&x2<=base[2]&&y2<=base[3]&&x2>x&&y2>y);
}
for(const meta of metas){
 const bytes=fs.readFileSync(`public${meta.url}`);
 const {scene,animations}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const group=new Group(),normalization=new Group(),content=new Group();group.add(normalization);normalization.add(content);content.add(scene);
 normalization.scale.setScalar(4.2/meta.bounds.size[0]);content.position.set(...meta.focusPoints.assembled).negate();
 const mixer=new AnimationMixer(scene),open=mixer.clipAction(animations.find(c=>c.name===meta.motion.openCloseClip)),parts=createExplosion(scene,animations.find(c=>c.name===meta.motion.explodeClip),meta.motion.explodePeakTime);
 for(const action of [open]){action.setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;action.setEffectiveWeight(1);}
 group.updateMatrixWorld(true);const compact=compactExplosion(parts,4.2);
 const meshes=[];scene.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.computeBoundingBox();meshes.push(mesh);}});
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
