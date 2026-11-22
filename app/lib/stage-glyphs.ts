// The DOM buttons and the stage renderer use the same 24-unit artwork.
export type StageGlyph='left'|'right'|'blade'|'bladeClosed'|'explode';
export const STAGE_GLYPHS:Record<StageGlyph,{fill?:string;stroke?:string}>={
 left:{fill:'M18.5.5 5.5 12l13 11.5-1.6-4.4L9 12l7.9-7.1Z'},
 right:{fill:'M5.5.5 18.5 12l-13 11.5 1.6-4.4L15 12 7.1 4.9Z'},
 blade:{
  stroke:'m3 17.1 1.9-2h15.7v3.2l-2 2H5.4L3 18Z M4.7 14.8l4.1-11 1.6 3.6-.4 3.5-2.3 4.1M13.2 5.8a9.1 9.1 0 0 1 6.1 6.3m.6-3.7-.5 3.9-3.7-.9',
  fill:'M7 17.7a.8.8 0 1 1-1.6 0 .8.8 0 1 1 1.6 0Z',
 },
 bladeClosed:{
  stroke:'m3 15.7 2-2h15.6v3.9l-2.1 2.1H5.1L3 17.6Z M7.8 13.7l7.3-2 4.4.6M18.5 9.9a8.8 8.8 0 0 0-6.6-5.5m2.2 3-2.5-3.1 3.7-1.4',
  fill:'M7.05 16.8a.85.85 0 1 1-1.7 0 .85.85 0 1 1 1.7 0Z',
 },
 explode:{stroke:'m2.5 8 9.5-4.5L21.5 8 12 12.5Z M2.5 12l9.5 4.5 9.5-4.5m-19 4 9.5 4.5 9.5-4.5'},
};
