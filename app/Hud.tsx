'use client';
import type {CSSProperties} from 'react';
import {CATALOGUE,type Option} from './lib/catalogue';
import {hasManualRotation,KNIVES,type DemoState,type Configuration,type Surface,type View} from './lib/state';
export function Glyph({name,size=26}:{name:string;size?:number}){
 const paths:Record<string,React.ReactNode>={
  stageIcon:<><path d="m2.5 10 9.5-7.4 9.5 7.4M5.4 9v11h5v-6h3.2v6h5V9"/></>,
  bladeIcon:<><path d="M2.2 17.2c4.4.8 7.8.2 11.2-2.3l5.2-4.5-3.8-4.1-2 .5Z" fill="currentColor" fillOpacity=".16"/><path d="M3.2 16.8c3.8-.3 7-1.6 10.2-4.4m2.4-5.1 2-2 3.5 3.7-2 2"/></>,
  handleIcon:<><path d="m3.2 15 9.9-10.3a3.7 3.7 0 0 1 5.1-.1l2 2a3.5 3.5 0 0 1-1 5.6l-3.7 1.5-5.1 5.6a3.7 3.7 0 0 1-5.2.1l-2-2a1.9 1.9 0 0 1 0-2.4Z"/><circle cx="7.5" cy="16.1" r="1.15"/><path d="m12.4 9.1 2.5 2m-.4-4.2 2.3 1.8"/></>,
  detailsIcon:<><path d="m7.4 3.6 9.2 0 4.6 8.4-4.6 8.4H7.4L2.8 12Z"/><circle cx="12" cy="12" r="4"/><path d="m9.4 14.5 5.2-5"/></>,
  inspectIcon:<><circle cx="9.7" cy="9.8" r="6.3"/><path d="m14.4 14.4 6.6 6.5M7 9.8h5.4m-2.7-2.7v5.4"/></>,
  left:<path d="m15.5 3.5-8.5 8.5 8.5 8.5"/>,right:<path d="m8.5 3.5 8.5 8.5-8.5 8.5"/>,
  blade:<><path d="M6.2 15.6h13a2 2 0 0 1 0 4H6.4a2.2 2.2 0 0 1-.2-4.4Z"/><circle cx="6.4" cy="17.6" r=".64" fill="currentColor" stroke="none"/><path d="m5.7 14 4-10.6c1.7 4.9.6 8.8-1.6 11M13.5 6.9a8.8 8.8 0 0 1 5.2 5.6m-3.1-.9 3.2 1.2 1-3.1"/></>,
  explode:<><path d="m3 7 9-4 9 4-9 4Z"/><path d="m3 11 9 4 9-4M3 15l9 4 9-4"/></>,
  orbit:<><path d="m7 3-4 4v6l4 4h8l5-5V6l-4-3h-4M20 3v4h-4"/><path d="m3 17 1-4 4 1"/><path d="M11 10h2v2h-2Z"/></>,
  reset:<><path d="M5 7 9 3h7l5 5v7l-5 5H9l-5-5M4 3v5h5"/></>,
  zoom:<><path d="m10 3 5 2 2 5-2 5-5 2-5-2-2-5 2-5Zm6 13 5 5M7 10h6m-3-3v6"/></>,
  side:<><path d="m3 13 8-4 3 1 7 1v4h-8l-2-1H3Z"/><path d="M13 11v3"/></>,
  top:<><path d="m4 12 7-2h10v4H11Z"/><path d="M13 10v4"/></>,
  edge:<path d="m12 3-2 7v11h4V10Z"/>,
  perspective:<><path d="m3 16 6-8 4-1 8-3v4l-8 6-2-1-7 5Z"/><path d="m13 7 1 5"/></>,
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]??paths.reset}</svg>;
}
export function Brand(){return <img className="wordmark" src="/memento-typo.svg" alt="Memento" width="1424" height="64" draggable={false}/>;}

const surfaceNames={blade:'lama',handle:'manico',metals:'dettagli'};

type Kind='color'|'style';
function Sample({item,index,row}:{item:Option;index:number;row:number}){
 const style:CSSProperties=item.motif?{}:{backgroundPosition:index*20+'% '+(row/24*100)+'%'};
 return <span className={item.motif?'sample motif-'+item.motif:'sample atlas'} style={style}/>;
}

