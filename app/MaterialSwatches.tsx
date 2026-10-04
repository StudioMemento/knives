'use client';
import {useEffect,useState} from 'react';
import {MATERIALS,type MaterialId,type Surface} from './configuration';
type Props={surface:Surface;color:string;value:MaterialId;onChange:(id:MaterialId)=>void;preview:(color:string)=>Record<MaterialId,string>|null};
export default function MaterialSwatches(p:Props){
 const [previews,setPreviews]=useState<Partial<Record<MaterialId,string>>>({});
 useEffect(()=>{const timer=setTimeout(()=>{const images=p.preview(p.color);if(images)setPreviews(images);},80);return()=>clearTimeout(timer);},[p.color,p.preview]);
 return <div className="material-spheres" role="group" aria-label={`${p.surface} material`}>
  {(Object.entries(MATERIALS) as [MaterialId,typeof MATERIALS[MaterialId]][]).filter(([id])=>p.surface==='handle'||id!=='polymer').map(([id,m])=><button key={id} className="material-option" aria-pressed={p.value===id} onClick={()=>p.onChange(id)}><span className="material-preview">{previews[id]&&<img src={previews[id]} alt="" width={128} height={128}/>}</span><span>{m.label}</span></button>)}
 </div>;
}
