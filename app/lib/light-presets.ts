type Vector = readonly [number, number, number];
type Softbox = {
 position: Vector;
 size: readonly [number, number];
 color: string;
 output: number;
 roll?: number;
};

type LightSetup = {
 label: string;
 description: string;
 key: {position:Vector; color:string; power:number; angle:number; softness:number};
 fill: {sky:string; ground:string; intensity:number};
 rim: {direction:Vector; color:string; intensity:number};
 environment: {background:string; yaw:number; intensity:number; blur:number; cards:readonly Softbox[]};
 ringLight: number;
};

// Key positions are stage-local. The studio cards are HDR emitters photographed from the product.
export const LIGHT_PRESETS = {
 studio: {
  label:'Studio', description:'Neutral light with balanced reflections on both sides.',
  key:{position:[-1.25,6.25,5.7],color:'#fff6ea',power:145,angle:.66,softness:.64},
  fill:{sky:'#e0e5ed',ground:'#191921',intensity:.23},
  rim:{direction:[-2,1,-3],color:'#d5e2ee',intensity:.82},
  environment:{background:'#101119',yaw:.18,intensity:1.10,blur:.045,cards:[
   {position:[-3,4.8,4.3],size:[5.4,1.8],color:'#fffefd',output:5.4},
   {position:[4,1.6,2.8],size:[1.5,4.2],color:'#fffefd',output:3.6},
   {position:[-.7,3,-3.2],size:[4.2,1.1],color:'#fffefd',output:4.2},
   {position:[0,.4,5.6],size:[5,3],color:'#fffefd',output:1.15},
  ]},ringLight:1,
 },
 softbox: {
  label:'Softbox', description:'A broad front light wraps around the surfaces.',
  key:{position:[1.5,5,7.8],color:'#f9fbff',power:62,angle:1.04,softness:1},
  fill:{sky:'#e8edf4',ground:'#8d929c',intensity:.85},
  rim:{direction:[3,2,-1],color:'#eff3ff',intensity:1.2},
  environment:{background:'#62656b',yaw:-.3,intensity:1.34,blur:.10,cards:[
   {position:[-.6,3.2,3.4],size:[10,7.5],color:'#fffdfa',output:3.5},
   {position:[3,-.25,-2],size:[3.6,6.5],color:'#dce6fa',output:1.8},
  ]},ringLight:.55,
 },
 radente: {
  label:'Raking', description:'Low side light brings out the grain of the finish.',
  key:{position:[-5.8,2.6,4.4],color:'#fff4df',power:230,angle:.51,softness:.24},
  fill:{sky:'#bac4cf',ground:'#111218',intensity:.13},
  rim:{direction:[3.3,1,-2.4],color:'#e4eeff',intensity:1.7},
  environment:{background:'#191b21',yaw:.42,intensity:1.16,blur:.012,cards:[
   {position:[-3.1,.35,2.4],size:[.72,7.8],color:'#ffefdc',output:13,roll:-.45},
   {position:[1.2,2.4,-3.8],size:[6.5,.52],color:'#f0f3ff',output:8.8},
   {position:[.5,.8,4],size:[3,2],color:'#a9bdcf',output:.65},
  ]},ringLight:.40,
 },
 controluce: {
  label:'Backlight', description:'Backlighting outlines the edges and leaves the face in shadow.',
  key:{position:[.5,3.6,-2.8],color:'#dce8f8',power:265,angle:.69,softness:.50},
  fill:{sky:'#8493a3',ground:'#10121a',intensity:.18},
  rim:{direction:[-1,2,-3],color:'#f3f5ff',intensity:6.5},
  environment:{background:'#15171c',yaw:-.15,intensity:.94,blur:.026,cards:[
   {position:[0,1.3,-3.2],size:[7.2,4.8],color:'#e9f1ff',output:6.8},
   {position:[-3.2,1,.6],size:[.9,5],color:'#f7f8ff',output:4.8},
   {position:[.7,.1,4],size:[3.2,2.2],color:'#aeb9ca',output:.54},
  ]},ringLight:.36,
 },
 ambra: {
  label:'Amber', description:'A low, warm light with neutral fill.',
  key:{position:[4.1,3.4,5.8],color:'#ffac70',power:178,angle:.78,softness:.75},
  fill:{sky:'#edcfb3',ground:'#30211f',intensity:.37},
  rim:{direction:[-3,2,-2],color:'#d5e8ff',intensity:2.4},
  environment:{background:'#30231f',yaw:-.50,intensity:1.24,blur:.052,cards:[
   {position:[3.6,2.2,2.5],size:[5.2,3.2],color:'#ffaf72',output:5.4,roll:.24},
   {position:[-2,1.4,-3],size:[1.5,4.4],color:'#e2efff',output:3.9},
   {position:[-.3,3.5,4],size:[4.5,1.2],color:'#ffe6b7',output:2.5},
  ]},ringLight:.53,
 },
 bicolore: {
  label:'Two-tone', description:'Cyan and violet light the model from opposite sides.',
  key:{position:[-4.1,3.7,5.9],color:'#8adeff',power:170,angle:.72,softness:.42},
  fill:{sky:'#b6c8ef',ground:'#241827',intensity:.30},
  rim:{direction:[3,1,-1.2],color:'#e69bff',intensity:3.9},
  environment:{background:'#191a2d',yaw:.12,intensity:1.28,blur:.033,cards:[
   {position:[-3.4,1.8,2.8],size:[2.3,5.7],color:'#82deff',output:5.8,roll:-.22},
   {position:[3.6,.7,1.9],size:[2.1,5.6],color:'#e397ff',output:5.2,roll:.23},
   {position:[0,3,-2.4],size:[3.2,1.1],color:'#e7ebff',output:2.4},
  ]},ringLight:.48,
 },
} as const satisfies Record<string,LightSetup>;

export type LightPreset = keyof typeof LIGHT_PRESETS;
export const LIGHT_ORDER = Object.keys(LIGHT_PRESETS) as LightPreset[];
export type StudioEnvironment = LightSetup['environment'];
