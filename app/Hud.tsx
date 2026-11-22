'use client';
import {useLayoutEffect,useRef,type CSSProperties} from 'react';
import TechnicalIcon from './TechnicalIcon';
import {CATALOGUE,SURFACES,type Option} from './lib/catalogue';
import {LIGHT_ORDER,LIGHT_PRESETS,type LightPreset} from './lib/light-presets';
import {hasManualRotation,CHAPTERS,KNIVES,type DemoState,type Configuration,type Surface,type View} from './lib/state';
import {STAGE_GLYPHS,type StageGlyph} from './lib/stage-glyphs';

export function Glyph({name,size=26}:{name:StageGlyph;size?:number}){
 const {fill,stroke}=STAGE_GLYPHS[name];
 return <svg data-stage-glyph={name} width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="1.55" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
  {stroke&&<path d={stroke} stroke="currentColor"/>}{fill&&<path d={fill} fill="currentColor"/>}
 </svg>;
}
type Chapter=typeof CHAPTERS[number];
const chapterTile='M6.5 0H32v25.5L25.5 32H0V6.5Z';
const chapterCuts:Record<Chapter,string>={
 Stage:'M5.6 14.4 16 5.5l10.4 8.9h-3.2v11h-5.4v-7h-3.6v7H8.8v-11Z',
 Blade:'M21 5.9h5.3l-1.7 7.3-8.6 8.5-10.4 4.8 4.1-11.4 9-8.2 1.1 1.2Z M9.6 22.2l12.6-12.5-2.3 4-7.3 7Z',
 Handle:'M5.9 20.5l6.3-7.3 2.2-.5 5.2-6.1h3.1l3.6 3.2v3.4L15 25.8l-3.8.5-5.3-3.9Z M23.4 10.9a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 1 1 3.6 0Z',
 Metals:'M10.6 6.8h10.8l5.3 9.2-5.3 9.2H10.6L5.3 16Z M20.5 16a4.5 4.5 0 1 1-9 0 4.5 4.5 0 1 1 9 0Z',
 Inspect:'M13.4 5.7a7.7 7.7 0 0 1 6.2 12.3l7.2 7.1-2 2-7.2-7.2a7.7 7.7 0 1 1-4.2-14.2Z M18.3 13.4a4.9 4.9 0 1 1-9.8 0 4.9 4.9 0 1 1 9.8 0Z',
};
export function ChapterIcon({chapter}:{chapter:Chapter}){
 return <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
  <path d={chapterTile+' '+chapterCuts[chapter]} fill="currentColor" fillRule="evenodd"/>
 </svg>;
}
export function Brand() {
 return <span className="wordmark" aria-hidden="true">
  {Array.from('memento', (letter, i) =>
   <img key={i} src={'/memento-mobile.svg#letter-' + letter} alt="" draggable={false} width="16" height="16"/>
  )}
 </span>;
}

export function ProductReadout({model,price,config,artReady}:{model:number;price:number;config:Configuration;artReady:boolean}) {
 const name=KNIVES[model];
 const titleRef=useRef<HTMLHeadingElement>(null), regionRef=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  if(!artReady)return;
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
  return ()=>{mounted=false;observer.disconnect();};
 },[name,artReady]);
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
   {options.map((item,i)=><button key={item.name} type="button" className={'choice '+kind}
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
function ExplodeGlyph({expanded}:{expanded:boolean}) {
 return <svg className="explode-glyph" data-stage-glyph={expanded?'compose':'explode'} width="30" height="30"
  viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="miter" aria-hidden="true">
  <path className="plate lower" d="m3 17 10 5 10-5"/>
  <path className="plate middle" d="m3 14 10 5 10-5"/>
  <path className="plate upper" d="m3 11 10-5 10 5-10 5Z"/>
  <path className="stack-arrows" d={expanded?'M28 5v7m-2.6-2.6L28 12l2.6-2.6M28 27v-7m-2.6 2.6L28 20l2.6 2.6':'M28 13V6m-2.6 2.6L28 6l2.6 2.6M28 19v7m-2.6-2.6L28 26l2.6-2.6'}/>
 </svg>;
}
export function PoseHud({value,onValue}:{value:PoseValues;onValue:(key:keyof PoseValues,n:number)=>void}){
 const closed=value.closed>.5,expanded=value.exploded>.5;
 return <>
  <button type="button" className="pose-action" data-control="closed" aria-label="Closed blade" aria-pressed={closed}
   onClick={()=>onValue('closed',closed?0:1)}><Glyph name={closed?'bladeClosed':'blade'} size={31}/></button>
  <button type="button" className="pose-action" data-control="exploded" aria-label="Exploded view" aria-pressed={expanded}
   aria-description={expanded?'Reassemble the model':'Separate the parts'}
   onClick={()=>onValue('exploded',expanded?0:1)}><ExplodeGlyph expanded={expanded}/></button>
 </>;
}

const cameraLabels:Record<View,string>={side:'Side',top:'Top',edge:'End-on',perspective:'Perspective',clip:'Pocket clip',screw:'Screw detail'};
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
    return <button type="button" key={view} data-view={view} aria-label={name+' view'}
     aria-pressed={value.view===view && !hasManualRotation(value)} onClick={() => onView(view)}>
     <TechnicalIcon name={loop?'loop':view}/>
    </button>;
   })}</div>
  </div>
  <div className="control-group light-block" role="group" aria-label="Light presets">
   <PanelTitle text="LIGHT"/>
   <div className="lighting-grid">{LIGHT_ORDER.map(id=>{
    const setup=LIGHT_PRESETS[id];
    return <button type="button" key={id} data-light-preset={id} aria-label={setup.label+' preset'}
     aria-description={setup.description} aria-pressed={lightPreset===id}
     onClick={()=>onLight(id)}>
     <TechnicalIcon name={id}/>
    </button>;
   })}</div>
  </div>
 </div>;
}
