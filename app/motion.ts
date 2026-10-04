import {easeInOut,TRANSITION_MS} from './navigation';
export const HERO_SHOW_MS=4200;
export const HERO_TRAVEL_MS=5600;
export const OUTRO_MS=3100;
export const wrapKnife=(index:number)=>((index%4)+4)%4;
export class HeroCarousel {
 position=0;show=0;dragging=false;private elapsed=0;private from=0;private target:number|null=null;private duration=HERO_TRAVEL_MS;private manual=false;
 reset(index:number){this.position=index;this.from=index;this.target=null;this.elapsed=0;this.show=0;this.manual=false;this.dragging=false;}
 focus(index:number,direction=0){
  let target=wrapKnife(index)+Math.round((this.position-wrapKnife(index))/4)*4;
  if(direction>0)while(target<=this.position)target+=4;
  if(direction<0)while(target>=this.position)target-=4;
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
   const t=Math.min(1,this.elapsed/this.duration);this.position=this.from+(this.target-this.from)*easeInOut(t);
   if(t===1){this.target=null;this.elapsed=0;this.show=0;this.manual=false;}
  }
 }
}
/** The orbit changes position and scale, never the shared product orientation.
 * Calibrated tip +Y -> left, edge -X -> down, broad face +Z -> camera. */
export function heroPose(index:number,orbit:HeroCarousel,width:number,height:number,mobile:boolean,reduced:boolean){
 const angle=(index-orbit.position)*Math.PI/2;
 const authority=Math.pow((Math.cos(angle)+1)*.5,2.6);
 const approach=Math.sin(angle)*authority;
 const length=Math.min(width*(mobile?.84:.63),height*1.55);
 return {
  x:Math.sin(angle)*width*(mobile?.62:.44),
  y:height*(-.06+(1-Math.cos(angle))*.055+Math.sin(angle)*.075)+approach*.04,
  z:Math.cos(angle)*1.45-.55,
  scale:length/4.5*(.38+authority*.62),
  pitch:0,
  yaw:0,
  roll:Math.PI/2,
 };
}
export function sectionFrame(viewWidth:number,viewHeight:number,chapter:number,configuring=false,dockHeight=80){
 const landscape=viewHeight<=500,mobile=viewWidth<600||(viewWidth<800&&!landscape);
 const config=configuring||chapter===2;
 const cameraZ=[8.3,8.6,9.2,9.5,9.5][chapter]??9.5;
 const fov=chapter<2?31:34;
 const height=2*Math.tan(fov*Math.PI/360)*cameraZ,width=height*viewWidth/viewHeight;
 const focus=chapter<2&&!config;
 const stageTop=landscape?138:mobile?252:240,stageBottom=viewHeight-dockHeight-(landscape?64:94);
 const available=Math.max(20,stageBottom-stageTop);
 const visibleLength=Math.min(width*(mobile?.85:focus?.53:config?.72:.68),height*(landscape?(config?1.15:1.65):2),config?available/viewHeight*height*4.4:Infinity);
 return {cameraZ,cameraX:config?0:[.24,-.30,.16,0,0][chapter]??0,cameraY:config?0:[.18,-.10,.18,0,0][chapter]??0,fov,
  x:focus&&!mobile?-width*.19:0,y:height*(config?.5-(stageTop+available/2)/viewHeight:focus?(mobile?.17:.025):.03),scale:visibleLength/4.5,visibleLength,
  pitch:config?0:[.09,-.20,.27,0,0][chapter]??0,
  yaw:config?0:[-.13,.26,-.12,0,0][chapter]??0,
  roll:Math.PI/2+(config?0:[-.10,.14,.04,0,0][chapter]??0)};
}
