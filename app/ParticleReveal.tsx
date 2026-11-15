'use client';
import {useLayoutEffect,useRef,type RefObject} from 'react';

type Grain={x:number;y:number;u:number;dx:number;dy:number;size:number;seed:number};
type Burst={element:HTMLElement;grains:Grain[];start:number;duration:number;leaving:boolean;opacity:number;behind:boolean};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
// A deterministic field: interrupting a reveal never produces a new random flash.
const noise=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};

/** Fine grains sampled from real glyphs and HUD outlines. The visible DOM stays
 * accessible/clickable; a short-lived canvas supplies the reference's dust FX.
 * No full-screen readback, WebGL postprocess, continuous particle simulation or
 * screenshot rasterization. A reveal costs work only while it is visible. */
export default function ParticleReveal({root,chapter,model,ready}:{root:RefObject<HTMLElement|null>;chapter:number;model:number;ready:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null),backCanvas=useRef<HTMLCanvasElement>(null);
 const running=useRef<{bursts:Burst[];raf:number;previous:HTMLElement[];started:boolean}>({bursts:[],raf:0,previous:[],started:false});
 useLayoutEffect(()=>{
  const surface=canvas.current,host=root.current;if(!surface||!host||!ready)return;
  const back=backCanvas.current,backCtx=back?.getContext('2d',{alpha:true});if(!back||!backCtx)return;
  const state=running.current,ctx=surface.getContext('2d',{alpha:true});if(!ctx)return;
  let disposed=false;
  const reset=()=>{cancelAnimationFrame(state.raf);for(const burst of state.bursts){burst.element.style.removeProperty('mask-image');burst.element.style.removeProperty('-webkit-mask-image');}state.bursts=[];ctx.clearRect(0,0,innerWidth,innerHeight);backCtx.clearRect(0,0,innerWidth,innerHeight);};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){reset();return;}
  const paintGlyph=(element:HTMLElement):{x:number;y:number}[]=>{
   const rect=element.getBoundingClientRect(),scale=Math.min(1,260/Math.max(1,rect.width)),buffer=document.createElement('canvas');
   buffer.width=Math.ceil(rect.width*scale)+4;buffer.height=Math.ceil(rect.height*scale)+4;
   const ink=buffer.getContext('2d',{willReadFrequently:true});if(!ink)return [];
   ink.scale(scale,scale);ink.fillStyle='white';ink.textBaseline='top';
   const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);let node:Node|null;
   while((node=walker.nextNode())){
    const text=node.textContent||'';if(!text.trim())continue;
    const parent=node.parentElement!,css=getComputedStyle(parent),range=document.createRange();range.selectNodeContents(node);
    const bounds=range.getBoundingClientRect();
    ink.font=`${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
    if('letterSpacing' in ink)(ink as CanvasRenderingContext2D & {letterSpacing:string}).letterSpacing=css.letterSpacing;
    ink.fillText(text,bounds.left-rect.left,bounds.top-rect.top);
   }
   const pixels=ink.getImageData(0,0,buffer.width,buffer.height).data,points:{x:number;y:number}[]=[];
   for(let y=0;y<buffer.height;y+=2)for(let x=0;x<buffer.width;x+=2){if(pixels[(y*buffer.width+x)*4+3]>90)points.push({x:rect.left+x/scale,y:rect.top+y/scale});}
   return points;
  };
  const sample=(element:HTMLElement):Grain[]=>{
   const rect=element.getBoundingClientRect();let points:{x:number;y:number}[]=[];
   if(element.hasAttribute('data-fx-text'))points=paintGlyph(element);
   else{
    const paths=element.querySelectorAll<SVGGeometryElement>('path,line,polyline,polygon,circle,rect');
    for(const path of paths){if(typeof path.getTotalLength!=='function')continue;const matrix=path.getScreenCTM();if(!matrix)continue;
     const length=path.getTotalLength();for(let d=0;d<length;d+=.65){const p=path.getPointAtLength(d).matrixTransform(matrix);points.push({x:p.x,y:p.y});}
    }
    if(!points.length){
     // Swatches, finish diamonds and slider tracks also condense from particles.
     const diamond=element.classList.contains('finish');
     for(let n=0;n<72;n++){const u=n/72;let x:number,y:number;
      if(diamond){const a=u*Math.PI*2;x=rect.width*.5+Math.cos(a)*rect.width*.46;y=rect.height*.5+Math.sin(a)*rect.height*.46;const d=Math.abs(Math.cos(a))+Math.abs(Math.sin(a));x=rect.width*.5+(x-rect.width*.5)/d;y=rect.height*.5+(y-rect.height*.5)/d;}
      else {const perimeter=(rect.width+rect.height)*2,d=u*perimeter;x=d<rect.width?d:d<rect.width+rect.height?rect.width:d<2*rect.width+rect.height?2*rect.width+rect.height-d:0;y=d<rect.width?0:d<rect.width+rect.height?d-rect.width:d<2*rect.width+rect.height?rect.height:perimeter-d;}
      points.push({x:rect.left+x,y:rect.top+y});
     }
    }
   }
   const step=Math.max(1,Math.ceil(points.length/190));
   return points.filter((_,i)=>i%step===0).map((p,i)=>({x:p.x,y:p.y,u:clamp((p.x-rect.left)/Math.max(1,rect.width)),dx:18+noise(i+rect.left)*45,dy:(noise(i*2+rect.top)-.5)*44,size:.55+noise(i+7)*.8,seed:noise(i+rect.left+rect.top)}));
  };
  const run=async()=>{
   await document.fonts.ready;if(disposed)return;reset();
   const dpr=Math.min(devicePixelRatio,1.5);surface.width=Math.round(innerWidth*dpr);surface.height=Math.round(innerHeight*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);back.width=surface.width;back.height=surface.height;backCtx.setTransform(dpr,0,0,dpr,0,0);
   const section=host.querySelectorAll<HTMLElement>('.hud-layer')[chapter];
   const current=[...section.querySelectorAll<HTMLElement>('[data-fx-text],[data-fx-control]')];
   const title=host.querySelector<HTMLElement>(chapter===0?'.hero-copy h1':'.atmospheric-title');
   if(title&&!current.includes(title))current.push(title);
   current.push(...Array.from(host.querySelectorAll<HTMLElement>('header [data-fx-text],.sequence-nav [data-fx-control]')).filter(el=>!current.includes(el)));
   const now=performance.now();
   // Exit is a drifting remnant; only entering content receives a moving mask.
   const outgoing=state.previous.filter(el=>!current.includes(el)&&el.isConnected);
   state.bursts=outgoing.map(element=>({element,grains:sample(element),start:now,duration:950,leaving:true,opacity:.48,behind:element.classList.contains('atmospheric-title')}));
   for(const element of current){const low=element.classList.contains('atmospheric-title');state.bursts.push({element,grains:sample(element),start:now,duration:low?2150:1850,leaving:false,opacity:low?.45:.82,behind:low});element.style.maskImage='linear-gradient(90deg,transparent,transparent)';}
   // Bound work on large screens and dense technical HUDs, including outgoing UI.
   let budget=1800;for(const burst of state.bursts){const limit=Math.max(24,Math.floor(1800/state.bursts.length));burst.grains=burst.grains.slice(0,Math.min(limit,budget));budget-=burst.grains.length;}
   state.previous=current;state.started=true;
   const frame=(clock:number)=>{
    if(disposed)return;ctx.clearRect(0,0,innerWidth,innerHeight);backCtx.clearRect(0,0,innerWidth,innerHeight);let alive=false;
    for(const burst of state.bursts){const t=clamp((clock-burst.start)/burst.duration);
     if(!burst.leaving){if(t>=1){burst.element.style.removeProperty('mask-image');burst.element.style.removeProperty('-webkit-mask-image');continue;}
      const front=(t*1.20-.10)*100;burst.element.style.maskImage=`linear-gradient(90deg,#000 ${front-8}%,transparent ${front+8}%)`;
     }else if(t>=1)continue;
     alive=true;
     const owner=burst.element.closest<HTMLElement>('.hud-layer');const layer=owner?Number(owner.style.opacity||1):1;
     for(const grain of burst.grains){const local=clamp((t-grain.u*.35)/.65),settle=ease(local),drift=burst.leaving?settle:1-settle;
      const alpha=(burst.leaving?(1-t)*.52:Math.sin(Math.PI*local))*burst.opacity*(burst.leaving?1:layer);
      if(alpha<.015)continue;
      const x=grain.x+grain.dx*drift,y=grain.y+grain.dy*drift+Math.sin(local*5+grain.seed*6)*8*drift;
      const paint=burst.behind?backCtx:ctx;paint.fillStyle=`rgba(236,239,242,${alpha.toFixed(3)})`;paint.fillRect(x,y,grain.size,grain.size);
     }
    }
    if(alive)state.raf=requestAnimationFrame(frame);else {ctx.clearRect(0,0,innerWidth,innerHeight);backCtx.clearRect(0,0,innerWidth,innerHeight);state.bursts=[];}
   };state.raf=requestAnimationFrame(frame);
  };void run();
  const resize=()=>reset();window.addEventListener('resize',resize);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');reduce.addEventListener('change',resize);
  return()=>{disposed=true;reset();window.removeEventListener('resize',resize);reduce.removeEventListener('change',resize);};
 },[root,chapter,model,ready]);
 return <><canvas ref={backCanvas} className="particle-reveal particle-reveal-back" aria-hidden="true"/><canvas ref={canvas} className="particle-reveal" aria-hidden="true"/></>;
}
