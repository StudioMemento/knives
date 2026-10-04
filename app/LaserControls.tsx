'use client';
import type {ScanAxis} from './navigation';

export type LaserProps={axis:ScanAxis;direction:1|-1;progress:number;disabled:boolean;onAxis:(axis:ScanAxis)=>void;onDirection:()=>void;onProgress:(progress:number)=>void;onReset:()=>void};
const axes=[['x','Length'],['y','Height'],['z','Depth']] as const;

export default function LaserControls(p:LaserProps){
 return <section className="laser-controls" aria-label="Laser section">
  <div className="scan-toolbar">
   <div className="scan-axes" role="group" aria-label="Section axis">{axes.map(([axis,label])=><button key={axis} aria-label={`Scan ${axis.toUpperCase()} · ${label}`} aria-pressed={p.axis===axis} disabled={p.disabled} onClick={()=>p.onAxis(axis)}><b>{axis.toUpperCase()}</b><span>{label}</span></button>)}</div>
   <button className="scan-direction" aria-label="Reverse scan direction" aria-pressed={p.direction===-1} disabled={p.disabled} onClick={p.onDirection} title="Reverse scan direction">↔</button>
  </div>
  <label className="scan-slider"><span>Section</span><input type="range" min="0" max="1" step=".001" aria-label="Laser section depth" value={p.progress} disabled={p.disabled} onChange={e=>p.onProgress(Number(e.target.value))}/><output>{Math.round(p.progress*100)}%</output></label>
  <div className="scan-footnote"><span>Scroll to scan · Drag to inspect</span><button disabled={p.disabled} onClick={p.onReset}>Reset</button></div>
 </section>;
}
