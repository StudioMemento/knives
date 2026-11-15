export const KNIVES = ['HYPER','VERTEX','QUAD','EDGE','TRIS'] as const;
export const CHAPTERS = ['Collection','Blade','Handle','Metals','Explore'] as const;
export type Surface = 'blade'|'handle'|'metals';
export type View = 'side'|'top'|'edge'|'perspective';
export type Finish = {color:number;style:number};
export type Configuration = Record<Surface,Finish>;
export const COLORS = [
 {name:'Argento',hex:'#bfc3c6'}, {name:'Titanio',hex:'#777e82'},
 {name:'Grafite',hex:'#35383c'}, {name:'Nero',hex:'#141619'},
 {name:'Champagne',hex:'#b89c72'}, {name:'Rame',hex:'#ae6950'},
 {name:'Bordeaux',hex:'#66313e'}, {name:'Blu notte',hex:'#273f58'},
];
export const STYLES = ['Satinato','Spazzolato','Stonewash','Carbonio'];
export const defaultConfiguration = ():Configuration => ({blade:{color:0,style:1},handle:{color:3,style:3},metals:{color:1,style:0}});
export type DemoState = {
 target:number; progress:number; selected:number; orbit:number; paused:boolean; reduced:boolean;dragging:boolean;dragPhase:number;
 configs:Configuration[]; closed:number; exploded:number; spin:boolean; view:View;
 cuts:[number,number,number]; yaw:number; pitch:number; zoom:number; resetVersion:number;
 focus:[number,number,number]|null; ready:number[];
};
export const createState = ():DemoState => ({target:0,progress:0,selected:0,orbit:0,paused:false,reduced:false,dragging:false,dragPhase:0,configs:KNIVES.map(defaultConfiguration),closed:0,exploded:0,spin:false,view:'side',cuts:[0,0,0],yaw:0,pitch:0,zoom:1,resetVersion:0,focus:null,ready:[]});
export const mod = (x:number,n=5) => ((x%n)+n)%n;
export const clamp = (x:number,a=0,b=1) => Math.min(b,Math.max(a,x));
export const smooth = (x:number) => {const t=clamp(x);return t*t*t*(t*(t*6-15)+10);};
export const sectionAt = (progress:number) => Math.round(mod(progress))%5;
export function nextAnchor(progress:number,direction:number){return direction>0?Math.floor(progress+.06)+1:Math.ceil(progress-.06)-1;}
export function resetInspection(s:DemoState){s.closed=0;s.exploded=0;s.spin=false;s.view='side';s.cuts=[0,0,0];s.yaw=0;s.pitch=0;s.zoom=1;s.focus=null;s.resetVersion++;}
export type ModelMeta = {
 id:string;url:string;meshCount:number;triangles:number;outputBytes:number;
 bounds:{center:[number,number,number];size:[number,number,number]};
 focusPoints:Record<'assembled'|'blade'|'handle'|'metals',[number,number,number]>;
 roleBounds?:Record<Surface,{size:[number,number,number];min:[number,number,number];max:[number,number,number]}>;
 motion:{openCloseClip:string;closedTime:number;explodeClip:string;explodePeakTime:number};
 sourceMotionQA:string;
};
