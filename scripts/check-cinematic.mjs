import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Vector3,PerspectiveCamera,Euler} from 'three';
import {chapterFrame,stageFrame,livingPose,DISPLAY} from '../app/lib/presentation.ts';

const metas=JSON.parse(fs.readFileSync('public/models/v48/manifest.json')).models;
const sizes=[[320,568],[390,844],[430,932],[768,1024],[844,390],[1366,768],[1440,900],[2560,1080],[3440,1440]];
let count=0;
for(const meta of metas)for(const [width,height] of sizes){
 const portrait=height>width,vh=2*Math.tan(34*Math.PI/360)*9.5,vw=vh*width/height;
 const camera=new PerspectiveCamera(34,width/height,.05,80);camera.position.z=9.5;camera.updateMatrixWorld();
 const hero=stageFrame(meta,vw,vh,portrait);
 const shots=[0,1,2,3,4].map(i=>chapterFrame(i,meta,hero,vw,vh,portrait));
 function box(bounds,shot){
  const x=[],y=[];
  for(let k=0;k<8;k++){
   const p=new Vector3(k&1?bounds.max[0]:bounds.min[0],k&2?bounds.max[1]:bounds.min[1],k&4?bounds.max[2]:bounds.min[2]);
   p.sub(shot.focus).multiplyScalar(shot.scale*DISPLAY/meta.bounds.size[0]).applyQuaternion(shot.rotation).add(shot.position).project(camera);
   x.push((1+p.x)/2);y.push((1-p.y)/2);
  }
  return [Math.min(...x),Math.min(...y),Math.max(...x),Math.max(...y)];
 }
 for(const shot of shots){assert.equal(shot.position.length(),0,'All shot pivots share the viewport center');count++;}
 const [stage,blade,handle,details,inspect]=shots;
 const stageBox=box(meta.bounds,stage),bladeBox=box(meta.roleBounds.blade,blade),handleBox=box(meta.roleBounds.handle,handle);
 for(const bounds of [stageBox,handleBox])assert.ok(bounds[0]>.005&&bounds[1]>.02&&bounds[2]<.995&&bounds[3]<.965,meta.id+' whole item '+width+' '+bounds);
 assert.ok(Math.abs((bladeBox[0]+bladeBox[2])/2-.5)<.09&&Math.abs((bladeBox[1]+bladeBox[3])/2-.5)<.10,'Centered blade macro');
 assert.ok(blade.scale>stage.scale*1.40,'Blade gets its own close-up');
 assert.ok(handle.scale>stage.scale*1.24,'Folded handle is magnified');
 const spine=new Vector3(0,1,0).applyQuaternion(details.rotation);
 assert.ok(spine.z>.83&&details.focus.y>handle.focus.y,'Details looks onto the upper profile');
 const tip=new Vector3(1,0,0).applyQuaternion(stage.rotation);
 assert.ok(tip.x<-.4&&tip.y<-.4,'Stage points from the lower left to the upper right');
 assert.equal(handle.closed,1);assert.equal(details.closed,1);assert.equal(blade.closed,0);
 assert.equal(chapterFrame(5,meta,hero,vw,vh,portrait),hero);
 assert.ok(new Vector3(1,0,0).applyQuaternion(inspect.rotation).x<-.99);
}
for(let time=0;time<120;time+=.11){
 const e=new Euler().setFromQuaternion(livingPose(time,1,-1,false).rotation);
 for(const angle of [e.x,e.y,e.z])assert.ok(Math.abs(angle)<=5*Math.PI/180+1e-8);
}
assert.equal(livingPose(4,1,1,true).rotation.w,1);
console.log('PASS — '+count+' centered shots, blade macro, folded handle, top profile and bounded idle');
