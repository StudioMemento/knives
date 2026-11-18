/** Consume the momentum tail of a wheel gesture without queuing destinations. */
export class SectionSnap {
 private last=-Infinity;
 private sum=0;
 private consumed=false;
 private lockedUntil=0;
 lock(now:number){this.lockedUntil=now+480;this.consumed=true;this.sum=0;}
 wheel(delta:number,now:number){
  if(now-this.last>210){this.sum=0;this.consumed=false;}
  this.last=now;
  if(now<this.lockedUntil||this.consumed)return 0;
  if(Math.sign(delta)!==Math.sign(this.sum))this.sum=0;
  this.sum+=delta;
  if(Math.abs(this.sum)<42)return 0;
  const direction=Math.sign(this.sum);this.lock(now);return direction;
 }
}
export function swipeDestination(start:number,deltaX:number,width:number,velocityX=0){
 const anchor=Math.round(start);
 const distance=Math.abs(deltaX);
 if(distance>=Math.min(62,width*.13)||(distance>=20&&Math.abs(velocityX)>.45))return anchor-Math.sign(deltaX);
 return anchor;
}
export function nearestChapter(target:number,index:number){
 const current=((target%5)+5)%5;
 return Math.round(target+((index-current+7.5)%5)-2.5);
}
