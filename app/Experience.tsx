'use client';
import {type CSSProperties,useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import Stage from './Stage';
import {CATALOGUE_KEY,SURFACES,catalogueChoices,restoreCatalogue} from './lib/catalogue';
import ParticleReveal from './ParticleReveal';
import {nearestChapter} from './lib/navigation';
import {chooseSlot} from './lib/gestures';
import {Brand,Glyph,Chevron,MaterialHud,PoseHud,CameraLightingHud,ConfigurationSummary,Spread} from './Hud';
import {CHAPTERS,KNIVES,PRODUCTS,createState,mod,resetView,sectionAt,type Surface,type View} from './lib/state';

import {STAGE_COLORS} from './lib/art-direction';
import {priceInCents} from './lib/pricing';

const euros=new Intl.NumberFormat('it-IT',{useGrouping:'always'});
const chapterIcons=['stageIcon','bladeIcon','handleIcon','detailsIcon','cameraIcon'] as const;

export default function Experience(){
 const [session]=useState(()=>({...createState(),configs:catalogueChoices()}));
 const state=useRef(session),root=useRef<HTMLElement>(null);
 const [frame,setFrame]=useState({section:0,selected:0,ready:0}),[error,setError]=useState('');
 const previous=useRef(frame),[,setRevision]=useState(0);
 const refresh=useCallback(()=>setRevision(v=>v+1),[]);
 const go=useCallback((target:number)=>{
  const s=state.current;
  if(s.target===target){if(sectionAt(target)===0){resetView(s);s.activity++;refresh();}return;}
  if(sectionAt(s.progress)===0&&sectionAt(target)!==0)chooseSlot(s,Math.round(s.orbit));
  resetView(s);s.target=target;s.activity++;refresh();
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
  try{s.configs=restoreCatalogue(localStorage);}catch{}
  refresh();
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
    case ' ':s.paused=!s.paused;s.activity++;refresh();break;
    default:return;
   }
   e.preventDefault();
  };
  const onReduce=()=>{s.reduced=reduce.matches;s.paused=reduce.matches;refresh();};
  window.addEventListener('keydown',key);reduce.addEventListener('change',onReduce);
  return ()=>{window.removeEventListener('keydown',key);reduce.removeEventListener('change',onReduce);};
 },[go,stepKnife,refresh]);
 const {selected,section,ready}=frame,s=state.current;
 const sheet=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const el=sheet.current;if(!el)return;
  // All text samples the same vertical gradient, even inside buttons and flex rows.
  const layout=()=>{
   const area=el.getBoundingClientRect(),title=el.querySelector('h1')!.getBoundingClientRect();
   el.style.setProperty('--ink-height',area.height+'px');
   el.style.setProperty('--ink-white',(title.height*.5)+'px');
   for(const node of el.querySelectorAll<HTMLElement>('.spread,.price>*,.essence span,.config-name,.config-value>span:last-child')){
    node.style.setProperty('--ink-shift',(area.top-node.getBoundingClientRect().top)+'px');
   }
  };
  layout();const observer=new ResizeObserver(layout);observer.observe(el);
  for(const node of el.querySelectorAll('h1,.price-line,.config-part'))observer.observe(node);
  let live=true;void document.fonts.ready.then(()=>{if(live)layout();});
  return ()=>{live=false;observer.disconnect();};
 },[selected]);
 const isCustom=section>=1&&section<=3;
 const setRange=(key:'closed'|'exploded',value:number)=>{
  if(isCustom)(key==='closed'?s.customFold:s.customExplode)[section-1]=value;
  else s[key]=value;
  s.activity++;refresh();
 };
 const material=(surface:Surface,key:'color'|'style',value:number)=>{
  s.configs[selected][surface][key]=value;s.activity++;
  try{localStorage.setItem(CATALOGUE_KEY,JSON.stringify(Object.fromEntries(KNIVES.map((id,i)=>[id,s.configs[i]]))));}catch{}
  refresh();
 };
 const preset=(v:View)=>{s.rotation.identity();s.focus=null;s.zoom=1;s.view=v;s.activity++;refresh();};
 const selectedConfig=s.configs[selected],cents=priceInCents(selected,selectedConfig);
 const amount=euros.format(Math.floor(cents/100)),fraction=String(cents%100).padStart(2,'0');
 const product=PRODUCTS[selected],knifeAnchor=s.knifeDestination??Math.round(s.orbit);
 return <main ref={root} className="experience" data-version="56" style={{'--stage-color':STAGE_COLORS[KNIVES[selected]]} as CSSProperties} data-ui-pending={ready===0&&!error} data-section={CHAPTERS[section].toLowerCase()} data-model={KNIVES[selected]}>
  <div className="environment" aria-hidden="true"/>
  <div ref={sheet} className="product-info">
   <h1 className="atmospheric-title" data-product-name><Spread text={KNIVES[selected]}/></h1>
   <div className="price-line">
    <div className="price" data-price-cents={cents} aria-label={'Prezzo dimostrativo '+amount+','+fraction+' euro'}><span className="currency">€</span><span>{amount}</span><small>,{fraction}</small></div>
    <p className="essence">{product.copy.map(line=><span key={line}>{line}</span>)}</p>
   </div>
   <ConfigurationSummary model={selected} config={selectedConfig} section={section} onSelect={chapter=>go(nearestChapter(s.target,chapter))}/>
  </div>
  <Stage state={state} onFrame={onFrame} onError={setError} onInteract={refresh} onChapter={go}/>
  <div className="bottom-veil" aria-hidden="true"><i/><i/><i/></div>
  <header><button className="brand" data-chrome aria-label="Torna allo stage" onClick={()=>go(nearestChapter(s.target,0))}><Brand/></button></header>
  {SURFACES.map((surface,i)=><section key={surface} className="hud-layer material-layer" aria-hidden={section!==i+1} inert={section!==i+1} aria-label={'Materiali '+CHAPTERS[i+1]}><MaterialHud surface={surface} model={selected} config={selectedConfig} onChange={material}/></section>)}
  <section className="hud-layer technical-layer" aria-hidden={section!==4} inert={section!==4} aria-label="Camera e lighting">
   <CameraLightingHud value={s} model={selected} onView={preset} onLight={index=>{s.lighting=index;s.activity++;refresh();}}/>
  </section>
  <div className="knife-nav" role="group" aria-label="Scelta del coltello">
   {([-1,1] as const).map(dir=>{
    const name=dir===-1?'Coltello precedente':'Coltello successivo';
    return <button key={dir} type="button" className="knife-step" aria-label={name} title={name}
     disabled={!s.ready.includes(mod(knifeAnchor+dir))} onClick={()=>stepKnife(dir)}><Chevron left={dir===-1}/></button>;
   })}
  </div>
  <footer className="control-dock">
   <nav className="sequence-nav" data-chrome aria-label="Navigazione showroom">
    {CHAPTERS.map((name,i)=><button key={name} type="button" className="chapter-button" aria-label={'Vai a '+name} title={name}
     aria-current={section===i?'step':undefined} onClick={()=>go(nearestChapter(s.target,i))}>
     <span className="nav-tile"><Glyph name={chapterIcons[i]} size={23}/></span>
    </button>)}
   </nav>
   <PoseHud value={isCustom?{...s,closed:s.customFold[section-1],exploded:s.customExplode[section-1]}:s} onValue={setRange}/>
  </footer>
  <ParticleReveal root={root} chapter={section} model={selected} ready={ready>0}/>
  <span className="sr-only" role="status" aria-live="polite">{KNIVES[selected]} — {CHAPTERS[section]}</span>
  {ready<5&&!error&&<div className={'loading '+(ready?'quiet':'')} role="status"><span className="load-mark"/><span>{ready?'COLLECTION':'PREPARING'}<small>{ready} / 5</small></span></div>}
  {error&&<div className="error-message" role="alert"><p>{error}</p><button onClick={()=>location.reload()}>Riprova</button></div>}
 </main>;
}
