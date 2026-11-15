import {Vector3,Quaternion,Euler} from 'three';
import type {ModelMeta} from './state';

export const DISPLAY=4.2;
export type Frame={position:Vector3;rotation:Quaternion;scale:number;focus:Vector3;closed:number};
export const rotation=(x:number,y:number,z:number)=>new Quaternion().setFromEuler(new Euler(x,y,z,'XYZ'));
// Every asset uses tip +X, spine +Y, main face -Z. Proper rotation, no mirroring.
const CANONICAL=new Quaternion(0,1,0,0);
export const presentation=(x:number,y:number,z:number)=>rotation(x,y,z).multiply(CANONICAL);

/** Project the actual part dimensions through its chosen attitude. */
function extent(size:number[],q:Quaternion){
 const lo=new Vector3(Infinity,Infinity,Infinity),hi=new Vector3(-Infinity,-Infinity,-Infinity);
 for(let k=0;k<8;k++){const p=new Vector3((k&1?1:-1)*size[0]/2,(k&2?1:-1)*size[1]/2,(k&4?1:-1)*size[2]/2).applyQuaternion(q);lo.min(p);hi.max(p);}
 return hi.sub(lo);
}
function fitShot(bounds:{min:number[];max:number[]},focus:Vector3,q:Quaternion,position:Vector3,normal:number,width:number,height:number,rect:number[]){
 const [x0,y0,x1,y1]=rect;
 const planes=[new Vector3(1,0,(2*x0-1)*width/19),new Vector3(-1,0,-(2*x1-1)*width/19),new Vector3(0,1,(1-2*y1)*height/19),new Vector3(0,-1,-(1-2*y0)*height/19)];
 const center=new Vector3(position.x,position.y,position.z-9.5);let scale=Infinity;
 for(let k=0;k<8;k++){
  const delta=new Vector3(k&1?bounds.max[0]:bounds.min[0],k&2?bounds.max[1]:bounds.min[1],k&4?bounds.max[2]:bounds.min[2]).sub(focus).multiplyScalar(normal).applyQuaternion(q);
  for(const plane of planes){const direction=plane.dot(delta);if(direction<0)scale=Math.min(scale,plane.dot(center)/-direction);}
 }
 return scale*.985;
}
export function chapterFrame(chapter:number,meta:ModelMeta,hero:Frame,width:number,height:number,mobile:boolean):Frame{
 if(chapter===0||chapter===5)return hero;
 const p=meta.focusPoints,normal=DISPLAY/meta.bounds.size[0];
 if(chapter===1){
  // The entire open knife spans the diagonal: steel in the clear left area,
  // handle visibly continuing into the optical blur beneath the right HUD.
  const angle=Math.atan2(height*(mobile?.23:.44),width*(mobile?.77:.69));
  const q=presentation(.09,-.12,angle),box=extent(meta.bounds.size,q);
  const scale=Math.min(width*(mobile?.92:.81)/(box.x*normal),height*(mobile?.38:.72)/(box.y*normal))*.965;
  return {position:new Vector3(-width*(mobile?.015:.065),height*(mobile?.24:.025),.3),rotation:q,scale,focus:new Vector3(...p.assembled),closed:0};
 }
 if(chapter===2||chapter===3){
  const q=chapter===2?presentation(.34,-.78,.55):presentation(-.26,.70,.32);
  const position=new Vector3(-width*(mobile?.015:.17),height*(mobile?.235:-.065),chapter===2?.65:1.35);
  const bounds=meta.roleBounds!.handle;
  const base=fitShot(bounds,new Vector3(...p.handle),q,position,normal,width,height,mobile?[.04,.10,.96,.49]:[.045,.095,.65,.89]);
  return {
   position,
   rotation:q,scale:base*(chapter===2?1:(mobile?1.72:2.05)),
   focus:new Vector3(...(chapter===2?p.handle:p.metals)),closed:1,
  };
 }
 // Preserve the approved technical view and its dynamic safe-area fitting.
 return {position:new Vector3(mobile?0:-width*.16,mobile?height*.23:-.12,.5),rotation:presentation(0,0,0),scale:width*(mobile?.86:.59)/DISPLAY,focus:new Vector3(...p.assembled),closed:0};
}

/** Small world-space movement survives every shot and interpolates without a
 * phase reset. Pointer signals are damped by the caller; reduced motion is zero. */
export function livingPose(time:number,pointerX:number,pointerY:number,reduced:boolean){
 if(reduced)return {rotation:new Quaternion(),offset:new Vector3()};
 return {
  rotation:rotation(Math.sin(time*.53)*.013+pointerY*.024,Math.sin(time*.39+.7)*.020+pointerX*.040,Math.sin(time*.31)*.006+pointerX*.006),
  offset:new Vector3(Math.sin(time*.37)*.015,Math.sin(time*.62)*.018,0),
 };
}
