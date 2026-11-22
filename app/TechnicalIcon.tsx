import type {ReactNode} from 'react';
import type {View} from './lib/state';
import type {LightPreset} from './lib/light-presets';

type SymbolName=View|'loop'|LightPreset;

const symbols:Record<SymbolName,ReactNode>={
 side:<>
  <path d="M3.5 13.5h20v10h-20Z" fill="currentColor" stroke="none"/>
  <path d="m5.2 10.1 3.1-2.6h20v10.8l-2.1 2.4"/>
 </>,
 top:<>
  <path d="m3.3 14.2 12.6-8.6 12.9 6.3-12.5 8.8Z" fill="currentColor" stroke="none"/>
  <path d="m4 18.6 12.4 6.1 11.6-8.1"/>
 </>,
 edge:<>
  <path d="m16 3 3.1 5v16L16 29l-3.1-5V8Z" fill="currentColor" stroke="none"/>
  <path d="M3.5 16h6.2m-2.9-3 3 3-3 3m21.7-3h-6.2m2.9-3-3 3 3 3"/>
 </>,
 perspective:<>
  <path d="m16 3.7 11 6.2v12.3l-11 6.2-11-6.2V9.9Z"/>
  <path d="m16 16.2 11-6.3v12.3l-11 6.2Z" fill="currentColor" stroke="none"/>
  <path d="m5 9.9 11 6.3 11-6.3M16 16.2v12.2"/>
 </>,
 clip:<>
  <path d="m7.1 22.2 12.6-14a4.2 4.2 0 0 1 6.2 5.6L14.2 26.7a6.1 6.1 0 0 1-9-8.2l12-13.2" strokeWidth="2.6"/>
  <path d="m11.3 22 10.5-11.6"/>
 </>,
 loop:<path d="m3.2 17 13.6-12 8.3 1 3.6 9.6-14 11.5-8-1.6Z M9.3 18.1l1.2 3.5 3.3.8 9.2-8-1.5-3.9-3-.3Z" fill="currentColor" fillRule="evenodd" stroke="none"/>,
 screw:<>
  <path d="m10.7 4.5 10.6 0 6.2 6.2v10.6l-6.2 6.2H10.7l-6.2-6.2V10.7Z"/>
  <path d="M16 7.8a8.2 8.2 0 1 0 0 16.4 8.2 8.2 0 1 0 0-16.4Z M10.5 19.2l8.7-8.7 2.3 2.3-8.7 8.7Z" fill="currentColor" fillRule="evenodd" stroke="none"/>
 </>,
 spotlight:<>
  <path d="M9 4.3h14l-2.5 7.4h-9Z" fill="currentColor" stroke="none"/>
  <path d="m11.6 15.1-6.8 10.6h22.4l-6.8-10.6"/>
 </>,
 penumbra:<path d="M14.4 3.9a12.2 12.2 0 0 0 0 24.2Z M17.4 3.9a12.2 12.2 0 0 1 3.2.9v22.4a12.2 12.2 0 0 1-3.2.9Z M23.4 6.3a12.2 12.2 0 0 1 2.1 2v15.4a12.2 12.2 0 0 1-2.1 2Z M28 11.7a12.8 12.8 0 0 1 0 8.6Z" fill="currentColor" stroke="none"/>,
 pointlight:<>
  <path d="m16 10.5 5.5 5.5-5.5 5.5-5.5-5.5Z" fill="currentColor" stroke="none"/>
  <path d="M16 3.4v4m0 17.2v4M3.4 16h4m17.2 0h4M7.1 7.1l2.8 2.8m12.2 12.2 2.8 2.8M7.1 24.9l2.8-2.8m12.2-12.2 2.8-2.8"/>
 </>,
 dome:<>
  <path d="M3.8 21.3a12.2 12.2 0 0 1 24.4 0Z"/>
  <path d="M6 24.1H26l-2.5 3H8.5Z" fill="currentColor" stroke="none"/>
  <path d="M8.6 17.3a9.1 9.1 0 0 1 4.8-4.8"/>
 </>,
 rimlight:<>
  <path d="M8.3 23.8a10.5 10.5 0 0 1 8.5-17.5c-5.3 2.4-7.9 8.8-5.4 14.4 1.4 3.3 4.1 5.4 7.3 6.5a11 11 0 0 1-10.4-3.4Z" fill="currentColor" stroke="none"/>
  <path d="M20.2 5.3a11.5 11.5 0 0 1 6.3 8.3m.1 4a11.5 11.5 0 0 1-4.9 7.5"/>
 </>,
 studio:<>
  <path d="M11 3.8h10l4.4 4.6v6.8l-4.4 4.6H11l-4.4-4.6V8.4Z M12.7 7.2l-2.8 2.9v3.4l1.5 1.6V11l2.4-2.4h5.1l-1.5-1.4Z" fill="currentColor" fillRule="evenodd" stroke="none"/>
  <path d="M16 20v4.4m-7.5 3.4 7.5-3.4 7.5 3.4"/>
 </>,
};

export default function TechnicalIcon({name}:{name:SymbolName}){
 return <svg data-symbol={name} viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor"
  strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">{symbols[name]}</svg>;
}
