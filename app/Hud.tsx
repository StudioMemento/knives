'use client';
import type {CSSProperties} from 'react';
import {CATALOGUE,SURFACES,type Option} from './lib/catalogue';
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
  clip:<><path d="M6.5 15.5 15.8 6.2a3 3 0 0 1 4.2 4.2L8.8 21.6a4.3 4.3 0 0 1-6.1-6.1l12-12" transform="translate(1 -1) scale(.94)"/></>,
  loop:<><rect x="3.8" y="5.8" width="16.4" height="12.4" rx="2" transform="rotate(-24 12 12)"/><path d="m4.5 13 3 4"/></>,
  screw:<><path d="m5 5 3-2 4 4-1 3L8 12l-4-4Z M10 11l8.5 8.5 2-2L12 9m1.8 6.6L16 13m.3 5.1 2.3-2.6"/></>,
  zoom:<><path d="m10 3 5 2 2 5-2 5-5 2-5-2-2-5 2-5Zm6 13 5 5M7 10h6m-3-3v6"/></>,
  side:<><path d="m3 13 8-4 3 1 7 1v4h-8l-2-1H3Z"/><path d="M13 11v3"/></>,
  top:<><path d="m4 12 7-2h10v4H11Z"/><path d="M13 10v4"/></>,
  edge:<path d="m12 3-2 7v11h4V10Z"/>,
  perspective:<><path d="m3 16 6-8 4-1 8-3v4l-8 6-2-1-7 5Z"/><path d="m13 7 1 5"/></>,
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]??paths.reset}</svg>;
}
export function Brand(){
 return <picture><source media="(max-width:699px), (max-height:500px) and (orientation:landscape) and (pointer:coarse)" srcSet="/memento-mobile.svg"/><img className="wordmark" src="/memento-typo.svg" alt="Memento" width="1424" height="64" draggable={false}/></picture>;
}

const surfaceNames={blade:'lama',handle:'manico',metals:'dettagli'};

type Kind='color'|'style';
function Sample({item,index,row}:{item:Option;index:number;row:number}){
 const style:CSSProperties=item.motif?{}:{backgroundPosition:index*20+'% '+(row/24*100)+'%'};
 return <span className={item.motif?'sample motif-'+item.motif:'sample atlas'} style={style}/>;
}

export function ConfigurationSummary({model,config}:{model:number;config:Configuration}){
 return <dl className="configuration" aria-label="Configurazione attiva">
  {SURFACES.map((surface,i)=>{
   const options=CATALOGUE[KNIVES[model]][surface],selected=config[surface];
   const material=options.styles[selected.style],color=options.colors[selected.color];
   return <div key={surface} data-config={surface} title={material.name+' · '+color.name}>
    <dt>{['Blade','Handle','Details'][i]}</dt>
    <dd><span className="config-chip" aria-hidden="true">
     <Sample item={color} index={selected.color} row={options.swatchRow}/>
     <span className="chip-finish"><Sample item={material} index={selected.style} row={options.swatchRow+1}/></span>
    </span><span className="sr-only">{material.name}, </span><span>{color.name}</span></dd>
   </div>;
  })}
 </dl>;
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
type PoseValues=Pick<DemoState,'closed'|'exploded'>;
export function PoseHud({value,onValue}:{value:PoseValues;onValue:(key:keyof PoseValues,n:number)=>void}){
 return <div className="pose-hud" role="group" aria-label="Posa del modello" data-pose>
  {(['closed','exploded'] as const).map((key,i)=>{
   const pressed=value[key]>.5;
   const action=i?(pressed?'Ricomponi il modello':'Esplodi il modello'):(pressed?'Apri la lama':'Chiudi la lama');
   return <button type="button" key={key} data-control={key} aria-label={i?'Vista esplosa':'Lama chiusa'} aria-pressed={pressed} title={action}
    onClick={()=>onValue(key,pressed?0:1)}><span className="pose-tile"><Glyph name={i?'explode':'blade'} size={23}/></span></button>;
  })}
 </div>;
}

const cameraLabels:Record<View,string>={side:'Laterale',top:'Dall’alto',edge:'Frontale',perspective:'Prospettica',clip:'Clip',screw:'Viti'};
export function TechnicalHud({value,model,onView,onCut,onReset}:{value:Pick<DemoState,'view'|'rotation'|'cuts'>;model:number;onView:(v:View)=>void;onCut:(axis:number,value:number)=>void;onReset:()=>void}){
 return <div className="technical-hud hud-panel" data-panel>
  <div className="camera-block" role="group" aria-label="Inquadrature">
   <div className="technical-head"><h2>INSPECT</h2><button type="button" className="reset-control" title="Ripristina posa e camera" aria-label="Ripristina posa e camera" onClick={onReset}><Glyph name="reset" size={14}/></button></div>
   <div className="view-row">{(Object.keys(cameraLabels) as View[]).map(v=>{
    const loop=v==='clip'&&KNIVES[model]==='EDGE',name=loop?'Anello posteriore':cameraLabels[v];
    return <button type="button" key={v} data-view={v} title={name} aria-label={'Vista '+name.toLowerCase()} aria-pressed={value.view===v&&!hasManualRotation(value)} onClick={()=>onView(v)}><Glyph name={loop?'loop':v} size={21}/></button>;
   })}</div>
  </div>
  <div className="cut-ranges" role="group" aria-label="Sezioni XYZ"><h3>SEZIONE</h3>
   {['X','Y','Z'].map((axis,i)=><label className="slider-row" key={axis}><span>{axis}</span><input type="range" min="0" max="100" step="1" aria-label={'Sezione '+axis} value={Math.round(value.cuts[i]*100)} onChange={e=>onCut(i,Number(e.target.value)/100)}/></label>)}
  </div>
 </div>;
}
