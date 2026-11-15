import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Quaternion,Vector3,PerspectiveCamera} from 'three';
import {chapterFrame,livingPose,DISPLAY} from '../app/lib/presentation.ts';
const metas=JSON.parse(fs.readFileSync('public/models/v48/manifest.json')).models;
const hero={position:new Vector3(),rotation:new Quaternion(),scale:1,focus:new Vector3(),closed:0};
const report=[];
for(const meta of metas)for(const [w,h] of [[1363,936],[2752,1064],[390,844]]){
 const mobile=w<700,vh=2*Math.tan(34*Math.PI/360)*9.5,vw=vh*w/h,camera=new PerspectiveCamera(34,w/h,.05,80);camera.position.set(0,0,9.5);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const [blade,handle,metal,inspect]=[1,2,3,4].map(i=>chapterFrame(i,meta,hero,vw,vh,mobile));
 function rect(bounds,pose){
  const coords=[];
  for(let k=0;k<8;k++){
   const p=new Vector3(k&1?bounds.max[0]:bounds.min[0],k&2?bounds.max[1]:bounds.min[1],k&4?bounds.max[2]:bounds.min[2]);
   p.sub(pose.focus).multiplyScalar(DISPLAY/meta.bounds.size[0]*pose.scale).applyQuaternion(pose.rotation).add(pose.position).project(camera);coords.push([(p.x+1)/2,(1-p.y)/2]);
  }
  return [Math.min(...coords.map(p=>p[0])),Math.min(...coords.map(p=>p[1])),Math.max(...coords.map(p=>p[0])),Math.max(...coords.map(p=>p[1]))];
 }
 const full=rect(meta.bounds,blade),bladeBox=rect(meta.roleBounds.blade,blade),handleInBlade=rect(meta.roleBounds.handle,blade),handleBox=rect(meta.roleBounds.handle,handle);
 assert.ok(full[0]>.015&&full[2]<.99&&full[1]>.065&&full[3]<(mobile?.52:.94),`full open knife clipped ${meta.id} ${w}: ${full}`);
 if(!mobile){assert.ok(handleInBlade[2]>.70&&(handleInBlade[0]+handleInBlade[2])/2>.56,`handle must continue into right diagonal blur ${meta.id}: ${handleInBlade}`);assert.ok(bladeBox[0]<.3,'blade stays in clear left area');}
 assert.ok(handleBox[0]>.015&&handleBox[2]<(mobile?.99:.72)&&handleBox[1]>.065&&handleBox[3]<(mobile?.54:.94),`handle closeup ${meta.id} ${w}: ${handleBox}`);
 const face=new Vector3(0,0,-1).applyQuaternion(handle.rotation);
 assert.ok(Math.abs(face.x)>.48&&face.z>.5,'Handle must reveal a substantial three-quarter attitude');
 assert.ok(handle.rotation.angleTo(metal.rotation)>1,'Metals must introduce a distinct pose');
 assert.equal(handle.closed,1);assert.equal(metal.closed,1);assert.equal(blade.closed,0);
 assert.ok(metal.focus.distanceTo(new Vector3(...meta.focusPoints.metals))<1e-8);
 assert.ok(metal.position.z>handle.position.z,'Hardware closeup advances into the scene');
 const metalSize=rect(meta.roleBounds.metals,metal),handleMetals=rect(meta.roleBounds.metals,handle);
 assert.ok(metalSize[2]-metalSize[0]>(handleMetals[2]-handleMetals[0])*1.08,'Hardware must be larger than in Handle');
 const direction=new Vector3(1,0,0).applyQuaternion(inspect.rotation);assert.ok(direction.x<-.999&&Math.abs(direction.y)<1e-8);
 assert.equal(chapterFrame(0,meta,hero,vw,vh,mobile),hero);assert.equal(chapterFrame(5,meta,hero,vw,vh,mobile),hero);
 report.push({model:meta.id,viewport:[w,h],full,bladeBox,handleInBlade,handleBox,handleToMetalAngle:handle.rotation.angleTo(metal.rotation)});
}
const reduced=livingPose(4,1,1,true);assert.equal(reduced.rotation.angleTo(new Quaternion()),0);assert.equal(reduced.offset.length(),0);
fs.writeFileSync('tools/assets/concept-v49.json',JSON.stringify({cases:report.length,report},null,2));
console.log('V49 framing checks passed');
