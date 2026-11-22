'use client';
import {useLayoutEffect,useRef,type CSSProperties,type ReactNode} from 'react';
import {CATALOGUE,SURFACES,type Option} from './lib/catalogue';
import {LIGHT_ORDER,LIGHT_PRESETS,type LightPreset} from './lib/light-presets';
import {hasManualRotation,CHAPTERS,KNIVES,type DemoState,type Configuration,type Surface,type View} from './lib/state';

const chevron = 'M18.5.5 5.5 12l13 11.5-1.6-4.4L9 12l7.9-7.1Z';
const paths:Record<string,ReactNode>={
  left:<path d={chevron} fill="currentColor" stroke="none"/>,
  right:<path d={chevron} transform="translate(24 0) scale(-1 1)" fill="currentColor" stroke="none"/>,
  blade:<><path d="m3 17.1 1.9-2h15.7v3.2l-2 2H5.4L3 18Z"/><path d="m4.7 14.8 4.1-11 1.6 3.6-.4 3.5-2.3 4.1M13.2 5.8a9.1 9.1 0 0 1 6.1 6.3m.6-3.7-.5 3.9-3.7-.9"/><circle cx="6.2" cy="17.7" r=".8" fill="currentColor" stroke="none"/></>,
  bladeClosed:<><path d="m3 15.7 2-2h15.6v3.9l-2.1 2.1H5.1L3 17.6Z"/><path d="m7.8 13.7 7.3-2 4.4.6M18.5 9.9a8.8 8.8 0 0 0-6.6-5.5m2.2 3-2.5-3.1 3.7-1.4"/><circle cx="6.2" cy="16.8" r=".85" fill="currentColor" stroke="none"/></>,
  explode:<><path d="m2.5 8 9.5-4.5L21.5 8 12 12.5Z"/><path d="m2.5 12 9.5 4.5 9.5-4.5m-19 4 9.5 4.5 9.5-4.5"/></>,
};
export function Glyph({name,size=26}:{name:string;size?:number}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
type Chapter=typeof CHAPTERS[number];
const chapterMarks:Record<Chapter,ReactNode>={
 Stage:<path d="m2 11 10-8.3L22 11m-2.8-2.3v11.6h-5V14H9.8v6.3h-5V8.7"/>,
 Blade:<><path d="m2.3 17.4 5.8-6.1 13.7-6.8c-1.8 5.7-5.3 10-12.4 13.4l-3.8-.3-1.3 1.3Z"/><path d="m8.2 14.4 8.1-5.7"/></>,
 Handle:<><path d="m3.3 14.8 10-10.4a3 3 0 0 1 4.1-.2l2.8 2.7a2.8 2.8 0 0 1 .1 4l-5.1 5.3-2.3.2-3.5 3.9a2.2 2.2 0 0 1-3.1.1l-2.8-2.6a2.1 2.1 0 0 1-.2-3Z"/><circle cx="16.5" cy="8" r="1.45"/><path d="m6.8 15.9 3.5-3.6"/></>,
 Metals:<><path d="M7.1 3.7h9.8l4.9 8.3-4.9 8.3H7.1L2.2 12Z"/><circle cx="12" cy="12" r="4"/></>,
 Inspect:<><circle cx="10.1" cy="10.1" r="6.8"/><path d="m15.2 15.2 6.1 6.1M7.1 10.1h6m-3-3v6"/></>,
};
export function ChapterIcon({chapter}:{chapter:Chapter}){
 return <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
  {chapterMarks[chapter]}
 </svg>;
}
export function Brand() {
 return <span className="wordmark" aria-hidden="true">
  {Array.from('memento', (letter, i) =>
   <img key={i} src={'/memento-mobile.svg#letter-' + letter} alt="" draggable={false} width="16" height="16"/>
  )}
 </span>;
}

export function ProductReadout({model,price,config}:{model:number;price:number;config:Configuration}) {
 const name=KNIVES[model];
 const titleRef=useRef<HTMLHeadingElement>(null), regionRef=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const title=titleRef.current,region=regionRef.current,host=region?.parentElement;
  const summary=region?.querySelector('dl'),priceLine=region?.querySelector<HTMLElement>('.price');
  const firstLabel=summary?.querySelector<HTMLElement>('dt span:last-child');
  const ink=document.createElement('canvas').getContext('2d');
  if(!title||!region||!host||!summary||!priceLine||!firstLabel||!ink)return;
  let mounted=true;
  const fit=()=>{
   if(!mounted)return;
   const box=region.getBoundingClientRect(),list=summary.getBoundingClientRect();
   const type=getComputedStyle(title), figures=getComputedStyle(priceLine);
   ink.font=type.fontWeight+' 1000px '+type.fontFamily;ink.fontKerning='normal';
   const referenceWidth=Math.max(...KNIVES.map(label=>{
    const m=ink.measureText(label);
    return (m.actualBoundingBoxLeft+m.actualBoundingBoxRight)/1000+(label.length-1)*.065;
   }));
   // Reserve one constant column for every three-digit price.
   ink.font=figures.fontWeight+' 1000px '+figures.fontFamily;
   const digit=Math.max(...Array.from('0123456789',n=>ink.measureText(n).width));
   const priceEms=(ink.measureText('€').width+3*digit)/1000+.15;
   const band=box.height-parseFloat(getComputedStyle(region).rowGap);
   const size=Math.max(1,Math.min(box.width/referenceWidth,band/1.36,
    (band-list.height)/.89,2*(box.width-list.width-6)/priceEms));
   host.style.setProperty('--title-size',size+'px');
   host.style.setProperty('--price-reserve',(.5*size*priceEms)+'px');
   ink.font=type.fontWeight+' '+size+'px '+type.fontFamily;
   const m=ink.measureText(name);
   const tracking=(box.width-m.actualBoundingBoxLeft-m.actualBoundingBoxRight)/(name.length-1);
   title.style.setProperty('--title-tracking',tracking+'px');
   title.style.setProperty('--run-start',m.actualBoundingBoxLeft+'px');
   // The figures and the small capitals have different ascenders. Align the ink
   // of the euro and the first label while keeping their layout boxes on one row.
   const capInset=(element:HTMLElement,text:string)=>{
    const style=getComputedStyle(element);ink.font=style.fontWeight+' '+style.fontSize+' '+style.fontFamily;
    const metric=ink.measureText(text);
    return (parseFloat(style.lineHeight)+metric.fontBoundingBoxAscent-metric.fontBoundingBoxDescent)/2-metric.actualBoundingBoxAscent;
   };
   const inkOffset=firstLabel.getBoundingClientRect().top-summary.getBoundingClientRect().top+
    capInset(firstLabel,'BLADE')-capInset(priceLine,'€');
   priceLine.style.setProperty('--figures-offset',(Number.isFinite(inkOffset)?inkOffset:0)+'px');
  };
  fit();
  const observer=new ResizeObserver(fit);observer.observe(region);observer.observe(summary);
  void document.fonts.ready.then(fit);
  return ()=>{mounted=false;observer.disconnect();};
 },[name]);
 return <>
  <div className="product-heading"><h1 ref={titleRef} className="atmospheric-title" data-product-name>{name}</h1></div>
  <div ref={regionRef} className="product-info">
   <div className="price" aria-live="polite" aria-atomic="true" aria-label={'Demo price: '+price+' euros'}>
    <span className="currency">€</span><span data-price>{price}</span>
   </div>
   <ConfigurationSummary model={model} config={config}/>
  </div>
 </>;
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

