'use client';
import type {CSSProperties} from 'react';
import {CATALOGUE,SURFACES,type Option} from './lib/catalogue';
import {LIGHT_ORDER,LIGHT_PRESETS,type LightPreset} from './lib/light-presets';
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
  clip:<><path d="M6.5 15.5 15.8 6.2a3 3 0 0 1 4.2 4.2L8.8 21.6a4.3 4.3 0 0 1-6.1-6.1l12-12" transform="translate(1 -1) scale(.94)"/></>,
  loop:<><rect x="3.8" y="5.8" width="16.4" height="12.4" rx="2" transform="rotate(-24 12 12)"/><path d="m4.5 13 3 4"/></>,
  screw:<><path d="m5 5 3-2 4 4-1 3L8 12l-4-4Z M10 11l8.5 8.5 2-2L12 9m1.8 6.6L16 13m.3 5.1 2.3-2.6"/></>,
  zoom:<><path d="m10 3 5 2 2 5-2 5-5 2-5-2-2-5 2-5Zm6 13 5 5M7 10h6m-3-3v6"/></>,
  side:<><path d="m3 13 8-4 3 1 7 1v4h-8l-2-1H3Z"/><path d="M13 11v3"/></>,
  top:<><path d="m4 12 7-2h10v4H11Z"/><path d="M13 10v4"/></>,
  edge:<path d="m12 3-2 7v11h4V10Z"/>,
  perspective:<><path d="m3 16 6-8 4-1 8-3v4l-8 6-2-1-7 5Z"/><path d="m13 7 1 5"/></>,
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export function Brand() {
 return <span className="wordmark" aria-hidden="true">
  {Array.from('memento', (letter, i) =>
   <img key={i} src={'/memento-mobile.svg#letter-' + letter} alt="" draggable={false} width="16" height="16"/>
  )}
 </span>;
}

export function TrackedLetters({text}: {text:string}) {
 return Array.from(text, (letter, i) => <span key={i} aria-hidden="true">{letter}</span>);
}

function PanelTitle({text}: {text:string}) {
 return <h2 className="panel-title" aria-label={text}><TrackedLetters text={text}/></h2>;
}

const surfaceNames={blade:'lama',handle:'manico',metals:'dettagli'};

type Kind='color'|'style';
function Sample({item,index,row}:{item:Option;index:number;row:number}){
 const style:CSSProperties=item.motif?{}:{backgroundPosition:index*20+'% '+(row/24*100)+'%'};
 return <span className={item.motif?'sample motif-'+item.motif:'sample atlas'} style={style}/>;
}

const partLabels = {blade: 'BLADE', handle: 'HANDLE', metals: 'METALS'};

export function ConfigurationSummary({model, config}: {model:number; config:Configuration}) {
 return <dl className="configuration" aria-label="Configurazione attiva">
  {SURFACES.map(surface => {
   const options = CATALOGUE[KNIVES[model]][surface];
   const selected = config[surface];
   const material = options.styles[selected.style], color = options.colors[selected.color];
   return <div key={surface} data-config={surface}>
    <dt>{partLabels[surface]}</dt>
    <dd>
     <span className="config-swatch" aria-hidden="true">
      <span className="config-finish"><Sample item={material} index={selected.style} row={options.swatchRow+1}/></span>
      <span className="config-tone"><Sample item={color} index={selected.color} row={options.swatchRow}/></span>
     </span>
     <span className="config-values">
      <span data-material-name><span className="sr-only">Materiale, </span>{material.name}</span>
      <span data-color-name><span className="sr-only">Colore, </span>{color.name}</span>
     </span>
    </dd>
   </div>;
  })}
 </dl>;
}

function ChoiceGroup({kind,surface,options,selected,row,onSelect}:{
 kind:Kind;surface:Surface;options:Option[];selected:number;row:number;onSelect:(index:number)=>void
}){
 return <div className="control-group choice-group"><PanelTitle text={kind==='style'?'MATERIAL':'COLOR'}/>
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
    onClick={()=>onValue(key,pressed?0:1)}><span className="pose-tile"><Glyph name={i?'explode':'blade'} size={18}/></span></button>;
  })}
 </div>;
}

const cameraLabels:Record<View,string>={side:'Laterale',top:'Dall’alto',edge:'Frontale',perspective:'Prospettica',clip:'Clip',screw:'Viti'};
type TechnicalProps = {
 value: Pick<DemoState, 'view' | 'rotation'>;
 lightPreset: LightPreset;
 model: number;
 onView: (view:View) => void;
 onLight: (preset:LightPreset) => void;
};

export function TechnicalHud({value, lightPreset, model, onView, onLight}: TechnicalProps) {
 return <div className="technical-hud hud-panel" data-panel>
  <div className="control-group camera-block" role="group" aria-label="Inquadrature">
   <PanelTitle text="CAMERA"/>
   <div className="view-row">{(Object.keys(cameraLabels) as View[]).map(view => {
    const loop = view==='clip' && KNIVES[model]==='EDGE';
    const name = loop ? 'Anello posteriore' : cameraLabels[view];
    return <button type="button" key={view} data-view={view} title={name} aria-label={'Vista '+name.toLowerCase()}
     aria-pressed={value.view===view && !hasManualRotation(value)} onClick={() => onView(view)}>
     <Glyph name={loop?'loop':view} size={20}/>
    </button>;
   })}</div>
  </div>
  <div className="control-group light-block" role="group" aria-label="Illuminazione">
   <PanelTitle text="LIGHTING"/>
   <div className="lighting-grid">{LIGHT_ORDER.map((id,index)=>{
    const setup=LIGHT_PRESETS[id];
    return <button type="button" key={id} data-light-preset={id} aria-label={'Luce '+setup.label}
     aria-description={setup.description} title={setup.label+' · '+setup.description} aria-pressed={lightPreset===id}
     onClick={()=>onLight(id)}>
     <span className="lighting-preview" aria-hidden="true" style={{backgroundPosition:(index*20)+'% 50%'}}/>
    </button>;
   })}</div>
   <span className="current-light" aria-live="polite">{LIGHT_PRESETS[lightPreset].label}</span>
  </div>
 </div>;
}
