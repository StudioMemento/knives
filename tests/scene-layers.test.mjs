import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import * as THREE from 'three';
const temporary=mkdtempSync(new URL('../.scene-test-',import.meta.url));
try{
 for(const name of ['catalog','configuration','model','navigation','motion','laser']){
  const source=readFileSync(new URL(`../app/${name}.ts`,import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${p}.mjs'`);
  writeFileSync(`${temporary}/${name}.mjs`,compiled);
 }
 const {HeroCarousel,heroPose,sectionFrame,HERO_SHOW_MS,HERO_TRAVEL_MS}=await import(pathToFileURL(`${temporary}/motion.mjs`));
 const {advanceView,SECTION_CHAPTER,CONFIG_CHAPTER,OUTRO_CHAPTER,WheelGesture}=await import(pathToFileURL(`${temporary}/navigation.mjs`));
 const {getKnifeMeshes,installFinish,updateFinish,foldMatrix,updateFold}=await import(pathToFileURL(`${temporary}/model.mjs`));
 const {originalConfiguration,applyPreset}=await import(pathToFileURL(`${temporary}/configuration.mjs`));
 const {createLaserSection,SCAN_AXES}=await import(pathToFileURL(`${temporary}/laser.mjs`));
 test('four repeated carousel loops stay continuous, horizontal and draggable',()=>{
  const orbit=new HeroCarousel();const seen=new Set();
  for(let frame=0;frame<Math.ceil((HERO_SHOW_MS+HERO_TRAVEL_MS)*17/20);frame++){const before=orbit.position;orbit.tick(.02,true);assert.ok(orbit.position>=before&&orbit.position-before<.025);seen.add(((Math.round(orbit.position)%4)+4)%4);}
  assert.equal(seen.size,4);assert.ok(orbit.position>16);
  const paused=orbit.position;orbit.tick(3,false);assert.equal(orbit.position,paused);
  for(let i=0;i<4;i++)for(const mobile of [true,false]){
   orbit.reset(i);const pose=heroPose(i,orbit,9,6,mobile,false);const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.pitch,pose.yaw,pose.roll));
   const blade=new THREE.Vector3(0,1,0).applyQuaternion(q);assert.ok(blade.x<-.9999&&Math.abs(blade.y)<1e-10,'tip faces left at centre');assert.equal(pose.x,0);
  }
  orbit.reset(3);orbit.focus(0,1);for(let f=0;f<60;f++)orbit.tick(.02,false);assert.equal(orbit.position,4);
  orbit.beginDrag();orbit.drag(-1.6);const held=orbit.position;orbit.tick(.1,true);assert.equal(orbit.position,held);orbit.endDrag();for(let f=0;f<60;f++)orbit.tick(.02,false);assert.equal(orbit.position,Math.round(held));
 });
 test('the technical section is inside configuration and the journey still returns to collection',()=>{
  assert.equal(SECTION_CHAPTER,CONFIG_CHAPTER);assert.equal(CONFIG_CHAPTER,2);assert.equal(OUTRO_CHAPTER,3);
  for(let selected=0;selected<4;selected++){
   let view={mode:'hero',selected,chapter:0};
   for(let chapter=0;chapter<=3;chapter++){view=advanceView(view,1);assert.equal(view.chapter,chapter);assert.equal(view.mode,'experience');}
   assert.equal(advanceView(view,-1).chapter,2);assert.equal(advanceView(view,1).mode,'hero');
   assert.equal(advanceView({mode:'experience',selected,chapter:2,cut:.6,scanEnabled:true},-1).chapter,1);
  }
  const wheel=new WheelGesture();assert.equal(wheel.feed(80,0,false),1);for(let t=10;t<200;t+=10)assert.equal(wheel.feed(70,t,false),0);assert.equal(wheel.feed(-90,500,false),-1);
 });
 test('hinge transform fixes the exact pivot and every static body surface',()=>{
  const root=new THREE.Group();root.userData.rig={pivot:new THREE.Vector3(.12,.08,.02),axis:new THREE.Vector3(0,0,1),closedAngle:Math.PI};
  const body=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()),blade=body.clone();blade.userData.movingBlade=true;root.add(body,blade);body.updateMatrix();const baseline=body.matrix.clone();
  for(const amount of [0,.1,.5,.9,1]){const matrix=foldMatrix(root,amount);assert.ok(root.userData.rig.pivot.clone().applyMatrix4(matrix).distanceTo(root.userData.rig.pivot)<1e-10);updateFold(root,amount);assert.deepEqual(body.matrix,baseline);assert.deepEqual(blade.matrix,matrix);}
 });
 test('laser clips original solids with a moving capped plane and restores original materials',()=>{
  const geometry=new THREE.BoxGeometry(.5,4.5,.35).toNonIndexed();const material=new THREE.MeshStandardMaterial();installFinish(material);const mesh=new THREE.Mesh(geometry,material);
  const laser=createLaserSection([mesh],new THREE.Color('#45e3cf'));const matrix=new THREE.Matrix4().makeRotationZ(Math.PI/2);laser.update(.7,true,matrix,2);
  assert.equal(laser.group.visible,true);assert.equal(material.clippingPlanes.length,1);assert.equal(material.userData.finishUniforms.uScanActive.value,1);
  assert.ok(laser.group.children.some(o=>o.material?.stencilFunc===THREE.NotEqualStencilFunc));
  const plane=material.clippingPlanes[0];assert.ok(plane.distanceToPoint(new THREE.Vector3(0,0,.175).applyMatrix4(matrix))<0);assert.ok(plane.distanceToPoint(new THREE.Vector3(0,0,-.175).applyMatrix4(matrix))>0);
  laser.update(0,false,matrix,3);assert.equal(material.clippingPlanes,null);assert.equal(material.userData.finishUniforms.uScanActive.value,0);assert.equal(laser.group.visible,false);laser.dispose();geometry.dispose();material.dispose();
 });
 test('finite, horizontal framing at mobile, tablet, desktop and short landscape sizes',()=>{
  for(const [width,height] of [[1440,900],[1024,768],[390,844],[844,390],[320,568]])for(let chapter=0;chapter<4;chapter++){
   const pose=sectionFrame(width,height,chapter,chapter===2);for(const value of Object.values(pose))assert.ok(Number.isFinite(value));assert.ok(pose.scale>0);
   if(chapter===2)assert.equal(pose.roll,Math.PI/2);
  }
 });

 test('all scan axes and both directions keep clipping, caps and edge uniforms aligned after rotation',()=>{
  const geometry=new THREE.BoxGeometry(.6,4.5,.4).translate(.07,-.13,.03).toNonIndexed(),material=new THREE.MeshStandardMaterial();installFinish(material);
  const laser=createLaserSection([new THREE.Mesh(geometry,material)],new THREE.Color('#ff5b32'));
  const matrix=new THREE.Matrix4().compose(new THREE.Vector3(2,-1,.3),new THREE.Quaternion().setFromEuler(new THREE.Euler(.2,.3,1.7)),new THREE.Vector3(1.3,.9,1.2));
  for(const [axis,{vector}] of Object.entries(SCAN_AXES))for(const direction of [1,-1]){
   const normal=new THREE.Vector3(...vector).multiplyScalar(direction),center=new THREE.Vector3(.07,-.13,.03),extent=axis==='x'?4.5:axis==='y'?.6:.4;
   laser.update(.55,true,matrix,2,axis,direction);
   const plane=material.clippingPlanes[0];
   assert.ok(plane.distanceToPoint(center.clone().addScaledVector(normal,extent/2).applyMatrix4(matrix))<0,'front half is cut');
   assert.ok(plane.distanceToPoint(center.clone().addScaledVector(normal,-extent/2).applyMatrix4(matrix))>0,'back half is retained');
   assert.ok(material.userData.finishUniforms.uScanAxis.value.distanceTo(normal)<1e-10);
   for(const cap of laser.group.children.filter(o=>o.material?.stencilFunc===THREE.NotEqualStencilFunc)){
    cap.updateMatrix();
    for(const [x,y]of [[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]])assert.ok(Math.abs(plane.distanceToPoint(new THREE.Vector3(x,y,0).applyMatrix4(cap.matrix).applyMatrix4(matrix)))<1e-8,'cap remains on the active plane');
   }
  }
  laser.update(0,false,matrix,3);assert.equal(material.clippingPlanes,null);laser.dispose();geometry.dispose();material.dispose();
 });
 test('material updates keep ignoring attached decoration and laser groups',()=>{
  for(let index=0;index<4;index++){
   const model=new THREE.Group(),material=new THREE.MeshStandardMaterial();installFinish(material);model.add(new THREE.Mesh(new THREE.BoxGeometry(),material));const surfaces=getKnifeMeshes(model);model.add(new THREE.Group(),new THREE.Group());
   updateFinish(material,applyPreset(index,1,originalConfiguration(index)));assert.equal(material.userData.finishUniforms.uBladeMix.value,1);assert.deepEqual(getKnifeMeshes(model),surfaces);assert.equal(surfaces.length,1);
  }
 });
}finally{rmSync(temporary,{recursive:true,force:true});}
