// SVG ink stays in the same buttons. Only their stacking order changes.
export function createStageControls(nav: HTMLElement) {
 const rail = nav.parentElement!;
 const fine = matchMedia('(any-hover:hover) and (any-pointer:fine) and (forced-colors:none)');
 let band: DOMRect, x = NaN, y = NaN, touch = false;
 let held: number | null = null, layered = false;
 let startingOver = nav.matches(':hover');

 function update() {
  const over = band && x >= band.left && x <= band.right && y >= band.top && y <= band.bottom;
  rail.toggleAttribute('data-behind-model', Boolean(layered && fine.matches && !touch && !over && !startingOver && held === null));
 }
 function resize() { band = nav.getBoundingClientRect(); update(); }
 function setLayered(value: boolean) {
  if (layered === value) return;
  layered = value;
  update();
 }
 function track(event: PointerEvent) {
  startingOver = false;
  touch = event.pointerType !== 'mouse';
  x = event.clientX; y = event.clientY;
  update();
 }
 function down(event: PointerEvent) {
  if (event.isPrimary && event.button === 0) held = event.pointerId;
  track(event);
 }
 function up(event: PointerEvent) {
  if (held === event.pointerId) held = null;
  track(event);
 }
 function reset() { startingOver = false; held = null; x = NaN; update(); }
 function leave(event: PointerEvent) { if (!event.relatedTarget) reset(); }

 window.addEventListener('pointerover', track, true);
 window.addEventListener('pointermove', track, true);
 window.addEventListener('pointerout', leave, true);
 window.addEventListener('pointerup', up, true);
 window.addEventListener('pointercancel', reset, true);
 window.addEventListener('blur', reset);
 nav.addEventListener('pointerdown', down);
 fine.addEventListener('change', update);
 function dispose() {
  setLayered(false);
  window.removeEventListener('pointerover', track, true);
  window.removeEventListener('pointermove', track, true);
  window.removeEventListener('pointerout', leave, true);
  window.removeEventListener('pointerup', up, true);
  window.removeEventListener('pointercancel', reset, true);
  window.removeEventListener('blur', reset);
  nav.removeEventListener('pointerdown', down);
  fine.removeEventListener('change', update);
 }
 return {resize, setLayered, dispose};
}
