'use client';
import Icon from './Icon';
import type {ScanAxis,View} from './navigation';
type Props={view:View;disabled:boolean;onChange:(patch:Partial<View>)=>void;};
export default function InspectionControls({view,disabled,onChange}:Props){
 return <section className="m43-section-controls" aria-label="Geometry section">
  {(['x','y','z'] as ScanAxis[]).map(axis=><label key={axis} className="m43-section-axis"><span>{axis.toUpperCase()}</span><input type="range" min="0" max="1" step=".001" aria-label={`Section ${axis.toUpperCase()}`} value={view.scanEnabled&&view.scanAxis===axis?view.cut??0:0} disabled={disabled} onChange={event=>onChange({scanAxis:axis,scanEnabled:true,cut:Number(event.target.value)})}/></label>)}
  <div className="m43-section-actions">
   <button aria-label="Reverse section direction" title="Reverse section direction" aria-pressed={view.scanDirection===-1} disabled={disabled} onClick={()=>onChange({scanDirection:view.scanDirection===-1?1:-1})}><span aria-hidden="true">⇄</span></button>
   <button aria-label="Reset section" title="Reset section" disabled={disabled} onClick={()=>onChange({cut:0,scanEnabled:false,scanDirection:1})}><Icon name="refresh" size={19}/></button>
  </div>
 </section>;
}
