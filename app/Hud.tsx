'use client';
import {COLORS,STYLES,type Configuration,type Surface,type View} from './lib/state';
export function Glyph({name,size=26}:{name:string;size?:number}){
 const paths:Record<string,React.ReactNode>={
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

export function MaterialHud({surface,config,onChange}:{surface:Surface;config:Configuration;onChange:(key:Surface,part:'color'|'style',value:number)=>void}){
 const value=config[surface],label=surface==='metals'?'Details':surface;
 return <div className="material-hud" data-hud={surface} data-panel>
  <div className="material-group">
   <h2>{label.toUpperCase()}</h2>
   <div className="swatches" role="group" aria-label={'Materiale '+label}>{COLORS.map((c,i)=><button key={c.name} className={'swatch '+(i===value.color?'selected':'')} style={{'--sample':c.hex} as React.CSSProperties} title={c.name} aria-label={label+' — '+c.name} aria-pressed={i===value.color} onClick={()=>onChange(surface,'color',i)}><span/></button>)}</div>
  </div>
  <div className="finish-group">
   <h2>STYLE</h2>
   <div className="finishes" role="group" aria-label={'Finitura '+label}>{STYLES.map((name,i)=><button key={name} className={'finish style-'+i+' '+(i===value.style?'selected':'')} title={name} aria-label={label+' — '+name} aria-pressed={i===value.style} onClick={()=>onChange(surface,'style',i)}><span/></button>)}</div>
  </div>
 </div>;
}
type RangeKey='closed'|'exploded'|'zoom';
type TechValues={closed:number;exploded:number;view:View;cuts:[number,number,number];zoom:number};
function Slider({label,name,value,min=0,max=100,unit='%',onChange}:{label:string;name:string;value:number;min?:number;max?:number;unit?:string;onChange:(v:number)=>void}){
 return <label className="slider-row"><span>{label}</span><input aria-label={name} aria-valuetext={value+unit} type="range" min={min} max={max} step="1" value={value} onChange={e=>onChange(Number(e.target.value))}/><output aria-hidden="true">{value}{unit}</output></label>;
}
export function TechnicalHud({value,onValue,onView,onCut,onReset}:{value:TechValues;onValue:(key:RangeKey,v:number)=>void;onView:(v:View)=>void;onCut:(axis:number,value:number)=>void;onReset:()=>void}){
 return <div className="technical-hud" data-panel>
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
