'use client';
import {useLayoutEffect,useRef} from 'react';

type Grain = {x:number;y:number;dx:number;dy:number;delay:number};
const noise = (n:number) => {const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};

// Only the loose particles use a canvas. The type and every control keep their
// native ink throughout loading, chapter changes and interrupted transitions.
function sampleText(element: HTMLElement): Grain[] {
 const rect=element.getBoundingClientRect();
 if(rect.width<=0||rect.height<=0)return [];
 const scale=Math.min(1,420/rect.width),buffer=document.createElement('canvas');
 buffer.width=Math.ceil(rect.width*scale)+2;buffer.height=Math.ceil(rect.height*scale)+2;
 const ctx=buffer.getContext('2d',{willReadFrequently:true});
 if(!ctx)return [];
 ctx.scale(scale,scale);ctx.textBaseline='top';
 const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT),range=document.createRange();
 for(let node=walker.nextNode();node;node=walker.nextNode()){
  const value=node.textContent,el=node.parentElement;
  if(!value?.trim()||!el)continue;
  const style=getComputedStyle(el);
  ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  // DOM ranges carry the actual tracking of the fitted word, including its last letter.
  for(let i=0;i<value.length;i++){
   range.setStart(node,i);range.setEnd(node,i+1);
   const glyph=range.getBoundingClientRect();
   ctx.fillText(value[i],glyph.left-rect.left,glyph.top-rect.top);
  }
 }
 const pixels=ctx.getImageData(0,0,buffer.width,buffer.height).data,points:{x:number;y:number}[]=[];
 for(let y=0;y<buffer.height;y+=2)for(let x=0;x<buffer.width;x+=2){
  if(pixels[(y*buffer.width+x)*4+3]>64)points.push({x:rect.left+x/scale,y:rect.top+y/scale});
 }
 const count=Math.min(180,points.length);
 return Array.from({length:count},(_,i)=>{
  const p=points[Math.floor((i+noise(i))*points.length/count)],angle=noise(i+1)*Math.PI*2,r=4+noise(i+9)*12;
  return {...p,dx:Math.cos(angle)*r,dy:Math.sin(angle)*r,delay:noise(i+27)*.20};
 });
}

export default function ParticleReveal({model,ready}:{model:number;ready:boolean}) {
 const ref=useRef<HTMLCanvasElement>(null);
 useLayoutEffect(()=>{
  const canvas=ref.current,host=canvas?.parentElement,reduce=matchMedia('(prefers-reduced-motion: reduce)');
  if(!ready||!canvas||!host||reduce.matches)return;
  const ink=canvas.getContext('2d');if(!ink)return;
  const width=host.clientWidth,height=host.clientHeight,dpr=Math.min(devicePixelRatio,1.5);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ink.setTransform(dpr,0,0,dpr,0,0);
  const grains=Array.from(host.querySelectorAll<HTMLElement>('[data-product-name],.price')).flatMap(sampleText);
  let raf=0;const start=performance.now(),duration=460;
  function clear(){cancelAnimationFrame(raf);ink!.clearRect(0,0,width,height);}
  function draw(now:number){
   ink!.clearRect(0,0,width,height);
   const t=(now-start)/duration;if(t>=1)return;
   ink!.fillStyle=host!.style.getPropertyValue('--ring-light')||'#f3f2ee';
   for(const g of grains){
    const u=Math.max(0,Math.min(1,(t-g.delay)/(1-g.delay)));
    ink!.globalAlpha=Math.sin(Math.PI*u)*.46;
    ink!.fillRect(g.x+g.dx*(1-u)**2,g.y+g.dy*(1-u)**2,1.1,1.1);
   }
   raf=requestAnimationFrame(draw);
  }
  raf=requestAnimationFrame(draw);
  window.addEventListener('resize',clear);reduce.addEventListener('change',clear);
  return ()=>{clear();window.removeEventListener('resize',clear);reduce.removeEventListener('change',clear);};
 },[model,ready]);
 return <canvas ref={ref} className="particle-reveal" aria-hidden="true"/>;
}
