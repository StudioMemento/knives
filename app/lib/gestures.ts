import {clamp,mod,sectionAt,TILT_LIMIT,type DemoState} from './state.ts';

type Point={x:number;y:number};
type Mode='pending'|'orbit'|'chapter'|'pinch';
type Callbacks={
 hitsProduct:(x:number,y:number)=>boolean;
 focus:(x:number,y:number,allowPlane:boolean)=>void;
 chapter:(target:number)=>void;
 renderUI:()=>void;
};

/** The gesture is owned by its starting surface until the last pointer lifts.
 * The same canvas never receives a second synthetic click to navigate again. */
export function bindGestures(canvas:HTMLCanvasElement,s:DemoState,callbacks:Callbacks){
 const contacts=new Map<number,Point>();
 let gesture:{mode:Mode;id:number;start:Point;last:Point;onModel:boolean;section:number;chapter:number;pinch:Point}|null=null;
 let lastTap:{point:Point;time:number}|null=null;
 const point=(e:PointerEvent)=>({x:e.clientX,y:e.clientY});
 const midpoint=()=>{const [a,b]=[...contacts.values()];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};};
 function down(e:PointerEvent){
  if(e.button!==0||!s.ready.length)return;
  const p=point(e);contacts.set(e.pointerId,p);canvas.setPointerCapture(e.pointerId);
  if(gesture){
   if(contacts.size===2){
    if(gesture.mode==='chapter')s.target=gesture.chapter;
    s.dragging=false;gesture.mode='pinch';gesture.pinch=midpoint();lastTap=null;
   }
   return;
  }
  s.interacting=true;s.activity++;
  gesture={mode:'pending',id:e.pointerId,start:p,last:p,onModel:callbacks.hitsProduct(p.x,p.y),section:sectionAt(s.progress),chapter:Math.round(s.target),pinch:p};
 }
 function move(e:PointerEvent){
  if(!gesture||!contacts.has(e.pointerId))return;
  const g=gesture,p=point(e);contacts.set(e.pointerId,p);
  if(g.mode==='pinch'){if(contacts.size===2)g.pinch=midpoint();return;}
  if(e.pointerId!==g.id)return;
  const dx=p.x-g.start.x,dy=p.y-g.start.y;
  if(g.mode==='pending'){
   const ax=Math.abs(dx),ay=Math.abs(dy);
   if(Math.max(ax,ay)<8||(Math.max(ax,ay)<22&&Math.max(ax,ay)<1.24*Math.min(ax,ay)))return;
   g.mode=ax>ay?'orbit':'chapter';
  }
  if(g.mode==='orbit'){
   s.yaw+=(p.x-g.last.x)*.009;
   s.pitch=clamp(s.pitch+(p.y-g.last.y)*.003,-TILT_LIMIT,TILT_LIMIT);
  }else{
   s.target=g.chapter-clamp(dy/(canvas.clientHeight*.88),-.48,.48);
  }
  g.last=p;
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
  else if(g.mode==='chapter'){
   const dy=e.clientY-g.start.y;
   callbacks.chapter(g.chapter+(!cancelled&&Math.abs(dy)>=Math.min(46,canvas.clientHeight*.065)?-Math.sign(dy):0));
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
 s.knifeRequest=s.ready.includes(mod(bounded))?bounded:settled;
 s.knifeDestination=s.knifeRequest;s.activity++;
}
