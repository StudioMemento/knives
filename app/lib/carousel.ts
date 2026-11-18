import {HERO_HOLD,HERO_TRAVEL} from './choreography.ts';

/** One continuous phase owns the ring, product selection and focus. Commands
 * never overwrite the visible phase. The idle cycle runs on elapsed seconds. */
export class Carousel {
 phase=0; velocity=0; acceleration=0; hold=0;
 private target:number|null=null;
 private elapsed=0;
 private duration=HERO_TRAVEL;
 private manual=false;
 private coefficients=[0,0,0,0,0,0];

 private begin(target:number,duration:number,manual:boolean){
  const distance=target-this.phase,velocity=this.velocity*duration,acceleration=this.acceleration*duration*duration/2;
  this.coefficients=[this.phase,velocity,acceleration,10*distance-6*velocity-3*acceleration,-15*distance+8*velocity+3*acceleration,6*distance-3*velocity-acceleration];
  this.target=target;this.duration=duration;this.elapsed=0;this.hold=0;this.manual=manual;
 }
 rest(){this.hold=0;}
 request(target:number,reduced=false){
  if(target===this.target){this.manual=true;return;}
  if(this.target===null&&Math.abs(target-this.phase)<1e-8){this.hold=0;return;}
  // Quintic Bézier control points enclose the entire release path. Shorten
  // the settle until the incoming derivatives fit the single-slot corridor.
  const distance=target-this.phase;
  const low=Math.min(target,this.phase)-(distance>=0?.07:0);
  const high=Math.max(target,this.phase)+(distance<=0?.07:0);
  let duration=reduced?.20:Math.min(1.38,Math.max(.3,Math.abs(distance)*1.25));
  while(duration>.005){
   const first=this.phase+this.velocity*duration/5;
   const second=this.phase+2*this.velocity*duration/5+this.acceleration*duration*duration/20;
   if(first>=low&&first<=high&&second>=low&&second<=high)break;
   duration*=.72;
  }
  this.begin(target,duration,true);
 }
 dragTo(target:number,dt:number){
  this.target=null;this.manual=true;this.hold=0;
  const stiffness=21,offset=this.phase-target,term=this.velocity+stiffness*offset,decay=Math.exp(-stiffness*dt);
  this.phase=target+(offset+term*dt)*decay;
  this.velocity=(this.velocity-stiffness*term*dt)*decay;
  this.acceleration=-2*stiffness*this.velocity-stiffness*stiffness*(this.phase-target);
  return this.phase;
 }
 step(dt:number,auto:boolean,paused:boolean,reduced:boolean){
  let remaining=Math.max(0,dt);
  while(remaining>1e-8){
   if(this.target===null){
    if(!auto||paused||reduced)break;
    const span=Math.min(remaining,Math.max(0,HERO_HOLD-this.hold));
    this.hold+=span;remaining-=span;
    if(this.hold+1e-8<HERO_HOLD)break;
    this.begin(Math.round(this.phase)+1,HERO_TRAVEL,false);
   }
   const destination=this.target;
   if(destination===null||(!this.manual&&(!auto||paused||reduced)))break;
   const span=Math.min(remaining,this.duration-this.elapsed);
   this.elapsed+=span;remaining-=span;
   const u=this.elapsed/this.duration,[a,b,c,d,e,f]=this.coefficients;
   this.phase=a+u*(b+u*(c+u*(d+u*(e+u*f))));
   this.velocity=(b+u*(2*c+u*(3*d+u*(4*e+u*5*f))))/this.duration;
   this.acceleration=(2*c+u*(6*d+u*(12*e+u*20*f)))/(this.duration*this.duration);
   if(this.elapsed+1e-8>=this.duration){
    this.phase=destination;this.target=null;this.elapsed=0;this.hold=0;this.manual=false;this.velocity=0;this.acceleration=0;
   }
  }
  return this.phase;
 }
}
