/** One physical scroll gesture requests one settled chapter. Inertia cannot
 * accumulate hidden destinations while the new UI is forming. */
export class SectionSnap {
 private last=-Infinity;
 private sum=0;
 private consumed=false;
 private lockedUntil=0;
 lock(now:number){this.lockedUntil=now+2300;this.consumed=true;this.sum=0;}
 wheel(delta:number,now:number):number{
  if(now-this.last>240){this.sum=0;this.consumed=false;}
  this.last=now;
  if(now<this.lockedUntil||this.consumed)return 0;
  if(Math.sign(delta)!==Math.sign(this.sum))this.sum=0;
  this.sum+=delta;
  if(Math.abs(this.sum)<42)return 0;
  const direction=Math.sign(this.sum);this.lock(now);return direction;
 }
}
export function swipeDestination(start:number,deltaX:number,width:number,velocityX:number){
 const travel=-deltaX/Math.max(180,width*.42);
 const flick=Math.max(-.55,Math.min(.55,-velocityX*.24));
 let target=Math.round(start+travel+flick);
 if(Math.abs(deltaX)>48&&target===Math.round(start))target+=Math.sign(-deltaX);
 return Math.max(Math.round(start)-2,Math.min(Math.round(start)+2,target));
}
export function nearestChapter(target:number,index:number){
 const current=((target%5)+5)%5;
 return Math.round(target+((index-current+7.5)%5)-2.5);
}
