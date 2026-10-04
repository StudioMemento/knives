'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {KNIVES,CHAPTERS} from './catalog';
import {originalConfiguration,configPrice,money,type Configuration,type CartItem,type Anchor,type Surface} from './configuration';
import {WheelGesture,normalizeWheel,TRANSITION_MS,advanceView,SECTION_CHAPTER,CONFIG_CHAPTER,OUTRO_CHAPTER,type ScanAxis,type InspectionView} from './navigation';
import KnifeStage,{type StageAPI,type View} from './KnifeStage';
import Configurator from './Configurator';
import RequestDialog,{downloadConfiguration} from './RequestDialog';
import Checkout from './Checkout';
import Icon from './Icon';
import MementoWordmark from './MementoWordmark';
import {OUTRO_MS} from './motion';
import {restoreSession} from './session';
import {nextReadyKnife} from './collection-loading';
const VIEWS:readonly [InspectionView,string][]=[['front','Front'],['back','Back'],['spine','Spine'],['edge','Edge'],['tip','Tip'],['base','Base']];
const SESSION_KEY='memento-knife-edition34';

export default function KnifeExperience(){
 const [view,setView]=useState<View>({mode:'hero',selected:0,chapter:0});
 const [configurations,setConfigurations]=useState<Configuration[]>(()=>KNIVES.map((_,i)=>originalConfiguration(i)));
 const [ready,setReady]=useState<number[]>([]),[busy,setBusy]=useState(false),[autoplay,setAutoplay]=useState(true),[reduced,setReduced]=useState(false),[folded,setFolded]=useState(false);
 const [bag,setBag]=useState<CartItem[]>([]),[checkout,setCheckout]=useState(false),[activeId,setActiveId]=useState<string|null>(null),[placing,setPlacing]=useState(false);
 const [notice,setNotice]=useState(''),[error,setError]=useState(''),[restored,setRestored]=useState(false);
 const [requestOpen,setRequestOpen]=useState(false),[inspection,setInspection]=useState<InspectionView>('front'),[dockHeight,setDockHeight]=useState(78);
 const dockRef=useRef<HTMLElement>(null);
 const configuring=view.mode==='experience'&&view.chapter===CONFIG_CHAPTER;
 const videoRef=useRef<HTMLVideoElement>(null);
 const api=useRef<StageAPI|null>(null),lockUntil=useRef(0);
 const unlockTimer=useRef<ReturnType<typeof setTimeout>|null>(null),toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const state=useRef({view,ready,checkout,placing,reduced,configuring});state.current={view,ready,checkout:checkout||requestOpen,placing,reduced,configuring};
 const wheel=useRef(new WheelGesture());const knife=KNIVES[view.selected],config=configurations[view.selected],loaded=ready.includes(view.selected);
 const notify=useCallback((text:string)=>{setNotice(text);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setNotice(''),3500);},[]);
 const navigate=useCallback((next:View)=>{
  const current=state.current;if(performance.now()<lockUntil.current||current.checkout||!current.ready.includes(next.selected))return;
  if(JSON.stringify(next)===JSON.stringify(current.view))return;
  const scan=current.view.mode==='experience'&&next.mode==='experience'&&current.view.chapter===SECTION_CHAPTER&&next.chapter===SECTION_CHAPTER;
  const duration=scan?0:current.reduced?40:TRANSITION_MS;lockUntil.current=performance.now()+duration;setBusy(duration>0);setPlacing(false);setActiveId(null);
  if(!scan){setFolded(false);setInspection('front');}
  if(current.view.mode==='hero'&&next.mode==='hero')api.current?.focus(next.selected);
  else{state.current={...current,view:next,placing:false};setView(next);}
  if(unlockTimer.current)clearTimeout(unlockTimer.current);unlockTimer.current=setTimeout(()=>setBusy(false),duration);
 },[]);
 const changeKnife=useCallback((direction:number)=>{
  const current=state.current;if(current.view.mode!=='hero'||current.checkout||performance.now()<lockUntil.current||current.ready.length<2)return;
  const next=nextReadyKnife(current.view.selected,direction,current.ready,KNIVES.length);
  lockUntil.current=performance.now()+(current.reduced||current.ready.length<KNIVES.length?40:TRANSITION_MS);api.current?.focus(next,direction);
 },[]);
 const advance=useCallback((direction:number)=>{const current=state.current;if(current.placing)return;navigate(advanceView(current.view,direction));},[navigate]);
 const updateCut=useCallback((cut:number)=>{const current=state.current;if(current.view.chapter!==SECTION_CHAPTER)return;const next={...current.view,cut:Math.max(0,Math.min(1,cut))};state.current={...current,view:next};setView(next);},[]);
 const updateScan=useCallback((patch:{scanAxis?:ScanAxis;scanDirection?:1|-1;scanEnabled?:boolean})=>{const current=state.current;if(current.view.chapter!==SECTION_CHAPTER)return;const next={...current.view,...patch};state.current={...current,view:next};setView(next);},[]);
 const onHeroFocus=useCallback((selected:number)=>{const current=state.current;if(current.view.mode!=='hero'||current.view.selected===selected)return;const next={...current.view,selected};state.current={...current,view:next};setView(next);},[]);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>{setReduced(media.matches);if(media.matches)setAutoplay(false);};update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 useEffect(()=>{
  if(view.mode!=='experience'||view.chapter!==OUTRO_CHAPTER||checkout||requestOpen)return;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const schedule=()=>{if(timer)clearTimeout(timer);if(!document.hidden)timer=setTimeout(()=>navigate({...state.current.view,mode:'hero',chapter:0,cut:0}),reduced?100:OUTRO_MS);};
  schedule();document.addEventListener('visibilitychange',schedule);return()=>{if(timer)clearTimeout(timer);document.removeEventListener('visibilitychange',schedule);};
 },[view.mode,view.chapter,checkout,requestOpen,reduced,navigate]);
 useEffect(()=>{
  const onWheel=(e:WheelEvent)=>{
   const current=state.current;if(e.ctrlKey||e.metaKey||current.checkout)return;
   const target=e.target as Element;if(target.closest('input,select,textarea,[data-scroll]'))return;
   e.preventDefault();const horizontal=Math.abs(e.deltaX)>Math.abs(e.deltaY),now=performance.now();const delta=normalizeWheel(horizontal?e.deltaX:e.deltaY,e.deltaMode,innerHeight);
   if(current.view.mode==='experience'&&current.view.chapter===SECTION_CHAPTER&&current.view.scanEnabled&&now>=lockUntil.current&&!current.placing){
    const cut=current.view.cut??0;
    if((delta>0&&cut<1)||(delta<0&&cut>0)){
     updateCut(cut+Math.max(-.13,Math.min(.13,delta/900)));wheel.current.feed(delta,now,true);return;
    }
    wheel.current.feed(delta,now,true);return;
   }
   const direction=wheel.current.feed(delta,now,now<lockUntil.current||current.placing);
   if(direction){if(horizontal&&current.view.mode==='hero')changeKnife(direction);else advance(direction);}
  };
  const onKey=(e:KeyboardEvent)=>{
   if(e.repeat||state.current.checkout||(e.target as Element).closest('input,select,textarea,button,a,[contenteditable]'))return;
   if(['ArrowDown','PageDown','ArrowUp','PageUp','ArrowLeft','ArrowRight','Enter','Escape'].includes(e.key))e.preventDefault();
   if(['ArrowDown','PageDown','Enter'].includes(e.key))advance(1);if(['ArrowUp','PageUp'].includes(e.key))advance(-1);
   if(e.key==='ArrowLeft')changeKnife(-1);if(e.key==='ArrowRight')changeKnife(1);
   if(e.key==='Escape'){if(state.current.placing)setPlacing(false);else navigate({...state.current.view,mode:'hero',chapter:0});}
  };
  addEventListener('wheel',onWheel,{passive:false});addEventListener('keydown',onKey);return()=>{removeEventListener('wheel',onWheel);removeEventListener('keydown',onKey);};
 },[advance,changeKnife,navigate,updateCut]);
 useEffect(()=>()=>{if(unlockTimer.current)clearTimeout(unlockTimer.current);if(toastTimer.current)clearTimeout(toastTimer.current);},[]);
 useEffect(()=>{try{const raw=localStorage.getItem(SESSION_KEY);if(raw){const saved=restoreSession(raw);setConfigurations(saved.configurations);setBag(saved.bag);}}catch{notify('Original finishes restored.');}setRestored(true);},[notify]);
 useEffect(()=>{if(!restored)return;try{localStorage.setItem(SESSION_KEY,JSON.stringify({version:34,coordinateFrame:42,configurations,bag}));}catch{notify('Local saving is unavailable. You can still download your demo order.');}},[configurations,bag,restored,notify]);
 useEffect(()=>{const dock=dockRef.current;if(!dock)return;const observer=new ResizeObserver(entries=>{const height=Math.round(entries[0].borderBoxSize?.[0]?.blockSize??dock.getBoundingClientRect().height);setDockHeight(previous=>previous===height?previous:height);});observer.observe(dock);return()=>observer.disconnect();},[configuring]);
 const materialPreviews=useCallback((color:string)=>api.current?.materials(color)??null,[]);
 const backgroundReady=ready.length===KNIVES.length&&!reduced;
 useEffect(()=>{
  const video=videoRef.current;if(!video)return;
  const sync=()=>{if(!backgroundReady||checkout||requestOpen||document.hidden||view.mode!=='hero')video.pause();else void video.play().catch(()=>{});};
  sync();document.addEventListener('visibilitychange',sync);return()=>document.removeEventListener('visibilitychange',sync);
 },[backgroundReady,checkout,requestOpen,view.mode]);
 const onReady=useCallback((index:number)=>{setReady(previous=>previous.includes(index)?previous:[...previous,index]);setError(message=>message.includes(KNIVES[index].name)?'':message);},[]);
 const onError=useCallback((message:string)=>setError(message),[]);
 const onSwipe=useCallback((x:number,y:number)=>{if(state.current.view.mode==='hero'&&Math.abs(x)>Math.abs(y))changeKnife(x<0?1:-1);else advance(y<0?1:-1);},[advance,changeKnife]);
 const changeConfig=(next:Configuration)=>setConfigurations(all=>all.map((item,index)=>index===view.selected?next:item));
 const onPick=(anchor:Anchor)=>{if(!activeId)return;changeConfig({...config,decorations:config.decorations.map(d=>d.id===activeId?{...d,anchor}:d)});setPlacing(false);setError('');notify('Design positioned.');};
 const defaultAnchor=(surface:Surface)=>api.current?.anchor(surface)??null;
 const addToBag=()=>{if(bag.length>=24){notify('Your bag holds 24 configurations.');return;}if(!loaded||busy||config.decorations.some(d=>!d.anchor||!d.content.trim()))return;setBag(items=>[...items,{id:crypto.randomUUID(),knifeId:knife.id,quantity:1,configuration:structuredClone(config),thumbnail:api.current?.capture()??''}]);notify(`${knife.name} added to your bag.`);};
 const quantity=bag.reduce((sum,item)=>sum+item.quantity,0);
 const incomplete=config.decorations.some(d=>!d.anchor||!d.content.trim());
 const foldButton=knife.folding&&<button className="fold-control" aria-pressed={folded} onClick={()=>{setFolded(v=>!v);setPlacing(false);updateScan({scanEnabled:false});}} disabled={busy||!!view.scanEnabled}><span className="fold-mark" aria-hidden="true"/>{folded?'Open blade':'Close blade'}</button>;
 return <main className={`knife-experience edition-34 edition-42 theme-${knife.id} mode-${view.mode} chapter-${view.chapter} ${busy?'is-transitioning':''} ${configuring?'is-configuring':''}`} style={{'--accent':knife.accent} as React.CSSProperties} data-edition="42">
  <div className="scene-backdrop" aria-hidden="true"><video ref={videoRef} autoPlay={backgroundReady&&!checkout&&!requestOpen&&view.mode==='hero'} muted loop playsInline preload="none" src={backgroundReady?'/media/hero-background.mp4':undefined}/><div className="scene-tone"/><div className="world-atmosphere"/><div className="scene-shade"/></div>
  <KnifeStage view={view} configurations={configurations} folded={folded} placing={placing} api={api} onReady={onReady} onError={onError} onPick={onPick} onSwipe={onSwipe} reduced={reduced} suspended={checkout||requestOpen} autoplay={autoplay&&ready.length===4} configuring={configuring} onHeroFocus={onHeroFocus} inspection={inspection} onInspect={()=>setInspection('free')} dockHeight={dockHeight}/>
  {view.mode==='experience'&&view.chapter<2&&<div className="detail-veil" aria-hidden="true"/>}
  <header className="site-header"><div className="header-left">{view.mode!=='hero'&&<button className="text-button" disabled={busy} onClick={()=>navigate({...view,mode:'hero',chapter:0})} aria-label="Back to collection"><Icon name="arrow-left" size={17}/><span>Collection</span></button>}</div><button className="brand" onClick={()=>navigate({...view,mode:'hero',chapter:0})} aria-label="Memento collection"><MementoWordmark/></button><div className="header-actions">{view.mode==='hero'&&<button className="icon-button carousel-pause" aria-label={autoplay?'Pause carousel':'Play carousel'} aria-pressed={autoplay} onClick={()=>setAutoplay(v=>!v)}><span aria-hidden="true">{autoplay?'Ⅱ':'▷'}</span></button>}<button className="bag-button" aria-label={`Open bag, ${quantity} items`} onClick={()=>setCheckout(true)}><Icon name="shopping-bag" size={19}/>{quantity>0&&<b>{quantity}</b>}</button></div></header>
  {view.mode==='hero'?<>
   <div className="collection-title" key={knife.id}><h1>{knife.name}</h1></div>
   <nav className="hero-navigation" aria-label="Knife collection"><button className="icon-button" disabled={ready.length<2} aria-label="Previous knife" onClick={()=>changeKnife(-1)}><Icon name="arrow-left" size={21}/></button><div><button className="enter-collection" disabled={!loaded||busy} onClick={()=>advance(1)}>Explore the knife <Icon name="chevron-down" size={18}/></button><span className="drag-cue" role="status">{ready.length<KNIVES.length?`Loading collection · ${ready.length} / ${KNIVES.length}`:'Drag to explore'}</span></div><button className="icon-button" disabled={ready.length<2} aria-label="Next knife" onClick={()=>changeKnife(1)}><Icon name="arrow-right" size={21}/></button></nav>
  </>:<>
   {view.chapter<2?<section className="detail-caption" key={`${knife.id}-${view.chapter}`} aria-label={CHAPTERS[view.chapter].label} data-scroll><p className="study-label">{view.chapter===0?'Blade':'Handle'}</p><h1>{knife.materials[view.chapter].value}</h1><p>{knife.materials[view.chapter].note}</p><dl className="detail-facts">{knife.materials.map(material=><div key={material.label}><dt>{material.label}</dt><dd>{material.value}</dd></div>)}</dl>{foldButton}</section>:view.chapter===OUTRO_CHAPTER?<div className="return-caption"><p>{knife.name}</p><span>Back to the collection</span><i/></div>:null}
   {configuring&&<>
    <div className="config-identity"><h1>{knife.name}</h1></div>
    <aside className="config-summary" aria-label="Your configuration"><div className="config-price"><span>Configured price</span><strong>{money(configPrice(knife.id,config))}</strong></div><button disabled={!loaded||busy} onClick={()=>{downloadConfiguration(knife,config);notify('Configuration saved.');}}><Icon name="download" size={16}/><span>Save configuration</span></button><button className="request-action" disabled={!loaded||busy||incomplete} onClick={()=>setRequestOpen(true)}>Request</button><button className="bag-action" disabled={!loaded||busy||incomplete} onClick={addToBag}>Add to bag</button></aside>
    <div className="orthographic-views" role="group" aria-label="Orthographic views">{VIEWS.map(([id,label])=><button key={id} aria-pressed={inspection===id} disabled={busy} onClick={()=>{setInspection(id);setPlacing(false);}}>{label}</button>)}</div>
    {knife.folding&&<div className="config-fold">{foldButton}</div>}
    <section ref={dockRef} className="configuration-dock" aria-label="Personalise your knife" data-scroll><Configurator key={knife.id} knife={knife} knifeIndex={view.selected} config={config} onChange={changeConfig} activeId={activeId} onActive={setActiveId} placing={placing} onPlace={setPlacing} defaultAnchor={defaultAnchor} preview={materialPreviews} disabled={busy} onSection={scanEnabled=>{updateScan({scanEnabled});if(scanEnabled)setFolded(false);}} laser={{axis:view.scanAxis??'z',direction:view.scanDirection??1,progress:view.cut??0,disabled:busy,onAxis:scanAxis=>updateScan({scanAxis}),onDirection:()=>updateScan({scanDirection:view.scanDirection===-1?1:-1}),onProgress:updateCut,onReset:()=>{updateCut(0);setInspection('front');api.current?.reset();}}}/></section>
   </>}
   {view.chapter<2&&<button className="scroll-cue" disabled={busy} onClick={()=>advance(1)} aria-label="Scroll to next section"><span>Scroll to continue</span><Icon name="chevron-down" size={18}/></button>}
   <footer className="journey-footer"><button className="text-button" disabled={busy} onClick={()=>navigate(view.chapter===0?{...view,mode:'hero',chapter:0}:{...view,chapter:view.chapter-1,cut:0,scanEnabled:false})} aria-label="Previous section"><Icon name="arrow-left" size={16}/><span>Back</span></button><div className="journey-steps" aria-label="Sections">{CHAPTERS.map((chapter,i)=><button key={chapter.id} aria-label={chapter.label} title={chapter.label} aria-current={view.chapter===i?'step':undefined} disabled={busy} onClick={()=>navigate({...view,chapter:i,cut:0,scanEnabled:false})}><span>{chapter.label}</span></button>)}</div><button className="text-button" disabled={busy} onClick={()=>navigate(view.chapter===OUTRO_CHAPTER?{...view,mode:'hero',chapter:0,cut:0}:{...view,chapter:view.chapter+1,cut:0,scanEnabled:false})}><span>{view.chapter===OUTRO_CHAPTER?'Collection':'Continue'}</span><Icon name="arrow-right" size={16}/></button></footer>
  </>}
  {placing&&<div className="placement-hint"><span>Select a point on the blade or handle.</span><button onClick={()=>setPlacing(false)} aria-label="Cancel positioning"><Icon name="x" size={17}/></button></div>}
  {!loaded&&!error&&<div className="loader"><MementoWordmark className="loader-wordmark"/><p role="status">Preparing {knife.name}</p><i/></div>}
  {error&&<div className="error-message" role="alert"><span>{error}</span><button onClick={()=>location.reload()}>Retry collection</button><button onClick={()=>setError('')} aria-label="Dismiss error"><Icon name="x" size={17}/></button></div>}
  {notice&&<div className="toast" role="status"><span>{notice}</span>{quantity>0&&<button onClick={()=>setCheckout(true)}>View bag</button>}</div>}
  {checkout&&<Checkout items={bag} onItems={setBag} onClose={()=>{setCheckout(false);wheel.current.reset();}}/>}
  {requestOpen&&<RequestDialog knife={knife} config={config} onClose={()=>{setRequestOpen(false);wheel.current.reset();}}/>}
 </main>;
}
