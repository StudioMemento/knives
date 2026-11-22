'use client';
import {useLayoutEffect,useRef} from 'react';

type Point={x:number;y:number};
type Grain=Point&{dx:number;dy:number;lag:number;size:number};
type Burst={element:HTMLElement;behind:boolean;grains:Grain[];origins:Point[];start:number;duration:number};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const noise=(n:number)=>{const v=Math.sin(127.1*n+311.7)*43758.5453;return v-Math.floor(v);};
const ease=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
const zones=[{x:.23,y:.22},{x:.72,y:.39},{x:.33,y:.82},{x:.91,y:.83}];

function sample(element:HTMLElement,rect:DOMRect){
 const buf=document.createElement('canvas'),scale=Math.min(1.15,420/Math.max(1,rect.width));
 buf.width=Math.ceil(rect.width*scale)+2;buf.height=Math.ceil(rect.height*scale)+2;
 const ink=buf.getContext('2d',{willReadFrequently:true});if(!ink||rect.width<=0||rect.height<=0)return [];
 ink.scale(scale,scale);ink.translate(-rect.left,-rect.top);ink.fillStyle='white';ink.strokeStyle='white';
 const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
 const range=document.createRange();let node:Node|null;
 while((node=walker.nextNode())){
  if(!node.textContent?.trim()||!node.parentElement||node.parentElement.closest('svg,.nav-tip'))continue;
  const css=getComputedStyle(node.parentElement);ink.font=css.fontWeight+' '+css.fontSize+' '+css.fontFamily;
  ink.textBaseline='top';ink.letterSpacing=css.letterSpacing==='normal'?'0px':css.letterSpacing;
  // Sample each visual line so wrapped copy has the same silhouette as the DOM.
  for(const match of node.textContent.matchAll(/\S+/g)){
   range.setStart(node,match.index!);range.setEnd(node,match.index!+match[0].length);
   const box=range.getBoundingClientRect(),word=css.textTransform==='uppercase'?match[0].toUpperCase():match[0];
   const width=ink.measureText(word).width;
   if(width>0){
    ink.save();ink.translate(box.left,box.top);ink.scale(box.width/width,1);ink.fillText(word,0,0);ink.restore();
   }
  }
 }
 for(const child of element.querySelectorAll<HTMLElement>('button, input, img')){
  const box=child.getBoundingClientRect();
  if(child instanceof HTMLImageElement&&child.complete&&child.naturalWidth){ink.drawImage(child,box.x,box.y,box.width,box.height);continue;}
  if(child.querySelector('svg'))continue;
  const sample=child.querySelector('.sample-outline');
  if(sample){
   const {x,y,width:w,height:h}=sample.getBoundingClientRect();
   const cut=child.classList.contains('style')?w*.23:0;
   ink.beginPath();ink.moveTo(x+cut,y);ink.lineTo(x+w,y);ink.lineTo(x+w,y+h-cut);
   ink.lineTo(x+w-cut,y+h);ink.lineTo(x,y+h);ink.lineTo(x,y+cut);ink.closePath();
   ink.stroke();ink.globalAlpha=.36;ink.fill();ink.globalAlpha=1;
  }
  else ink.fillRect(box.x+box.width*.13,box.y+box.height/2,box.width*.74,1.5);
 }
 for(const path of element.querySelectorAll<SVGGeometryElement>('svg path,svg circle')){
  const matrix=path.getScreenCTM();if(!matrix)continue;
  if(path instanceof SVGPathElement&&getComputedStyle(path).fill!=='none'){
   ink.save();ink.transform(matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f);
   ink.fill(new Path2D(path.getAttribute('d')!),path.getAttribute('fill-rule')==='evenodd'?'evenodd':'nonzero');ink.restore();
   if(getComputedStyle(path).stroke==='none')continue;
  }
  const length=path.getTotalLength();
  for(let d=0;d<length;d+=.7){const p=path.getPointAtLength(d).matrixTransform(matrix);ink.fillRect(p.x,p.y,1.35,1.35);}
 }
 const pixels=ink.getImageData(0,0,buf.width,buf.height).data,points:Point[]=[];
 for(let y=0;y<buf.height;y+=2)for(let x=0;x<buf.width;x+=2)if(pixels[(y*buf.width+x)*4+3]>40)points.push({x:rect.left+x/scale,y:rect.top+y/scale});
 const limit=Math.min(420,points.length),grains:Grain[]=[];
 for(let i=0;i<limit;i++){
  const p=points[Math.floor((i+noise(i))*points.length/limit)];
  const u=(p.x-rect.left)/rect.width,v=(p.y-rect.top)/rect.height;
  const lag=Math.min(...zones.map((o,j)=>Math.hypot(u-o.x,v-o.y)*.72+j*.045));
  const angle=noise(i+rect.left)*Math.PI*2,r=8+noise(i+9)*27;
  grains.push({...p,dx:Math.cos(angle)*r,dy:Math.sin(angle)*r,lag,size:.6+noise(i+3)*.9});
 }
 return grains;
}

