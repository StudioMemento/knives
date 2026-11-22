import type {WebGLRenderer} from 'three';

/** Leave a transparent window for the native SVG controls in the scene's floor
 * pass. The small canvas below them keeps the original floor and reflections.
 * The active product is drawn once, over the window, at its normal depth. */
export function createStageControls(nav: HTMLElement, floor: HTMLCanvasElement, input: HTMLElement, renderer: WebGLRenderer) {
 const rail = nav.parentElement!;
 let ctx = floor.getContext('2d');
 const source = renderer.domElement;
 const hover = matchMedia('(any-hover:hover) and (any-pointer:fine)');
 let band: DOMRect, x = 0, y = 0, width = 0, height = 0;
 let pointerX = NaN, pointerY = NaN, pressed: number | null = null;
 let usingTouch = false, initiallyHovered = hover.matches && nav.matches(':hover');

 function resize(view: DOMRect) {
  band = nav.getBoundingClientRect();
  const sx = source.width / view.width, sy = source.height / view.height;
  x = Math.max(0, Math.floor((band.left - view.left) * sx));
  y = Math.max(0, Math.floor((band.top - view.top) * sy));
  width = Math.min(source.width, Math.ceil((band.right - view.left) * sx)) - x;
  height = Math.min(source.height, Math.ceil((band.bottom - view.top) * sy)) - y;
  if (width <= 0 || height <= 0) return;
  if (floor.width !== width) floor.width = width;
  if (floor.height !== height) floor.height = height;
  floor.style.left = `${x / sx}px`;
  floor.style.top = `${y / sy}px`;
  floor.style.width = `${width / sx}px`;
  floor.style.height = `${height / sy}px`;
 }
 function track(e: PointerEvent) {
  initiallyHovered = false;
  usingTouch = e.pointerType === 'touch';
  pointerX = usingTouch ? NaN : e.clientX;
  pointerY = e.clientY;
 }
 function reset() { pointerX = NaN; initiallyHovered = false; pressed = null; }
 function leave(e: PointerEvent) { if (!e.relatedTarget) reset(); }
 function down(e: PointerEvent) { if (e.isPrimary && e.button === 0) pressed = e.pointerId; }
 function up(e: PointerEvent) { if (pressed === e.pointerId) pressed = null; }
 window.addEventListener('pointerover', track, true);
 window.addEventListener('pointermove', track, true);
 window.addEventListener('pointerout', leave, true);
 window.addEventListener('pointerup', up, true);
 window.addEventListener('pointercancel', up, true);
 window.addEventListener('blur', reset);
 nav.addEventListener('pointerdown', down);

 function raise() {
  rail.removeAttribute('data-behind-model');
  floor.hidden = true;
 }
 function beforeProduct() {
  const over = pointerX >= band.left && pointerX <= band.right && pointerY >= band.top && pointerY <= band.bottom;
  if (!ctx || !hover.matches || usingTouch || width <= 0 || height <= 0 || over || initiallyHovered || pressed !== null ||
      nav.querySelector(':focus-visible') || input.matches(':focus-visible')) {
   raise();
   return;
  }
  // Copy only the floor under the controls. Both rectangles are expressed in
  // drawing-buffer pixels so fractional DPR and resizing cannot shift the seam.
  try {
   ctx.globalCompositeOperation = 'copy';
   ctx.drawImage(source, x, y, width, height, 0, 0, width, height);
  } catch {
   ctx = null;
   raise();
   return;
  }
  const dpr = renderer.getPixelRatio();
  renderer.setScissor(x / dpr, (source.height - y - height) / dpr, width / dpr, height / dpr);
  renderer.setScissorTest(true);
  renderer.clearColor();
  renderer.setScissorTest(false);
  floor.hidden = false;
  rail.toggleAttribute('data-behind-model', true);
 }
 function dispose() {
  raise();
  window.removeEventListener('pointerover', track, true);
  window.removeEventListener('pointermove', track, true);
  window.removeEventListener('pointerout', leave, true);
  window.removeEventListener('pointerup', up, true);
  window.removeEventListener('pointercancel', up, true);
  window.removeEventListener('blur', reset);
  nav.removeEventListener('pointerdown', down);
 }
 return {resize, beforeProduct, raise, dispose};
}