function ConfigurationSummary({model, config}: {model:number; config:Configuration}) {
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
 return <div className="control-group choice-group"><PanelTitle text={kind==='style'?partLabels[surface]:'COLOR'}/>
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
const cameraSymbols:Record<View|'loop',ReactNode>={
 side:<><path d="M4.6 19.2h7.6l3.3-2.7 12.2-5.8c-2.2 4.7-6.2 8.6-12.8 9.3l-2.1-.8H4.6Zm0 0-1.1-2.4 7.9-2.4 3.2 2.2"/><circle cx="10.9" cy="16.9" r=".9" fill="currentColor" stroke="none"/></>,
 top:<><path d="M16 4.6v7m-3.1-3.2 3.1 3.2 3.1-3.2M4.3 20.7l6.9-5.5h15.4l-6.9 5.5Zm0 0v2.1h15.5l6.8-5.5"/></>,
 edge:<><path d="M16 5.1c1.6 4.6 2.4 10.1 2.4 17.5L16 26l-2.4-3.4c0-7.4.8-12.9 2.4-17.5Z"/><path d="M3.3 16h6.6l-2.2-2.2m2.2 2.2-2.2 2.2m20.8-2.2H22l2.2-2.2M22 16l2.2 2.2"/></>,
 perspective:<><path d="m16 4.8 10.3 5.8v10.3L16 27l-10.3-6.1V10.6Z"/><path d="M5.7 10.6 16 16.4l10.3-5.8M16 16.4V27"/></>,
 clip:<><path d="m7.4 19.8 12-13.2a3.7 3.7 0 0 1 5.5 4.9L13.5 24.7a5.1 5.1 0 0 1-7.7-6.6l10.7-12"/><path d="m10.4 18.4 9.1-10.2"/></>,
 loop:<><path d="m4.5 15.1 13.9-9.2 6.7 1.8 2.3 8.2-14 10.1-6.9-2.1Z"/><path d="m8.6 16.1 10.5-6.8 3.1 1.1 1.1 4.2-10.8 7.7-3-1.4Z"/></>,
 screw:<><circle cx="16" cy="16" r="9.4"/><path d="m14.1 9.9 3.1-.2.5 3.7 3.8-.3.3 3.2-3.8.4.4 3.8-3.2.3-.4-3.9-3.8.4-.3-3.2 3.8-.4Z"/></>,
};
const lightSymbols:Record<LightPreset,ReactNode>={
 spotlight:<><path d="m7 4 9.5 4.3-2.9 6.4-9.4-4.3Zm8.2 7.3 3.8.1-2.4 5.1-2.3-2.7M7.1 5.3 4.8 4.2"/><path d="m20.3 14.1 7 3.1m-9.4.4 6 6.9m-8.5-5.2 2.1 7"/></>,
 penumbra:<><path d="M8.2 6.5h15.6l-2.6 4.7H10.7Z"/><path d="M11 14.2a9.3 9.3 0 0 0 10 0M8 18.6a15.7 15.7 0 0 0 16 0"/><path d="M4.8 23.2a21.8 21.8 0 0 0 22.4 0" strokeDasharray="1.5 3"/></>,
 pointlight:<><circle cx="16" cy="16" r="3.9"/><path d="M16 3.5v5m0 15v5M3.5 16h5m15 0h5M7 7l3.5 3.5m11 11L25 25M7 25l3.5-3.5m11-11L25 7"/></>,
 dome:<><path d="M3.2 21.4a12.8 12.8 0 0 1 25.6 0ZM2.5 25.1h27"/><path d="M9.3 18c.7-3.5 2.5-6.2 5.2-8"/></>,
 rimlight:<><path d="M19.7 5.3a10.8 10.8 0 1 0 .1 21c-4.6-1.5-7.4-5.3-7.4-10.4s2.7-9 7.3-10.6Z"/><path d="m22.7 8.3 2-2m.4 9.5h3m-5.8 7.5 2 2"/></>,
 studio:<><path d="m4.4 5.2 9.4.7 2.1 7.1-5.4 4.6-7.8-4.8Z"/><path d="m9.5 16.9-1 6.4m-4.1 3.6 4.1-3.6 3.5 3.6m8.1-17.1 7.1-2.2 1.9 6-7.1 2.3Zm4.8 6.4v7.4m-3.3 3.2 3.3-3.2 3.1 3.2"/></>,
};
function TechnicalIcon({symbol,framed=false}:{symbol:ReactNode;framed?:boolean}) {
 return <svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor"
  strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  {symbol}
  {framed&&<path className="frame-corners" d="M25 2.5h4.5V7m-27 18v4.5H7" strokeLinecap="square" strokeLinejoin="miter"/>}
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
     <TechnicalIcon symbol={cameraSymbols[loop?'loop':view]} framed/>
    </button>;
   })}</div>
  </div>
  <div className="control-group light-block" role="group" aria-label="Light presets">
   <PanelTitle text="LIGHT"/>
   <div className="lighting-grid">{LIGHT_ORDER.map(id=>{
    const setup=LIGHT_PRESETS[id];
    return <button type="button" key={id} data-light-preset={id} aria-label={setup.label+' preset'}
     title={setup.label} aria-description={setup.description} aria-pressed={lightPreset===id}
     onClick={()=>onLight(id)}>
     <TechnicalIcon symbol={lightSymbols[id]}/>
    </button>;
   })}</div>
  </div>
 </div>;
}
