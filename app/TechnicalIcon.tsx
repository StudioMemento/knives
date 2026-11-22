import type {ReactNode} from 'react';
import type {View} from './lib/state';
import type {LightPreset} from './lib/light-presets';

type SymbolName = View | 'loop' | LightPreset;

function Solid({d}:{d:string}) {
 return <path d={d} fill="currentColor" fillRule="evenodd" stroke="none"/>;
}

// The tip, the stepped joint and the chamfered handle identify the same
// object in the side elevation and the three-quarter drawing.
function KnifeProfile() {
 return <>
  <Solid d="M1.1 19.4c3.5-3.8 7.7-7.9 12.2-9.4h3.1l-2.9 7.5-5 2Z"/>
  <Solid d="M17.9 11.5h8.4l3.8 1.9 1 2.8-2.8 3.7-3.3.8-6.6-1.5-3.4.4Z M21.5 15.2a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 1 1 2.8 0Z"/>
 </>;
}
const detailHandle='M2.5 20.4 7.9 12l14.4-6.4 5.9 1.9 1.5 4.6-3.6 6.3-15.5 7.1-5.7-.5Z';

const symbols: Record<SymbolName,ReactNode> = {
 side:<g transform="translate(0 -2.4) scale(1 1.15)"><KnifeProfile/></g>,
 top:<g transform="rotate(-69 16 16)">
  <Solid d="m1 16 7.6-2.9 7.6-1-2.6 3.1-9.4.9 9.1.8 2.9 2.9-7.8-1Z"/>
  <Solid d="m17.5 11.8 9.3-.7 3.8 2.3.5 4.6-3.8 2.8-10.2-.8-1.7-1.5 2.2-2.5-2.2-2.3Z M18.8 15v2h8.3l1-1-1-1Z"/>
 </g>,
 edge:<>
  <Solid d="M11.5 3.6h9.1l4.1 4.9-.6 14.8-3.6 4.8h-9.2l-3.6-4.8-.6-14.8Z M12.7 7.3l-2 2.3.3 12.3 1.9 2.5h6.2l1.9-2.5.3-12.3-2-2.3Z"/>
  <Solid d="M15.2 7.1H17l1.4 6.1-2.3 10.1-2.2-10.1Z"/>
 </>,
 perspective:<g transform="rotate(-24 16 16)">
  <Solid d="m1.3 18.2 6.8-8.7 5.6-3.2 2.1 2-4.3 1.6-4 2.7Z M16.8 9.6l3.8-3 7.4.3 3.2 2.5-3.6 1-2.2-.8Z"/>
  <KnifeProfile/>
 </g>,
 clip:<>
  <path d={detailHandle} strokeWidth="1.65"/>
  <Solid d="m6.8 21.3 1.1-3.7 13.6-6.4.4-2.1 2.1-1.2 2.1.8.5 2.2-2.1 2-2.1-.1L10 19.5l-.4 2Z"/>
 </>,
 loop:<>
  <Solid d={detailHandle+' M26 11.9a3.1 3.1 0 1 1-6.2 0 3.1 3.1 0 1 1 6.2 0Z M6 21.2l8.4-4.6 1 1.8-8.3 4.1Z'}/>
 </>,
 screw:<>
  <path d="m2 25.6 3 .3 18.5-7.2 5.3-6.3-.9-5.3-4.1-2.9-7.3 1.6L3 15" strokeWidth="1.7"/>
  <Solid d="m10.5 10.2 3.7-3.1 5.8-.3 3.5 3.5.2 4.9-3.8 3.3-5.2.5-4-3.1Z M13.7 14.8l1.7 1.9 5.2-5.3-1.7-1.8Z"/>
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
