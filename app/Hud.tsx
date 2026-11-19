'use client';
import type {CSSProperties} from 'react';
import {CATALOGUE,type Option} from './lib/catalogue';
import {KNIVES,type Configuration,type Surface,type View} from './lib/state';
export function Glyph({name,size=26}:{name:string;size?:number}){
 const paths:Record<string,React.ReactNode>={
  stageIcon:<><ellipse cx="12" cy="16.5" rx="9.5" ry="3.2"/><path d="m9 12 5.8-7.6 1.5.7-3.6 7.5-4.4 1.8Z"/></>,
  bladeIcon:<><path d="M2.6 16.8 15 5.6l3 .7 2.4 2.5-6.1 5.4c-3.5 2.5-7.5 3.2-11.7 2.6Z"/><path d="m6.5 15.8 8.7-7.3"/></>,
  handleIcon:<><path d="m3.5 15.8 12-11.4 3.2.1 2 2.3-.2 2.5L8.2 20.1l-3.5-.3-1.6-2.4Z"/><circle cx="7.2" cy="16.2" r="1.05"/><path d="m11 13.2 5.1-4.8"/></>,
  detailsIcon:<><path d="m8.2 3.3 7.6 0 5.4 5.4v6.7l-5.4 5.3H8.2l-5.4-5.3V8.7Z"/><circle cx="12" cy="12" r="4.1"/><path d="m10.8 13.3 2.4-2.6"/></>,
  inspectIcon:<><path d="M3 9V4h5m8 0h5v5m0 6v5h-5m-8 0H3v-5"/><circle cx="11" cy="11" r="3.5"/><path d="m13.7 13.7 3.1 3.1"/></>,
  down:<path d="m5 8 6 6m2 0 6-6"/>,up:<path d="m5 16 6-6m2 0 6 6"/>,left:<path d="m15 4-7 7m0 2 7 7"/>,right:<path d="m9 4 7 7m0 2-7 7"/>,
  blade:<><path d="m3 17 9-4 8 4-9 2Z"/><path d="m5 13 6-9 2 9M15 5a8 8 0 0 1 5 7m-3-2 3 2 1-3"/></>,
  explode:<><path d="m3 7 9-4 9 4-9 4Z"/><path d="m3 11 9 4 9-4M3 15l9 4 9-4"/></>,
  orbit:<><path d="m7 3-4 4v6l4 4h8l5-5V6l-4-3h-4M20 3v4h-4"/><path d="m3 17 1-4 4 1"/><path d="M11 10h2v2h-2Z"/></>,
  reset:<><path d="M5 7 9 3h7l5 5v7l-5 5H9l-5-5M4 3v5h5"/></>,
  zoom:<><path d="m10 3 5 2 2 5-2 5-5 2-5-2-2-5 2-5Zm6 13 5 5M7 10h6m-3-3v6"/></>,
  side:<><path d="m3 13 8-4 3 1 7 1v4h-8l-2-1H3Z"/><path d="M13 11v3"/></>,
  top:<><path d="m4 12 7-2h10v4H11Z"/><path d="M13 10v4"/></>,
  edge:<path d="m12 3-2 7v11h4V10Z"/>,
  perspective:<><path d="m3 16 6-8 4-1 8-3v4l-8 6-2-1-7 5Z"/><path d="m13 7 1 5"/></>,
  pause:<path d="M8 6v12M16 6v12"/>,play:<path d="m8 5 11 7-11 7Z"/>,
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.05" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">{paths[name]??paths.reset}</svg>;
}
export function Brand(){return <img className="wordmark" src="/memento-typo.svg" alt="Memento" width="1424" height="64" draggable={false}/>;}

const surfaceNames={blade:'lama',handle:'manico',metals:'dettagli'};

function ChoiceGroup({label,kind,surface,options,selected,row,onSelect}:{
 label:string;kind:'color'|'style';surface:Surface;options:Option[];selected:number;row:number;onSelect:(index:number)=>void
}){
 const option=options[selected];
 return <div className="choice-group">
  <div className="choice-options"><h2>{label}</h2>
  <div className="choice-grid" role="group" aria-label={(kind==='color'?'Colore ':'Materiale ')+surfaceNames[surface]}>
   {options.map((item,i)=>{
    const sample:CSSProperties=item.motif?{}:{backgroundPosition:(i*20)+'% '+(row/24*100)+'%'};
    return <button key={item.name} type="button" className={'choice '+kind} title={item.name}
     aria-label={item.name} aria-pressed={i===selected} onClick={()=>onSelect(i)}>
     <span className="sample-outline"><span className={item.motif?'sample motif-'+item.motif:'sample atlas'} style={sample}/></span>
    </button>;
   })}
  </div>
  </div>
  <div className="choice-caption" aria-live="polite" aria-atomic="true">
   <strong>{option.name}</strong><p>{option.description}</p>
  </div>
 </div>;
}

export function MaterialHud({surface,model,config,onChange}:{
 surface:Surface;model:number;config:Configuration;onChange:(surface:Surface,key:'color'|'style',value:number)=>void
}){
 const choices=CATALOGUE[KNIVES[model]][surface],value=config[surface];
 return <div className="material-hud hud-panel" data-hud={surface} data-panel>
  <ChoiceGroup label="COLOR" kind="color" surface={surface} options={choices.colors} selected={value.color}
   row={choices.swatchRow} onSelect={i=>onChange(surface,'color',i)}/>
  <ChoiceGroup label="STYLE" kind="style" surface={surface} options={choices.styles} selected={value.style}
   row={choices.swatchRow+1} onSelect={i=>onChange(surface,'style',i)}/>
 </div>;
}
type RangeKey='closed'|'exploded'|'zoom';
type TechValues={closed:number;exploded:number;view:View;cuts:[number,number,number];zoom:number};
function Slider({label,name,value,min=0,max=100,unit='%',onChange}:{label:string;name:string;value:number;min?:number;max?:number;unit?:string;onChange:(v:number)=>void}){
 return <label className="slider-row"><span>{label}</span><input aria-label={name} aria-valuetext={value+unit} type="range" min={min} max={max} step="1" value={value} onChange={e=>onChange(Number(e.target.value))}/><output aria-hidden="true">{value}{unit}</output></label>;
}
export function TechnicalHud({value,onValue,onView,onCut,onReset}:{value:TechValues;onValue:(key:RangeKey,v:number)=>void;onView:(v:View)=>void;onCut:(axis:number,value:number)=>void;onReset:()=>void}){
 return <div className="technical-hud hud-panel" data-panel>
  <div className="technical-head"><h2>INSPECT</h2><button className="reset-control" title="Ripristina posa e camera" aria-label="Ripristina posa e camera" onClick={onReset}><Glyph name="reset" size={19}/><span>RESET</span></button></div>
  <div className="view-row" role="group" aria-label="Inquadrature">{(['side','top','edge','perspective'] as const).map((v,i)=><button key={v} title={['Laterale','Dall’alto','Frontale','Prospettica'][i]} aria-label={['Vista laterale','Vista dall’alto','Vista frontale','Vista prospettica'][i]} aria-pressed={value.view===v} onClick={()=>onView(v)}><Glyph name={v} size={28}/></button>)}</div>
  <div className="inspect-ranges"><div className="range-group" role="group" aria-label="Posa e zoom">
   <Slider label="LAMA" name="Chiusura lama" value={Math.round(value.closed*100)} onChange={v=>onValue('closed',v/100)}/>
   <Slider label="ESPLOSO" name="Distanza esploso" value={Math.round(value.exploded*100)} onChange={v=>onValue('exploded',v/100)}/>
   <Slider label="ZOOM" name="Zoom camera" value={Math.round(value.zoom*100)} min={65} max={220} onChange={v=>onValue('zoom',v/100)}/>
  </div><div className="range-group cut-ranges" role="group" aria-label="Sezioni XYZ">
   <h3>SEZIONE</h3>
   {['X','Y','Z'].map((axis,i)=><Slider key={axis} label={axis} name={'Sezione '+axis} value={Math.round(value.cuts[i]*100)} onChange={v=>onCut(i,v/100)}/>)}
  </div></div>
 </div>;
}
