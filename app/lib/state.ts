import {Euler,Quaternion} from 'three';
export const KNIVES = ['HYPER','VERTEX','EDGE','TRIS','QUAD'] as const;
export const PREVIOUS_ORDER = ['HYPER','VERTEX','QUAD','EDGE','TRIS'] as const;
export const IDLE_TILT_LIMIT = Math.PI / 12;
export const CHAPTERS = ['Stage','Blade','Handle','Details','Camera & Lighting'] as const;
export const PRODUCTS = [
 {copy:['Grafite e luce fredda.', 'Un profilo da gran turismo.']},
 {copy:['Riflessi cobalto e viola.', 'Il colore cambia con la luce.']},
 {copy:['Vuoti scavati nel metallo.', 'Un ritmo industriale.']},
 {copy:['Curve morbide, luce opale.', 'La materia affiora.']},
 {copy:['Toni caldi, linee misurate.', 'L’eleganza dei quattro piani.']},
] as const;
export type Surface = 'blade'|'handle'|'metals';
export type View = 'side'|'top'|'edge'|'perspective'|'clip'|'screw';
export type Finish = {color:number;style:number};
export type Configuration = Record<Surface,Finish>;
export const defaultConfiguration = ():Configuration => ({blade:{color:0,style:1},handle:{color:3,style:3},metals:{color:1,style:0}});
export type DemoState = {
 target:number; progress:number; selected:number; orbit:number; knifeRequest:number|null; knifeDestination:number|null;
 paused:boolean; reduced:boolean; interacting:boolean; activity:number;
 configs:Configuration[]; customFold:[number,number,number];customExplode:[number,number,number];closed:number; exploded:number; view:View;
 zoom:number; lighting:number; rotation:Quaternion;
 focus:[number,number,number]|null; ready:number[];
};
export const createState = ():DemoState => ({
 target:0,progress:0,selected:0,orbit:0,knifeRequest:null,knifeDestination:null,paused:false,reduced:false,interacting:false,activity:0,
 configs:KNIVES.map(defaultConfiguration),customFold:[0,1,1],customExplode:[0,0,0],closed:0,exploded:0,view:'side',zoom:1,lighting:0,rotation:new Quaternion(),focus:null,ready:[],
});
export const mod = (x:number,n=5) => ((x%n)+n)%n;
export const clamp = (x:number,a=0,b=1) => Math.min(b,Math.max(a,x));
export const smooth = (x:number) => {const t=clamp(x);return t*t*t*(t*(t*6-15)+10);};
export const sectionAt = (progress:number) => Math.round(mod(progress))%5;
export const nextAnchor = (progress:number,direction:number) => Math.round(progress)+Math.sign(direction);
// Apply each delta in screen space so the axes stay usable after passing either pole.
export function rotateProduct(s:DemoState,yaw:number,pitch:number){
 const delta=new Quaternion().setFromEuler(new Euler(pitch,yaw,0,'XYZ'));
 s.rotation.premultiply(delta).normalize();s.activity++;
}
export const hasManualRotation=(s:Pick<DemoState,'rotation'>)=>Math.abs(s.rotation.w)<.9999999;
export function resetView(s:DemoState){s.view='side';s.rotation.identity();s.focus=null;s.zoom=1;}
export function resetInspection(s:DemoState){s.closed=0;s.exploded=0;s.customFold=[0,1,1];s.customExplode=[0,0,0];resetView(s);}
export type ModelMeta = {
 id:string;url:string;meshCount:number;triangles:number;outputBytes:number;
 bounds:{min:number[];max:number[];center:[number,number,number];size:[number,number,number]};
 focusPoints:Record<'assembled'|'blade'|'handle'|'metals',[number,number,number]>;
 roleBounds:Record<Surface,{size:[number,number,number];min:[number,number,number];max:[number,number,number]}>;
 motion:{openCloseClip:string;closedTime:number;explodeClip:string;explodePeakTime:number};
 sourceMotionQA:string;
};
