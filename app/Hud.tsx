'use client';
import {useLayoutEffect,useRef,type CSSProperties,type ReactNode} from 'react';
import {CATALOGUE,SURFACES,type Option} from './lib/catalogue';
import {LIGHT_ORDER,LIGHT_PRESETS,type LightPreset} from './lib/light-presets';
import {hasManualRotation,KNIVES,type DemoState,type Configuration,type Surface,type View} from './lib/state';

const chevron = 'M18.5.5 5.5 12l13 11.5-1.6-4.4L9 12l7.9-7.1Z';
const paths:Record<string,ReactNode>={
  stageIcon:<><path d="m1.9 11.8 10.1-10 10.1 10-3.5.7v4.1L12 22l-6.6-5.4v-4.1Z"/><path d="m9.5 19.9.1-6.3h4.8l.1 6.3"/></>,
  bladeIcon:<><path d="M2.1 14.9 12.6 4.6l8.9-2.3-2.4 9.2-7.8 8-2.9-2.8-3.2 3.2-2.8-2.8 2.1-2.1Z"/><path d="m8.6 14.7 8-8.1 4.7-4.1"/></>,
  handleIcon:<><path d="M2.3 14.1 13.8 2.7l4.8.8 3.1 3.1-1 4.4-4.9 4.9-3 .1-5.8 5-3.3-1.5-2-2Z"/><circle cx="16.5" cy="7.5" r="2"/><path d="m5.1 16.7 4-4"/></>,
  detailsIcon:<><path d="m10.6 2.2 2.8 0 8.4 8.4v2.8l-8.4 8.4h-2.8l-8.4-8.4v-2.8Z"/><path d="m12 7 4.4 2.5v5L12 17l-4.4-2.5v-5Z"/></>,
  inspectIcon:<><path d="m2 10.3 8.1-8.1 8.2 8.1-2.2 2.4 6 6-3.4 3.4-6-6-2.6 2.4Z"/><path d="M6.8 10.3h6.6m-3.3-3.2v6.5"/></>,
  left:<path d={chevron} fill="currentColor" stroke="none"/>,
  right:<path d={chevron} transform="translate(24 0) scale(-1 1)" fill="currentColor" stroke="none"/>,
  blade:<><path d="m3 17.1 1.9-2h15.7v3.2l-2 2H5.4L3 18Z"/><path d="m4.7 14.8 4.1-11 1.6 3.6-.4 3.5-2.3 4.1M13.2 5.8a9.1 9.1 0 0 1 6.1 6.3m.6-3.7-.5 3.9-3.7-.9"/><circle cx="6.2" cy="17.7" r=".8" fill="currentColor" stroke="none"/></>,
  bladeClosed:<><path d="m3 15.7 2-2h15.6v3.9l-2.1 2.1H5.1L3 17.6Z"/><path d="m7.8 13.7 7.3-2 4.4.6M18.5 9.9a8.8 8.8 0 0 0-6.6-5.5m2.2 3-2.5-3.1 3.7-1.4"/><circle cx="6.2" cy="16.8" r=".85" fill="currentColor" stroke="none"/></>,
  explode:<><path d="m2.5 8 9.5-4.5L21.5 8 12 12.5Z"/><path d="m2.5 12 9.5 4.5 9.5-4.5m-19 4 9.5 4.5 9.5-4.5"/></>,
};
export function Glyph({name,size=26}:{name:string;size?:number}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export function Brand() {
 return <span className="wordmark" aria-hidden="true">
  {Array.from('memento', (letter, i) =>
   <img key={i} src={'/memento-mobile.svg#letter-' + letter} alt="" draggable={false} width="16" height="16"/>
  )}
 </span>;
}

export function ProductHeading({name,price}:{name:string;price:number}) {
 const ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const heading=ref.current, region=heading?.parentElement;
  const title=heading?.querySelector('h1'), ink=document.createElement('canvas').getContext('2d');
  if(!heading||!region||!title||!ink)return;
  let mounted=true;
  // A shallow viewport limits the cap height. Fit the complete, kerned lockup
  // to the same horizontal margins without adding space between the letters.
  const fit=()=>{
   if(!mounted)return;
   const type=getComputedStyle(title);
   ink.font=type.fontWeight+' '+type.fontSize+' '+type.fontFamily;
   ink.fontKerning='normal';
   const supportsTracking='letterSpacing' in ink;
   if(supportsTracking)ink.letterSpacing=type.letterSpacing;
   const metrics=ink.measureText(name);
   const manualTracking=supportsTracking?0:(name.length-1)*parseFloat(type.letterSpacing);
   const width=metrics.actualBoundingBoxRight+metrics.actualBoundingBoxLeft+manualTracking;
   if(width<=0)return;
   heading.style.setProperty('--run-width',width+'px');
   heading.style.setProperty('--run-start',metrics.actualBoundingBoxLeft+'px');
   heading.style.setProperty('--word-scale',String(region.getBoundingClientRect().width/width));
  };
  fit();
  const observer=new ResizeObserver(fit);
  observer.observe(region.parentElement??region);
  void document.fonts.ready.then(fit);
  return ()=>{mounted=false;observer.disconnect();};
 },[name]);
 return <div ref={ref} className="product-heading">
  <h1 className="atmospheric-title" data-product-name>{name}</h1>
  <div className="price" aria-live="polite" aria-atomic="true" aria-label={'Demo price: '+price+' euros'}>
   <span className="currency">€</span><span data-price>{price}</span>
  </div>
 </div>;
}

