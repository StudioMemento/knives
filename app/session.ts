import {KNIVES} from './catalog';
import {MATERIALS,STENCILS,originalConfiguration,type Configuration,type CartItem,type Decoration} from './configuration';

const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const color=(x:unknown):x is string=>typeof x==='string'&&/^#[0-9a-f]{6}$/i.test(x);
const vector=(x:unknown):x is [number,number,number]=>Array.isArray(x)&&x.length===3&&x.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=10);
export function restoreConfiguration(value:unknown,index:number):Configuration {
 const result=originalConfiguration(index);if(!object(value))return result;
 if(Number.isInteger(value.preset)&&Number(value.preset)>=-1&&Number(value.preset)<3)result.preset=Number(value.preset);
 for(const part of ['blade','handle'] as const){const finish=value[part];if(object(finish)&&typeof finish.material==='string'&&Object.hasOwn(MATERIALS,finish.material)&&color(finish.color))result[part]={material:finish.material as Configuration['blade']['material'],color:finish.material==='original'?result[part].color:finish.color};}
 if(Array.isArray(value.decorations))for(const d of value.decorations.slice(0,8)){
  if(!object(d)||typeof d.id!=='string'||d.id.length>100||!['symbol','text'].includes(String(d.type))||typeof d.content!=='string'||d.content.length>28||!['stencil','sticker'].includes(String(d.treatment))||!color(d.color)||!['sans','serif','mono'].includes(String(d.font))||typeof d.width!=='number'||!Number.isFinite(d.width)||d.width<.15||d.width>2.5||typeof d.rotation!=='number'||!Number.isFinite(d.rotation)||Math.abs(d.rotation)>180)continue;
  if(d.type==='symbol'&&!STENCILS.includes(d.content))continue;
  const a=d.anchor;const anchor=object(a)&&typeof a.mesh==='string'&&a.mesh.length<=200&&vector(a.point)&&vector(a.normal)&&Math.hypot(...a.normal)>.5?{mesh:a.mesh,point:a.point,normal:a.normal}:null;
  result.decorations.push({id:d.id,type:d.type as Decoration['type'],content:d.content,treatment:d.treatment as Decoration['treatment'],color:d.color,width:d.width,rotation:d.rotation,font:d.font as Decoration['font'],anchor});
 }
 return result;
}
export function restoreSession(raw:string){
 const data:unknown=JSON.parse(raw);if(!object(data)||data.version!==34)throw new Error('Unsupported session');
 const configurations=KNIVES.map((_,i)=>restoreConfiguration(Array.isArray(data.configurations)?data.configurations[i]:null,i));
 const bag:CartItem[]=[];
 if(Array.isArray(data.bag))for(const item of data.bag.slice(0,24)){
  if(!object(item)||typeof item.id!=='string'||!Number.isInteger(item.quantity)||Number(item.quantity)<1||Number(item.quantity)>10)continue;
  const index=KNIVES.findIndex(k=>k.id===item.knifeId);if(index<0)continue;
  const configuration=restoreConfiguration(item.configuration,index);
  if(configuration.decorations.some(d=>!d.anchor||!d.content.trim()))continue;
  bag.push({id:item.id,knifeId:KNIVES[index].id,configuration,quantity:Number(item.quantity),thumbnail:typeof item.thumbnail==='string'&&item.thumbnail.startsWith('data:image/png;base64,')&&item.thumbnail.length<400000?item.thumbnail:''});
 }
 // Carry existing Gerber decorations into the corrected proper-rotation frame.
 if(data.coordinateFrame!==42){
  const rotate=(config:Configuration)=>{for(const d of config.decorations)if(d.anchor){d.anchor.point=[-d.anchor.point[0],d.anchor.point[1],-d.anchor.point[2]];d.anchor.normal=[-d.anchor.normal[0],d.anchor.normal[1],-d.anchor.normal[2]];}};
  rotate(configurations[3]);for(const item of bag)if(item.knifeId==='gerber')rotate(item.configuration);
 }
 return {configurations,bag};
}
