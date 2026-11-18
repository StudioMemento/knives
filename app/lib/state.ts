export const KNIVES = ['HYPER','VERTEX','QUAD','EDGE','TRIS'] as const;
export const CHAPTERS = ['Stage','Blade','Handle','Details','Inspect'] as const;
export const PRODUCTS = [
 {copy:'Struttura in metallo e inserti testurizzati.',price:179},
 {copy:'Superfici sfaccettate e linee tese.',price:179},
 {copy:'Volumi squadrati e finiture a contrasto.',price:179},
 {copy:'Una sequenza di fori circolari disegna il manico.',price:179},
 {copy:'Curve ampie raccolte in un profilo compatto.',price:179},
] as const;
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
 target:number; progress:number; selected:number; orbit:number; knifeRequest:number|null;
 paused:boolean; reduced:boolean; dragging:boolean; interacting:boolean; dragPhase:number; activity:number;
 configs:Configuration[]; closed:number; exploded:number; view:View;
 cuts:[number,number,number]; yaw:number; pitch:number; zoom:number;
 focus:[number,number,number]|null; ready:number[];
};
export const createState = ():DemoState => ({
 target:0,progress:0,selected:0,orbit:0,knifeRequest:null,paused:false,reduced:false,dragging:false,interacting:false,dragPhase:0,activity:0,
 configs:KNIVES.map(defaultConfiguration),closed:0,exploded:0,view:'side',cuts:[0,0,0],yaw:0,pitch:0,zoom:1,focus:null,ready:[],
});
export const mod = (x:number,n=5) => ((x%n)+n)%n;
export const clamp = (x:number,a=0,b=1) => Math.min(b,Math.max(a,x));
export const smooth = (x:number) => {const t=clamp(x);return t*t*t*(t*(t*6-15)+10);};
export const sectionAt = (progress:number) => Math.round(mod(progress))%5;
export const nextAnchor = (progress:number,direction:number) => Math.round(progress)+Math.sign(direction);
export function resetView(s:DemoState){s.view='side';s.yaw=0;s.pitch=0;s.zoom=1;s.focus=null;}
export function resetInspection(s:DemoState){s.closed=0;s.exploded=0;s.cuts=[0,0,0];resetView(s);}
export type ModelMeta = {
 id:string;url:string;meshCount:number;triangles:number;outputBytes:number;
 bounds:{min:number[];max:number[];center:[number,number,number];size:[number,number,number]};
 focusPoints:Record<'assembled'|'blade'|'handle'|'metals',[number,number,number]>;
 roleBounds:Record<Surface,{size:[number,number,number];min:[number,number,number];max:[number,number,number]}>;
 motion:{openCloseClip:string;closedTime:number;explodeClip:string;explodePeakTime:number};
 sourceMotionQA:string;
};