function PanelTitle({text}: {text:string}) {
 return <h2 className="panel-title" aria-label={text}>
  {Array.from(text,(letter,i)=><span key={i} aria-hidden="true">{letter}</span>)}
 </h2>;
}

type Kind='color'|'style';
function Sample({item,index,row}:{item:Option;index:number;row:number}){
 const style:CSSProperties=item.motif?{}:{backgroundPosition:index*20+'% '+(row/24*100)+'%'};
 return <span className={item.motif?'sample motif-'+item.motif:'sample atlas'} style={style}/>;
}

const partLabels = {blade: 'BLADE', handle: 'HANDLE', metals: 'METALS'};

export function ConfigurationSummary({model, config}: {model:number; config:Configuration}) {
 return <dl className="configuration" aria-label="Current configuration">
  {SURFACES.map(surface => {
   const options = CATALOGUE[KNIVES[model]][surface];
   const selected = config[surface];
   const material = options.styles[selected.style], color = options.colors[selected.color];
   return <div key={surface} data-config={surface}>
    <dt><span className="part-marker" aria-hidden="true">//</span><span>{partLabels[surface]}</span></dt>
    <dd aria-label={'Style: '+material.name}>
     <span className="config-swatch config-finish" aria-hidden="true">
      <Sample item={material} index={selected.style} row={options.swatchRow+1}/>
     </span>
     <span data-material-name>{material.name}</span>
    </dd>
    <dd aria-label={'Color: '+color.name}>
     <span className="config-swatch config-tone" aria-hidden="true">
      <Sample item={color} index={selected.color} row={options.swatchRow}/>
     </span>
     <span data-color-name>{color.name}</span>
    </dd>
   </div>;
  })}
 </dl>;
}

function ChoiceGroup({kind,surface,options,selected,row,onSelect}:{
 kind:Kind;surface:Surface;options:Option[];selected:number;row:number;onSelect:(index:number)=>void
}){
 return <div className="control-group choice-group"><PanelTitle text={kind==='style'?'STYLE':'COLOR'}/>
  <div className="choice-grid" role="group" aria-label={surface+' '+kind}>
   {options.map((item,i)=><button key={item.name} type="button" className={'choice '+kind} title={item.name}
    aria-label={item.name} aria-description={item.description} aria-pressed={i===selected} onClick={()=>onSelect(i)}>
    <span className="sample-outline"><Sample item={item} index={i} row={row}/></span>
   </button>)}
  </div></div>;
}

export function MaterialHud({surface,model,config,onChange}:{
 surface:Surface;model:number;config:Configuration;onChange:(surface:Surface,key:Kind,value:number)=>void
}){
 const choices=CATALOGUE[KNIVES[model]][surface],value=config[surface];
 return <div className="material-hud hud-panel" data-hud={surface} data-panel>
  <ChoiceGroup kind="style" surface={surface} options={choices.styles} selected={value.style}
   row={choices.swatchRow+1} onSelect={i=>onChange(surface,'style',i)}/>
  <ChoiceGroup kind="color" surface={surface} options={choices.colors} selected={value.color}
   row={choices.swatchRow} onSelect={i=>onChange(surface,'color',i)}/>
 </div>;
}
type PoseValues=Pick<DemoState,'closed'|'exploded'>;
export function PoseHud({value,onValue}:{value:PoseValues;onValue:(key:keyof PoseValues,n:number)=>void}){
 return <>
  {(['closed','exploded'] as const).map((key,i)=>{
   const pressed=value[key]>.5;
   const action=i?(pressed?'Reassemble model':'Explode model'):(pressed?'Open blade':'Close blade');
   return <button type="button" key={key} className="pose-action" data-control={key} aria-label={i?'Exploded view':'Closed blade'} aria-pressed={pressed} title={action}
    onClick={()=>onValue(key,pressed?0:1)}><Glyph name={i?'explode':pressed?'bladeClosed':'blade'} size={31}/></button>;
  })}
 </>;
}

