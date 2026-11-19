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
