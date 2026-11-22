import type {ReactNode} from 'react';
import type {View} from './lib/state';
import type {LightPreset} from './lib/light-presets';

type SymbolName = View | 'loop' | LightPreset;

function Solid({d}:{d:string}) {
 return <path d={d} fill="currentColor" fillRule="evenodd" stroke="none"/>;
}

// Opposite framing corners distinguish the two component close-ups.
const macroFrame = <path d="M2.5 10V4.5l2-2H10m12 27h5.5l2-2V22"/>;

const symbols: Record<SymbolName,ReactNode> = {
 side: <>
  <path d="M2.5 11V7.5H9m20.5 13.4v3.6H23"/>
  <Solid d="M2 18.5l8.6-6h5.6l-2 5.4-4.3 1.7H2Z M18 12.6h8.5l3.5 2.6-.8 3.4-2.8 1.2-5.4-1.1-4.8.2Z M21.6 15.4a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 1 1 2.2 0Z"/>
 </>,
 top: <>
  <path d="M7.7 7.3Q16-.8 24.3 7.3 16 15.4 7.7 7.3Z"/>
  <circle cx="16" cy="7.3" r="2" fill="currentColor" stroke="none"/>
  <Solid d="m2 21.3 13.3-7.7 14.6 4.7-13.2 7.9Z"/>
  <path d="m4 25.3 12.9 4.1 11.5-6.8"/>
 </>,
 edge: <>
  <path d="M4.2 10.1a12.3 12.3 0 0 0 0 11.8m23.6-11.8a12.3 12.3 0 0 1 0 11.8M2.5 16H9m14 0h6.5"/>
  <Solid d="M14.3 3.1h3.4L19.6 13 16 29.8 12.4 13Z"/>
 </>,
 perspective: <>
  <Solid d="m3.7 10.4 9.3-5.3 9.3 5.3-9.3 5.3Z"/>
  <path d="M5.2 13.2v6.9l7.8 4.5 7.8-4.5v-6.9M13 18v6"/>
  <path d="M4.2 24.9c3.1 4.3 11.7 3.4 18 .1 4.6-2.4 6.9-6.3 6.2-10.2m-3.2 3.3 3.1-3.9 2.3 4.3"/>
 </>,
 clip: <>{macroFrame}
  <Solid d="M5.2 25.3 7.1 20l10.6-13 .7-3.1 3-1.3 3.9 1.3 1.6 3.3-1.7 3.6-2.8 1.1-9.3 12-4.8 2.6Z M23.8 6.8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 1 1 3 0Z M10 22.2l9.4-12.4 1.5 1.3L12 22.3Z"/>
 </>,
 loop: <>{macroFrame}
  <Solid d="m5 21 5.1-5.3a8.8 8.8 0 1 1 6.2 6.1l-4.8 5.1-4.5-.7Z M23.9 12.9a4.9 4.9 0 1 0-9.8 0 4.9 4.9 0 1 0 9.8 0Z"/>
 </>,
 screw: <>{macroFrame}
  <Solid d="M16 5a11 11 0 1 1 0 22 11 11 0 1 1 0-22Z M12.7 9.1l-2.8 2.8 3.7 3.8-4.1 4.1 2.8 2.8 4.1-4.1 3.7 3.8 2.8-2.8-3.7-3.8 3.5-3.5-2.8-2.8-3.5 3.5Z"/>
 </>,
 spotlight: <>
  <Solid d="m3.3 9.2 6.9-6.9 6.1 4.1 3.1-.8 1.9 1.9-10.4 10.4-1.9-1.9.9-3Z"/>
  <path d="m14 17.6 4.2 10.9 10.2-10.1-10.8-4.2M6.6 14l-2.4 2.4-1.7-1.7"/>
 </>,
 penumbra: <>
  <Solid d="M5.7 3.3h20.6l-3.6 5.2H9.4Z"/>
  <path d="m9.3 12.1-5.8 6.8M16 12v5.5m6.7-5.4 5.8 6.8"/>
  <path d="M4.1 23.3c5.9-2.7 17.9-2.7 23.8 0M6.8 27.8h3.5m3.9 0h3.6m3.9 0h3.5"/>
 </>,
 pointlight: <>
  <path d="M16 2v3.1M4.6 5.8l2.3 2.3M2 14.2h3.2m21.6 0H30M25.1 8.1l2.3-2.3"/>
  <Solid d="M16 6.8a7.6 7.6 0 0 1 5.2 13.1c-1.4 1.2-2 2.2-2.1 3.7h-6.2c-.1-1.5-.7-2.5-2.1-3.7A7.6 7.6 0 0 1 16 6.8Z M12.3 13.9l3.7 5.1 3.7-5.1-1.5-1.1-2.2 3.1-2.2-3.1Z"/>
  <path d="M12.9 26.2h6.2m-5.1 3h4"/>
 </>,
 dome: <>
  <path d="M2.8 22.6a13.2 15.7 0 0 1 26.4 0Zm6.9 0c0-6.5 2.3-12.8 6.3-15.7 4 2.9 6.3 9.2 6.3 15.7M5.6 14.9c5.8 3.1 15 3.1 20.8 0"/>
  <Solid d="M2.7 25.2h26.6l-3 3H5.7Z"/>
 </>,
 rimlight: <>
  <path d="m11.8 7.1-8 4.8v10.3l8 4.8" strokeWidth="1.5"/>
  <path d="m11.8 7.1 7.9 4.8v10.3L11.8 27" strokeWidth="3.1"/>
  <Solid d="m27.4 4.6 2.7-1.4v21.4L27.4 26Z"/>
  <path d="m24.7 8.5-2.1 1.6m2.1 5.6h-2.3m2.3 7.3-2.1-1.6"/>
 </>,
 studio: <>
  <Solid d="m2 6.6 3.4-3.7 8.1 4.7-.7 4.9-3.3 3.1-7.6-4.5Z M30 6.6l-3.4-3.7-8.1 4.7.7 4.9 3.3 3.1 7.6-4.5Z"/>
  <path d="M6.2 14.4v9.2L2.5 27m3.7-3.4L10 27m15.8-12.6v9.2l3.7 3.4m-3.7-3.4L22 27M11.5 28.5h9"/>
  <Solid d="m12.2 21.9 3.8-3.8 3.8 3.8-3.8 3.7Z"/>
 </>,
};

export default function TechnicalIcon({name}:{name:SymbolName}) {
 return <svg data-symbol={name} viewBox="0 0 32 32" width="32" height="32"
  fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={2}
  aria-hidden="true">{symbols[name]}</svg>;
}
