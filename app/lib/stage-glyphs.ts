export type StageGlyph = 'left' | 'right' | 'blade' | 'bladeClosed' | 'explode' | 'compose';

type Mark = {
 d: string;
 solid?: boolean;
 plateOffset?: number;
};

type Drawing = {
 units: number;
 weight: number;
 marks: Mark[];
};

function stack(expanded: boolean): Drawing {
 return {units:32, weight:1.7, marks:[
  {d:'m3 17 10 5 10-5', plateOffset:expanded ? 5 : 0},
  {d:'m3 14 10 5 10-5', plateOffset:expanded ? 1 : 0},
  {d:'m3 11 10-5 10 5-10 5Z', plateOffset:expanded ? -3 : 0},
  {d:expanded
   ? 'M28 5v7m-2.6-2.6L28 12l2.6-2.6M28 27v-7m-2.6 2.6L28 20l2.6 2.6'
   : 'M28 13V6m-2.6 2.6L28 6l2.6 2.6M28 19v7m-2.6-2.6L28 26l2.6-2.6'},
 ]};
}

// Both the in-scene marks and the interactive SVGs use these outlines.
export const STAGE_GLYPHS: Record<StageGlyph, Drawing> = {
 left:{units:24,weight:1.55,marks:[{solid:true,d:'M18.5.5 5.5 12l13 11.5-1.6-4.4L9 12l7.9-7.1Z'}]},
 right:{units:24,weight:1.55,marks:[{solid:true,d:'M5.5.5 18.5 12l-13 11.5 1.6-4.4L15 12 7.1 4.9Z'}]},
 blade:{units:24,weight:1.55,marks:[
  {d:'m3 17.1 1.9-2h15.7v3.2l-2 2H5.4L3 18Z M4.7 14.8l4.1-11 1.6 3.6-.4 3.5-2.3 4.1M13.2 5.8a9.1 9.1 0 0 1 6.1 6.3m.6-3.7-.5 3.9-3.7-.9'},
  {solid:true,d:'M7 17.7a.8.8 0 1 1-1.6 0 .8.8 0 1 1 1.6 0Z'},
 ]},
 bladeClosed:{units:24,weight:1.55,marks:[
  {d:'m3 15.7 2-2h15.6v3.9l-2.1 2.1H5.1L3 17.6Z M7.8 13.7l7.3-2 4.4.6M18.5 9.9a8.8 8.8 0 0 0-6.6-5.5m2.2 3-2.5-3.1 3.7-1.4'},
  {solid:true,d:'M7.05 16.8a.85.85 0 1 1-1.7 0 .85.85 0 1 1 1.7 0Z'},
 ]},
 explode:stack(false),
 compose:stack(true),
};
