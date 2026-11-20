import {KNIVES, type Configuration} from './state.ts';
import {SURFACES} from './catalogue.ts';

type Schedule = {base: number; blade: number[][]; handle: number[][]; metals: number[][]};

// Premiums are in €25 increments. Each pair follows the material and colour order
// of the corresponding model's catalogue. Signature finishes have their own premium.
const schedules: Record<typeof KNIVES[number], Schedule> = {
 HYPER: {base:2450, blade:[[0,22,6,9,17,12],[0,3,7,10,14,21]], handle:[[9,18,0,6,11,38],[0,4,8,11,16,24]], metals:[[0,9,3,14,6,11],[0,3,7,11,5,16]]},
 VERTEX:{base:3525, blade:[[23,8,0,72,29,6],[12,4,10,0,28,8]], handle:[[8,0,85,4,5,36],[6,10,0,15,28,19]], metals:[[36,14,8,21,11,0],[4,9,0,13,19,24]]},
 EDGE:  {base:1925, blade:[[0,5,10,7,21,12],[0,4,9,16,11,20]], handle:[[4,0,9,12,31,20],[0,3,6,10,15,19]], metals:[[10,0,3,7,13,19],[0,3,5,8,12,16]]},
 TRIS:  {base:4175, blade:[[74,89,12,19,0,24],[4,9,15,0,20,29]], handle:[[0,13,48,29,54,23],[0,7,14,11,25,32]], metals:[[15,8,32,41,20,0],[0,5,11,17,23,14]]},
 QUAD:  {base:4975, blade:[[4,79,31,24,0,12],[0,6,12,17,25,33]], handle:[[0,13,20,8,53,28],[3,12,0,17,26,38]], metals:[[0,25,69,11,15,22],[0,5,11,18,27,34]]}
};

let prices: Uint32Array[] | undefined;
function editionPrices() {
 const counts = new Map<number, number>();
 return KNIVES.map(id => {
  const schedule = schedules[id];
  const [blade, handle, details] = SURFACES.map(surface => {
   const [materials, colours] = schedule[surface];
   return materials.flatMap(material => colours.map(colour => (material + colour) * 25));
  });
  const result = new Uint32Array(blade.length * handle.length * details.length);
  let index = 0;
  for (const b of blade) for (const h of handle) for (const d of details) {
   const euros = schedule.base + b + h + d;
   // Break equal subtotals by cents in stable catalogue order, across all five editions.
   const offset = counts.get(euros) ?? 0;
   result[index++] = euros * 100 + offset;
   counts.set(euros, offset + 1);
  }
  return result;
 });
}

export function priceInCents(model: number, config: Configuration) {
 prices ??= editionPrices();
 const variant = (part: typeof SURFACES[number]) => config[part].style * 6 + config[part].color;
 return prices[model][(variant('blade') * 36 + variant('handle')) * 36 + variant('metals')];
}
