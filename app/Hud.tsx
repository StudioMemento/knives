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
export function Brand(){return <span className="wordmark" data-fx-text>MEMENTO</span>;}
export function MaterialHud({surface,config,onChange}:{surface:Surface;config:Configuration;onChange:(key:Surface,part:'color'|'style',value:number)=>void}){
 const value=config[surface];return <div className="material-hud" data-hud={surface}>
  <h2 data-fx-text>{surface.toUpperCase()}</h2>
  <div className="swatches" role="group" aria-label={'Materiale '+surface}>{COLORS.map((c,i)=><button data-fx-control key={c.name} className={'swatch '+(i===value.color?'selected':'')} style={{'--sample':c.hex} as React.CSSProperties} title={c.name} aria-label={surface+' — '+c.name} aria-pressed={i===value.color} onClick={()=>onChange(surface,'color',i)}><span/></button>)}</div>
  <h2 data-fx-text className="style-title">STYLE</h2>
  <div className="finishes" role="group" aria-label={'Finitura '+surface}>{STYLES.map((name,i)=><button data-fx-control key={name} className={'finish style-'+i+' '+(i===value.style?'selected':'')} title={name} aria-label={surface+' — '+name} aria-pressed={i===value.style} onClick={()=>onChange(surface,'style',i)}><span/></button>)}</div>
 </div>;
}
export type TechValues={closed:number;exploded:number;spin:boolean;view:View;cuts:[number,number,number];zoom:number};
export function TechnicalHud({value,onAction,onView,onCut,onReset}:{value:TechValues;onAction:(name:'blade'|'explode'|'orbit'|'zoom')=>void;onView:(v:View)=>void;onCut:(axis:number,value:number)=>void;onReset:()=>void}){
 return <div className="technical-hud">
  <div className="action-row">{(['blade','explode','orbit'] as const).map((name,i)=><button data-fx-control key={name} aria-label={['Apri o chiudi lama','Attiva esploso','Rotazione automatica'][i]} aria-pressed={[value.closed>.5,value.exploded>.5,value.spin][i]} onClick={()=>onAction(name)}><Glyph name={name}/><span data-fx-text>{['LAMA','ESPLOSO','ORBITA'][i]}</span></button>)}</div>
  <div className="view-title"><h2 data-fx-text>VISTE</h2><button data-fx-control aria-label="Avvicina dettaglio" aria-pressed={value.zoom>1} onClick={()=>onAction('zoom')}><Glyph name="zoom" size={24}/></button></div>
  <div className="view-row" role="group" aria-label="Inquadrature">{(['side','top','edge','perspective'] as const).map((v,i)=><button data-fx-control key={v} aria-label={['Vista laterale','Vista dall’alto','Vista frontale','Vista prospettica'][i]} aria-pressed={value.view===v} onClick={()=>onView(v)}><Glyph name={v} size={31}/></button>)}</div>
  <h2 data-fx-text className="section-title">SEZIONE</h2>
  <div className="axis-sliders">{['X','Y','Z'].map((axis,i)=><label key={axis}><span data-fx-text>{axis}</span><input data-fx-control aria-label={'Sezione '+axis} type="range" min="0" max="100" step="1" value={Math.round(value.cuts[i]*100)} onChange={e=>onCut(i,Number(e.target.value)/100)}/></label>)}</div>
  <button data-fx-control className="reset-control" aria-label="Ripristina posa e camera" onClick={onReset}><Glyph name="reset" size={36}/><span data-fx-text>RESET</span></button>
 </div>;
}
