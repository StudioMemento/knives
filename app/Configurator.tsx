'use client';
import {useState} from 'react';
import type {Knife} from './catalog';
import {STENCILS,applyPreset,type Configuration,type Decoration,type Surface,type Anchor,type MaterialId} from './configuration';
import Icon from './Icon';
import MaterialSwatches from './MaterialSwatches';
import LaserControls,{type LaserProps} from './LaserControls';
type Category='blade'|'handle'|'finishes'|'symbols'|'text'|'section';
type Props={knife:Knife;knifeIndex:number;config:Configuration;onChange:(config:Configuration)=>void;activeId:string|null;onActive:(id:string|null)=>void;placing:boolean;onPlace:(value:boolean)=>void;defaultAnchor:(surface:Surface)=>Anchor|null;preview:(color:string)=>Record<MaterialId,string>|null;laser:LaserProps;onSection:(active:boolean)=>void;disabled:boolean};
const categories:readonly [Category,string,string][]=[['blade','Blade','blade'],['handle','Handle','grip'],['finishes','Finishes','materials'],['symbols','Symbols','diamond'],['text','Text','text-size'],['section','Section','section']];
export default function Configurator(p:Props){
 const [category,setCategory]=useState<Category|null>(null),[sub,setSub]=useState<'material'|'colour'>('material'),[surface,setSurface]=useState<Surface>('blade'),[text,setText]=useState('');
 const active=p.config.decorations.find(d=>d.id===p.activeId),finish=p.config[surface];
 const updateLayer=(patch:Partial<Decoration>)=>p.onChange({...p.config,decorations:p.config.decorations.map(d=>d.id===p.activeId?{...d,...patch}:d)});
 const choose=(next:Category|null)=>{setCategory(next);p.onPlace(false);p.onSection(next==='section');if(next==='blade'||next==='handle'){setSurface(next);setSub('material');}};
 const add=(type:Decoration['type'],content:string)=>{if(p.config.decorations.length>=8||!content.trim())return;const item:Decoration={id:crypto.randomUUID(),type,content:content.trim(),color:'#f1eadc',treatment:'stencil',width:type==='text'?1.25:.48,rotation:type==='text'?-90:0,font:'sans',anchor:p.defaultAnchor(surface)};p.onChange({...p.config,decorations:[...p.config.decorations,item]});p.onActive(item.id);p.onPlace(!item.anchor);setText('');};
 const colour=(color:string)=>p.onChange({...p.config,preset:-1,[surface]:{material:finish.material==='original'?(surface==='blade'?'satin':'polymer'):finish.material,color}});
 const isDesign=category==='symbols'||category==='text';
 return <div className={`configurator-v42 ${category?'has-open-panel':''}`}>
  {category&&<section id="configuration-options" className={`config-options options-${category}`} aria-label={`${categories.find(c=>c[0]===category)![1]} options`} data-scroll>
   <header className="options-heading"><strong>{categories.find(c=>c[0]===category)![1]}</strong>
    {(category==='blade'||category==='handle')&&<div className="config-subtabs" role="group" aria-label="Surface settings">{(['material','colour'] as const).map(tab=><button key={tab} aria-pressed={sub===tab} onClick={()=>setSub(tab)}>{tab==='material'?'Material':'Colour'}</button>)}</div>}
    {isDesign&&<div className="config-subtabs" role="group" aria-label="Design placement surface">{(['blade','handle'] as const).map(s=><button key={s} aria-pressed={surface===s} onClick={()=>setSurface(s)}>{s==='blade'?'Blade':'Handle'}</button>)}</div>}
    <button className="close-options" aria-label="Close options" onClick={()=>choose(null)}><Icon name="x" size={17}/></button>
   </header>
   {(category==='blade'||category==='handle')&&(sub==='material'?<MaterialSwatches surface={surface} value={finish.material} color={finish.color} preview={p.preview} onChange={material=>p.onChange({...p.config,preset:-1,[surface]:{...finish,material}})}/>:<div className="config-colours"><div className="colour-choices" role="group" aria-label="Surface colour">{['#d1d4d5','#272a2d','#b89359','#a5573e','#335760','#636949','#eee5d4'].map(color=><button key={color} aria-label={`Colour ${color}`} aria-pressed={finish.color===color&&finish.material!=='original'} style={{'--swatch':color} as React.CSSProperties} onClick={()=>colour(color)}><span/></button>)}</div><label className="custom-colour">Custom colour<input type="color" value={finish.color} onChange={e=>colour(e.target.value)}/><output>{finish.color.toUpperCase()}</output></label></div>)}
   {category==='finishes'&&<div className="finish-cards">{p.knife.finishes.map((option,index)=><button key={option.name} aria-pressed={p.config.preset===index} onClick={()=>p.onChange(applyPreset(p.knifeIndex,index,p.config))}><span className="finish-dot" style={{background:index===0?'#aeb6b8':option.color}}/><strong>{index===0?'Original':option.name}</strong><span>{index===0?'Original materials':option.note}</span></button>)}</div>}
   {category==='section'&&<LaserControls {...p.laser}/>}
   {isDesign&&<div className={`design-workspace ${active?'has-selection':''}`}>
    <div className="design-library">{category==='symbols'?<div className="symbol-choices" aria-label="Design library">{STENCILS.map(name=><button key={name} disabled={p.config.decorations.length>=8} onClick={()=>add('symbol',name)} aria-label={`Add ${name.replaceAll('-',' ')}`} title={name.replaceAll('-',' ')}><Icon name={name} size={25}/></button>)}</div>:<form className="custom-text" onSubmit={e=>{e.preventDefault();add('text',text);}}><label className="sr-only" htmlFor="engraving-text">Your custom text</label><input id="engraving-text" value={text} maxLength={28} placeholder="Your words" onChange={e=>setText(e.target.value)}/><button aria-label="Add text" disabled={!text.trim()||p.config.decorations.length>=8}><Icon name="plus"/></button></form>}
     <p className="micro-copy">Each design +€12 · {p.config.decorations.length}/8 layers</p>
     {p.config.decorations.length>0&&<div className="design-layers" aria-label="Design layers">{p.config.decorations.map((d,i)=><button key={d.id} aria-label={`Edit layer ${i+1}: ${d.content}`} aria-pressed={d.id===p.activeId} onClick={()=>{p.onActive(d.id);p.onPlace(false);}}>{d.type==='symbol'?<Icon name={d.content} size={16}/>:<span>Aa</span>}<small>{i+1}</small>{!d.anchor&&<span className="unplaced" title="Placement needed">!</span>}</button>)}</div>}
    </div>
    {active&&<div className="design-editor"><div className="editor-heading"><strong>Selected design</strong><button aria-label="Remove selected design" onClick={()=>{p.onChange({...p.config,decorations:p.config.decorations.filter(d=>d.id!==p.activeId)});p.onActive(null);p.onPlace(false);}}><Icon name="trash" size={17}/></button></div>
     {active.type==='text'&&<label className="field-label">Text<input value={active.content} maxLength={28} onChange={e=>updateLayer({content:e.target.value})}/></label>}
     <div className="design-editor-grid"><label className="field-label">Application<select value={active.treatment} onChange={e=>updateLayer({treatment:e.target.value as Decoration['treatment']})}><option value="stencil">Stencil / ink</option><option value="sticker">Sticker</option></select></label><label className="field-label">Ink<input type="color" value={active.color} onChange={e=>updateLayer({color:e.target.value})}/></label>
     {active.type==='text'&&<label className="field-label">Typeface<select value={active.font} onChange={e=>updateLayer({font:e.target.value as Decoration['font']})}><option value="sans">Modern</option><option value="serif">Editorial</option><option value="mono">Technical</option></select></label>}
     <label className="range-label">Size <output>{Math.round(active.width/4.5*100)}%</output><input type="range" min=".15" max="2.5" step=".01" value={active.width} onChange={e=>updateLayer({width:Number(e.target.value)})}/></label>
     <label className="range-label">Rotation <output>{active.rotation}°</output><input type="range" min="-180" max="180" step="1" value={active.rotation} onChange={e=>updateLayer({rotation:Number(e.target.value)})}/></label></div>
     <div className="placement-actions"><button aria-pressed={p.placing} onClick={()=>p.onPlace(!p.placing)}><Icon name="hand-click" size={16}/>{p.placing?'Cancel placement':'Position on knife'}</button><button onClick={()=>{const a=p.defaultAnchor(surface);if(a){updateLayer({anchor:a});p.onPlace(false);}else p.onPlace(true);}}>On {surface}</button></div>
    </div>}
   </div>}
  </section>}
  <nav className="config-categories" aria-label="Configure your knife">{categories.map(([id,label,icon])=><button key={id} aria-expanded={category===id} aria-controls="configuration-options" disabled={p.disabled} onClick={()=>choose(category===id?null:id)}><Icon name={icon} size={23}/><span>{label}</span></button>)}</nav>
 </div>;
}
