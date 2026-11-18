import {Vector3} from 'three';
import type {ExplodedPart} from './explosion';
import {smooth} from './state.ts';

export const HERO_PERIOD=8;
export const HERO_TRAVEL=2.2;
export const HERO_HOLD=HERO_PERIOD-HERO_TRAVEL;
export const RAIL_DEPTH=1.22;
export const assemblyWeight=(distance:number)=>1-smooth((distance-.12)/.78);

export function railPoint(angle:number,radius:number,centerX:number,floorY:number){
 return new Vector3(centerX+Math.sin(angle)*radius,floorY,Math.cos(angle)*RAIL_DEPTH);
}

/** Sample after the authored position tracks. The curl of this sinusoidal
 * vector field is bounded and stays anchored to each component's rest pose. */
export function animateBackdrop(parts:ExplodedPart[],weight:number,time:number,model:number){
 if(weight<=0)return;
 for(let i=0;i<parts.length;i++){
  const {node,assembled}=parts[i];
  const phase=i*2.39996+model*.79;
  const x=assembled.x*13+phase+time*.34;
  const y=assembled.y*17+phase*.68-time*.41;
  const z=assembled.z*15-phase*.47+time*.29;
  node.position.x+=weight*(.0018*(Math.cos(y)-Math.cos(z))+.0014*Math.sin(time*.61+phase));
  node.position.y+=weight*(.0023*(Math.cos(z)-Math.cos(x))+.0017*Math.sin(time*.46+phase));
  node.position.z+=weight*(.0020*(Math.cos(x)-Math.cos(y))+.0016*Math.cos(time*.38+phase));
 }
}
