/** Exact critically damped motion: continuous velocity even when scrolling or
 * dragging changes direction. The result does not depend on the frame rate. */
export class MotionValue {
 value:number;
 velocity=0;
 constructor(value=0){this.value=value;}
 step(target:number,dt:number,frequency=9){
  const offset=this.value-target,term=this.velocity+frequency*offset,decay=Math.exp(-frequency*dt);
  this.value=target+(offset+term*dt)*decay;
  this.velocity=(this.velocity-frequency*term*dt)*decay;
  return this.value;
 }
}
export const focusWeight=(distance:number)=>{
 const t=Math.max(0,Math.min(1,1-distance));
 return t*t*t*(t*(t*6-15)+10);
};
// Equal spacing in projection, along the same shallow ellipse as the reference.
const depth=1.22,outer=1.9;
const outerX=Math.sin(outer)/(9.5-depth*Math.cos(outer));
let lo=outer,hi=Math.PI;
for(let i=0;i<32;i++){const mid=(lo+hi)/2;if(Math.sin(mid)/(9.5-depth*Math.cos(mid))>outerX/3)lo=mid;else hi=mid;}
const inner=(lo+hi)/2;
const angles=[0,outer,inner,2*Math.PI-inner,2*Math.PI-outer,2*Math.PI];
export function orbitAngle(slot:number){
 const n=((slot%5)+5)%5,k=Math.floor(n),u=n-k,a=angles[k],b=angles[k+1];
 const previous=k===0?angles[4]-2*Math.PI:angles[k-1];
 const next=k===4?angles[1]+2*Math.PI:angles[k+2];
 const m0=(b-previous)/2,m1=(next-a)/2;
 return (2*u*u*u-3*u*u+1)*a+(u*u*u-2*u*u+u)*m0+(-2*u*u*u+3*u*u)*b+(u*u*u-u*u)*m1;
}
