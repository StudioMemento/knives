'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Stage from './Stage';
import ParticleReveal from './ParticleReveal';
import {SectionSnap,swipeDestination,nearestChapter} from './lib/navigation';
import {Brand,Glyph,MaterialHud,TechnicalHud} from './Hud';
import {CHAPTERS,KNIVES,createState,defaultConfiguration,mod,nextAnchor,resetInspection,sectionAt,type Surface,type View} from './lib/state';

export default function Experience(){
 const state=useRef(createState());const snap=useRef(new SectionSnap());const horizontalSnap=useRef(new SectionSnap());
 const [section,setSection]=useState(0),[selected,setSelected]=useState(0),[ready,setReady]=useState(0),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const sections=useRef<(HTMLElement|null)[]>([]),root=useRef<HTMLElement>(null),live=useRef<HTMLSpanElement>(null);
 const refresh=()=>setRevision(v=>v+1);
 const navigate=useCallback((direction:number)=>{state.current.focus=null;state.current.target=nextAnchor(state.current.target,direction);snap.current.lock(performance.now());},[]);
 const selectKnife=useCallback((direction:number)=>{
  const s=state.current;if(sectionAt(s.progress)!==0||s.ready.length<2)return;
  const current=Math.round(s.orbit);let next=current+direction;
  for(let i=0;i<KNIVES.length&&!s.ready.includes(mod(next));i++)next+=direction;
  s.orbit=next;
 },[]);
 const onFrame=useCallback((p:number,id:number,loaded:number,focus:number)=>{
  const chapter=sectionAt(p),u=mod(p);
  sections.current.forEach((el,i)=>{if(!el)return;let d=Math.abs(u-i);d=Math.min(d,5-d);const a=Math.max(0,1-d/0.68);el.style.opacity=String(a*a*(3-2*a));el.style.pointerEvents='none';el.setAttribute('aria-hidden',d>=.48?'true':'false');if('inert' in el)el.inert=d>=.48;});
  if(root.current){root.current.dataset.section=CHAPTERS[chapter].toLowerCase();root.current.dataset.model=KNIVES[id];root.current.dataset.progress=u.toFixed(3);root.current.dataset.dragging=String(state.current.dragging);root.current.style.setProperty('--hero-focus',String(focus));root.current.style.setProperty('--focus-blur',state.current.focus?'1':'0');root.current.style.setProperty('--detail-opacity',String(Math.min(1,Math.min(u,5-u)*2)));root.current.style.setProperty('--blur-angle','135deg');}
  setSection(old=>old===chapter?old:chapter);setSelected(old=>old===id?old:id);setReady(old=>old===loaded?old:loaded);
 },[]);
 useEffect(()=>{
  const s=state.current;const reduce=matchMedia('(prefers-reduced-motion: reduce)');s.reduced=reduce.matches;s.paused=reduce.matches;
  try{const raw=JSON.parse(localStorage.getItem('memento-knives-v46')||'null');if(Array.isArray(raw)&&raw.length===5)s.configs=raw.map(c=>{const next=defaultConfiguration();for(const k of ['blade','handle','metals'] as const){if(Number.isInteger(c?.[k]?.color)&&c[k].color>=0&&c[k].color<8)next[k].color=c[k].color;if(Number.isInteger(c?.[k]?.style)&&c[k].style>=0&&c[k].style<4)next[k].style=c[k].style;}return next;});}catch{}refresh();
  const onWheel=(e:WheelEvent)=>{
   if((e.target as Element).closest('input'))return;
   if(e.ctrlKey||e.metaKey){if(sectionAt(s.progress)===4){e.preventDefault();s.zoom=Math.max(.8,Math.min(1.35,s.zoom-e.deltaY*.002));}return;}
   e.preventDefault();
   const factor=e.deltaMode===1?18:e.deltaMode===2?innerHeight:1,now=performance.now();
   if(Math.abs(e.deltaX)>Math.abs(e.deltaY)&&sectionAt(s.progress)===0){const d=horizontalSnap.current.wheel(e.deltaX*factor,now);if(d)selectKnife(d);return;}
   const d=snap.current.wheel(e.deltaY*factor,now);if(d){s.focus=null;s.target=nextAnchor(s.target,d);}
  };
  type Gesture={id:number;x:number;y:number;lastX:number;lastTime:number;velocity:number;startOrbit:number;startChapter:number;axis:'x'|'y'|null;touch:boolean};
  let gesture:Gesture|null=null;const host=root.current!;
  const pointerDown=(e:PointerEvent)=>{
   if(e.button!==0||(e.target as Element).closest('button,input,a,textarea')||sectionAt(s.progress)===4)return;
   gesture={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastTime:e.timeStamp,velocity:0,startOrbit:s.orbit,startChapter:Math.round(s.target),axis:null,touch:e.pointerType!=='mouse'};
   host.setPointerCapture(e.pointerId);
  };
  const pointerMove=(e:PointerEvent)=>{
   if(!gesture||e.pointerId!==gesture.id)return;const g=gesture,dx=e.clientX-g.x,dy=e.clientY-g.y;
   if(!g.axis&&Math.hypot(dx,dy)>9){
    if(sectionAt(s.progress)===0&&Math.abs(dx)>Math.abs(dy)*1.15)g.axis='x';
    else if(g.touch&&Math.abs(dy)>Math.abs(dx))g.axis='y';
   }
   const elapsed=Math.max(8,e.timeStamp-g.lastTime);g.velocity=(e.clientX-g.lastX)/elapsed;g.lastX=e.clientX;g.lastTime=e.timeStamp;
   if(g.axis==='x'){s.dragging=true;s.dragPhase=g.startOrbit-dx/Math.max(180,innerWidth*.42);}
   if(g.axis==='y'){s.focus=null;s.target=g.startChapter+Math.max(-.42,Math.min(.42,-dy/innerHeight));}
  };
  const pointerUp=(e:PointerEvent)=>{
   if(!gesture||e.pointerId!==gesture.id)return;const g=gesture;gesture=null;
   if(g.axis==='x'){s.dragging=false;s.orbit=swipeDestination(g.startOrbit,e.clientX-g.x,innerWidth,g.velocity);}
   if(g.axis==='y'){const dy=e.clientY-g.y;s.target=g.startChapter+(Math.abs(dy)>44?Math.sign(-dy):0);snap.current.lock(performance.now());}
   if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId);
   refresh();
  };
  const pointerCancel=(e:PointerEvent)=>{if(!gesture)return;s.dragging=false;s.orbit=Math.round(s.orbit);s.target=gesture.startChapter;gesture=null;if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId);refresh();};
  host.addEventListener('pointerdown',pointerDown);host.addEventListener('pointermove',pointerMove);host.addEventListener('pointerup',pointerUp);host.addEventListener('pointercancel',pointerCancel);
  const onKey=(e:KeyboardEvent)=>{if((e.target as Element).closest('input,textarea,button,a'))return;if(['ArrowDown','ArrowUp','PageDown','PageUp','ArrowLeft','ArrowRight','Home','Escape','0',' '].includes(e.key))e.preventDefault();if(e.key==='ArrowDown'||e.key==='PageDown')navigate(1);if(e.key==='ArrowUp'||e.key==='PageUp')navigate(-1);if(e.key==='ArrowLeft')selectKnife(-1);if(e.key==='ArrowRight')selectKnife(1);if(e.key==='Home'||e.key==='Escape')s.target=Math.round(s.progress/5)*5;if(e.key==='0'){resetInspection(s);refresh();}if(e.key===' '){s.paused=!s.paused;refresh();}};
  const onReduce=()=>{s.reduced=reduce.matches;s.paused=reduce.matches;refresh();};
  window.addEventListener('wheel',onWheel,{passive:false});window.addEventListener('keydown',onKey);reduce.addEventListener('change',onReduce);
  return()=>{host.removeEventListener('pointerdown',pointerDown);host.removeEventListener('pointermove',pointerMove);host.removeEventListener('pointerup',pointerUp);host.removeEventListener('pointercancel',pointerCancel);window.removeEventListener('wheel',onWheel);window.removeEventListener('keydown',onKey);reduce.removeEventListener('change',onReduce);};
 },[navigate,selectKnife]);
 const material=(surface:Surface,key:'color'|'style',value:number)=>{state.current.configs[selected][surface][key]=value;try{localStorage.setItem('memento-knives-v46',JSON.stringify(state.current.configs));}catch{}refresh();};
 const action=(name:'blade'|'explode'|'orbit'|'zoom')=>{const s=state.current;s.focus=null;if(name==='blade')s.closed=s.closed>.5?0:1;if(name==='explode')s.exploded=s.exploded>.5?0:1;if(name==='orbit')s.spin=!s.spin;if(name==='zoom'){s.zoom=s.zoom>1?1:1.3;s.focus=s.zoom>1?[0,0,0]:null;}refresh();};
 const preset=(v:View)=>{const s=state.current;s.view=v;s.yaw=0;s.pitch=0;s.focus=null;refresh();};
 return <main ref={root} className="experience" data-version="49" data-ui-pending={ready===0&&!error} data-section="collection" data-model={KNIVES[selected]} data-revision={revision}>
  <div className="environment" aria-hidden="true"/>
  <Stage state={state} onFrame={onFrame} onError={setError} onInteract={refresh}/>
  <div className="diagonal-blur" aria-hidden="true"/>
  <div className="focus-bokeh" aria-hidden="true"/>
  <div className="atmospheric-title" data-fx-text aria-hidden="true">{KNIVES[selected]}</div>
  <header><button className="brand" aria-label="Torna alla collezione" onClick={()=>{state.current.target=Math.round(state.current.progress/5)*5;}}><Brand/></button></header>
  <section ref={el=>{sections.current[0]=el;}} className="hud-layer hero-layer" data-ui aria-label="Collezione">
   <div className="hero-copy"><h1 data-fx-text>{KNIVES[selected]}</h1><p data-fx-text>STRUTTURA IN METALLO<br/>INSERTI TESTURIZZATI</p><div data-fx-text className="price" aria-label="Prezzo dimostrativo 179 euro"><span className="currency">€</span>179</div></div>

   <button data-fx-control className="play-control" aria-label={state.current.paused?'Riprendi danza':'Pausa danza'} aria-pressed={state.current.paused} onClick={()=>{state.current.paused=!state.current.paused;refresh();}}><Glyph name={state.current.paused?'play':'pause'} size={16}/></button>
  </section>
  {(['blade','handle','metals'] as const).map((surface,i)=><section key={surface} className="hud-layer material-layer" ref={el=>{sections.current[i+1]=el;}} data-ui aria-hidden="true" inert aria-label={'Configura '+surface}><MaterialHud surface={surface} config={state.current.configs[selected]} onChange={material}/></section>)}
  <section className="hud-layer technical-layer" ref={el=>{sections.current[4]=el;}} data-ui aria-hidden="true" inert aria-label="Esplorazione tecnica"><TechnicalHud value={state.current} onAction={action} onView={preset} onCut={(i,v)=>{state.current.cuts[i]=v;refresh();}} onReset={()=>{resetInspection(state.current);refresh();}}/></section>
  <nav className="sequence-nav" aria-label="Percorso in cinque sezioni">
   <button data-fx-control className="sequence-arrow" aria-label="Sezione precedente" onClick={()=>navigate(-1)}><Glyph name="left" size={24}/></button>
   <div className="sequence-dots">{CHAPTERS.map((name,i)=><button data-fx-control key={name} className="sequence-dot" aria-label={'Vai a '+name} aria-current={section===i?'step':undefined} onClick={()=>{const s=state.current;s.focus=null;s.target=nearestChapter(s.target,i);snap.current.lock(performance.now());}}><span/></button>)}</div>
   <button data-fx-control className="sequence-arrow" aria-label={section===4?'Ritorna alla danza':'Sezione successiva'} onClick={()=>navigate(1)}><Glyph name="right" size={24}/></button>
  </nav>

  <ParticleReveal root={root} chapter={section} model={selected} ready={ready>0}/>
  <span className="sr-only" role="status" aria-live="polite" ref={live}>{KNIVES[selected]} — {CHAPTERS[section]}</span>
  {ready<5&&!error&&<div className={'loading '+(ready?'quiet':'')} role="status"><span className="load-mark"/><span>{ready?'COLLECTION':'PREPARING'}<small>{ready} / 5</small></span></div>}
  {error&&<div className="error-message" role="alert"><p>{error}</p><button onClick={()=>location.reload()}>Riprova</button></div>}
 </main>;
}
