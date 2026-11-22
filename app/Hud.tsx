'use client';
import {useLayoutEffect,useRef,type CSSProperties} from 'react';
import TechnicalIcon from './TechnicalIcon';
import {CATALOGUE,SURFACES,type Option} from './lib/catalogue';
import {LIGHT_ORDER,LIGHT_PRESETS,type LightPreset} from './lib/light-presets';
import {hasManualRotation,CHAPTERS,KNIVES,type DemoState,type Configuration,type Surface,type View} from './lib/state';
import {STAGE_GLYPHS,type StageGlyph} from './lib/stage-glyphs';

export function Glyph({name,size=26}:{name:StageGlyph;size?:number}){
 const {units,weight,marks}=STAGE_GLYPHS[name];
 return <svg data-stage-glyph={name} width={size} height={size} viewBox={`0 0 ${units} ${units}`}
  fill="none" strokeWidth={weight} strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
  {marks.map((mark,i)=><path key={i} d={mark.d} fill={mark.solid?'currentColor':'none'}
   stroke={mark.solid?'none':'currentColor'} className={mark.plateOffset===undefined?undefined:'plate'}
   transform={mark.plateOffset===undefined?undefined:`translate(0 ${mark.plateOffset})`}/>)}
 </svg>;
}
type Chapter=typeof CHAPTERS[number];
const chapterTile='M0 8 8 0h21l3 3v21l-8 8H3l-3-3Z';
const chapterCuts:Record<Chapter,string>={
 Stage:'M4.2 14.7 16 5.1l11.8 9.6-2.2 2.6-9.6-7.8-9.6 7.8Z M8.4 17.9l3.3-2.7v7h2.6v-4.7h3.4v4.7h2.6v-7l3.3 2.7v7.5H8.4Z',
 Blade:'M2.7 21.3 9.4 12l9.6-2.1 4-2.5 4.8 1.1.5 4.5-3.5 3.4h-3.2l-1.9-1.6-1.2 3.7-7.4 3.1Z M5.9 20l5.5-4.9 6.1-2.1-5.6 4Z M26.1 11.9a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 1 1 3.2 0Z',
 Handle:'M4.2 20.1 7 16.9 17.7 7.4l4.7-1.1 4.1 2.2 1.1 3.3-1.5 3.6-3.3 2.4-2.8-.2-4.1 3.6-1.6 2.9-5.1 2.2-4.1-1.6Z M24.4 11.7a2.1 2.1 0 1 1-4.2 0 2.1 2.1 0 1 1 4.2 0Z M7.7 20.3l7.8-6.9 1.3 1.6-7.8 6.9Z',
 Metals:'M16 4.7a11.3 11.3 0 1 1 0 22.6 11.3 11.3 0 1 1 0-22.6Z M14.3 9.2h3.4l.9 3.1 3.1-.9 1.6 2.9-2.3 2.1 2.2 2.2-1.6 2.8-3.1-.9-.9 3h-3.2l-.9-3-3.1.9-1.6-2.8 2.2-2.2-2.3-2.1 1.6-2.9 3.1.9Z',
 Inspect:'M5 6.3h8v2.8H7.8v4.6H5Z M19 6.3h8v7.4h-2.8V9.1H19Z M5 18.3h2.8v4.6H13v2.8H5Z M24.2 18.3H27v7.4h-8v-2.8h5.2Z M16 10.2a5.8 5.8 0 1 1 0 11.6 5.8 5.8 0 1 1 0-11.6Z M16 13a3 3 0 1 0 0 6 3 3 0 1 0 0-6Z',
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
export function PoseHud({value,onValue}:{value:PoseValues;onValue:(key:keyof PoseValues,n:number)=>void}){
 const closed=value.closed>.5,expanded=value.exploded>.5;
 return <>
  <button type="button" className="pose-action" data-control="closed" aria-label="Closed blade" aria-pressed={closed}
   onClick={()=>onValue('closed',closed?0:1)}><Glyph name={closed?'bladeClosed':'blade'} size={31}/></button>
  <button type="button" className="pose-action" data-control="exploded" aria-label="Exploded view" aria-pressed={expanded}
   aria-description={expanded?'Reassemble the model':'Separate the parts'}
   onClick={()=>onValue('exploded',expanded?0:1)}><Glyph name={expanded?'compose':'explode'} size={30}/></button>
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
