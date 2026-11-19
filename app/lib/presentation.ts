import {Vector3,Quaternion,Euler} from 'three';
import outlines from './shot-outlines.json' with {type:'json'};
import type {ModelMeta} from './state';
import {IDLE_TILT_LIMIT} from './state.ts';

export const DISPLAY=4.2;
export const CAMERA_DISTANCE=9.5;
export type Frame={position:Vector3;rotation:Quaternion;scale:number;focus:Vector3;closed:number};
export type ScreenRect=[number,number,number,number];
export const rotation=(x:number,y:number,z:number)=>new Quaternion().setFromEuler(new Euler(x,y,z,'XYZ'));
const CANONICAL=new Quaternion(0,1,0,0);
export const presentation=(pitch:number,yaw:number,roll:number)=>rotation(0,0,roll).multiply(rotation(pitch,yaw,0)).multiply(CANONICAL);

/** The product can cross the UI gutters. Portrait reserves the actual space above each panel. */
export function productArea(portrait:boolean,panelTop=portrait?.81:.89):ScreenRect{
 return [.10,.045,.90,Math.max(.40,Math.min(portrait?.728:.74,panelTop-.018))];
}

const envelopes=outlines as Record<string,{assembled:number[];blade:number[];folded:number[]}>;
type Prepared={positions:Float32Array; focus:Vector3; pitch:number; yaw:number};
const cached=new WeakMap<ModelMeta,Map<number,Prepared>>();
function prepare(meta:ModelMeta,chapter:number){
 let byChapter=cached.get(meta);
 if(!byChapter){byChapter=new Map();cached.set(meta,byChapter);}
 const previous=byChapter.get(chapter);
 if(previous)return previous;
 const pitch=[.12,.13,.36,1.12,0][chapter],yaw=[-.12,-.09,-.30,-.09,0][chapter];
 const part=chapter===1?'blade':chapter===2||chapter===3?'folded':'assembled';
 const focus=new Vector3(...meta.focusPoints[part==='folded'?'handle':part]);
 const points=envelopes[meta.id][part],positions=new Float32Array(points.length);
 const q=presentation(pitch,yaw,0),p=new Vector3();
 for(let i=0;i<points.length;i+=3){
  p.fromArray(points,i).multiplyScalar(.00001).sub(focus).multiplyScalar(DISPLAY/meta.bounds.size[0]).applyQuaternion(q);
  p.toArray(positions,i);
 }
 const result={positions,focus,pitch,yaw};byChapter.set(chapter,result);return result;
}

/** Fit the convex silhouette to four perspective planes. Translation centers the
 * actual projected outline, including off-center pivots and the far end of the clip. */
function fittedShot(meta:ModelMeta,chapter:number,width:number,height:number,portrait:boolean,rect:ScreenRect):Frame{
 const {positions,focus,pitch,yaw}=prepare(meta,chapter);
 const left=(rect[0]-.5)*width,right=(rect[2]-.5)*width,top=(.5-rect[1])*height,bottom=(.5-rect[3])*height;
 function measure(roll:number){
  let xLow=Infinity,xHigh=-Infinity,yLow=Infinity,yHigh=-Infinity;
  const cs=Math.cos(roll),sn=Math.sin(roll);
  for(let i=0;i<positions.length;i+=3){
   const x=positions[i]*cs-positions[i+1]*sn,y=positions[i]*sn+positions[i+1]*cs,z=positions[i+2]/CAMERA_DISTANCE;
   xLow=Math.min(xLow,x+left*z);xHigh=Math.max(xHigh,x+right*z);
   yLow=Math.min(yLow,y+bottom*z);yHigh=Math.max(yHigh,y+top*z);
  }
  return {xLow,xHigh,yLow,yHigh,sx:(right-left)/(xHigh-xLow),sy:(top-bottom)/(yHigh-yLow)};
 }
 // A flatter widescreen shot and steeper portrait shot use both dimensions.
 let lo=.025,hi=1.54;
 for(let i=0;i<9;i++){
  const mid=(lo+hi)/2,fit=measure(mid);
  if(fit.sx<fit.sy)lo=mid;else hi=mid;
 }
 let roll=chapter===4&&!portrait?0:(lo+hi)/2;
 let fit=measure(roll);
 // A folded outline can lean relative to its own long axis. Some need a few
 // degrees beyond horizontal or vertical to occupy both sides of the frame.
 if(chapter===2&&Math.min(fit.sx,fit.sy)/Math.max(fit.sx,fit.sy)<.98){
  const seed=roll;
  for(let i=1;i<=32;i++)for(const sign of [-1,1]){
   const angle=seed+sign*i*.018,candidate=measure(angle);
   if(Math.abs(Math.log(candidate.sx/candidate.sy))<Math.abs(Math.log(fit.sx/fit.sy))){roll=angle;fit=candidate;}
  }
 }
 const scale=Math.min(fit.sx,fit.sy);
 const x=(left+right-scale*(fit.xLow+fit.xHigh))/2,y=(bottom+top-scale*(fit.yLow+fit.yHigh))/2;
 return {position:new Vector3(x,y,0),rotation:presentation(pitch,yaw,roll),scale,focus,closed:chapter===2||chapter===3?1:0};
}

export function stageFrame(meta:ModelMeta,width:number,height:number,portrait:boolean,rect=productArea(portrait)){
 return fittedShot(meta,0,width,height,portrait,rect);
}
export function chapterFrame(chapter:number,meta:ModelMeta,hero:Frame,width:number,height:number,portrait:boolean,rect=productArea(portrait)){
 return chapter===0||chapter===5?hero:fittedShot(meta,chapter,width,height,portrait,rect);
}
export function livingPose(time:number,pointerX:number,pointerY:number,reduced:boolean){
 const limit=IDLE_TILT_LIMIT;
 if(reduced)return {rotation:new Quaternion(),offset:new Vector3()};
 return {
  rotation:rotation(limit*Math.sin(time*.43+.38*pointerY),limit*Math.sin(time*.33+.7+.4*pointerX),limit*Math.sin(time*.29)),
  offset:new Vector3(),
 };
}
