import {Vector3,Quaternion,Euler} from 'three';
import outlines from './shot-outlines.json' with {type:'json'};
import type {ModelMeta} from './state';
import {TILT_LIMIT} from './state.ts';

export const DISPLAY=4.2;
export const CAMERA_DISTANCE=9.5;
export type Frame={position:Vector3;rotation:Quaternion;scale:number;focus:Vector3;closed:number};
export type ScreenRect=[number,number,number,number];
export const rotation=(x:number,y:number,z:number)=>new Quaternion().setFromEuler(new Euler(x,y,z,'XYZ'));
const CANONICAL=new Quaternion(0,1,0,0);
export const presentation=(pitch:number,yaw:number,roll:number)=>rotation(0,0,roll).multiply(rotation(pitch,yaw,0)).multiply(CANONICAL);

/** The product can cross the UI gutters. Portrait reserves the actual space above each panel. */
export function productArea(portrait:boolean,panelTop=portrait?.77:.89):ScreenRect{
 return [.10,.095,.90,portrait?Math.max(.40,Math.min(.835,panelTop-.018)):.825];
}

const envelopes=outlines as Record<string,{assembled:number[];blade:number[];folded:number[]}>;
/** Fit the rotated hero using the actual open-model hull, so folding never
 * changes its projection pivot or lens. A transformed mesh AABB is too loose. */
export function heroTiltFit(meta:ModelMeta,focus:Vector3,pose:Quaternion,position:Vector3,scale:number,width:number,height:number,bottomEdge:number){
 const hull=envelopes[meta.id].assembled,k=scale*DISPLAY/meta.bounds.size[0],p=new Vector3();
 const left=-.433*width,right=.433*width,top=.439*height,bottom=(.5-bottomEdge)*height;
 const depth=1-position.z/CAMERA_DISTANCE;
 const roomL=position.x-left*depth,roomR=right*depth-position.x,roomB=position.y-bottom*depth,roomT=top*depth-position.y;
 let fit=1;
 for(let i=0;i<hull.length;i+=3){
  p.fromArray(hull,i).multiplyScalar(.00001).sub(focus).multiplyScalar(k).applyQuaternion(pose);
  const z=p.z/CAMERA_DISTANCE;
  const l=-p.x-left*z,r=p.x+right*z,b=-p.y-bottom*z,t=p.y+top*z;
  if(l>0)fit=Math.min(fit,roomL/l);if(r>0)fit=Math.min(fit,roomR/r);
  if(b>0)fit=Math.min(fit,roomB/b);if(t>0)fit=Math.min(fit,roomT/t);
 }
 return Math.max(.01,fit);
}
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
 const roll=chapter===4&&!portrait?0:(lo+hi)/2;
 const fit=measure(roll),scale=Math.min(fit.sx,fit.sy);
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
 const limit=TILT_LIMIT;
 if(reduced)return {rotation:new Quaternion(),offset:new Vector3()};
 return {
  rotation:rotation(limit*Math.sin(time*.43+.38*pointerY),limit*Math.sin(time*.33+.7+.4*pointerX),limit*Math.sin(time*.29)),
  offset:new Vector3(),
 };
}
