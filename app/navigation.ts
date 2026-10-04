export const TRANSITION_MS=1050;
export const easeInOut=(t:number)=>{const x=Math.max(0,Math.min(1,t));return x*x*x*(x*(x*6-15)+10);};
/** A wheel stream is consumed once and cannot queue navigation during a transition. */
export class WheelGesture {
 private last=-Infinity;private consumed=false;private sum=0;private direction=0;
 feed(delta:number,time:number,locked:boolean):number {
  if(time-this.last>200){this.consumed=false;this.sum=0;this.direction=0;}
  this.last=time;
  if(locked){this.consumed=true;return 0;}
  if(this.consumed||Math.abs(delta)<1)return 0;
  const direction=Math.sign(delta);
  if(direction!==this.direction){this.sum=0;this.direction=direction;}
  this.sum+=Math.min(Math.abs(delta),100);
  if(this.sum<28)return 0;
  this.consumed=true;return direction;
 }
 reset(){this.last=-Infinity;this.consumed=false;this.sum=0;}
}
export function normalizeWheel(delta:number,mode:number,height:number){return delta*(mode===1?16:mode===2?height:1);}

export type ScanAxis='x'|'y'|'z';
export type InspectionView='front'|'back'|'spine'|'edge'|'tip'|'base'|'free';
export type View={mode:'hero'|'experience';selected:number;chapter:number;cut?:number;scanAxis?:ScanAxis;scanDirection?:1|-1;scanEnabled?:boolean};
export const CONFIG_CHAPTER=2;
export const SECTION_CHAPTER=CONFIG_CHAPTER;
export const OUTRO_CHAPTER=3;
export function advanceView(view:View,direction:number):View{
 if(view.mode==='hero')return direction>0?{...view,mode:'experience',chapter:0,cut:0}:view;
 if((direction<0&&view.chapter===0)||(direction>0&&view.chapter===OUTRO_CHAPTER))return {...view,mode:'hero',chapter:0,cut:0};
 const chapter=Math.max(0,Math.min(OUTRO_CHAPTER,view.chapter+direction));
 return {...view,chapter,cut:0,scanEnabled:false};
}
