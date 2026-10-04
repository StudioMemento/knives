import type { KnifeId } from './catalog';
import { KNIVES } from './catalog';
export type Surface = 'blade' | 'handle';
export type MaterialId = 'original' | 'satin' | 'polished' | 'coated' | 'polymer';
export type SurfaceFinish = { material: MaterialId; color: string };
export type Anchor = { mesh: string; point: [number,number,number]; normal: [number,number,number] };
export type Decoration = { id: string; type: 'symbol' | 'text'; content: string; treatment: 'stencil' | 'sticker'; color: string; width: number; rotation: number; font: 'sans' | 'serif' | 'mono'; anchor: Anchor | null };
export type Configuration = { preset: number; blade: SurfaceFinish; handle: SurfaceFinish; decorations: Decoration[] };
export type CartItem = { id: string; knifeId: KnifeId; configuration: Configuration; quantity: number; thumbnail: string };
export const MATERIALS: Record<MaterialId,{label:string;roughness:number;metalness:number}> = {
 original:{label:'Original texture',roughness:.45,metalness:.7},
 satin:{label:'Brushed metal',roughness:.4,metalness:.94},
 polished:{label:'Polished metal',roughness:.16,metalness:1},
 coated:{label:'Ceramic coating',roughness:.58,metalness:.32},
 polymer:{label:'Matte polymer',roughness:.88,metalness:.02},
};
export const STENCILS = ['compass','bolt','mountain','wave-sine','leaf','flame','diamond','laurel-wreath','anchor','sparkles'];
const HANDLE_COLORS = ['#303238','#e4b52c','#426359','#76503d'];
export function originalConfiguration(index:number):Configuration {return {preset:0,blade:{material:'original',color:'#c5c9cb'},handle:{material:'original',color:HANDLE_COLORS[index]},decorations:[]};}
export function applyPreset(knifeIndex:number,preset:number,current:Configuration):Configuration {
 if(preset===0)return {...originalConfiguration(knifeIndex),decorations:current.decorations};
 const knife=KNIVES[knifeIndex];const color=knife.finishes[preset].color;
 return {...current,preset,blade:{material:knifeIndex===0?'coated':knifeIndex===3?'polished':'satin',color:knifeIndex===1?'#bfc5c7':color},handle:{material:knifeIndex===1?'coated':knifeIndex===3?'satin':'polymer',color:knifeIndex===1?color:knifeIndex===2?'#244c49':knifeIndex===3?'#41302b':color}};
}
export function configPrice(knifeId:KnifeId,config:Configuration):number {const knife=KNIVES.find(k=>k.id===knifeId)!;return knife.finishes[Math.max(0,Math.min(knife.finishes.length-1,config.preset))]!.price+config.decorations.length*12;}
export function describeConfiguration(config:Configuration) {return `${MATERIALS[config.blade.material].label} blade · ${MATERIALS[config.handle.material].label} handle`;}
export const money=(amount:number)=>new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(amount);
export function shippingQuote(country:string,method:'standard'|'express',subtotal:number){if(method==='express')return country==='IT'?14:22;return subtotal>=300?0:country==='IT'?6:12;}