/** Each changed region owns its reveal. Jobs on persistent controls keep their
 * original clock when a different region changes or another model is selected. */
export default function ParticleReveal({chapter,model,ready}:{chapter:number;model:number;ready:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null),back=useRef<HTMLCanvasElement>(null);
 const update=useRef<(chapter:number,model:number,ready:boolean)=>void>(()=>{});
 useLayoutEffect(()=>{
  const frontCanvas=canvas.current,backCanvas=back.current;
  const host=frontCanvas?.parentElement;
  if(!host||!frontCanvas||!backCanvas)return;
  const front=frontCanvas.getContext('2d'),rear=backCanvas.getContext('2d');if(!front||!rear)return;
  const jobs=new Map<HTMLElement,Burst>(),reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let first=true,lastChapter=-1,lastModel=-1,raf=0,width=0,height=0,disposed=false;
  let latest:{chapter:number;model:number;ready:boolean}|null=null,fontsReady=false;
  function stop(element:HTMLElement){element.style.removeProperty('mask-image');element.style.removeProperty('-webkit-mask-image');jobs.delete(element);}
  function clear(){
   cancelAnimationFrame(raf);raf=0;
   for(const el of jobs.keys())stop(el);
   front!.clearRect(0,0,width,height);rear!.clearRect(0,0,width,height);
  }
  function resize(){
   clear();width=host!.clientWidth;height=host!.clientHeight;const dpr=Math.min(devicePixelRatio,1.5);
   for(const [c,ctx] of [[frontCanvas,front],[backCanvas,rear]] as const){
    c!.width=Math.round(width*dpr);c!.height=Math.round(height*dpr);ctx!.setTransform(dpr,0,0,dpr,0,0);
   }
  }
  function draw(now:number){
   raf=0;front!.clearRect(0,0,width,height);rear!.clearRect(0,0,width,height);
   const tint=host!.style.getPropertyValue('--ring-light')||'#f3f2ee';
   front!.fillStyle=tint;rear!.fillStyle=tint;
   for(const job of jobs.values()){
    const t=clamp((now-job.start)/job.duration);
    if(t>=1){stop(job.element);continue;}
    const mask=job.origins.map((o,j)=>{
     const grow=ease((t-j*.047)/(.84-j*.02))*147;
     return 'radial-gradient(ellipse farthest-corner at '+o.x+'% '+o.y+'%,#000 '+Math.max(0,grow-15)+'%,transparent '+Math.max(.01,grow)+'%)';
    }).join(',');
    job.element.style.maskImage=mask;job.element.style.webkitMaskImage=mask;
    const ctx=job.behind?rear!:front!;
    for(const grain of job.grains){
     const local=clamp((t-grain.lag*.66)/.68);
     const alpha=Math.sin(local*Math.PI)*.78;if(alpha<.025)continue;
     const drift=1-ease(local);
     ctx.globalAlpha=alpha;
     ctx.fillRect(grain.x+grain.dx*drift,grain.y+grain.dy*drift,grain.size,grain.size);
    }
   }
   if(jobs.size)raf=requestAnimationFrame(draw);
  }
  function add(el:HTMLElement|null,behind=false,duration=behind?1100:860){
   if(!el)return;const rect=el.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
   jobs.set(el,{element:el,behind,grains:sample(el,rect),origins:zones.map(p=>({x:p.x*100,y:p.y*100})),start:performance.now(),duration});
   el.style.maskImage='linear-gradient(transparent,transparent)';
  }
  function sync(nextChapter:number,nextModel:number,isReady:boolean){
   latest={chapter:nextChapter,model:nextModel,ready:isReady};if(!fontsReady||!isReady)return;
   const newModel=first||nextModel!==lastModel,newChapter=first||nextChapter!==lastChapter;
   if(!reduce.matches){
    if(first)host!.querySelectorAll<HTMLElement>('[data-chrome]').forEach(el=>add(el));
    if(newModel){add(host!.querySelector('.product-heading'),true);add(host!.querySelector('.price'),true,1100);}
    if(newChapter)for(const el of jobs.keys())if(el.closest('.hud-layer[aria-hidden=true]'))stop(el);
    if(newChapter&&nextChapter>0)add(host!.querySelector('.hud-layer[aria-hidden=false] [data-panel]'));
    if(!raf&&jobs.size)raf=requestAnimationFrame(draw);
   }
   first=false;lastChapter=nextChapter;lastModel=nextModel;
  }
  update.current=sync;resize();
  void document.fonts.ready.then(()=>{if(disposed)return;fontsReady=true;if(latest)sync(latest.chapter,latest.model,latest.ready);});
  window.addEventListener('resize',resize);reduce.addEventListener('change',clear);
  return ()=>{disposed=true;clear();update.current=()=>{};window.removeEventListener('resize',resize);reduce.removeEventListener('change',clear);};
 },[]);
 useLayoutEffect(()=>{update.current(chapter,model,ready);},[chapter,model,ready]);
 return <><canvas ref={back} className="particle-reveal particle-reveal-back" aria-hidden="true"/><canvas ref={canvas} className="particle-reveal" aria-hidden="true"/></>;
}
