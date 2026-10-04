'use client';
import {useEffect,useRef,useState} from 'react';
import type {Knife} from './catalog';
import {MATERIALS,configPrice,money,type Configuration} from './configuration';
import Icon from './Icon';
export function downloadConfiguration(knife:Knife,configuration:Configuration,contact?:{name:string;email:string;note:string}){
 const file={format:'memento-knife-configuration',version:42,createdAt:new Date().toISOString(),knife:knife.id,name:knife.name,estimatedPrice:configPrice(knife.id,configuration),currency:'EUR',configuration,...(contact?{request:{status:'draft',...contact}}:{})};
 const url=URL.createObjectURL(new Blob([JSON.stringify(file,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`memento-${knife.id}-${contact?'request':'configuration'}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function RequestDialog({knife,config,onClose}:{knife:Knife;config:Configuration;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),[name,setName]=useState(''),[email,setEmail]=useState(''),[note,setNote]=useState(''),[saved,setSaved]=useState(false);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.showModal();return()=>previous?.focus();},[]);
 return <dialog ref={dialog} className="request-dialog" aria-labelledby="request-title" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===dialog.current)onClose();}}>
  <header><span>MEMENTO / REQUEST</span><button aria-label="Close request" onClick={onClose}><Icon name="x"/></button></header>
  <div className="request-body" data-scroll><h2 id="request-title">Your configuration.</h2><p className="request-product">{knife.name}<strong>{money(configPrice(knife.id,config))}</strong></p>
   <dl><div><dt>Blade</dt><dd>{MATERIALS[config.blade.material].label} · {config.blade.color.toUpperCase()}</dd></div><div><dt>Handle</dt><dd>{MATERIALS[config.handle.material].label} · {config.handle.color.toUpperCase()}</dd></div><div><dt>Designs</dt><dd>{config.decorations.length?config.decorations.map(d=>d.content.replaceAll('-',' ')).join(', '):'None'}</dd></div></dl>
   <form onSubmit={e=>{e.preventDefault();downloadConfiguration(knife,config,{name,email,note});setSaved(true);}}><label>Name<input autoComplete="name" required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label><label>Email<input type="email" autoComplete="email" required maxLength={200} value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Notes<textarea rows={3} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></label><p className="micro-copy">Download a request with your details and complete configuration to share with the studio. This showroom does not send requests automatically.</p><button className="primary-button">Download request<Icon name="download"/></button>{saved&&<p role="status">Your request is ready to share.</p>}</form>
  </div>
 </dialog>;
}
