'use client';
import type {InspectionView} from './navigation';
import Icon from './Icon';

// Small vector knife silhouettes, as requested by the approved storyboard.
function KnifeView({view}:{view:InspectionView}){
 const spine=view==='spine',reverse=view==='back',oblique=view==='free';
 return <svg viewBox="0 0 56 34" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path className="camera-brackets" d="M6 10V6h5M45 6h5v4M50 24v4h-5M11 28H6v-4"/>
  <g transform={oblique?'translate(28 17) rotate(-24) translate(-28 -17)':reverse?'translate(56 0) scale(-1 1)':undefined}>
   {spine?<><path d="M8 17h21l18-1v3H29L8 17Z"/><path d="M29 16v3"/></>:<><path d="m7 18 18-6 5 2v7l-5 1C17 23 11 22 7 18Z"/><path d="m30 14 15 1 4 5-2 2-17-1Z"/><circle cx="32.5" cy="17.5" r="1.3"/><path d="m37 17 6 1"/></>}
  </g>
 </svg>;
}
const views:readonly [InspectionView,string][]=[['front','Front view'],['back','Reverse view'],['spine','Spine view'],['free','Perspective view']];
export default function CameraControls({value,disabled,onView,onReset}:{value:InspectionView;disabled:boolean;onView:(view:InspectionView)=>void;onReset:()=>void}){
 return <nav className="m43-camera" aria-label="Camera views">
  <button className="m43-camera-reset" title="Reset camera" aria-label="Reset camera" disabled={disabled} onClick={onReset}><Icon name="refresh" size={19}/></button>
  {views.map(([id,label])=><button key={id} title={label} aria-label={label} aria-pressed={value===id} disabled={disabled} onClick={()=>onView(id)}><KnifeView view={id}/></button>)}
 </nav>;
}
