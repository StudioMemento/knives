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
 point?: {position:Vector; color:string; intensity:number};
 fill: {sky:string; ground:string; intensity:number};
 rim: {direction:Vector; color:string; intensity:number};
 environment: {background:string; yaw:number; intensity:number; blur:number; cards:readonly Softbox[]; dome?:{sky:string; horizon:string; ground:string}};
 ringLight: number;
};

// Key positions are stage-local. The studio cards are HDR emitters photographed from the product.
export const LIGHT_PRESETS = {
 studio: {
  label:'Studio light', description:'Neutral light with balanced reflections on both sides.',
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
 spotlight: {
  label:'Spotlight', description:'A narrow, hard-edged beam from the upper left.',
  key:{position:[-2.7,5.1,6.6],color:'#fff4e1',power:235,angle:.39,softness:.12},
  fill:{sky:'#c8ced9',ground:'#101117',intensity:.14},
  rim:{direction:[2,1,-2],color:'#dce4ef',intensity:.45},
  environment:{background:'#101115',yaw:.24,intensity:.91,blur:.015,cards:[
   {position:[-2.2,3.8,3.4],size:[1.65,1.55],color:'#fff1d9',output:11},
   {position:[3.5,.9,-1.8],size:[.6,4.6],color:'#dbe3f1',output:2.8},
  ]},ringLight:.47,
 },
 penumbra: {
  label:'Penumbra', description:'A wide, feathered beam makes highlights fade gently across the finish.',
  key:{position:[-3.1,4.2,6.9],color:'#fff7ed',power:116,angle:.91,softness:1},
  fill:{sky:'#e8edf5',ground:'#686370',intensity:.60},
  rim:{direction:[3,2,-1],color:'#e4e6f4',intensity:.65},
  environment:{background:'#373740',yaw:-.32,intensity:1.04,blur:.24,cards:[
   {position:[-2.8,3,3.1],size:[8,5.5],color:'#fff4e6',output:4.7},
   {position:[2.8,-.4,-2.1],size:[4.8,5.2],color:'#c7cfe0',output:1.5},
  ]},ringLight:.5,
 },
 pointlight: {
  label:'Point light', description:'A small omnidirectional source creates a bright local highlight with rapid falloff.',
  key:{position:[0,1.8,5],color:'#ffffff',power:0,angle:.66,softness:0},
  point:{position:[1.9,2.4,6.3],color:'#ffddbb',intensity:73},
  fill:{sky:'#d9d4db',ground:'#282027',intensity:.29},
  rim:{direction:[-2,1,-1.8],color:'#e1e6f3',intensity:.55},
  environment:{background:'#262127',yaw:-.12,intensity:1.04,blur:.021,cards:[
   {position:[2.2,2.7,3.5],size:[.88,.88],color:'#ffdebb',output:19},
   {position:[-2.2,1.2,-2.5],size:[2.2,1.7],color:'#c5ceda',output:1.35},
  ]},ringLight:.42,
 },
 dome: {
  label:'Dome', description:'Diffuse sky and ground illumination wrap around the entire model.',
  key:{position:[0,6,3],color:'#ffffff',power:0,angle:1.1,softness:1},
  fill:{sky:'#eff6ff',ground:'#887c76',intensity:2.2},
  rim:{direction:[0,1,-2],color:'#edf3fb',intensity:0},
  environment:{background:'#676871',yaw:0,intensity:.96,blur:.10,
   dome:{sky:'#f4f8ff',horizon:'#bfc8d5',ground:'#494349'},cards:[
   {position:[-.5,5.1,1.8],size:[9.6,5.8],color:'#f4f7ff',output:2.6},
  ]},ringLight:.32,
 },
 rimlight: {
  label:'Rim light', description:'Two rear strips outline the silhouette against a low front fill.',
  key:{position:[.5,3.9,-2.8],color:'#d6e5fa',power:165,angle:.7,softness:.45},
  fill:{sky:'#a5b1c2',ground:'#171921',intensity:.22},
  rim:{direction:[-1.6,1.5,-3],color:'#e4f2ff',intensity:6.4},
  environment:{background:'#171921',yaw:-.14,intensity:1.09,blur:.03,cards:[
   {position:[-3.2,1.8,-2.8],size:[.8,7.3],color:'#e5f1ff',output:10},
   {position:[3.3,1,-2.4],size:[.62,5.3],color:'#cbdfff',output:7.8},
   {position:[-.4,.3,4],size:[4,2.4],color:'#a9b5c3',output:.82},
  ]},ringLight:.4,
 },
} as const satisfies Record<string,LightSetup>;

export type LightPreset = keyof typeof LIGHT_PRESETS;
export const LIGHT_ORDER = ['spotlight','penumbra','pointlight','dome','rimlight','studio'] as const satisfies readonly LightPreset[];
export type StudioEnvironment = LightSetup['environment'];
