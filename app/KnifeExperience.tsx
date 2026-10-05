'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {KNIVES} from './catalog';
import {originalConfiguration,configPrice,money,type Configuration,type CartItem,type Anchor,type Surface} from './configuration';
import {WheelGesture,normalizeWheel,TRANSITION_MS,advanceView,CONFIG_CHAPTER,OUTRO_CHAPTER,type InspectionView,type View} from './navigation';
import KnifeStage,{type StageAPI} from './KnifeStage';
import Configurator from './Configurator';
import SurfaceControls from './SurfaceControls';
import CameraControls from './CameraControls';
import InspectionControls from './InspectionControls';
import Checkout from './Checkout';
import Icon from './Icon';
import MementoWordmark from './MementoWordmark';
import {restoreSession} from './session';
import {nextReadyKnife} from './collection-loading';

const SESSION_KEY='memento-knife-edition34';
const SECTIONS=['Hero','Blade','Handle','Inspect','Details'];

export default function KnifeExperience(){
 const [view,setView]=useState<View>({mode:'hero',selected:2,chapter:0});
 const [configurations,setConfigurations]=useState<Configuration[]>(()=>KNIVES.map((_,i)=>originalConfiguration(i)));
 const [ready,setReady]=useState<number[]>([]),[busy,setBusy]=useState(false);
 const [autoplay,setAutoplay]=useState(true),[reduced,setReduced]=useState(false);
 const [folded,setFolded]=useState(false),[exploded,setExploded]=useState(false);
 const [bag,setBag]=useState<CartItem[]>([]),[checkout,setCheckout]=useState(false);
 const [activeId,setActiveId]=useState<string|null>(null),[placing,setPlacing]=useState(false);
 const [designer,setDesigner]=useState<'symbols'|'text'|null>(null);
 const [notice,setNotice]=useState(''),[error,setError]=useState(''),[restored,setRestored]=useState(false);
 const [inspection,setInspection]=useState<InspectionView>('front');
 const pivotRef=useRef<HTMLButtonElement|null>(null);
 const api=useRef<StageAPI|null>(null),lockUntil=useRef(0);
 const unlockTimer=useRef<ReturnType<typeof setTimeout>|null>(null),toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const configuring=view.mode==='experience'&&view.chapter===CONFIG_CHAPTER;
 const state=useRef({view,ready,checkout,placing,reduced,configuring,designer});
 state.current={view,ready,checkout,placing,reduced,configuring,designer};
 const wheel=useRef(new WheelGesture()),knife=KNIVES[view.selected],config=configurations[view.selected];
 const loaded=ready.includes(view.selected),hero=view.mode==='hero',detail=!hero&&view.chapter<2,product=!hero&&view.chapter===OUTRO_CHAPTER;
 const currentSection=hero?0:view.chapter+1;
 const notify=useCallback((text:string)=>{setNotice(text);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setNotice(''),3500);},[]);
 const navigate=useCallback((next:View)=>{
  const current=state.current;
  if(performance.now()<lockUntil.current||current.checkout)return;
  if(JSON.stringify(next)===JSON.stringify(current.view))return;
  const duration=current.reduced?40:TRANSITION_MS;
  lockUntil.current=performance.now()+duration;setBusy(true);setPlacing(false);setActiveId(null);setDesigner(null);
  setFolded(next.mode==='experience'&&next.chapter===1&&!!KNIVES[next.selected].folding);
  setExploded(false);setInspection('front');api.current?.reset();
  if(current.view.mode==='hero'&&next.mode==='hero')api.current?.focus(next.selected);
  else{state.current={...current,view:next,placing:false};setView(next);}
  if(unlockTimer.current)clearTimeout(unlockTimer.current);
  unlockTimer.current=setTimeout(()=>setBusy(false),duration);
 },[]);
 const advance=useCallback((direction:number)=>{if(!state.current.placing)navigate(advanceView(state.current.view,direction));},[navigate]);
 const changeKnife=useCallback((direction:number)=>{
  const current=state.current;
  if(current.view.mode!=='hero'||current.checkout||performance.now()<lockUntil.current||current.ready.length<2)return;
  const next=nextReadyKnife(current.view.selected,direction,current.ready,KNIVES.length);
  lockUntil.current=performance.now()+(current.reduced||current.ready.length<KNIVES.length?40:TRANSITION_MS);
  api.current?.focus(next,direction);
 },[]);
 const updateScan=useCallback((patch:Partial<View>)=>{
  const current=state.current;if(current.view.mode!=='experience'||current.view.chapter!==CONFIG_CHAPTER)return;
  const next={...current.view,...patch};state.current={...current,view:next};setView(next);
  if(patch.scanEnabled){setExploded(false);setFolded(false);}
 },[]);
 const onHeroFocus=useCallback((selected:number)=>{
  const current=state.current;if(current.view.mode!=='hero'||current.view.selected===selected)return;
  const next={...current.view,selected};state.current={...current,view:next};setView(next);
 },[]);
 useEffect(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>{setReduced(media.matches);if(media.matches)setAutoplay(false);};
  update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);
 },[]);
 useEffect(()=>{
  const onWheel=(event:WheelEvent)=>{
   const current=state.current;
   if(current.checkout||current.designer)return;
   const target=event.target as Element;
   if(target.closest('input,select,textarea,[data-scroll],button'))return;
   // The inspection canvas owns wheel/pinch zoom. Navigation remains on the
   // two persistent chevrons and keyboard, without a zoom slider.
   if(current.configuring&&target.closest('canvas'))return;
   if(event.ctrlKey||event.metaKey)return;
   event.preventDefault();
   const horizontal=Math.abs(event.deltaX)>Math.abs(event.deltaY),now=performance.now();
   const delta=normalizeWheel(horizontal?event.deltaX:event.deltaY,event.deltaMode,innerHeight);
   const direction=wheel.current.feed(delta,now,now<lockUntil.current||current.placing);
   if(direction){if(horizontal&&current.view.mode==='hero')changeKnife(direction);else advance(direction);}
  };
  const onKey=(event:KeyboardEvent)=>{
   const current=state.current;
   if(event.repeat||current.checkout||(event.target as Element).closest('input,select,textarea,button,a,[contenteditable]'))return;
   if(['ArrowDown','PageDown','ArrowUp','PageUp','ArrowLeft','ArrowRight','Enter','Escape','0','+','-','='].includes(event.key))event.preventDefault();
   if(event.key==='Escape'){if(current.designer){setDesigner(null);setPlacing(false);}else navigate({...current.view,mode:'hero',chapter:0,scanEnabled:false});return;}
   if(current.designer)return;
   if(['ArrowDown','PageDown','Enter'].includes(event.key))advance(1);
   if(['ArrowUp','PageUp'].includes(event.key))advance(-1);
   if(event.key==='ArrowLeft')changeKnife(-1);if(event.key==='ArrowRight')changeKnife(1);
   if(current.configuring){if(event.key==='0'){setInspection('front');api.current?.reset();}if(['+','='].includes(event.key))api.current?.zoom(.12);if(event.key==='-')api.current?.zoom(-.12);}
  };
  addEventListener('wheel',onWheel,{passive:false});addEventListener('keydown',onKey);
  return()=>{removeEventListener('wheel',onWheel);removeEventListener('keydown',onKey);};
 },[advance,changeKnife,navigate]);
 useEffect(()=>()=>{if(unlockTimer.current)clearTimeout(unlockTimer.current);if(toastTimer.current)clearTimeout(toastTimer.current);},[]);
 useEffect(()=>{
  try{const raw=localStorage.getItem(SESSION_KEY);if(raw){const saved=restoreSession(raw);setConfigurations(saved.configurations);setBag(saved.bag);}}
  catch{notify('Original finishes restored.');}
  setRestored(true);
 },[notify]);
 useEffect(()=>{
  if(!restored)return;
  try{localStorage.setItem(SESSION_KEY,JSON.stringify({version:34,coordinateFrame:42,configurations,bag}));}
  catch{notify('This browser cannot save your configuration locally.');}
 },[configurations,bag,restored,notify]);
 const materialPreviews=useCallback((color:string)=>api.current?.materials(color)??null,[]);
 const onReady=useCallback((index:number)=>{setReady(previous=>previous.includes(index)?previous:[...previous,index]);setError(message=>message.includes(KNIVES[index].name)?'':message);},[]);
 const onError=useCallback((message:string)=>setError(message),[]);
 const onSwipe=useCallback((x:number,y:number)=>{if(state.current.view.mode==='hero'&&Math.abs(x)>Math.abs(y))changeKnife(x<0?1:-1);else advance(y<0?1:-1);},[advance,changeKnife]);
 const changeConfig=(next:Configuration)=>setConfigurations(all=>all.map((item,index)=>index===view.selected?next:item));
 const onPick=(anchor:Anchor)=>{if(!activeId)return;changeConfig({...config,decorations:config.decorations.map(d=>d.id===activeId?{...d,anchor}:d)});setPlacing(false);notify('Design positioned.');};
 const defaultAnchor=(surface:Surface)=>api.current?.anchor(surface)??null;
 const quantity=bag.reduce((sum,item)=>sum+item.quantity,0);
 const toggleFold=()=>{setFolded(value=>!value);setExploded(false);updateScan({scanEnabled:false,cut:0});};
 const toggleExplode=()=>{setExploded(value=>!value);updateScan({scanEnabled:false,cut:0});};
 return <main className={`knife-experience edition-43 mode-${view.mode} chapter-${view.chapter} ${busy?'is-transitioning':''} ${configuring?'is-inspecting':''}`} data-edition="43" data-section={SECTIONS[currentSection].toLowerCase()}>
  <div className="m43-void" aria-hidden="true"/>
  {!product&&<div className={`m43-atmospheric-name ${detail?'is-macro':''}`} aria-hidden="true" key={knife.id+currentSection}>{knife.name}</div>}
  <KnifeStage view={view} configurations={configurations} folded={folded} exploded={exploded} placing={placing} api={api} onReady={onReady} onError={onError} onPick={onPick} onSwipe={onSwipe} reduced={reduced} suspended={checkout} autoplay={autoplay&&ready.length===KNIVES.length} configuring={configuring} onHeroFocus={onHeroFocus} inspection={inspection} onInspect={()=>setInspection('free')} dockHeight={0} pivotRef={pivotRef}/>
  {(detail||product)&&<div className="m43-gradient-blur" aria-hidden="true"/>}
  <header className="m43-header">
   <button className="m43-monogram" onClick={()=>navigate({...view,mode:'hero',chapter:0,scanEnabled:false})} aria-label="Memento collection"><MementoWordmark monogram/></button>
   {quantity>0&&<button className="m43-existing-bag" aria-label={`Open bag, ${quantity} items`} onClick={()=>setCheckout(true)}><Icon name="shopping-bag" size={18}/></button>}
  </header>
  {!hero&&<button className="m43-section-nav m43-previous" aria-label="Previous section" title={SECTIONS[currentSection-1]} disabled={busy} onClick={()=>advance(-1)}><Icon name="chevron-down" size={19}/></button>}
  <button className="m43-section-nav m43-next" aria-label={hero?'Explore the knife':product?'Back to collection':'Next section'} title={product?'Collection':SECTIONS[currentSection+1]} disabled={busy} onClick={()=>advance(1)}><Icon name="chevron-down" size={19}/></button>
  <span className="sr-only" role="status" aria-live="polite">{knife.name} — {SECTIONS[currentSection]}</span>
  {hero&&<>
   <nav className="m43-orbit-nav" aria-label="Knife collection">
    <button aria-label="Previous knife" disabled={ready.length<2} onClick={()=>changeKnife(-1)}><Icon name="chevron-right" size={15}/></button>
    <button className="m43-play" aria-label={autoplay?'Pause carousel':'Play carousel'} aria-pressed={autoplay} onClick={()=>setAutoplay(value=>!value)}><span aria-hidden="true">{autoplay?'Ⅱ':'▷'}</span></button>
    <button aria-label="Next knife" disabled={ready.length<2} onClick={()=>changeKnife(1)}><Icon name="chevron-right" size={15}/></button>
   </nav>
  </>}
  {detail&&<>
   <SurfaceControls key={view.chapter} surface={view.chapter===0?'blade':'handle'} originalColor={originalConfiguration(view.selected)[view.chapter===0?'blade':'handle'].color} config={config} onChange={changeConfig} onDesign={setDesigner}/>
   {knife.folding&&<button ref={pivotRef} className="m43-pivot-hotspot" aria-label={exploded?'Assemble knife':'Explode components'} title={exploded?'Assemble knife':'Explode components'} aria-pressed={exploded} disabled={!loaded||busy} onClick={toggleExplode}><Icon name="materials" size={16}/></button>}
  </>}
  {configuring&&<>
   <h1 className="sr-only">Inspect {knife.name}</h1>
   <InspectionControls view={view} disabled={!loaded||busy} onChange={updateScan}/>
   <CameraControls value={inspection} disabled={!loaded||busy} onView={value=>{setInspection(value);setPlacing(false);if(value==='free')api.current?.perspective();}} onReset={()=>{setInspection('front');api.current?.reset();}}/>
   <div className="m43-geometry-actions">
    <button aria-label={exploded?'Assemble knife':'Explode components'} title={knife.folding?(exploded?'Assemble knife':'Explode components'):'Single-piece model'} aria-pressed={exploded} disabled={!loaded||busy||!knife.folding} onClick={toggleExplode}><Icon name="materials" size={24}/></button>
    {knife.folding&&<button aria-label={folded?'Open blade':'Close blade'} title={folded?'Open blade':'Close blade'} aria-pressed={folded} disabled={!loaded||busy} onClick={toggleFold}><Icon name="rotate-3d" size={25}/></button>}
   </div>
  </>}
  {product&&<section className="m43-product m43-column" aria-label="Product details">
   <h1>{knife.name}</h1>
   <p className="m43-price">{knife.pricePending?<span title="Price to be confirmed">—</span>:money(configPrice(knife.id,config)).replace('.00','')}</p>
   <p className="m43-description">{knife.description}</p>
  </section>}
  {designer&&<aside className="m43-designer" aria-label="Personal design editor" data-scroll>
   <button className="m43-close-designer" aria-label="Close design editor" onClick={()=>{setDesigner(null);setPlacing(false);}}><Icon name="x" size={18}/></button>
   <Configurator key={designer+knife.id} knife={knife} knifeIndex={view.selected} config={config} onChange={changeConfig} activeId={activeId} onActive={setActiveId} placing={placing} onPlace={setPlacing} defaultAnchor={defaultAnchor} preview={materialPreviews} disabled={busy||!loaded} initialCategory={designer} initialSurface={view.chapter===1?'handle':'blade'} compact onSection={()=>{}} laser={{axis:'z',direction:1,progress:0,disabled:true,onAxis:()=>{},onDirection:()=>{},onProgress:()=>{},onReset:()=>{}}}/>
  </aside>}
  {placing&&<div className="m43-placement-hint"><span>Select a point on the knife.</span><button onClick={()=>setPlacing(false)} aria-label="Cancel positioning"><Icon name="x" size={17}/></button></div>}
  {!loaded&&!error&&<div className="m43-loading" role="status"><i/><span>Preparing {knife.name}</span></div>}
  {loaded&&ready.length<KNIVES.length&&!error&&<span className="m43-loading-count" role="status">{ready.length} / {KNIVES.length}</span>}
  {error&&<div className="m43-error" role="alert"><span>{error}</span><button onClick={()=>location.reload()}>Retry</button></div>}
  {notice&&<div className="m43-toast" role="status">{notice}</div>}
  {checkout&&<Checkout items={bag} onItems={setBag} onClose={()=>{setCheckout(false);wheel.current.reset();}}/>}
 </main>;
}
