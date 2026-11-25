'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Stage from './Stage';
import {CATALOGUE,CATALOGUE_KEY,SURFACES,catalogueChoices,configurationPrice} from './lib/catalogue';
import ParticleReveal from './ParticleReveal';
import RingCursor from './RingCursor';
import {nearestChapter} from './lib/navigation';
import {chooseSlot} from './lib/gestures';
import {Brand,ChapterIcon,Glyph,MaterialHud,PoseHud,TechnicalHud,ProductReadout} from './Hud';
import {CHAPTERS,KNIVES,createState,mod,resetView,sectionAt,type Surface,type View} from './lib/state';

export default function Experience(){
 const host=useRef<HTMLElement>(null);
 const state=useRef(createState());
 const [frame,setFrame]=useState({selected:0,ready:0}),[error,setError]=useState('');
 const [artReady,setArtReady]=useState(false);
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
 const onFrame=useCallback((selected:number,ready:number)=>{
  const last=previous.current;
  if(last.selected!==selected||last.ready!==ready){
   previous.current={selected,ready};setFrame(previous.current);
  }
 },[]);
 useEffect(()=>{
  let mounted=true;
  const atlas=new Image();atlas.src='/ui/catalogue-swatches.webp';
  const logo=Array.from(host.current?.querySelectorAll<HTMLImageElement>('.wordmark img')??[]);
  const initial=CATALOGUE[KNIVES[state.current.selected]];
  const samples=SURFACES.flatMap(role=>initial[role].styles.flatMap(option=>option.sample?[option.sample]:[]));
  const images=samples.map(url=>{const image=new Image();image.src=url;return image;});
  // Resolve failures as well: the fallback face and swatches can still be used.
  void Promise.allSettled([
   document.fonts.load('400 16px Michroma','HYPER CAMERA LIGHT'),
   document.fonts.load('300 14px "Memento UI"','Blade Handle Metals'),
   document.fonts.load('400 24px "Memento Figures"','€0123456789'),
   atlas.decode(),...[...logo,...images].map(image=>image.decode()),
  ]).then(()=>{if(mounted)setArtReady(true);});
  return ()=>{mounted=false;};
 },[]);
 useEffect(()=>{
  const root=host.current;if(!root)return;
  const prevent=(event:Event)=>event.preventDefault();
  const secondary=(event:MouseEvent)=>{if(event.button>0)event.preventDefault();};
  const nativeActions=['auxclick','contextmenu','dragstart','selectstart'];
  for(const name of nativeActions)root.addEventListener(name,prevent,true);
  root.addEventListener('pointerdown',secondary,true);root.addEventListener('mousedown',secondary,true);
  return ()=>{
   for(const name of nativeActions)root.removeEventListener(name,prevent,true);
   root.removeEventListener('pointerdown',secondary,true);root.removeEventListener('mousedown',secondary,true);
  };
 },[]);
 useEffect(()=>{
  const s=state.current,reduce=matchMedia('(prefers-reduced-motion: reduce)');
  s.reduced=reduce.matches;s.paused=reduce.matches;
  try{
   const keyed=localStorage.getItem(CATALOGUE_KEY)||localStorage.getItem('memento-knives-ui-v51');
   s.configs=catalogueChoices(keyed?JSON.parse(keyed):null);
  }catch{}
  refresh();
  const key=(e:KeyboardEvent)=>{
   if(host.current?.dataset.uiPending==='true')return;
   const target=e.target;
   if(target instanceof Element&&target.closest('input,textarea,select,[contenteditable=true]'))return;
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'&&!e.altKey&&!e.shiftKey&&
      (target===document.body||(target instanceof Node&&host.current?.contains(target)))){e.preventDefault();return;}
   if(e.altKey||e.ctrlKey||e.metaKey)return;
   if(e.key===' '&&target instanceof Element&&target.closest('button,a'))return;
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
 const {selected,ready}=frame,s=state.current,section=sectionAt(s.target);
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
 const preset=(v:View)=>{resetView(s);s.view=v;s.activity++;refresh();};
 const selectedConfig=s.configs[selected];
 const knife = KNIVES[selected];
 const price = configurationPrice(knife, selectedConfig);
 const knifeAnchor = s.knifeDestination ?? Math.round(s.orbit);
 const uiReady=ready>0&&artReady;

 return <main ref={host} className="experience" data-version="72" data-ui-pending={!uiReady}
  data-section={CHAPTERS[section].toLowerCase()} data-model={knife}>
  <div className="environment" aria-hidden="true"/>
  <ProductReadout model={selected} price={price} config={selectedConfig} artReady={artReady}/>
  <Stage state={state} onFrame={onFrame} onError={setError} onInteract={refresh} onChapter={go}/>
  <div className="bottom-veil" aria-hidden="true"><i/><i/><i/><i/><i/></div>
  <header className="brand-rail">
   <button type="button" className="brand" data-chrome aria-label="Return to stage"
    onClick={()=>go(nearestChapter(s.target,0))}><Brand/></button>
  </header>

  <div className="ring-anchor" aria-hidden="true"/>
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
   <div className="knife-nav" role="group" aria-label="Model selection and pose">
   <button type="button" className="knife-step previous" aria-label="Previous model"
    disabled={!s.ready.includes(mod(knifeAnchor-1))} onClick={()=>stepKnife(-1)}><Glyph name="left" size={44}/></button>
   <PoseHud value={isCustom?{closed:s.customFold[section-1],exploded:s.customExplode[section-1]}:s} onValue={setRange}/>
   <button type="button" className="knife-step next" aria-label="Next model"
    disabled={!s.ready.includes(mod(knifeAnchor+1))} onClick={()=>stepKnife(1)}><Glyph name="right" size={44}/></button>
   </div>
   <nav className="sequence-nav" data-chrome aria-label="Showroom navigation">
    {CHAPTERS.map((name,i)=><button key={name} type="button" className="chapter-button" aria-label={'Go to '+name}
     aria-current={section===i?'step':undefined} onClick={()=>go(nearestChapter(s.target,i))}>
     <ChapterIcon chapter={name}/>
    </button>)}
   </nav>
  </footer>
  <ParticleReveal model={selected} ready={uiReady}/>
  <RingCursor/>
  <span className="sr-only" role="status" aria-live="polite">{KNIVES[selected]} — {CHAPTERS[section]}</span>
  {!uiReady&&!error&&<div className="loading" role="status"><span className="load-mark"/>PREPARING</div>}
  {error&&<div className="error-message" role="alert"><p>{error}</p><button onClick={()=>location.reload()}>Try again</button></div>}
 </main>;
}
