'use client';
import type {CSSProperties} from 'react';
import {CATALOGUE,SURFACES,type Option} from './lib/catalogue';
import {LIGHT_ORDER,LIGHT_PRESETS,type LightPreset} from './lib/light-presets';
import {hasManualRotation,KNIVES,type DemoState,type Configuration,type Surface,type View} from './lib/state';
export function Glyph({name,size=26}:{name:string;size?:number}){
 const paths:Record<string,React.ReactNode>={
  stageIcon:<><path d="m2.4 11.3 8-7.8h3.2l8 7.8"/><path d="M5.2 10v10.2h5v-6.1h3.6v6.1h2.7l2.3-2.3V10"/></>,
  bladeIcon:<><path d="M2.4 18.6 13.7 6.1h3.9l3.9 3.9-5.9 5.9-6.2 2.7Z"/><path d="m6.3 16.3 6.2-2.1 3.5-3.6m-2.2-4.3 4.3 4.3"/></>,
  handleIcon:<><path d="m3.1 14.7 9.6-10.4h4.8l3.4 3.4v2.6l-5 4.1-2 .2-5 5.2H6.3l-3.2-3.2Z"/><circle cx="7.4" cy="15.6" r="1.25"/><path d="m12.1 9.6 2 2m.7-4.6 2 2"/></>,
  detailsIcon:<><path d="m7.4 3.6 8.4 0 5 5v6.6l-5.2 5.2H7.2l-4.1-4.1V8Z"/><circle cx="12" cy="12" r="4.3"/><path d="m9.5 14.5 5-5"/></>,
  inspectIcon:<><path d="M4.2 6.7 7 3.9h5.9l3.3 3.3v5.7l-3.3 3.3H7.1l-2.9-2.9Z"/><path d="m15.3 15.3 5.5 5.5M7.4 10h5.5m-2.8-2.7v5.4"/></>,
  left:<path d="m15.7 3.2-8.8 8.8 8.8 8.8"/>,right:<path d="m8.3 3.2 8.8 8.8-8.8 8.8"/>,
  blade:<><path d="m3 17.1 1.9-2h15.7v3.2l-2 2H5.4L3 18Z"/><path d="m4.7 14.8 4.1-11 1.6 3.6-.4 3.5-2.3 4.1M13.2 5.8a9.1 9.1 0 0 1 6.1 6.3m.6-3.7-.5 3.9-3.7-.9"/><circle cx="6.2" cy="17.7" r=".8" fill="currentColor" stroke="none"/></>,
  bladeClosed:<><path d="m3 15.7 2-2h15.6v3.9l-2.1 2.1H5.1L3 17.6Z"/><path d="m7.8 13.7 7.3-2 4.4.6M18.5 9.9a8.8 8.8 0 0 0-6.6-5.5m2.2 3-2.5-3.1 3.7-1.4"/><circle cx="6.2" cy="16.8" r=".85" fill="currentColor" stroke="none"/></>,
  explode:<><path d="m2.5 8 9.5-4.5L21.5 8 12 12.5Z"/><path d="m2.5 12 9.5 4.5 9.5-4.5m-19 4 9.5 4.5 9.5-4.5"/></>,
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
export function ChapterTile({icon}: {icon:string}) {
 return <span className="nav-tile" aria-hidden="true">
  <svg className="nav-contour" viewBox="0 0 40 40" fill="none">
   <path d="M10 .7H39.3V30L30 39.3H.7V10Z" vectorEffect="non-scaling-stroke"/>
  </svg>
  <Glyph name={icon} size={24}/>
 </span>;
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
 return <div className="pose-hud" role="group" aria-label="Model pose" data-pose>
  {(['closed','exploded'] as const).map((key,i)=>{
   const pressed=value[key]>.5;
   const action=i?(pressed?'Reassemble model':'Explode model'):(pressed?'Open blade':'Close blade');
   return <button type="button" key={key} data-control={key} aria-label={i?'Exploded view':'Closed blade'} aria-pressed={pressed} title={action}
    onClick={()=>onValue(key,pressed?0:1)}><Glyph name={i?'explode':pressed?'bladeClosed':'blade'} size={31}/></button>;
  })}
 </div>;
}

const cameraLabels:Record<View,string>={side:'Side',top:'Top',edge:'End-on',perspective:'Perspective',clip:'Pocket clip',screw:'Screws'};
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
     <Glyph name={loop?'loop':view} size={28}/>
    </button>;
   })}</div>
  </div>
  <div className="control-group light-block" role="group" aria-label="Light presets">
   <PanelTitle text="LIGHT"/>
   <div className="lighting-grid">{LIGHT_ORDER.map((id,index)=>{
    const setup=LIGHT_PRESETS[id];
    return <button type="button" key={id} data-light-preset={id} aria-label={setup.label+' light'}
     aria-description={setup.description} title={setup.label+' · '+setup.description} aria-pressed={lightPreset===id}
     onClick={()=>onLight(id)}>
     <span className="lighting-preview" aria-hidden="true" style={{backgroundPosition:(index*20)+'% 50%'}}/>
    </button>;
   })}</div>
   <span className="current-light" aria-live="polite">{LIGHT_PRESETS[lightPreset].label}</span>
  </div>
 </div>;
}
