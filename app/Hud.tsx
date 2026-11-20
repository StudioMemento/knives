'use client';
import {useEffect,useRef,type CSSProperties} from 'react';
import {CATALOGUE,SURFACES,type Option} from './lib/catalogue';
import {LIGHTS} from './lib/art-direction';
import {hasManualRotation,KNIVES,type DemoState,type Configuration,type Surface,type View} from './lib/state';
export function Glyph({name,size=26}:{name:string;size?:number}){
 const paths:Record<string,React.ReactNode>={
  stageIcon:<><path d="m2.5 10 9.5-7.4 9.5 7.4M5.4 9v11h5v-6h3.2v6h5V9"/></>,
  bladeIcon:<><path d="M2.2 17.2c4.4.8 7.8.2 11.2-2.3l5.2-4.5-3.8-4.1-2 .5Z" fill="currentColor" fillOpacity=".16"/><path d="M3.2 16.8c3.8-.3 7-1.6 10.2-4.4m2.4-5.1 2-2 3.5 3.7-2 2"/></>,
  handleIcon:<><path d="m3.2 15 9.9-10.3a3.7 3.7 0 0 1 5.1-.1l2 2a3.5 3.5 0 0 1-1 5.6l-3.7 1.5-5.1 5.6a3.7 3.7 0 0 1-5.2.1l-2-2a1.9 1.9 0 0 1 0-2.4Z"/><circle cx="7.5" cy="16.1" r="1.15"/><path d="m12.4 9.1 2.5 2m-.4-4.2 2.3 1.8"/></>,
  detailsIcon:<><path d="m7.4 3.6 9.2 0 4.6 8.4-4.6 8.4H7.4L2.8 12Z"/><circle cx="12" cy="12" r="4"/><path d="m9.4 14.5 5.2-5"/></>,
  cameraIcon:<><path d="M2.5 8h4l2-3h7l2 3h4v11h-19Z"/><circle cx="12" cy="13" r="3.5"/></>,
  left:<path d="M20 1h-7L2 12l11 11h7L9 12Z" stroke="none" fill="currentColor"/>,
  right:<path d="M4 1h7l11 11-11 11H4l11-11Z" stroke="none" fill="currentColor"/>,
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
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="butt" strokeLinejoin="miter" aria-hidden="true">{paths[name]}</svg>;
}
export function Brand(){
 // Individual view boxes use the original wordmark paths while the gaps follow the layout.
 const glyphs=[[113.39,56.69],[340.16,56.69],[566.93,56.69],[793.70,56.69],[1024.5,49.14],[1247.24,56.70],[1474.02,56.69]];
 return <span className="wordmark" aria-hidden="true">{glyphs.map(([x,w])=>
  <svg key={x} viewBox={`${x-.5} 112.9 ${w+1} 57.7`} style={{aspectRatio:(w+1)/57.7}}>
   <image href="/memento-typo.svg" x="110" y="110" width="1424" height="64"/>
  </svg>)}</span>;
}

const surfaceNames={blade:'lama',handle:'manico',metals:'dettagli'};

type Kind='color'|'style';
function Sample({item,index,row}:{item:Option;index:number;row:number}){
 const style:CSSProperties=item.motif?{}:{backgroundPosition:index*20+'% '+(row/24*100)+'%'};
 return <span className={item.motif?'sample motif-'+item.motif:'sample atlas'} style={style}/>;
}

export function Spread({text}:{text:string}) {
 const line=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
  let active=true;
  void document.fonts.ready.then(()=>{
   const el=line.current;if(!active||!el)return;
   const ctx=document.createElement('canvas').getContext('2d');if(!ctx)return;
   ctx.font='100px '+getComputedStyle(el).fontFamily;
   const first=ctx.measureText(text[0]),last=ctx.measureText(text[text.length-1]);
   // Remove only the two outer side bearings. Letter outlines and font size stay intact.
   el.style.setProperty('--first-bearing',first.actualBoundingBoxLeft/100+'em');
   el.style.setProperty('--last-bearing',(last.actualBoundingBoxRight-last.width)/100+'em');
  });
  return ()=>{active=false;};
 },[text]);
 return <><span className="sr-only">{text}</span><span ref={line} className="spread" aria-hidden="true">{Array.from(text,(letter,i)=><span key={i}>{letter}</span>)}</span></>;
}

