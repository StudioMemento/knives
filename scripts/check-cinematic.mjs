import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Vector3,PerspectiveCamera,Euler} from 'three';
import {chapterFrame,stageFrame,livingPose,productArea,CAMERA_DISTANCE,DISPLAY} from '../app/lib/presentation.ts';
import {backdropOpacity,slotOffset,railPoint,RAIL} from '../app/lib/choreography.ts';
import {KNIVES,PREVIOUS_ORDER,IDLE_TILT_LIMIT} from '../app/lib/state.ts';
import {CATALOGUE,catalogueChoices,configurationPrice,SURFACES} from '../app/lib/catalogue.ts';

const metas=JSON.parse(fs.readFileSync('public/models/v48/manifest.json')).models;
const hulls=JSON.parse(fs.readFileSync('app/lib/shot-outlines.json'));
const sizes=[[320,568],[390,844],[430,932],[768,1024],[844,390],[1366,768],[1440,900],[2560,1080],[3440,1440],[3840,1080]];
let count=0;
for(const meta of metas)for(const [width,height] of sizes){
 const portrait=height>width,vh=2*Math.tan(34*Math.PI/360)*CAMERA_DISTANCE,vw=vh*width/height;
 const camera=new PerspectiveCamera(34,width/height,.05,80);camera.position.z=CAMERA_DISTANCE;camera.updateMatrixWorld();
 const rect=productArea(portrait,portrait?(height-227)/height:.9);
 const stage=stageFrame(meta,vw,vh,portrait,rect);
 const shots=[0,1,2,3,4].map(i=>chapterFrame(i,meta,stage,vw,vh,portrait,rect));
 for(const [i,shot] of shots.entries()){
  const key=i===1?'blade':i===2||i===3?'folded':'assembled';
  const coords=hulls[meta.id][key],p=new Vector3(),xs=[],ys=[];
  for(let j=0;j<coords.length;j+=3){
   p.fromArray(coords,j).multiplyScalar(.00001).sub(shot.focus).multiplyScalar(shot.scale*DISPLAY/meta.bounds.size[0]);
   p.applyQuaternion(shot.rotation).add(shot.position).project(camera);xs.push((1+p.x)/2);ys.push((1-p.y)/2);
  }
  const [l,t,r,b]=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
  const eps=.001;
  assert.ok(l>=rect[0]-eps&&r<=rect[2]+eps&&t>=rect[1]-eps&&b<=rect[3]+eps,meta.id+' clips '+key);
  const fillX=(r-l)/(rect[2]-rect[0]),fillY=(b-t)/(rect[3]-rect[1]);
  assert.ok(Math.max(fillX,fillY)>.998,'Every shot uses the available product area');
  const modelLabel=JSON.stringify({model:meta.id,width,height,i,fillX,fillY});
  if((i!==4||portrait)&&width/height<=3)assert.ok(Math.min(fillX,fillY)>.98,modelLabel);
  count++;
 }
 const [hero,blade,handle,detail,inspect]=shots;
 assert.ok(blade.scale>hero.scale*1.4,'The blade has its own close-up');
 if(width/height<=3)assert.ok(handle.scale>hero.scale*1.24,'Folded handles are magnified');
 assert.equal(handle.closed,1);assert.equal(detail.closed,1);assert.equal(blade.closed,0);
 assert.ok(new Vector3(0,1,0).applyQuaternion(detail.rotation).z>.83,'Details shows the upper profile');
 const axis=new Vector3(1,0,0).applyQuaternion(hero.rotation);
 assert.ok(axis.x<0&&axis.y<0);
 if(width/height>2.2)assert.ok(Math.abs(axis.y/axis.x)<.54,'Wide screens use a shallow diagonal');
 if(portrait&&height/width>1.8)assert.ok(Math.abs(axis.y/axis.x)>1,'Tall screens use a steep diagonal');
 if(!portrait)assert.ok(new Vector3(1,0,0).applyQuaternion(inspect.rotation).x<-.99,'Inspection offers a true side elevation');
 assert.equal(chapterFrame(5,meta,hero,vw,vh,portrait,rect),hero);
}
for(let time=0;time<120;time+=.11){
 const e=new Euler().setFromQuaternion(livingPose(time,1,-1,false).rotation);
 for(const angle of [e.x,e.y,e.z])assert.ok(Math.abs(angle)<=IDLE_TILT_LIMIT+1e-8);
}
assert.equal(livingPose(4,1,1,true).rotation.w,1);
assert.equal(backdropOpacity(0),1);assert.equal(backdropOpacity(.62),0);
for(let i=0;i<=100;i++){
 const phase=i/100;
 assert.ok(backdropOpacity(phase+.01)<=backdropOpacity(phase));
 assert.equal(Math.abs(slotOffset(0,phase)+phase)<1e-8,true);
 assert.equal(Math.abs(slotOffset(1,phase)-(1-phase))<1e-8,true);
 const p=railPoint(phase*2*Math.PI);assert.ok(Math.abs(Math.hypot(p.x,p.z-RAIL.centerZ)-RAIL.radius)<1e-8);assert.equal(p.y,RAIL.floorY);
}
for(const zones of Object.values(CATALOGUE))for(const surface of SURFACES){
 const {colors,styles,default:pair}=zones[surface];
 for(const [i,options] of [colors,styles].entries()){
  assert.equal(options.length,6);assert.equal(new Set(options.map(o=>o.name)).size,6);
  assert.ok(options.every(o=>o.description.length>0));assert.ok(options[pair[i]]);
 }
}
assert.deepEqual(KNIVES,['HYPER','VERTEX','EDGE','TRIS','QUAD']);
const previous=PREVIOUS_ORDER.map((_,i)=>({blade:{color:i,style:5-i}}));
const migrated=catalogueChoices(previous);
KNIVES.forEach((id,i)=>assert.deepEqual(migrated[i].blade,previous[PREVIOUS_ORDER.indexOf(id)].blade));
const keyed=Object.fromEntries(KNIVES.map((id,i)=>[id,migrated[i]]));keyed.EDGE.handle={color:8,style:-1};
assert.deepEqual(catalogueChoices(keyed)[2].handle,catalogueChoices()[2].handle);
assert.deepEqual(catalogueChoices(keyed)[3].blade,migrated[3].blade);
console.log('PASS — '+count+' fitted silhouettes, 15° idle tilt, circular rail, bidirectional slide and keyed catalogue migration');

const defaults=catalogueChoices();
for(const [i,knife] of KNIVES.entries()){
 const configuration=defaults[i],base=configurationPrice(knife,configuration);
 let maximum=base;
 for(const surface of SURFACES){
  for(const [key,options] of [['color',CATALOGUE[knife][surface].colors],['style',CATALOGUE[knife][surface].styles]]){
   const initial=configuration[surface][key];
   assert.equal(options[initial].surcharge,0);
   assert.equal(new Set(options.map(o=>o.surcharge)).size,options.length);
   for(const [n,option] of options.entries()){
    configuration[surface][key]=n;
    assert.equal(configurationPrice(knife,configuration),base+option.surcharge);
   }
   configuration[surface][key]=initial;
   maximum+=Math.max(...options.map(o=>o.surcharge));
  }
 }
 assert.ok(base>=100 && maximum<=999);
}
console.log('PASS — each of the 180 catalogue options updates its own three-digit configuration price');
