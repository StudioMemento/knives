import {clamp,mod,rotateProduct,sectionAt,type DemoState} from './state.ts';

type Point={x:number;y:number};
type Contact={start:Point;last:Point};
type Callbacks={
 hitsProduct:(x:number,y:number)=>boolean;
 focus:(x:number,y:number,allowPlane:boolean)=>void;
 chapter:(target:number)=>void;
 renderUI:()=>void;
};
const TAP_SLOP=7;
export const ZOOM_LIMITS={min:.55,max:2.8} as const;
function zoomBy(s:DemoState, factor:number){
 s.zoom=clamp(s.zoom*factor,ZOOM_LIMITS.min,ZOOM_LIMITS.max);s.activity++;
}
const point=(e:PointerEvent):Point=>({x:e.clientX,y:e.clientY});
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);

export function bindGestures(canvas:HTMLCanvasElement,s:DemoState,callbacks:Callbacks){
 const contacts=new Map<number,Contact>();
 let mode:'tap'|'orbit'|'multi'='tap',lastTap:{point:Point;time:number}|null=null;
 let originChapter=0,settled=false,tapOnProduct=false,multiFocus:Point|null=null;
 function down(e:PointerEvent){
  if(e.button!==0||!s.ready.length)return;
  const p=point(e);
  contacts.set(e.pointerId,{start:p,last:p});canvas.setPointerCapture(e.pointerId);
  if(contacts.size===1){
   mode='tap';originChapter=s.target;settled=Math.abs(s.progress-originChapter)<.09;
   // Picking on pointer-up would make a tap on the moving carousel ambiguous.
   tapOnProduct=settled&&[0,4].includes(sectionAt(originChapter))&&callbacks.hitsProduct(p.x,p.y);
   s.interacting=true;s.activity++;
  }else{
   const [a,b]=[...contacts.values()];
   multiFocus=contacts.size===2&&mode==='tap'?{x:(a.last.x+b.last.x)/2,y:(a.last.y+b.last.y)/2}:null;
   mode='multi';lastTap=null;
  }
 }
 function move(e:PointerEvent){
  const contact=contacts.get(e.pointerId);if(!contact)return;
  const p=point(e);
  if(mode==='multi'){
   if(distance(contact.start,p)>TAP_SLOP)multiFocus=null;
   if(contacts.size===2){
    const peer=[...contacts.values()].find(c=>c!==contact)!;
    const before=distance(contact.last,peer.last),after=distance(p,peer.last);
    if(before>8&&after>8)zoomBy(s,after/before);
   }
  }else{
   if(mode==='tap'&&distance(contact.start,p)<=TAP_SLOP)return;
   mode='orbit';lastTap=null;
   const gain=Math.PI/Math.max(270,Math.min(540,canvas.clientWidth*.86,canvas.clientHeight*.86));
   if(p.x!==contact.last.x||p.y!==contact.last.y)rotateProduct(s,(p.x-contact.last.x)*gain,(p.y-contact.last.y)*gain);
  }
  contact.last=p;
 }
 function end(e:PointerEvent,cancelled:boolean){
  if(!contacts.has(e.pointerId))return;
  // Some touch devices coalesce the entire drag into the release event.
  if(!cancelled)move(e);
  contacts.delete(e.pointerId);
  if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  if(cancelled){multiFocus=null;lastTap=null;}
  if(contacts.size)return;
  const section=sectionAt(originChapter),sameChapter=settled&&originChapter===s.target;
  if(!cancelled&&sameChapter){
   if(mode==='multi'&&multiFocus&&section===4)callbacks.focus(multiFocus.x,multiFocus.y,true);
   if(mode==='tap'&&tapOnProduct){
    if(section===0)callbacks.chapter(originChapter+1);
    if(section===4){
     const p=point(e);
     if(lastTap&&e.timeStamp-lastTap.time<360&&distance(lastTap.point,p)<30){callbacks.focus(p.x,p.y,false);lastTap=null;}
     else lastTap={point:p,time:e.timeStamp};
    }
   }else if(mode==='tap')lastTap=null;
  }
  multiFocus=null;s.interacting=false;s.activity++;callbacks.renderUI();
 }
 function wheel(e:WheelEvent){
  if(e.metaKey||!s.ready.length||!e.deltaY)return;
  e.preventDefault();
  const unit=e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1;
  zoomBy(s,Math.exp(clamp(-e.deltaY*unit*(e.ctrlKey?.009:.0016),-1.6,1.6)));
 }
 function key(e:KeyboardEvent){
  if(e.altKey||e.ctrlKey||e.metaKey||!s.ready.length)return;
  const step=Math.PI/12;
  switch(e.key){
   case '+':case '=':zoomBy(s,1.15);break;
   case '-':zoomBy(s,1/1.15);break;
   case 'ArrowLeft':rotateProduct(s,-step,0);break;
   case 'ArrowRight':rotateProduct(s,step,0);break;
   case 'ArrowUp':rotateProduct(s,0,-step);break;
   case 'ArrowDown':rotateProduct(s,0,step);break;
   default:return;
  }
  e.preventDefault();e.stopPropagation();callbacks.renderUI();
 }
 const up=(e:PointerEvent)=>end(e,false),cancel=(e:PointerEvent)=>end(e,true);
 const clear=()=>{
  const ids=[...contacts.keys()];contacts.clear();
  for(const id of ids)if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
  s.interacting=false;multiFocus=null;lastTap=null;
 };
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);
 canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);
 canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',key);window.addEventListener('blur',clear);
 return ()=>{
  clear();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);
  canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('lostpointercapture',cancel);
  canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('keydown',key);window.removeEventListener('blur',clear);
 };
}

export function chooseSlot(s:DemoState,slot:number){
 const bounded=Math.round(slot);
 if(!s.ready.length)return;
 const current=Math.round(s.orbit);
 const settled=current+mod(s.selected-mod(current)+2)-2;
 s.knifeRequest=s.ready.includes(mod(bounded))?bounded:settled;
 s.knifeDestination=s.knifeRequest;s.activity++;
}
