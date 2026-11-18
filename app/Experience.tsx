'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Stage from './Stage';
import ParticleReveal from './ParticleReveal';
import {SectionSnap,nearestChapter} from './lib/navigation';
import {chooseSlot} from './lib/gestures';
import {Brand,Glyph,MaterialHud,TechnicalHud} from './Hud';
import {CHAPTERS,KNIVES,PRODUCTS,createState,defaultConfiguration,mod,resetInspection,resetView,sectionAt,type Surface,type View} from './lib/state';

export default function Experience(){
 const state=useRef(createState()),root=useRef<HTMLElement>(null),snap=useRef(new SectionSnap());
 const [frame,setFrame]=useState({section:0,selected:0,ready:0}),[error,setError]=useState('');
 const previous=useRef(frame),[,setRevision]=useState(0);
 const refresh=useCallback(()=>setRevision(v=>v+1),[]);
 const go=useCallback((target:number)=>{
  const s=state.current;
  if(sectionAt(target)!==sectionAt(s.progress)||s.target!==target){
   if(sectionAt(s.progress)===0&&sectionAt(target)!==0)chooseSlot(s,Math.round(s.orbit));
   resetView(s);
  }
  s.target=target;s.activity++;snap.current.lock(performance.now());refresh();
 },[refresh]);
 const choose=useCallback((slot:number)=>{
  const s=state.current;
  if(mod(slot)!==s.selected){resetView(s);s.closed=0;s.exploded=0;s.cuts=[0,0,0];}
  chooseSlot(s,slot);refresh();
 },[refresh]);
 const stepKnife=useCallback((direction:number)=>{
  const s=state.current;
  if(s.ready.length<2)return;
  const anchor=Math.round(s.orbit);
  const next=anchor+direction;
  if(s.ready.includes(mod(next)))choose(next);
 },[choose]);
 const onFrame=useCallback((progress:number,selected:number,ready:number)=>{
  const section=sectionAt(progress),last=previous.current;
  if(last.section!==section||last.selected!==selected||last.ready!==ready){
   previous.current={section,selected,ready};setFrame(previous.current);
  }
 },[]);
 useEffect(()=>{
  const s=state.current,reduce=matchMedia('(prefers-reduced-motion: reduce)');
  s.reduced=reduce.matches;s.paused=reduce.matches;
  try{
   const stored=JSON.parse(localStorage.getItem('memento-knives-v46')||'null');
   if(Array.isArray(stored)&&stored.length===KNIVES.length)s.configs=stored.map(c=>{
    const next=defaultConfiguration();
    for(const k of ['blade','handle','metals'] as const){
     if(Number.isInteger(c?.[k]?.color)&&c[k].color>=0&&c[k].color<8)next[k].color=c[k].color;
     if(Number.isInteger(c?.[k]?.style)&&c[k].style>=0&&c[k].style<4)next[k].style=c[k].style;
    }
    return next;
   });
  }catch{}
  refresh();
  const wheel=(e:WheelEvent)=>{
   if(e.ctrlKey||e.metaKey||(e.target as Element).closest('input[type=range]'))return;
   e.preventDefault();
   const factor=e.deltaMode===1?18:e.deltaMode===2?innerHeight:1;
   const horizontal=Math.abs(e.deltaX)>Math.abs(e.deltaY);
   const direction=snap.current.wheel((horizontal?e.deltaX:e.deltaY)*factor,performance.now());
   if(direction){if(horizontal)stepKnife(direction);else go(Math.round(s.target)+direction);}
  };
  const key=(e:KeyboardEvent)=>{
   if((e.target as Element).closest('input,textarea,select')||e.altKey||e.ctrlKey||e.metaKey)return;
   if(e.key===' '&&(e.target as Element).closest('button,a'))return;
   if(e.repeat)return;
   switch(e.key){
    case 'ArrowDown':case 'PageDown':go(Math.round(s.target)+1);break;
    case 'ArrowUp':case 'PageUp':go(Math.round(s.target)-1);break;
    case 'ArrowLeft':stepKnife(-1);break;
    case 'ArrowRight':stepKnife(1);break;
    case 'Home':case 'Escape':go(nearestChapter(s.target,0));break;
    case '0':resetInspection(s);refresh();break;
    case ' ':s.paused=!s.paused;s.activity++;refresh();break;
    default:return;
   }
   e.preventDefault();
  };
  const onReduce=()=>{s.reduced=reduce.matches;s.paused=reduce.matches;refresh();};
  window.addEventListener('wheel',wheel,{passive:false});window.addEventListener('keydown',key);reduce.addEventListener('change',onReduce);
  return ()=>{window.removeEventListener('wheel',wheel);window.removeEventListener('keydown',key);reduce.removeEventListener('change',onReduce);};
 },[go,stepKnife,refresh]);
 const {selected,section,ready}=frame,s=state.current;
 const setRange=(key:'closed'|'exploded'|'zoom',value:number)=>{s[key]=value;s.activity++;refresh();};
 const material=(surface:Surface,key:'color'|'style',value:number)=>{
  s.configs[selected][surface][key]=value;
  try{localStorage.setItem('memento-knives-v46',JSON.stringify(s.configs));}catch{}
  refresh();
 };
 const preset=(v:View)=>{s.yaw=0;s.pitch=0;s.view=v;refresh();};
 const product=PRODUCTS[selected];
 return <main ref={root} className="experience" data-version="50" data-ui-pending={ready===0&&!error} data-section={CHAPTERS[section].toLowerCase()} data-model={KNIVES[selected]}>
  <div className="environment" aria-hidden="true"/>
  <h1 className="atmospheric-title" data-product-name>{KNIVES[selected]}</h1>
  <Stage state={state} onFrame={onFrame} onError={setError} onInteract={refresh} onChapter={go} onSelect={choose}/>
  <div className="optical-blur" aria-hidden="true"><i/><i/><i/></div>
  <header><button className="brand" data-chrome aria-label="Torna allo stage" onClick={()=>go(nearestChapter(s.target,0))}><Brand/></button></header>
  <div className="item-arrows" role="group" aria-label="Selezione coltello">
   <button className="item-arrow prev" data-chrome aria-label="Coltello precedente" title="Coltello precedente" disabled={!s.ready.includes(mod(selected-1))} onClick={()=>stepKnife(-1)}><Glyph name="left" size={21}/></button>
   <button className="item-arrow next" data-chrome aria-label="Coltello successivo" title="Coltello successivo" disabled={!s.ready.includes(mod(selected+1))} onClick={()=>stepKnife(1)}><Glyph name="right" size={21}/></button>
  </div>
  <section className="hud-layer hero-layer" aria-label="Stage" aria-hidden={section!==0} inert={section!==0}>
   <div className="hero-copy" data-summary><p>{product.copy}</p><div className="price" aria-label={'Prezzo dimostrativo '+product.price+' euro'}><span className="currency">€</span>{product.price}</div></div>
   <button className="play-control" data-chrome title={s.paused?'Riprendi sequenza':'Pausa sequenza'} aria-label={s.paused?'Riprendi sequenza':'Pausa sequenza'} aria-pressed={s.paused} onClick={()=>{s.paused=!s.paused;s.activity++;refresh();}}><Glyph name={s.paused?'play':'pause'} size={17}/></button>
   <div className="hero-actions" data-chrome>
    <button aria-label={s.closed>.5?'Apri lama':'Chiudi lama'} title={s.closed>.5?'Apri lama':'Chiudi lama'} aria-pressed={s.closed>.5} onClick={()=>setRange('closed',s.closed>.5?0:1)}><Glyph name="blade"/></button>
    <button aria-label={s.exploded>.5?'Ricomponi modello':'Esplodi modello'} title={s.exploded>.5?'Ricomponi modello':'Esplodi modello'} aria-pressed={s.exploded>.5} onClick={()=>setRange('exploded',s.exploded>.5?0:1)}><Glyph name="explode"/></button>
   </div>
  </section>
  {(['blade','handle','metals'] as const).map((surface,i)=><section key={surface} className="hud-layer material-layer" aria-hidden={section!==i+1} inert={section!==i+1} aria-label={'Materiali '+CHAPTERS[i+1]}><MaterialHud surface={surface} config={s.configs[selected]} onChange={material}/></section>)}
  <section className="hud-layer technical-layer" aria-hidden={section!==4} inert={section!==4} aria-label="Inspect / Explore"><TechnicalHud value={s} onValue={setRange} onView={preset} onCut={(i,v)=>{s.cuts[i]=v;refresh();}} onReset={()=>{resetInspection(s);refresh();}}/></section>
  <nav className="sequence-nav" data-chrome aria-label="Percorso in cinque sezioni">
   <button className="sequence-arrow" aria-label="Sezione precedente" onClick={()=>go(Math.round(s.target)-1)}><Glyph name="left" size={21}/></button>
   <div className="sequence-dots">{CHAPTERS.map((name,i)=><button key={name} className="sequence-dot" title={name} aria-label={'Vai a '+name} aria-current={section===i?'step':undefined} onClick={()=>go(nearestChapter(s.target,i))}><span/></button>)}</div>
   <button className="sequence-arrow" aria-label={section===4?'Ritorna allo stage':'Sezione successiva'} onClick={()=>go(Math.round(s.target)+1)}><Glyph name="right" size={21}/></button>
  </nav>
  <ParticleReveal root={root} chapter={section} model={selected} ready={ready>0}/>
  <span className="sr-only" role="status" aria-live="polite">{KNIVES[selected]} — {CHAPTERS[section]}</span>
  {ready<5&&!error&&<div className={'loading '+(ready?'quiet':'')} role="status"><span className="load-mark"/><span>{ready?'COLLECTION':'PREPARING'}<small>{ready} / 5</small></span></div>}
  {error&&<div className="error-message" role="alert"><p>{error}</p><button onClick={()=>location.reload()}>Riprova</button></div>}
 </main>;
}
