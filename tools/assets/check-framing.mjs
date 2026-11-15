// CPU-only projection of the real animated GLB vertices using the settled
// anchor/camera values in app/Stage.tsx. No renderer or browser is needed.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AnimationMixer,LoopOnce,Vector3,Quaternion,Euler,Group,PerspectiveCamera} from 'three';

const site=fileURLToPath(new URL('../../',import.meta.url)).replace(/\/$/,'');
const {safeSphereRadius,animatedRadius}=await import(`${site}/app/lib/framing.ts`);
const dir=`${site}/public/models/v46`;
const metas=JSON.parse(fs.readFileSync(`${dir}/manifest.json`)).models;
const v=a=>new Vector3(...a);
const rotation=(x,y,z)=>new Quaternion().setFromEuler(new Euler(x,y,z,'XYZ'));
const DISPLAY=4.2,FLOOR=-1.85;
const corrected=process.argv.includes('--corrected');
const bounds=()=>({min:[Infinity,Infinity],max:[-Infinity,-Infinity],vertices:0,outside:0,behind:0,hud:0});
const round=n=>Math.round(n*10000)/10000;
function frame(chapter,meta){
 const p=meta.focusPoints;
 if(chapter===0){
  const roll=-Math.PI/2-.58,tip=new Vector3(DISPLAY*.5,0,0).applyAxisAngle(new Vector3(0,0,1),roll);
  return {position:new Vector3(-1.5+Math.sin(-.2)*3-tip.x,FLOOR+.10-tip.y,-1.6+Math.cos(-.2)*3),rotation:rotation(0,0,roll),scale:1,focus:v(p.assembled),closed:0};
 }
 if(chapter===1)return {position:new Vector3(-1.45,.12,.7),rotation:rotation(.04,-.05,-2.52),scale:1.65,focus:v(p.blade),closed:0};
 if(chapter===2)return {position:new Vector3(-1.40,-.03,.7),rotation:rotation(.03,-.08,Math.PI-.08),scale:1.65,focus:v(p.handle),closed:1};
 if(chapter===3)return {position:new Vector3(-1.4,.08,.65),rotation:rotation(-.10,-.52,Math.PI-.10),scale:1.8,focus:v(p.metals),closed:1};
 return {position:new Vector3(-1.4,-.12,.65),rotation:rotation(0,0,Math.PI),scale:1.08,focus:v(p.assembled),closed:0};
}
const baseScenarios=[
 {name:'hero',chapter:0,focusRole:'all'},
 {name:'blade',chapter:1,focusRole:'blade'},
 {name:'handle_closed',chapter:2,focusRole:'handle'},
 {name:'metals_closed',chapter:3,focusRole:'metals'},
 {name:'explore_open',chapter:4,focusRole:'all'},
 {name:'explore_closed',chapter:4,focusRole:'all',closed:1},
 {name:'explore_exploded',chapter:4,focusRole:'all',explosion:1},
 {name:'explore_closed_exploded',chapter:4,focusRole:'all',closed:1,explosion:1},
 {name:'explore_top',chapter:4,focusRole:'all',view:[Math.PI/2,0]},
 {name:'explore_edge',chapter:4,focusRole:'all',view:[0,Math.PI/2]},
 {name:'explore_perspective',chapter:4,focusRole:'all',view:[-.33,.56]},
 {name:'explore_exploded_top',chapter:4,focusRole:'all',view:[Math.PI/2,0],explosion:1},
 {name:'explore_exploded_edge',chapter:4,focusRole:'all',view:[0,Math.PI/2],explosion:1},
 {name:'explore_exploded_perspective',chapter:4,focusRole:'all',view:[-.33,.56],explosion:1},
];
const scenarios=corrected?[...baseScenarios,...baseScenarios.filter(s=>s.chapter===4).map(s=>({...s,name:s.name+'_zoom',zoom:1.3}))]:baseScenarios;
const viewports=[{name:'desktop',width:1363,height:936,mobile:false},{name:'mobile',width:390,height:844,mobile:true}];
// Conservative HUD boxes derived from the current stylesheet. Mobile y bounds
// include font line-height rounding. These are readable-control exclusion zones,
// not a claim that the UI has a filled rectangle behind it.
function hudRect(chapter,mobile){
 if(mobile)return chapter===0?[.33,.65,.93,.85]:chapter===4?[.4428,.49,.93,.88]:[.4992,.62,.93,.86];
 return chapter===0?[.67,.24,.935,.51]:chapter===4?[.72,.19,.935,.62]:[.72,.39,.9071,.70];
}
const results=[];
for(const meta of metas){
 const bytes=fs.readFileSync(`${dir}/${meta.id.toLowerCase()}.glb`);
 const {scene,animations}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const group=new Group(),scaleGroup=new Group(),content=new Group();group.add(scaleGroup);scaleGroup.add(content);content.add(scene);scaleGroup.scale.setScalar(DISPLAY/meta.bounds.size[0]);
 const mixer=new AnimationMixer(scene),open=mixer.clipAction(animations.find(c=>c.name===meta.motion.openCloseClip)),explode=mixer.clipAction(animations.find(c=>c.name===meta.motion.explodeClip));
 for(const action of [open,explode]){action.setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;action.setEffectiveWeight(1);}
 const meshes=[];scene.traverse(o=>{if(o.isMesh){const name=String(o.userData.materialRole||o.material.name||o.name).toLowerCase();meshes.push({mesh:o,role:name.includes('blade')?'blade':name.includes('handle')?'handle':'metals'});}});
 for(const viewport of viewports)for(const scenario of scenarios){
  const {mobile}=viewport,f=frame(scenario.chapter,meta);
  const zoom=scenario.zoom??1;f.scale*=zoom;
  if(scenario.view)f.rotation.multiply(rotation(...scenario.view,0));
  if(mobile){f.position.x*=.32;f.position.y+=.8;f.scale*=.64;}
  if(corrected){
   if(!mobile&&scenario.chapter===3)f.position.x=-2.3;
   if(!mobile&&scenario.chapter===4)f.position.x=-1.1;
   if(mobile&&scenario.chapter===1)f.position.x=-.25;
   if(mobile&&scenario.chapter===2){f.position.x=0;f.scale*=.55/.64;}
   if(mobile&&scenario.chapter===3){f.position.x=-.8;f.scale*=.50/.64;}
   if(mobile&&scenario.chapter===4)f.position.set(0,1.40,.65);
  }
  group.position.copy(f.position);group.quaternion.copy(f.rotation);group.scale.setScalar(f.scale);content.position.copy(f.focus).negate();
  open.time=(scenario.closed??f.closed)*meta.motion.closedTime;explode.time=(scenario.explosion??0)*meta.motion.explodePeakTime;mixer.update(0);group.updateMatrixWorld(true);
  const hero=scenario.chapter===0;
  const camera=new PerspectiveCamera(38,viewport.width/viewport.height,.05,80);
  camera.position.set(mobile?0:.3,mobile?.65:hero?1.1:.45,(mobile?9.9:9.25)-(hero?0:.55));
  camera.lookAt(mobile?0:.25,mobile?.15:-.05,0);camera.updateMatrixWorld();
  let cap=1,worldRadius=null,safeRadius=null;
  if(corrected&&scenario.chapter===4){
   worldRadius=animatedRadius(meshes.map(m=>m.mesh),group);
   safeRadius=safeSphereRadius(camera,group.position,mobile?[.04,.10,.96,.49]:[.04,.08,.69,.92]);
   const full=safeSphereRadius(camera,group.position,[.02,.02,.98,.98]),baseRadius=worldRadius/zoom;
   cap=Math.min(1,safeRadius/baseRadius,full/(baseRadius*zoom));group.scale.multiplyScalar(cap);group.updateMatrixWorld(true);
  }
  const hud=hudRect(scenario.chapter,mobile),byRole={all:bounds(),blade:bounds(),handle:bounds(),metals:bounds()},world=new Vector3(),projected=new Vector3();
  for(const {mesh,role} of meshes){
   const attr=mesh.geometry.getAttribute('position');
   for(let i=0;i<attr.count;i++){
    world.fromBufferAttribute(attr,i).applyMatrix4(mesh.matrixWorld);projected.copy(world).project(camera);
    const x=(projected.x+1)*.5,y=(1-projected.y)*.5;
    const behind=world.clone().applyMatrix4(camera.matrixWorldInverse).z>-.05;
    for(const b of [byRole.all,byRole[role]]){
     b.min[0]=Math.min(b.min[0],x);b.min[1]=Math.min(b.min[1],y);b.max[0]=Math.max(b.max[0],x);b.max[1]=Math.max(b.max[1],y);b.vertices++;
     if(x<0||x>1||y<0||y>1)b.outside++;if(behind)b.behind++;
     if(x>=hud[0]&&x<=hud[2]&&y>=hud[1]&&y<=hud[3])b.hud++;
    }
   }
  }
  for(const b of Object.values(byRole)){b.min=b.min.map(round);b.max=b.max.map(round);b.outsidePercent=round(b.outside/b.vertices*100);b.hudVertexPercent=round(b.hud/b.vertices*100);}
  results.push({model:meta.id,viewport:viewport.name,scenario:scenario.name,chapter:scenario.chapter,focusRole:scenario.focusRole,zoom,hudRect:hud,cap,worldRadius,safeRadius,byRole});
 }
 mixer.stopAllAction();mixer.uncacheRoot(scene);
}
const report={note:'Normalized screen coordinates, top-left origin. Tight projection of all actual vertices. Settled anchors, no idle wobble, no user yaw/pitch. Corrected scenarios include intentional zoom1.3: base radius fits HUD-safe rect; scaled radius fits full viewport [.02,.02,.98,.98]. HUD overlap percentages measure vertices, not pixel area. Source mesh-motion QA limitations remain unchanged.',viewports,results};
const output=fileURLToPath(new URL(corrected?'./framing-corrected-report.json':'./framing-report.json',import.meta.url));fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
for(const viewport of viewports){
 console.log(`\n${viewport.name} ${viewport.width}x${viewport.height}: all-model [xmin,ymin,xmax,ymax], focus-role bounds if distinct; outside%/HUD-vertex%`);
 for(const name of scenarios.map(s=>s.name)){
  console.log(name);
  for(const r of results.filter(r=>r.viewport===viewport.name&&r.scenario===name)){
   const a=r.byRole.all,f=r.byRole[r.focusRole];console.log(` ${r.model.padEnd(6)} [${[...a.min,...a.max].join(', ')}] ${a.outsidePercent}/${a.hudVertexPercent}${f!==a?` focus=[${[...f.min,...f.max].join(', ')}] ${f.outsidePercent}/${f.hudVertexPercent}`:''}`);
  }
 }
}
console.log(`\nSaved ${output}`);
