'use client';
import {useEffect, useRef} from 'react';

export default function RingCursor() {
 const ref = useRef<HTMLSpanElement>(null);
 useEffect(() => {
  const pointer = ref.current!;
  const host = pointer.parentElement!;
  const fine = matchMedia('(any-hover:hover) and (any-pointer:fine) and (forced-colors:none)');
  let visible = false;
  function hide() {
   if (!visible) return;
   visible = false;
   host.removeAttribute('data-custom-pointer');
  }
  function move(event: PointerEvent) {
   if (event.pointerType !== 'mouse' || !fine.matches) { hide(); return; }
   // The top-left vertex is the hotspot. Position updates bypass React and the scene loop.
   pointer.style.transform = `translate3d(${event.clientX}px,${event.clientY}px,0)`;
   if (!visible) {
    visible = true;
    host.setAttribute('data-custom-pointer','');
   }
  }
  host.addEventListener('pointerover', move, {passive:true});
  host.addEventListener('pointermove', move, {passive:true});
  host.addEventListener('pointerdown', move, {passive:true});
  host.addEventListener('pointerleave', hide);
  host.addEventListener('pointercancel', hide);
  window.addEventListener('blur', hide);
  document.addEventListener('visibilitychange', hide);
  fine.addEventListener('change', hide);
  return () => {
   hide();
   host.removeEventListener('pointerover', move);
   host.removeEventListener('pointermove', move);
   host.removeEventListener('pointerdown', move);
   host.removeEventListener('pointerleave', hide);
   host.removeEventListener('pointercancel', hide);
   window.removeEventListener('blur', hide);
   document.removeEventListener('visibilitychange', hide);
   fine.removeEventListener('change', hide);
  };
 }, []);
 return <span ref={ref} className="ring-cursor" aria-hidden="true"/>;
}
