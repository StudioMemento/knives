'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Stage from './Stage';
import {CATALOGUE_KEY,SURFACES,catalogueChoices,configurationPrice} from './lib/catalogue';
import ParticleReveal from './ParticleReveal';
import {nearestChapter} from './lib/navigation';
import {chooseSlot} from './lib/gestures';
import {Brand,ChapterTile,Glyph,MaterialHud,PoseHud,TechnicalHud,ConfigurationSummary,TrackedLetters} from './Hud';
import {CHAPTERS,KNIVES,PREVIOUS_ORDER,createState,defaultConfiguration,mod,resetView,sectionAt,type Surface,type View} from './lib/state';

const chapterIcons=['stageIcon','bladeIcon','handleIcon','detailsIcon','inspectIcon'] as const;

export default function Experience(){
 const state=useRef(createState()),root=useRef<HTMLElement>(null);
 const [frame,setFrame]=useState({section:0,selected:0,ready:0}),[error,setError]=useState('');
 const choices=useRef<ReturnType<typeof catalogueChoices>|null>(null);
 if(choices.current===null)choices.current=catalogueChoices();
 const previous=useRef(frame),[,setRevision]=useState(0);
 const refresh=useCallback(()=>setRevision(v=>v+1),[]);
 const go=useCallback((target:number)=>{
  const s=state.current;
  if(s.target===target){if(sectionAt(target)===0){resetView(s);s.activity++;refresh();}return;}
  if(sectionAt(s.progress)===0&&sectionAt(target)!==0)chooseSlot(s,Math.round(s.orbit));
  resetView(s);s.target=target;s.activity++;refresh();
 },[refresh]);
 const stepKnife=useCallback((direction:number)=>{
  const s=state.current;
  if(s.ready.length<2)return;
  const anchor=s.knifeDestination??Math.round(s.orbit);
  const next=anchor+direction;
  if(!s.ready.includes(mod(next)))return;
  chooseSlot(s,next);refresh();
 },[refresh]);
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
 const isCustom=section>=1&&section<=3;
 const setRange=(key:'closed'|'exploded',value:number)=>{
  if(isCustom)(key==='closed'?s.customFold:s.customExplode)[section-1]=value;
  else s[key]=value;
  s.activity++;refresh();
 };
 const material=(surface:Surface,key:'color'|'style',value:number)=>{
  choices.current![selected][surface][key]=value;
  try{localStorage.setItem(CATALOGUE_KEY,JSON.stringify(Object.fromEntries(KNIVES.map((id,i)=>[id,choices.current![i]]))));}catch{}
  refresh();
 };
 const preset=(v:View)=>{resetView(s);s.view=v;s.activity++;refresh();};
 const selectedConfig=choices.current[selected];
 const knife = KNIVES[selected];
 const price = configurationPrice(knife, selectedConfig);
 const knifeAnchor = s.knifeDestination ?? Math.round(s.orbit);

 return <main ref={root} className="experience" data-version="60" data-ui-pending={ready===0&&!error}
  data-section={CHAPTERS[section].toLowerCase()} data-model={knife}>
  <div className="environment" aria-hidden="true"/>
  <div className="product-info">
   <div className="name-frame">
    <h1 className="atmospheric-title" data-product-name aria-label={knife}><TrackedLetters text={knife}/></h1>
   </div>
   <div className="product-readout">
    <div className="price" aria-live="polite" aria-atomic="true" aria-label={'Demo price: '+price+' euros'}>
     <span className="currency">€</span><span data-price>{price}</span>
    </div>
    <ConfigurationSummary model={selected} config={selectedConfig}/>
   </div>
  </div>
  <Stage state={state} onFrame={onFrame} onError={setError} onInteract={refresh} onChapter={go}/>
  <div className="bottom-veil" aria-hidden="true"><i/><i/><i/></div>
  <header className="brand-rail">
   <button type="button" className="brand" data-chrome aria-label="Return to stage"
    onClick={()=>go(nearestChapter(s.target,0))}><Brand/></button>
  </header>

  <div className="knife-nav" role="group" aria-label="Model selection and pose">
   <button type="button" className="knife-step previous" aria-label="Previous model" title="Previous model"
    disabled={!s.ready.includes(mod(knifeAnchor-1))} onClick={()=>stepKnife(-1)}><Glyph name="left" size={31}/></button>
   <PoseHud value={isCustom?{closed:s.customFold[section-1],exploded:s.customExplode[section-1]}:s} onValue={setRange}/>
   <button type="button" className="knife-step next" aria-label="Next model" title="Next model"
    disabled={!s.ready.includes(mod(knifeAnchor+1))} onClick={()=>stepKnife(1)}><Glyph name="right" size={31}/></button>
  </div>

  <footer className="control-dock">
   <div className="dock-tools">
    {SURFACES.map((surface,i)=>
     <section key={surface} className="hud-layer" aria-hidden={section!==i+1} inert={section!==i+1}
      aria-label={CHAPTERS[i+1]+' finishes'}>
      <MaterialHud surface={surface} model={selected} config={selectedConfig} onChange={material}/>
     </section>)}
    <section className="hud-layer" aria-hidden={section!==4} inert={section!==4} aria-label="Camera and light">
     <TechnicalHud value={s} lightPreset={s.lightPreset} model={selected} onView={preset}
      onLight={id=>{s.lightPreset=id;s.activity++;refresh();}}/>
    </section>
   </div>
   <nav className="sequence-nav" data-chrome aria-label="Showroom navigation">
    {CHAPTERS.map((name,i)=><button key={name} type="button" className="chapter-button" aria-label={'Go to '+name} title={name}
     aria-current={section===i?'step':undefined} onClick={()=>go(nearestChapter(s.target,i))}>
     <ChapterTile icon={chapterIcons[i]}/>
    </button>)}
   </nav>
  </footer>
  <ParticleReveal root={root} chapter={section} model={selected} ready={ready>0}/>
  <span className="sr-only" role="status" aria-live="polite">{KNIVES[selected]} — {CHAPTERS[section]}</span>
  {ready<5&&!error&&<div className={'loading '+(ready?'quiet':'')} role="status"><span className="load-mark"/><span>{ready?'COLLECTION':'PREPARING'}<small>{ready} / 5</small></span></div>}
  {error&&<div className="error-message" role="alert"><p>{error}</p><button onClick={()=>location.reload()}>Try again</button></div>}
 </main>;
}
