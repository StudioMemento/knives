import {KNIVES, type Configuration} from './state.ts';
import {SURFACES} from './catalogue.ts';

type Schedule = {range: [number, number]; blade: number[][]; handle: number[][]; metals: number[][]};

// Each edition has a price range in cents. Weights follow the material and colour
// order in the catalogue, including the model-specific signature finishes.
const schedules: Record<typeof KNIVES[number], Schedule> = {
 HYPER: {range:[28900,84900], blade:[[0,22,6,9,17,12],[0,3,7,10,14,21]], handle:[[9,18,0,6,11,38],[0,4,8,11,16,24]], metals:[[0,9,3,14,6,11],[0,3,7,11,5,16]]},
 VERTEX:{range:[34900,94900], blade:[[23,8,0,72,29,6],[12,4,10,0,28,8]], handle:[[8,0,85,4,5,36],[6,10,0,15,28,19]], metals:[[36,14,8,21,11,0],[4,9,0,13,19,24]]},
 EDGE:  {range:[24900,79900], blade:[[0,5,10,7,21,12],[0,4,9,16,11,20]], handle:[[4,0,9,12,31,20],[0,3,6,10,15,19]], metals:[[10,0,3,7,13,19],[0,3,5,8,12,16]]},
 TRIS:  {range:[39500,97800], blade:[[74,89,12,19,0,24],[4,9,15,0,20,29]], handle:[[0,13,48,29,54,23],[0,7,14,11,25,32]], metals:[[15,8,32,41,20,0],[0,5,11,17,23,14]]},
 QUAD:  {range:[44900,99890], blade:[[4,79,31,24,0,12],[0,6,12,17,25,33]], handle:[[0,13,20,8,53,28],[3,12,0,17,26,38]], metals:[[0,25,69,11,15,22],[0,5,11,18,27,34]]}
};

const prices = new Map<number, Uint32Array>();

function editionPrices(model: number) {
 const schedule = schedules[KNIVES[model]];
 const [blade, handle, details] = SURFACES.map(surface => {
  const [materials, colours] = schedule[surface];
  return materials.flatMap(material => colours.map(colour => material + colour));
 });
 const maxWeight = Math.max(...blade) + Math.max(...handle) + Math.max(...details);
 const minWeight = Math.min(...blade) + Math.min(...handle) + Math.min(...details);
 const ranks = new Uint32Array(maxWeight + 1);
 const weights = new Uint16Array(blade.length * handle.length * details.length);
 let index = 0;
 for (const b of blade) for (const h of handle) for (const d of details) {
  const weight = b + h + d;
  weights[index++] = weight;
  ranks[weight]++;
 }
 let rank = 0;
 for (let weight = minWeight; weight <= maxWeight; weight++) {
  const count = ranks[weight];
  ranks[weight] = rank;
  rank += count;
 }
 // Reserve one cent per possible configuration. Distribute the rest of the price
 // range by finish weight. Tied finishes take consecutive cents in catalogue order.
 const [low, high] = schedule.range;
 const premium = high - low - (weights.length - 1);
 const result = Uint32Array.from(weights, weight =>
  low + ranks[weight]++ + Math.round(premium * (weight - minWeight) / (maxWeight - minWeight)));
 prices.set(model, result);
 return result;
}

export function priceInCents(model: number, config: Configuration) {
 const list = prices.get(model) ?? editionPrices(model);
 const variant = (part: typeof SURFACES[number]) => config[part].style * 6 + config[part].color;
 return list[(variant('blade') * 36 + variant('handle')) * 36 + variant('metals')];
}
