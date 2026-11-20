export const STAGE_COLORS = {HYPER:'#83baff', VERTEX:'#9be753', EDGE:'#4bd7be', TRIS:'#c397ff', QUAD:'#ffbd78'} as const;

export const LIGHTS = [
 {id:'atelier', name:'Atelier', detail:'Softbox neutro, riflessi lunghi', key:'#ffedda', rim:'#c1d9ff', position:[-3,5,5], reverse:[4,2,-3], power:106, edge:1.55, fill:.42, env:1.15, rotation:.20, fog:.80},
 {id:'glacier', name:'Ghiaccio', detail:'Luce fredda laterale, bordo azzurro', key:'#c8e7ff', rim:'#72a9ff', position:[4,3,3], reverse:[-4,2,-2], power:126, edge:2.55, fill:.32, env:1.08, rotation:1.32, fog:.96},
 {id:'amber', name:'Ambra', detail:'Luce radente calda, rimbalzo rame', key:'#ffd4a2', rim:'#ff9461', position:[-4,1.8,4], reverse:[3,3,-4], power:123, edge:2.0, fill:.30, env:1.08, rotation:-.74, fog:.95},
 {id:'noir', name:'Noir', detail:'Controluce bianco, ombre profonde', key:'#c9d2dc', rim:'#ffffff', position:[-1,4,-3], reverse:[4,1,1], power:174, edge:2.75, fill:.18, env:.78, rotation:2.55, fog:.68},
 {id:'prism', name:'Prisma', detail:'Ciano e magenta sui lati opposti', key:'#94f6ec', rim:'#ef91ee', position:[-4,1.5,4], reverse:[4,1,0], power:137, edge:2.70, fill:.32, env:1.00, rotation:-1.67, fog:1.00},
 {id:'silk', name:'Seta', detail:'Luce diffusa alta, mezzitoni perlati', key:'#fff5ed', rim:'#e4d7ff', position:[0,6,2], reverse:[-3,3,2], power:93, edge:1.16, fill:.75, env:1.43, rotation:.82, fog:.80}
] as const;