export function VariantRecall({surface,model,config}:{surface:Surface;model:number;config:Configuration}){
 const collection=CATALOGUE[KNIVES[model]][surface],selection=config[surface];
 return <aside className="variant-recall" aria-label={'Varianti attive · '+surfaceNames[surface]} aria-live="polite" aria-atomic="true">
  {(['style','color'] as const).map(kind=>{
   const index=selection[kind],material=kind==='style',item=(material?collection.styles:collection.colors)[index];
   return <div className="recall-box" key={kind} data-recall={kind}>
    <span className={'variant-chip '+kind} aria-hidden="true"><Sample item={item} index={index} row={collection.swatchRow+(material?1:0)}/></span>
    <div><span className="recall-label">{material?'Material':'Color'} · {surfaceNames[surface]}</span><strong>{item.name}</strong><p>{item.description}</p></div>
   </div>;
  })}
 </aside>;
}

function ChoiceGroup({kind,surface,options,selected,row,onSelect}:{
 kind:Kind;surface:Surface;options:Option[];selected:number;row:number;onSelect:(index:number)=>void
}){
 return <div className="choice-group"><h2>{kind==='style'?'MATERIAL':'COLOR'}</h2>
  <div className="choice-grid" role="group" aria-label={(kind==='color'?'Colore ':'Materiale ')+surfaceNames[surface]}>
   {options.map((item,i)=><button key={item.name} type="button" className={'choice '+kind} title={item.name}
    aria-label={item.name} aria-pressed={i===selected} onClick={()=>onSelect(i)}>
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
type RangeKey='closed'|'exploded'|'zoom';
type TechValues={closed:number;exploded:number;view:View;cuts:[number,number,number];zoom:number};
type SetRange=(key:RangeKey,v:number)=>void;
function Slider({label,icon,name,value,min=0,max=100,showValue=true,onChange}:{label?:string;icon?:string;name:string;value:number;min?:number;max?:number;showValue?:boolean;onChange:(v:number)=>void}){
 return <label className="slider-row" title={name}><span>{icon?<Glyph name={icon} size={22}/>:label}</span><input aria-label={name} aria-valuetext={value+'%'} type="range" min={min} max={max} step="1" value={value} onChange={e=>onChange(Number(e.target.value))}/>{showValue&&<output aria-hidden="true">{value}%</output>}</label>;
}
export function PoseHud({value,onValue}:{value:TechValues;onValue:SetRange}){
 return <div className="pose-hud" role="group" aria-label="Posa del modello" data-pose>
  <Slider showValue={false} icon="blade" name="Apertura e chiusura lama" value={Math.round(value.closed*100)} onChange={v=>onValue('closed',v/100)}/>
  <Slider showValue={false} icon="explode" name="Distanza esploso" value={Math.round(value.exploded*100)} onChange={v=>onValue('exploded',v/100)}/>
 </div>;
}
export function TechnicalHud({value,onValue,onView,onCut,onReset}:{value:TechValues & Pick<DemoState,'rotation'>;onValue:SetRange;onView:(v:View)=>void;onCut:(axis:number,value:number)=>void;onReset:()=>void}){
 return <div className="technical-hud hud-panel" data-panel>
  <div className="camera-block" role="group" aria-label="Camere e zoom">
   <div className="technical-head"><h2>INSPECT</h2><button className="reset-control" title="Ripristina posa e camera" aria-label="Ripristina posa e camera" onClick={onReset}><Glyph name="reset" size={16}/></button></div>
   <div className="view-row" role="group" aria-label="Inquadrature">{(['side','top','edge','perspective'] as const).map((v,i)=><button key={v} title={['Laterale','Dall’alto','Frontale','Prospettica'][i]} aria-label={['Vista laterale','Vista dall’alto','Vista frontale','Vista prospettica'][i]} aria-pressed={value.view===v&&!hasManualRotation(value)} onClick={()=>onView(v)}><Glyph name={v} size={23}/></button>)}</div>
   <Slider label="ZOOM" name="Zoom camera" value={Math.round(value.zoom*100)} min={65} max={220} onChange={v=>onValue('zoom',v/100)}/>
  </div>
  <div className="cut-ranges" role="group" aria-label="Sezioni XYZ"><h3>SEZIONE</h3>
   {['X','Y','Z'].map((axis,i)=><Slider key={axis} label={axis} name={'Sezione '+axis} value={Math.round(value.cuts[i]*100)} onChange={v=>onCut(i,v/100)}/>)}
  </div>
 </div>;
}
