import {Vector3,type Mesh,type Object3D} from 'three';
import {mod,smooth} from './state.ts';

export const HERO_PERIOD=8;
export const HERO_TRAVEL=2.2;
export const HERO_HOLD=HERO_PERIOD-HERO_TRAVEL;
export const RAIL={radius:4.35,floorY:-1.14,centerZ:-17,landing:-.56,slope:.117} as const;
export const slotOffset=(index:number,phase:number)=>mod(index-phase+2.5)-2.5;
export const stationWeight=(slot:number)=>1-smooth(Math.abs(slot)/1.20);

// More space between the pieces at the front of the track keeps the next
// silhouette readable as it approaches. Angle and velocity wrap continuously.
export function railAngle(slot:number){
 const theta=slot*2*Math.PI/5;
 return RAIL.landing+theta+.78*Math.sin(theta);
}

export function railPoint(slot:number,scaleX:number,scaleZ:number,floorY:number,out=new Vector3(),slope:number=RAIL.slope){
 const a=railAngle(slot);
 const depth=Math.cos(a)*RAIL.radius*scaleZ/Math.hypot(1,slope);
 return out.set(Math.sin(a)*RAIL.radius*scaleX,floorY+depth*slope,RAIL.centerZ+depth);
}

// In the supplied GLBs +X points from the handle to the open blade tip.
// Read the actual vertex after all authored node transforms, once at load.
export function openBladeTip(root:Object3D,meshes:Mesh[]){
 const inverse=root.matrixWorld.clone().invert(),p=new Vector3(),tip=new Vector3(-Infinity,0,0);
 for(const mesh of meshes){
  if(mesh.userData.surface!=='blade')continue;
  const transform=inverse.clone().multiply(mesh.matrixWorld),positions=mesh.geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++){
   p.fromBufferAttribute(positions,i).applyMatrix4(transform);
   // Bevels can share an extremum. Keep one vertex even after matrix round-off.
   if(p.x>tip.x+1e-8)tip.copy(p);
  }
 }
 if(!Number.isFinite(tip.x))throw Error('Modello privo di superficie lama');
 return tip;
}
