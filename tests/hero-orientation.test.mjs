import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const compile=name=>ts.transpileModule(readFileSync(new URL(`../app/${name}.ts`,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const asURL=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const motion=compile('motion').replace("from './navigation'",`from '${asURL(compile('navigation'))}'`);
const {HeroCarousel,heroPose}=await import(asURL(motion));

// Apply the scene's XYZ Euler convention to the calibrated asset axes.
function rotate([x,y,z],{pitch,yaw,roll}){
 [x,y]=[x*Math.cos(roll)-y*Math.sin(roll),x*Math.sin(roll)+y*Math.cos(roll)];
 [x,z]=[x*Math.cos(yaw)+z*Math.sin(yaw),-x*Math.sin(yaw)+z*Math.cos(yaw)];
 [y,z]=[y*Math.cos(pitch)-z*Math.sin(pitch),y*Math.sin(pitch)+z*Math.cos(pitch)];
 return [x,y,z];
}

function assertCollectionFrame(orbit,mobile,reduced){
 const width=mobile?3:12,height=6;
 const poses=Array.from({length:4},(_,index)=>heroPose(index,orbit,width,height,mobile,reduced));
 for(const pose of poses){
  for(const [axis,expected,label]of [
   [[0,1,0],[-1,0,0],'tip left'],
   [[-1,0,0],[0,-1,0],'edge down'],
   [[0,0,1],[0,0,1],'broad face forward'],
  ])assert.ok(rotate(axis,pose).every((value,i)=>Math.abs(value-expected[i])<1e-10),`${label} at orbit ${orbit.position}`);
 }
 // Keep the spatial carousel: sharing an orientation must not stack the products.
 assert.ok(Math.max(...poses.map(p=>p.z))-Math.min(...poses.map(p=>p.z))>2);
}

test('all four knives share a presentation frame throughout autoplay and pauses',()=>{
 for(const mobile of [false,true])for(const reduced of [false,true]){
  const orbit=new HeroCarousel();
  for(let frame=0;frame<2600;frame++){
   orbit.tick(.02,true);assertCollectionFrame(orbit,mobile,reduced);
  }
  const position=orbit.position;orbit.tick(.1,false);assert.equal(orbit.position,position);assertCollectionFrame(orbit,mobile,reduced);
 }
});

test('dragging, wrapping, manual selection and partial-load jumps keep the same direction',()=>{
 const orbit=new HeroCarousel();
 orbit.beginDrag();
 for(const delta of [.1,.5,1.7,-4.9,9.2,-13.4]){orbit.drag(delta);assertCollectionFrame(orbit,false,false);}
 orbit.endDrag();
 for(let frame=0;frame<60;frame++){orbit.tick(.02,false);assertCollectionFrame(orbit,false,false);}
 for(const direction of [-1,1])for(let index=0;index<4;index++){
  orbit.focus(index,direction);
  for(let frame=0;frame<60;frame++){orbit.tick(.02,false);assertCollectionFrame(orbit,false,false);}
  orbit.reset(index);assertCollectionFrame(orbit,true,true);
 }
});
