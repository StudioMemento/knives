import {Vector3,Quaternion,Euler} from 'three';
import type {ModelMeta} from './state';

export const DISPLAY=4.2;
export type Frame={position:Vector3;rotation:Quaternion;scale:number;focus:Vector3;closed:number};
export const rotation=(x:number,y:number,z:number)=>new Quaternion().setFromEuler(new Euler(x,y,z,'XYZ'));
const CANONICAL=new Quaternion(0,1,0,0);
export const presentation=(pitch:number,yaw:number,roll:number)=>rotation(0,0,roll).multiply(rotation(pitch,yaw,0)).multiply(CANONICAL);
export const stageTilt=(portrait:boolean)=>portrait?.90:.82;

function extent(size:number[],q:Quaternion){
 const lo=new Vector3(Infinity,Infinity,Infinity),hi=new Vector3(-Infinity,-Infinity,-Infinity),point=new Vector3();
 for(let i=0;i<8;i++){
  point.set((i&1?1:-1)*size[0]/2,(i&2?1:-1)*size[1]/2,(i&4?1:-1)*size[2]/2).applyQuaternion(q);
  lo.min(point);hi.max(point);
 }
 return hi.sub(lo);
}
function centeredShot(meta:ModelMeta,part:'assembled'|'blade'|'handle',focus:Vector3,q:Quaternion,width:number,height:number,spanX:number,spanY:number,closed:number):Frame{
 const size=part==='assembled'?meta.bounds.size:meta.roleBounds[part].size;
 const box=extent(size,q).multiplyScalar(DISPLAY/meta.bounds.size[0]);
 return {position:new Vector3(),rotation:q,focus,scale:Math.min(width*spanX/box.x,height*spanY/box.y),closed};
}
export function stageFrame(meta:ModelMeta,width:number,height:number,portrait:boolean):Frame{
 return centeredShot(meta,'assembled',new Vector3(...meta.focusPoints.assembled),presentation(.12,-.12,stageTilt(portrait)),width,height,portrait?.82:.70,portrait?.49:.70,0);
}
export function chapterFrame(chapter:number,meta:ModelMeta,hero:Frame,width:number,height:number,portrait:boolean):Frame{
 if(chapter===0||chapter===5)return hero;
 const points=meta.focusPoints;
 if(chapter===1){
  return centeredShot(meta,'blade',new Vector3(...points.blade),presentation(.13,-.09,portrait?.72:.38),width,height,portrait?.98:.75,portrait?.50:.79,0);
 }
 if(chapter===2){
  return centeredShot(meta,'handle',new Vector3(...points.handle),presentation(.36,-.30,stageTilt(portrait)),width,height,portrait?.83:.68,portrait?.48:.72,1);
 }
 if(chapter===3){
  const focus=new Vector3(...points.handle);
  focus.y+=meta.roleBounds.handle.size[1]*.37;
  const frame=centeredShot(meta,'handle',focus,presentation(1.12,-.09,portrait?.54:.30),width,height,portrait?1.06:.82,portrait?.54:.79,1);
  return frame;
 }
 return centeredShot(meta,'assembled',new Vector3(...points.assembled),presentation(0,0,0),width,height,portrait?.86:.65,.55,0);
}
export function livingPose(time:number,pointerX:number,pointerY:number,reduced:boolean){
 const limit=5*Math.PI/180;
 if(reduced)return {rotation:new Quaternion(),offset:new Vector3()};
 return {
  rotation:rotation(limit*(.88*Math.sin(time*.43)+.12*pointerY),limit*(.86*Math.sin(time*.33+.7)+.14*pointerX),limit*.77*Math.sin(time*.29)),
  offset:new Vector3(),
 };
}
