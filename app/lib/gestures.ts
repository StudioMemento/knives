import {clamp,mod,sectionAt,type DemoState} from './state.ts';
import {swipeDestination} from './navigation.ts';

type Point={x:number;y:number};
type Mode='pending'|'orbit'|'knife'|'chapter'|'pinch';
type Callbacks={
 hitsProduct:(x:number,y:number)=>boolean;
 focus:(x:number,y:number,allowPlane:boolean)=>void;
 chapter:(target:number)=>void;
 select:(slot:number)=>void;
 renderUI:()=>void;
};

/** The gesture is owned by its starting surface until the last pointer lifts.
 * The same canvas never receives a second synthetic click to navigate again. */
export function bindGestures(canvas:HTMLCanvasElement,s:DemoState,callbacks:Callbacks){
 const contacts=new Map<number,Point>();
 let gesture:{mode:Mode;id:number;start:Point;last:Point;time:number;velocity:number;onModel:boolean;section:number;phase:number;chapter:number;pinch:Point}|null=null;
 let lastTap:{point:Point;time:number}|null=null;
 const point=(e:PointerEvent)=>({x:e.clientX,y:e.clientY});
 const midpoint=()=>{const [a,b]=[...contacts.values()];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};};
 function down(e:PointerEvent){
  if(e.button!==0||!s.ready.length)return;
  const p=point(e);contacts.set(e.pointerId,p);canvas.setPointerCapture(e.pointerId);
  if(gesture){
   if(contacts.size===2){
    if(gesture.mode==='knife')callbacks.select(Math.round(s.orbit));
    if(gesture.mode==='chapter')s.target=gesture.chapter;
    s.dragging=false;gesture.mode='pinch';gesture.pinch=midpoint();lastTap=null;
   }
   return;
  }
  s.interacting=true;s.activity++;
  gesture={mode:'pending',id:e.pointerId,start:p,last:p,time:e.timeStamp,velocity:0,onModel:callbacks.hitsProduct(p.x,p.y),section:sectionAt(s.progress),phase:s.orbit,chapter:Math.round(s.target),pinch:p};
 }
 function move(e:PointerEvent){
  if(!gesture||!contacts.has(e.pointerId))return;
  const g=gesture,p=point(e);contacts.set(e.pointerId,p);
  if(g.mode==='pinch'){if(contacts.size===2)g.pinch=midpoint();return;}
  if(e.pointerId!==g.id)return;
  const dx=p.x-g.start.x,dy=p.y-g.start.y;
  if(g.mode==='pending'){
   if(Math.hypot(dx,dy)<7)return;
   g.mode=g.onModel?'orbit':Math.abs(dx)>Math.abs(dy)?'knife':'chapter';
   if(g.mode==='knife'){s.knifeRequest=null;s.dragging=true;}
  }
  const sx=p.x-g.last.x,sy=p.y-g.last.y;
  g.velocity=sx/Math.max(8,e.timeStamp-g.time);g.last=p;g.time=e.timeStamp;
  if(g.mode==='orbit'){
   const free=g.section===4;
   s.yaw=free?s.yaw+sx*.009:clamp(s.yaw+sx*.008,-.56,.56);
   s.pitch=clamp(s.pitch+sy*.007,free?-1.53:-.34,free?1.53:.34);
  }else if(g.mode==='knife'){
   const anchor=Math.round(g.phase);
   const lo=s.ready.includes(mod(anchor-1))?anchor-.92:anchor;
   const hi=s.ready.includes(mod(anchor+1))?anchor+.92:anchor;
   s.dragPhase=clamp(g.phase-dx/Math.max(160,canvas.clientWidth*.60),lo,hi);
  }else{
   // Pull down to advance; push up to retrace. Wheel input stays conventional.
   s.target=g.chapter+clamp(dy/(canvas.clientHeight*.88),-.48,.48);
  }
 }
 function end(e:PointerEvent,cancelled:boolean){
  if(!contacts.has(e.pointerId)||!gesture)return;
  const g=gesture;
  contacts.delete(e.pointerId);
  if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  if(g.mode==='pinch'){
   if(cancelled)g.section=-1;
   if(contacts.size)return;
   if(g.section===4)callbacks.focus(g.pinch.x,g.pinch.y,true);
  }else if(e.pointerId!==g.id)return;
  else if(g.mode==='knife'){
   const slot=cancelled?Math.round(g.phase):swipeDestination(g.phase,e.clientX-g.start.x,canvas.clientWidth,g.velocity);
   s.dragging=false;callbacks.select(slot);
  }else if(g.mode==='chapter'){
   const dy=e.clientY-g.start.y;
   callbacks.chapter(g.chapter+(!cancelled&&Math.abs(dy)>=Math.min(46,canvas.clientHeight*.065)?Math.sign(dy):0));
  }else if(!cancelled&&g.mode==='pending'&&g.onModel){
   if(g.section===0)callbacks.chapter(g.chapter+1);
   if(g.section===4){
    const p=point(e),now=e.timeStamp;
    if(lastTap&&now-lastTap.time<360&&Math.hypot(p.x-lastTap.point.x,p.y-lastTap.point.y)<30){callbacks.focus(p.x,p.y,false);lastTap=null;}
    else lastTap={point:p,time:now};
   }
  }
  gesture=null;s.interacting=false;s.dragging=false;s.activity++;callbacks.renderUI();
 }
 const up=(e:PointerEvent)=>end(e,false),cancel=(e:PointerEvent)=>end(e,true);
 const clear=()=>{
  if(gesture?.mode==='chapter')s.target=gesture.chapter;
  if(gesture?.mode==='knife')callbacks.select(Math.round(gesture.phase));
  contacts.clear();gesture=null;s.dragging=false;s.interacting=false;lastTap=null;
 };
 const lost=(e:PointerEvent)=>{if(contacts.has(e.pointerId))end(e,true);};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);
 canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',lost);window.addEventListener('blur',clear);
 return ()=>{clear();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('lostpointercapture',lost);window.removeEventListener('blur',clear);};
}

export function chooseSlot(s:DemoState,slot:number){
 const bounded=Math.round(slot);
 if(!s.ready.length)return;
 const current=Math.round(s.orbit);
 const settled=current+mod(s.selected-mod(current)+2)-2;
 s.knifeRequest=s.ready.includes(mod(bounded))?bounded:settled;s.activity++;
}
