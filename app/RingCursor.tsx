'use client';
import {useEffect, useRef} from 'react';

export default function RingCursor() {
 const ref = useRef<HTMLSpanElement>(null);
 const trailRef = useRef<HTMLSpanElement>(null);
 useEffect(() => {
  const pointer = ref.current!, trail = trailRef.current!, host = pointer.parentElement!;
  const fine = matchMedia('(any-hover:hover) and (any-pointer:fine) and (forced-colors:none)');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let visible = false, frame = 0, last = 0;
  let x = 0, y = 0, followingX = 0, followingY = 0;

  function stopTrail() {
   cancelAnimationFrame(frame);
   frame = 0;
   trail.style.opacity = '0';
   followingX = x; followingY = y;
  }
  function fade(now: number) {
   const dt = Math.max(0, now - last);
   last = now;
   const decay = Math.exp(-dt / 42);
   followingX = x + (followingX - x) * decay;
   followingY = y + (followingY - y) * decay;
   const dx = followingX - x, dy = followingY - y;
   const length = Math.min(20, Math.hypot(dx, dy));
   if (length < .5) { stopTrail(); return; }
   trail.style.transform = `rotate(${Math.atan2(dy, dx)}rad) scaleX(${length / 20})`;
   trail.style.opacity = String(.44 * Math.min(length / 11, 1));
   frame = requestAnimationFrame(fade);
  }
  function hide() {
   if (!visible) return;
   visible = false;
   host.removeAttribute('data-custom-pointer');
   stopTrail();
  }
  function move(event: PointerEvent) {
   if (event.pointerType !== 'mouse' || !fine.matches) { hide(); return; }
   const moved = x !== event.clientX || y !== event.clientY;
   x = event.clientX; y = event.clientY;
   // The white tip follows the device directly. Only the coloured wake eases.
   pointer.style.transform = `translate3d(${x}px,${y}px,0)`;
   if (!visible) {
    visible = true; followingX = x; followingY = y;
    host.setAttribute('data-custom-pointer','');
   } else if (moved && !frame && !reduced.matches) {
    last = performance.now();
    fade(last);
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
  reduced.addEventListener('change', stopTrail);
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
   reduced.removeEventListener('change', stopTrail);
  };
 }, []);
 return <span ref={ref} className="ring-cursor" aria-hidden="true"><span ref={trailRef} className="cursor-trail"/></span>;
}
