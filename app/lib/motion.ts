/** Exact critically damped motion: continuous velocity even when scrolling or
 * dragging changes direction. The result does not depend on the frame rate. */
export class MotionValue {
 value:number;
 velocity=0;
 constructor(value=0){this.value=value;}
 reset(value:number){this.value=value;this.velocity=0;}
 step(target:number,dt:number,frequency=9){
  const offset=this.value-target,term=this.velocity+frequency*offset,decay=Math.exp(-frequency*dt);
  this.value=target+(offset+term*dt)*decay;
  this.velocity=(this.velocity-frequency*term*dt)*decay;
  return this.value;
 }
}
/** Five equal arc lengths on the physical stage rail. */
export const orbitAngle=(slot:number)=>((slot%5+5)%5)*2*Math.PI/5;
