import {easeInOut,TRANSITION_MS} from './navigation';

export const HERO_SHOW_MS=4200;
export const HERO_TRAVEL_MS=5600;
export const COLLECTION_SIZE=5;
export const HERO_FLOOR_RATIO=.26;
export const wrapKnife=(index:number,count=COLLECTION_SIZE)=>((index%count)+count)%count;
// Quintic departure, then a long logarithmic-feeling approach: most rotation
// happens before the focus lane, the last 18% occupies half the travel time.
// Both halves share the same velocity and acceleration at the join (C2).
export function heroTravel(t:number){
 const x=Math.max(0,Math.min(1,t));
 if(x<.5){const u=x*2;return 4.24*u**3-5.10*u**4+1.68*u**5;}
 const u=(x-.5)*2;return .82+.18*(1-(1-u)**4);
}
export class HeroCarousel {
 position=0;show=0;dragging=false;
 private elapsed=0;private from=0;private target:number|null=null;
 private duration=HERO_TRAVEL_MS;private manual=false;
 reset(index:number){this.position=index;this.from=index;this.target=null;this.elapsed=0;this.show=0;this.manual=false;this.dragging=false;}
 focus(index:number,direction=0){
  let target=wrapKnife(index)+Math.round((this.position-wrapKnife(index))/COLLECTION_SIZE)*COLLECTION_SIZE;
  if(direction>0)while(target<=this.position)target+=COLLECTION_SIZE;
  if(direction<0)while(target>=this.position)target-=COLLECTION_SIZE;
  this.from=this.position;this.target=target;this.duration=TRANSITION_MS;this.elapsed=0;this.show=0;this.manual=true;
 }
 beginDrag(){this.dragging=true;this.target=null;this.elapsed=0;this.show=0;this.manual=false;}
 drag(delta:number){if(this.dragging)this.position+=delta;}
 endDrag(){this.dragging=false;this.focus(wrapKnife(Math.round(this.position)));}
 tick(dt:number,playing:boolean){
  if(this.dragging||(!playing&&!this.manual))return;
  this.elapsed+=Math.min(dt,.1)*1000;
  if(this.target===null){
   this.show=Math.min(1,this.elapsed/HERO_SHOW_MS);
   if(this.elapsed>=HERO_SHOW_MS){this.from=this.position;this.target=this.position+1;this.elapsed=0;this.duration=HERO_TRAVEL_MS;this.show=0;}
  }else{
   const t=Math.min(1,this.elapsed/this.duration);this.position=this.from+(this.target-this.from)*heroTravel(t);
   if(t===1){this.target=null;this.elapsed=0;this.show=0;this.manual=false;}
  }
 }
}
// Five positions on the same ring, symmetric and equally spaced in projection.
// Rear blades stay perpendicular; only the active knife leans, about its tip.
const depth=1.22,outer=1.9;
const outerX=Math.sin(outer)/(9.5-depth*Math.cos(outer));
let lo=outer,hi=Math.PI;
for(let i=0;i<32;i++){const mid=(lo+hi)/2;if(Math.sin(mid)/(9.5-depth*Math.cos(mid))>outerX/3)lo=mid;else hi=mid;}
const inner=(lo+hi)/2;
const angles=[0,outer,inner,Math.PI*2-inner,Math.PI*2-outer,Math.PI*2];
export function heroPose(index:number,orbit:HeroCarousel,width:number,height:number,mobile:boolean,_reduced:boolean){
 const slot=wrapKnife(index-orbit.position),nearest=Math.min(slot,COLLECTION_SIZE-slot);
 const authority=easeInOut(Math.max(0,1-nearest));
 const step=Math.floor(slot),u=slot-step,a=angles[step],b=angles[step+1];
 const previous=step===0?angles[4]-Math.PI*2:angles[step-1];
 const next=step===4?angles[1]+Math.PI*2:angles[step+2];
 const m0=(b-previous)/2,m1=(next-a)/2;
 const angle=(2*u*u*u-3*u*u+1)*a+(u*u*u-2*u*u+u)*m0+(-2*u*u*u+3*u*u)*b+(u*u*u-u*u)*m1;
 const radius=width*(mobile?.37:.385),floorY=-height*HERO_FLOOR_RATIO;
 const scale=Math.min(height*(.29+authority*.365),width*(.54+authority*.65))/4.5,roll=Math.PI-authority*Math.PI/15;
 const tipX=-Math.sin(roll)*2.25*scale,tipY=Math.cos(roll)*2.25*scale;
 return {x:Math.sin(angle)*radius-tipX,y:floorY+.065-tipY,z:Math.cos(angle)*depth,
  scale,pitch:0,yaw:0,roll,authority,floorY,radius,depth};
}
export function sectionFrame(viewWidth:number,viewHeight:number,chapter:number,_configuring=false,_dockHeight=0){
 const mobile=viewWidth<700&&viewHeight>500;
 const cameraZ=9.5,fov=34;
 const height=2*Math.tan(fov*Math.PI/360)*cameraZ,width=height*viewWidth/viewHeight;
 const focus=chapter<2,product=chapter===3;
 const visibleLength=width*(mobile?(focus?.86:.88):focus?.65:product?.64:.86);
 return {cameraZ,cameraX:0,cameraY:0,fov,
  x:mobile?0:focus?-width*.16:product?-width*.15:0,
  y:height*(mobile?.13:chapter===0?.035:chapter===1?-.045:product?-.025:-.03),
  scale:visibleLength/4.5,visibleLength,
  pitch:0,yaw:chapter===1?-.08:0,
  roll:Math.PI/2+(chapter===0?(mobile?.48:.58):chapter===1?.035:0)};
}
