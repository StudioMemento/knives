'use client';
import type {CSSProperties} from 'react';
import {MATERIALS,type Configuration,type Surface,type MaterialId} from './configuration';
import Icon from './Icon';

export const SURFACE_COLORS=[
 {name:'Steel',value:'#c5c9cb'}, {name:'Smoke',value:'#777c80'},
 {name:'Graphite',value:'#434548'}, {name:'Black',value:'#202327'},
 {name:'Champagne',value:'#bc9b72'}, {name:'Copper',value:'#9c6150'},
 {name:'Oxblood',value:'#552c32'}, {name:'Midnight',value:'#253449'},
];
const styles:MaterialId[]=['original','satin','coated','polished'];
type Props={surface:Surface;originalColor:string;config:Configuration;onChange:(config:Configuration)=>void;onDesign:(category:'symbols'|'text')=>void;};
export default function SurfaceControls({surface,originalColor,config,onChange,onDesign}:Props){
 const finish=config[surface];
 const selectColor=(color:string)=>onChange({...config,preset:-1,[surface]:{color,material:finish.material==='original'?'satin':finish.material}});
 return <section className="m43-surface m43-column" aria-label={`${surface} customisation`}>
  <h1>{surface==='blade'?'Blade':'Handle'}</h1>
  <div className="m43-colors" role="group" aria-label={`${surface} colour`}>
   {SURFACE_COLORS.map(({name,value})=><button key={value} title={name} aria-label={`${surface} colour: ${name}`} aria-pressed={finish.color===value} onClick={()=>selectColor(value)} style={{'--surface-color':value} as CSSProperties}><span/></button>)}
  </div>
  <h2>Style</h2>
  <div className="m43-styles" role="group" aria-label={`${surface} style`}>
   {styles.map(id=><button key={id} title={MATERIALS[id].label} aria-label={`${surface} style: ${MATERIALS[id].label}`} aria-pressed={finish.material===id} onClick={()=>onChange({...config,preset:id==='original'?0:-1,[surface]:{...finish,material:id,color:id==='original'?originalColor:finish.color}})}><span className={`m43-finish finish-${id}`}/></button>)}
  </div>
  <div className="m43-design-actions" role="group" aria-label="Personal design">
   <button title="Symbols & finishes" aria-label="Add a symbol" onClick={()=>onDesign('symbols')}><Icon name="diamond" size={17}/></button>
   <button title="Engraving" aria-label="Add text" onClick={()=>onDesign('text')}><Icon name="text-size" size={19}/></button>
  </div>
 </section>;
}
