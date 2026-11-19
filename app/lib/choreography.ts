import {Euler,Quaternion,Vector3} from 'three';
import type {ExplodedPart} from './explosion';
import {mod,smooth} from './state.ts';

export const HERO_PERIOD=8;
export const HERO_TRAVEL=2.2;
export const HERO_HOLD=HERO_PERIOD-HERO_TRAVEL;
export const RAIL={radius:4.35,floorY:-1.63,centerZ:-2.25} as const;
export const backdropOpacity=(stageDistance:number)=>1-smooth(stageDistance/.62);
export const assemblyWeight=(distance:number)=>1-smooth((distance-.12)/.78);
export const slotOffset=(index:number,phase:number)=>mod(index-phase+2.5)-2.5;

export function railPoint(angle:number){
 return new Vector3(Math.sin(angle)*RAIL.radius,RAIL.floorY,RAIL.centerZ+Math.cos(angle)*RAIL.radius);
}

/** The authored exploded positions provide a local centre for each orbit.
 * Sampling first keeps the swirl reversible and independent of frame rate. */
const turn=new Quaternion(),delta=new Vector3(),euler=new Euler();
export function animateBackdrop(parts:ExplodedPart[],weight:number,time:number,model:number){
 if(weight<=0)return;
 for(let i=0;i<parts.length;i++){
  const {node,assembled}=parts[i],phase=i*2.39996+model*.79;
  delta.subVectors(node.position,assembled);
  euler.set(.52*Math.sin(time*.58+phase),time*.58+phase,.36*Math.cos(time*.47-phase));
  delta.applyQuaternion(turn.setFromEuler(euler)).add(assembled);node.position.lerp(delta,weight);
 }
}