export function ConfigurationSummary({model,config,section,onSelect}:{
 model:number;config:Configuration;section:number;onSelect:(chapter:number)=>void
}){
 return <div className="configuration" role="group" aria-label="Configurazione attiva">
  {SURFACES.map((surface,i)=>{
   const options=CATALOGUE[KNIVES[model]][surface],selected=config[surface];
   const name=['Blade','Handle','Details'][i],material=options.styles[selected.style],color=options.colors[selected.color];
   return <button type="button" className="config-part" key={surface} data-config={surface} data-active={section===i+1}
    title={name+' · '+material.name+' / '+color.name} aria-label={name+', materiale '+material.name+', colore '+color.name+'. Modifica'} onClick={()=>onSelect(i+1)}>
    <span className="config-name"><b aria-hidden="true">//</b>{name}</span>
    {[{item:material,index:selected.style,row:options.swatchRow+1,kind:'material'},{item:color,index:selected.color,row:options.swatchRow,kind:'color'}].map(({item,index,row,kind})=>
     <span key={kind} className={'config-value '+kind}><span className="mini-sample"><Sample item={item} index={index} row={row}/></span><span>{item.name}</span></span>)}
   </button>;
  })}
 </div>;
}

function ChoiceGroup({kind,surface,options,selected,row,onSelect}:{
 kind:Kind;surface:Surface;options:Option[];selected:number;row:number;onSelect:(index:number)=>void
}){
 return <div className="choice-group"><h2><Spread text={kind==='style'?'MATERIAL':'COLOR'}/></h2>
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
export function CameraLightingHud({value,model,onView,onLight}:{
 value:Pick<DemoState,'view'|'rotation'|'lighting'>;model:number;onView:(v:View)=>void;onLight:(index:number)=>void
}){
 return <div className="technical-hud hud-panel" data-panel>
  <div className="choice-group" role="group" aria-label="Inquadrature">
   <h2><Spread text="CAMERA"/></h2>
   <p className="selected-setting">{hasManualRotation(value)?'Libera':value.view==='clip'&&KNIVES[model]==='EDGE'?'Anello':cameraLabels[value.view]}</p>
   <div className="choice-grid">{(Object.keys(cameraLabels) as View[]).map(v=>{
    const loop=v==='clip'&&KNIVES[model]==='EDGE',name=loop?'Anello posteriore':cameraLabels[v];
    return <button type="button" className="choice camera-choice" key={v} data-view={v} title={name} aria-label={'Vista '+name.toLowerCase()} aria-pressed={value.view===v&&!hasManualRotation(value)} onClick={()=>onView(v)}><span className="sample-outline"><Glyph name={loop?'loop':v} size={20}/></span></button>;
   })}</div>
  </div>
  <div className="choice-group" role="group" aria-label="Illuminazione">
   <h2><Spread text="LIGHTING"/></h2>
   <p className="selected-setting">{LIGHTS[value.lighting].name}</p>
   <div className="choice-grid">{LIGHTS.map((light,i)=>
    <button type="button" key={light.id} data-light={light.id} className="choice light-choice" title={light.name+' · '+light.detail}
     aria-label={light.name+' · '+light.detail} aria-pressed={value.lighting===i} onClick={()=>onLight(i)}>
     <span className="sample-outline"><i className={'light-sample light-'+light.id} style={{'--key':light.key,'--rim':light.rim} as CSSProperties}/></span>
    </button>)}</div>
  </div>
 </div>;
}
