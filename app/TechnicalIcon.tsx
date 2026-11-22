import type {ReactNode} from 'react';
import type {View} from './lib/state';
import type {LightPreset} from './lib/light-presets';

type SymbolName = View | 'loop' | LightPreset;

// Draw the faces as solids and reserve a full stroke of negative space between
// planes. Small viewports retain the same silhouettes at the 25 px HUD size.
const symbols: Record<SymbolName,ReactNode> = {
 side: <>
  <path d="M3 13h20v7l-4 4H3z" fill="currentColor" stroke="none"/>
  <path d="m5 10 4-4h19v12l-3 3"/>
  <path d="M20 6h8v8" strokeWidth="2.5"/>
 </>,
 top: <>
  <path d="m2 15 13-10 15 6-14 10z" fill="currentColor" stroke="none"/>
  <path d="m4 20 12 5 12-9"/>
 </>,
 edge: <>
  <path d="m16 2 3 6v16l-3 6-3-6V8z" fill="currentColor" stroke="none"/>
  <path d="M2 16h8l-4-4m4 4-4 4m24-4h-8l4-4m-4 4 4 4"/>
 </>,
 perspective: <>
  <path d="m3 9 13-6 13 6-13 7z" fill="currentColor" stroke="none"/>
  <path d="M4 13v9l12 7 12-7v-9m-12 5v10"/>
 </>,
 clip: <>
  <path d="m7 20 12-14h7v7L14 27H7l-4-4v-6L15 4"/>
  <path d="m10 22 12-14v4L12 24z" fill="currentColor" stroke="none"/>
 </>,
 loop: <path d="M3 17 16 4h9l5 8-14 15H8z M9 17l3 4h3l9-10-2-2h-4z" fill="currentColor" fillRule="evenodd" stroke="none"/>,
 screw: <>
  <path d="M10 3h12l7 7v12l-7 7H10l-7-7V10z"/>
  <path d="M12 7h8l5 5v8l-5 5h-8l-5-5v-8z M9 20l3 3L23 12l-3-3z" fill="currentColor" fillRule="evenodd" stroke="none"/>
 </>,
 spotlight: <>
  <path d="M9 3h14l-2 7H11z" fill="currentColor" stroke="none"/>
  <path d="m11 14-7 12h24l-7-12"/>
  <path d="M16 14v4"/>
 </>,
 penumbra: <>
  <path d="m4 11 8-7h4v24h-4l-8-7z M19 4l3 2v20l-3 2z M25 8l3 4v8l-3 4z" fill="currentColor" stroke="none"/>
 </>,
 pointlight: <>
  <path d="m16 10 6 6-6 6-6-6z M16 2l1.5 5h-3z M30 16l-5 1.5v-3z M16 30l-1.5-5h3z M2 16l5-1.5v3z" fill="currentColor" stroke="none"/>
  <path d="m6 6 3.5 3.5m13 13L26 26M6 26l3.5-3.5m13-13L26 6"/>
 </>,
 dome: <>
  <path d="m3 21 3-8 7-6h6l7 6 3 8z"/>
  <path d="m8 18 2-4 5-4m-10 15h22l-3 3H8z"/>
 </>,
 rimlight: <>
  <path d="m17 3-6 6-3 8 3 7 7 5-9-2-6-8 1-8 7-7z" fill="currentColor" stroke="none"/>
  <path d="m21 5 6 6 2 5m-1 4-3 5-5 3"/>
 </>,
 studio: <>
  <path d="M10 3h14l4 4-2 10-5 4H7l-3-4L6 7z M11 7l-2 3-1 5 4-5h9l2-3z" fill="currentColor" fillRule="evenodd" stroke="none"/>
  <path d="M16 22v3m-9 4 9-4 9 4"/>
 </>,
};

export default function TechnicalIcon({name}:{name:SymbolName}) {
 return <svg data-symbol={name} viewBox="0 0 32 32" width="32" height="32" fill="none"
  stroke="currentColor" strokeWidth="1.8" strokeLinecap="butt" strokeLinejoin="miter" aria-hidden="true">{symbols[name]}</svg>;
}
