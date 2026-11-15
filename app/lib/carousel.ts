import {HERO_HOLD} from './choreography.ts';
/** A complete focus turn; a C2 trajectory between focus positions.
 * Retargeting preserves both velocity and acceleration instead of restarting
 * an ease from rest on every click or trackpad event. */
export class Carousel {
 phase=0;
 velocity=0;
 acceleration=0;
 hold=0;
 private target:number|null=null;
 private elapsed=0;
 private duration=5.6;
 private manual=false;
 private coefficients=[0,0,0,0,0,0];
 private begin(target:number,duration:number,manual:boolean){
  const d=target-this.phase,b1=this.velocity*duration,b2=this.acceleration*duration*duration/2;
  this.coefficients=[this.phase,b1,b2,10*d-6*b1-3*b2,-15*d+8*b1+3*b2,6*d-3*b1-b2];
  this.target=target;this.duration=duration;this.elapsed=0;this.hold=0;this.manual=manual;
 }
 request(target:number,reduced=false){
  if(target===this.target){this.manual=true;return;}
  this.begin(target,reduced?.3:2.4,true);
 }
 dragTo(target:number,dt:number){
  this.target=null;this.manual=true;this.hold=0;
  const frequency=16,offset=this.phase-target,term=this.velocity+frequency*offset,decay=Math.exp(-frequency*dt);
  this.phase=target+(offset+term*dt)*decay;
  this.velocity=(this.velocity-frequency*term*dt)*decay;
  this.acceleration=-2*frequency*this.velocity-frequency*frequency*(this.phase-target);
  return this.phase;
 }
 step(dt:number,active:boolean,paused:boolean,reduced:boolean){
  if(!active)return this.phase;
  if(this.target!==null){
   if(paused&&!this.manual)return this.phase;
   this.elapsed+=dt;
   const u=Math.min(1,this.elapsed/this.duration),[a,b,c,d,e,f]=this.coefficients;
   this.phase=a+u*(b+u*(c+u*(d+u*(e+u*f))));
   this.velocity=(b+u*(2*c+u*(3*d+u*(4*e+u*5*f))))/this.duration;
   this.acceleration=(2*c+u*(6*d+u*(12*e+u*20*f)))/(this.duration*this.duration);
   if(u===1){this.phase=this.target;this.target=null;this.elapsed=0;this.hold=0;this.manual=false;this.velocity=0;this.acceleration=0;}
  }else if(!paused){
   this.hold+=dt;
   if(this.hold>=HERO_HOLD&&!reduced)this.begin(Math.round(this.phase)+1,5.6,false);
  }
  return this.phase;
 }
}
