'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Stage from './Stage';
import {CATALOGUE_KEY,SURFACES,catalogueChoices} from './lib/catalogue';
import ParticleReveal from './ParticleReveal';
import {SectionSnap,nearestChapter} from './lib/navigation';
import {chooseSlot} from './lib/gestures';
import {Brand,Glyph,MaterialHud,PoseHud,TechnicalHud,VariantRecall} from './Hud';
import {CHAPTERS,KNIVES,PREVIOUS_ORDER,PRODUCTS,createState,defaultConfiguration,mod,resetInspection,resetView,sectionAt,type Surface,type View} from './lib/state';

const chapterIcons=['stageIcon','bladeIcon','handleIcon','detailsIcon','inspectIcon'] as const;

export default function Experience(){
 const state=useRef(createState()),root=useRef<HTMLElement>(null),snap=useRef(new SectionSnap());
 const [frame,setFrame]=useState({section:0,selected:0,ready:0}),[error,setError]=useState('');
 const choices=useRef<ReturnType<typeof catalogueChoices>|null>(null);
 if(choices.current===null)choices.current=catalogueChoices();
 const lastKind=useRef(new Map<string,'style'|'color'>());
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
  chooseSlot(s,slot);refresh();
 },[refresh]);
 const stepKnife=useCallback((direction:number)=>{
  const s=state.current;
  if(s.ready.length<2)return;
  const anchor=s.knifeDestination??Math.round(s.orbit);
  const next=anchor+direction;
  if(s.ready.includes(mod(next)))choose(next);
 },[choose]);
 const onFrame=useCallback((_progress:number,selected:number,ready:number)=>{
  const section=sectionAt(state.current.target),last=previous.current;
  if(last.section!==section||last.selected!==selected||last.ready!==ready){
   previous.current={section,selected,ready};setFrame(previous.current);
  }
 },[]);
 useEffect(()=>{
  const s=state.current,reduce=matchMedia('(prefers-reduced-motion: reduce)');
  s.reduced=reduce.matches;s.paused=reduce.matches;
  try{
   const stored=JSON.parse(localStorage.getItem('memento-knives-v46')||'null');
   if(Array.isArray(stored)&&stored.length===KNIVES.length)s.configs=KNIVES.map(id=>{
    const c=stored[PREVIOUS_ORDER.indexOf(id)];
    const next=defaultConfiguration();
    for(const k of ['blade','handle','metals'] as const){
     if(Number.isInteger(c?.[k]?.color)&&c[k].color>=0&&c[k].color<8)next[k].color=c[k].color;
     if(Number.isInteger(c?.[k]?.style)&&c[k].style>=0&&c[k].style<4)next[k].style=c[k].style;
    }
    return next;
   });
  }catch{}
  try{choices.current=catalogueChoices(JSON.parse(localStorage.getItem(CATALOGUE_KEY)||localStorage.getItem('memento-knives-ui-v51')||'null'));}catch{}
  refresh();
  let wheelAxis:'horizontal'|'vertical'|null=null,lastWheel=-Infinity;
  const wheel=(e:WheelEvent)=>{
   if(e.ctrlKey||e.metaKey||(e.target as Element).closest('input[type=range]'))return;
   e.preventDefault();
   const now=performance.now(),factor=e.deltaMode===1?18:e.deltaMode===2?innerHeight:1;
   if(now-lastWheel>170||!wheelAxis)wheelAxis=Math.abs(e.deltaX)>Math.abs(e.deltaY)?'horizontal':'vertical';
   lastWheel=now;
   if(wheelAxis==='horizontal'){s.yaw-=e.deltaX*factor*.006;s.activity++;return;}
   const direction=snap.current.wheel(e.deltaY*factor,now);
   if(direction)go(Math.round(s.target)+direction);
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
 const isCustom=section>=1&&section<=3;
 const setRange=(key:'closed'|'exploded'|'zoom',value:number)=>{
  if(isCustom&&key!=='zoom')(key==='closed'?s.customFold:s.customExplode)[section-1]=value;
  else s[key]=value;
  s.activity++;refresh();
 };
 const material=(surface:Surface,key:'color'|'style',value:number)=>{
  choices.current![selected][surface][key]=value;
  lastKind.current.set(KNIVES[selected]+surface,key);
  try{localStorage.setItem(CATALOGUE_KEY,JSON.stringify(Object.fromEntries(KNIVES.map((id,i)=>[id,choices.current![i]]))));}catch{}
  refresh();
 };
 const preset=(v:View)=>{s.yaw=0;s.pitch=0;s.view=v;refresh();};
 const selectedConfig=choices.current[selected];
 const surface=isCustom?SURFACES[section-1]:null;
 const product=PRODUCTS[selected],knifeAnchor=s.knifeDestination??Math.round(s.orbit);
 return <main ref={root} className="experience" data-version="52" data-ui-pending={ready===0&&!error} data-section={CHAPTERS[section].toLowerCase()} data-model={KNIVES[selected]}>
  <div className="environment" aria-hidden="true"/>
  <h1 className="atmospheric-title" data-product-name>{KNIVES[selected]}</h1>
  <Stage state={state} onFrame={onFrame} onError={setError} onInteract={refresh} onChapter={go}/>
  <div className="bottom-veil" aria-hidden="true"><i/><i/><i/></div>
  {surface&&<VariantRecall surface={surface} model={selected} config={selectedConfig} kind={lastKind.current.get(KNIVES[selected]+surface)??'style'}/>}
  <header><button className="brand" data-chrome aria-label="Torna allo stage" onClick={()=>go(nearestChapter(s.target,0))}><Brand/></button></header>
  <section className="hud-layer hero-layer" aria-label="Stage" aria-hidden={section!==0} inert={section!==0}>
   <div className="hero-copy hud-panel" data-panel data-summary><p>{product.copy}</p><div className="price" aria-label={'Prezzo dimostrativo '+product.price+' euro'}><span className="currency">€</span>{product.price}</div>
   </div>
  </section>
  {SURFACES.map((surface,i)=><section key={surface} className="hud-layer material-layer" aria-hidden={section!==i+1} inert={section!==i+1} aria-label={'Materiali '+CHAPTERS[i+1]}><MaterialHud surface={surface} model={selected} config={selectedConfig} onChange={material}/></section>)}
  <section className="hud-layer technical-layer" aria-hidden={section!==4} inert={section!==4} aria-label="Inspect / Explore"><TechnicalHud value={s} onValue={setRange} onView={preset} onCut={(i,v)=>{s.cuts[i]=v;refresh();}} onReset={()=>{resetInspection(s);refresh();}}/></section>
  <PoseHud value={isCustom?{...s,closed:s.customFold[section-1],exploded:s.customExplode[section-1]}:s} onValue={setRange}/>
  <nav className="sequence-nav" data-chrome aria-label="Navigazione showroom">
   <button type="button" className="knife-step" aria-label="Coltello precedente" title="Coltello precedente"
    disabled={!s.ready.includes(mod(knifeAnchor-1))} onClick={()=>stepKnife(-1)}><Glyph name="left" size={32}/></button>
   {CHAPTERS.map((name,i)=><button key={name} type="button" className="chapter-button" aria-label={'Vai a '+name}
    aria-current={section===i?'step':undefined} onClick={()=>go(nearestChapter(s.target,i))}>
    <span className="nav-tile"><Glyph name={chapterIcons[i]} size={23}/></span><span className="nav-tip" aria-hidden="true">{name}</span>
   </button>)}
   <button type="button" className="knife-step" aria-label="Coltello successivo" title="Coltello successivo"
    disabled={!s.ready.includes(mod(knifeAnchor+1))} onClick={()=>stepKnife(1)}><Glyph name="right" size={32}/></button>
  </nav>
  <ParticleReveal root={root} chapter={section} model={selected} ready={ready>0}/>
  <span className="sr-only" role="status" aria-live="polite">{KNIVES[selected]} — {CHAPTERS[section]}</span>
  {ready<5&&!error&&<div className={'loading '+(ready?'quiet':'')} role="status"><span className="load-mark"/><span>{ready?'COLLECTION':'PREPARING'}<small>{ready} / 5</small></span></div>}
  {error&&<div className="error-message" role="alert"><p>{error}</p><button onClick={()=>location.reload()}>Riprova</button></div>}
 </main>;
}
