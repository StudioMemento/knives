import {Vector3,Quaternion,Euler,type Object3D} from 'three';
import type {ExplodedPart} from './explosion';

export const HERO_HOLD=7.4;
export const RAIL_DEPTH=1.22;
export const TAU=Math.PI*2;
const ease=(n:number)=>{const t=Math.max(0,Math.min(1,n));return Math.max(0,Math.min(1,t*t*t*(t*(t*6-15)+10)));};
/** Assembly finishes before the focus plateau, with the same envelope on exit. */
export const assemblyWeight=(distance:number)=>1-ease((distance-.18)/.72);
export const turnTarget=(hold:number)=>TAU*ease((hold-.45)/(HERO_HOLD-1.5));
export const turnPose=(angle:number)=>new Quaternion().setFromEuler(new Euler(angle,.055*Math.sin(angle),.025*Math.sin(angle*2),'XYZ'));
export function railPoint(angle:number,radius:number,centerX:number,floorY:number){
 return new Vector3(centerX+Math.sin(angle)*radius,floorY,Math.cos(angle)*RAIL_DEPTH);
}
/** Absolute offsets after the original explosion sampler; never accumulated. */
export function animateBackdrop(parts:ExplodedPart[],weight:number,time:number,model:number){
 if(weight<1e-8)return;
 for(let i=0;i<parts.length;i++){
  const p=parts[i],phase=i*2.39996+model*.79;
  p.node.position.x+=Math.sin(time*.38+phase)*.0035*weight;
  p.node.position.y+=Math.cos(time*.46+phase*.71)*.0045*weight;
  p.node.position.z+=Math.sin(time*.32+phase*1.27)*.006*weight;
 }
}
/** Pin the actual animated blade vertex to the rail, including explosion,
 * local component movement, full-turn attitude and original node hierarchy. */
export function anchorTip(group:Object3D,tipMesh:Object3D,tipLocal:Vector3,target:Vector3,weight:number){
 if(weight<1e-8)return;
 group.updateMatrixWorld(true);
 const delta=target.clone().sub(tipLocal.clone().applyMatrix4(tipMesh.matrixWorld));
 group.position.addScaledVector(delta,weight);group.updateMatrixWorld(true);
}
