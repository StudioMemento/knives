import catalogue from './catalogue-data.json' with {type:'json'};
import {KNIVES, PREVIOUS_ORDER, type Configuration, type Surface} from './state.ts';

export type Option = {name:string; description:string; motif?:string; hex?:string[]};
export type Collection = {swatchRow:number; default:number[]; colors:Option[]; styles:Option[]};
type Knife = typeof KNIVES[number];
export const CATALOGUE:Record<Knife,Record<Surface,Collection>>=catalogue;
export const CATALOGUE_KEY='memento-knives-ui-v52';
export const SURFACES=['blade','handle','metals'] as const;

/** V51 choices belong to the UI catalogue. The previous 3D look has its own storage. */
export function catalogueChoices(stored:unknown=null):Configuration[] {
 return KNIVES.map(knife=>{
  const result={} as Configuration;
  for(const surface of SURFACES) {
   const options=CATALOGUE[knife][surface];
   const entry=Array.isArray(stored)?stored[PREVIOUS_ORDER.indexOf(knife)]:(stored as Partial<Record<Knife,Configuration>>|null)?.[knife];
   const saved=entry?.[surface];
   const index=(value:unknown,count:number,fallback:number)=>
    typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<count?value:fallback;
   result[surface]={
    color:index(saved?.color,options.colors.length,options.default[0]),
    style:index(saved?.style,options.styles.length,options.default[1]),
   };
  }
  return result;
 });
}

export function restoreCatalogue(storage: Pick<Storage,'getItem'>) {
 for (const key of [CATALOGUE_KEY, 'memento-knives-ui-v51']) {
  try {
   const value = JSON.parse(storage.getItem(key) ?? 'null');
   if (value && typeof value === 'object') return catalogueChoices(value);
  } catch { /* Continue to the previous catalogue if a saved entry is damaged. */ }
 }
 const defaults = catalogueChoices();
 let old: unknown;
 try { old = JSON.parse(storage.getItem('memento-knives-v46') ?? 'null'); } catch { return defaults; }
 if (!Array.isArray(old)) return defaults;
 const legacyColours = ['bfc3c6','777e82','35383c','141619','b89c72','ae6950','66313e','273f58'];
 const channels = (hex:string) => [0,2,4].map(i => parseInt(hex.replace('#','').slice(i,i+2),16));
 const finishNames = [/satin|seta/i,/spazz|fresat/i,/stonewash|blast|micro/i,/carbon|trama|venat/i];
 for (const [i,id] of KNIVES.entries()) for (const part of SURFACES) {
  const saved = old[PREVIOUS_ORDER.indexOf(id)]?.[part];
  if (!saved) continue;
  const options = CATALOGUE[id][part];
  if (Number.isInteger(saved.color) && legacyColours[saved.color]) {
   const rgb = channels(legacyColours[saved.color]);
   const distances = options.colors.map(c => channels(c.hex![0]).reduce((d,v,k)=>d+(v-rgb[k])**2,0));
   defaults[i][part].color = distances.indexOf(Math.min(...distances));
  }
  if (Number.isInteger(saved.style) && finishNames[saved.style]) {
   const match = options.styles.findIndex(v=>finishNames[saved.style].test(v.name));
   if (match >= 0) defaults[i][part].style=match;
  }
 }
 return defaults;
}