const cameraLabels:Record<View,string>={side:'Side',top:'Top',edge:'End-on',perspective:'Perspective',clip:'Pocket clip',screw:'Screw detail'};
// Filled planes distinguish the three orthographic views. The perspective view
// shows all three edges. Macro views keep the contour of the actual detail.
const cameraSymbols:Record<View|'loop',ReactNode>={
 side:<><path d="M6 13h16v9H6Z" fill="currentColor" fillOpacity=".30"/><path d="m6 13 4-4h16v9l-4 4m0-9 4-4"/></>,
 top:<><path d="m5 14 6-7h16l-6 7Z" fill="currentColor" fillOpacity=".52"/><path d="M5 14v4l16 1 6-7V7m-6 7v5"/></>,
 edge:<><path d="m10 9 10 5v11l-10-5Z" fill="currentColor" fillOpacity=".40"/><path d="m10 9 6-3 10 5v11l-6 3m0-11 6-3"/></>,
 perspective:<><path d="m6 11 10-5 10 5v11l-10 5-10-5Zm0 0 10 5 10-5M16 16v11"/></>,
 clip:<><path d="m8 22 12-14c2-2 5 0 4 2l-11 14c-2 2-5 2-7-1l-1-2"/><path d="m10 20 9-11"/><circle cx="21.4" cy="9.5" r=".9" fill="currentColor" stroke="none"/></>,
 loop:<><path d="m7 14 11-7 6 2 2 7-11 9-6-1-3-5Z"/><path d="m10 15 9-5 2 1 1 4-9 7-3-1-1-3Z"/></>,
 screw:<><circle cx="16" cy="16" r="9.2"/><path d="m12.2 12.2 3.8 1.3 3.8-1.3-1.3 3.8 1.3 3.8-3.8-1.3-3.8 1.3 1.3-3.8Z" fill="currentColor" fillOpacity=".20"/></>,
};
function CameraIcon({view}:{view:View|'loop'}) {
 return <svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor"
  strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  {cameraSymbols[view]}
  <path className="frame-corners" d="M24.5 2.5h5v5m-27 17v5h5" strokeLinecap="square" strokeLinejoin="miter"/>
 </svg>;
}
type TechnicalProps = {
 value: Pick<DemoState, 'view' | 'rotation'>;
 lightPreset: LightPreset;
 model: number;
 onView: (view:View) => void;
 onLight: (preset:LightPreset) => void;
};

export function TechnicalHud({value, lightPreset, model, onView, onLight}: TechnicalProps) {
 return <div className="technical-hud hud-panel" data-panel>
  <div className="control-group camera-block" role="group" aria-label="Camera views">
   <PanelTitle text="CAMERA"/>
   <div className="view-row">{(Object.keys(cameraLabels) as View[]).map(view => {
    const loop = view==='clip' && KNIVES[model]==='EDGE';
    const name = loop ? 'Rear loop' : cameraLabels[view];
    return <button type="button" key={view} data-view={view} title={name} aria-label={name+' view'}
     aria-pressed={value.view===view && !hasManualRotation(value)} onClick={() => onView(view)}>
     <CameraIcon view={loop?'loop':view}/>
    </button>;
   })}</div>
  </div>
  <div className="control-group light-block" role="group" aria-label="Light presets">
   <PanelTitle text="LIGHT"/>
   <div className="lighting-grid">{LIGHT_ORDER.map((id,index)=>{
    const setup=LIGHT_PRESETS[id];
    return <button type="button" key={id} data-light-preset={id} aria-label={setup.label+' preset'}
     aria-description={setup.description} aria-pressed={lightPreset===id}
     onClick={()=>onLight(id)}>
     <span className="lighting-preview" aria-hidden="true" style={{backgroundPosition:(index*20)+'% 50%'}}/>
    </button>;
   })}</div>
  </div>
 </div>;
}
