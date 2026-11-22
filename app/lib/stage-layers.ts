import {WebGLRenderer} from 'three';

type Surface = HTMLCanvasElement | OffscreenCanvas;
const finePointer = '(any-hover:hover) and (any-pointer:fine)';

function makeRenderer(canvas: Surface) {
 return new WebGLRenderer({canvas, antialias:true, alpha:true, powerPreference:'high-performance'});
}

// Use one WebGL context for the scene. The browser composites its two transparent
// images around the actual HTML buttons, with the SVGs at display resolution.
export function createStageLayers(front: HTMLCanvasElement, back: HTMLCanvasElement) {
 const fine = matchMedia(finePointer);
 let buffer: OffscreenCanvas | undefined;
 let offscreenRenderer: WebGLRenderer | undefined;
 if (fine.matches && typeof OffscreenCanvas !== 'undefined' &&
     typeof OffscreenCanvas.prototype.transferToImageBitmap === 'function' &&
     typeof ImageBitmapRenderingContext !== 'undefined') {
  try {
   buffer = new OffscreenCanvas(1, 1);
   offscreenRenderer = makeRenderer(buffer);
  } catch {
   buffer = undefined;
  }
 }
 const renderer = offscreenRenderer ?? makeRenderer(front);
 const source = buffer ?? front;
 // A direct WebGL canvas also supports the two planes on browsers without
 // transferable GPU images. A touch-only device presents the scene in one pass.
 const frontBitmap = buffer ? front.getContext('bitmaprenderer') : null;
 const front2D = buffer && !frontBitmap ? front.getContext('2d') : null;
 if (buffer && !frontBitmap && !front2D) {
  renderer.dispose();
  throw new Error('The active model canvas could not be initialized.');
 }
 const backBitmap = buffer ? back.getContext('bitmaprenderer') : null;
 let back2D: CanvasRenderingContext2D | null | undefined;
 let split = false;
 back.hidden = true;

 function resize() {
  for (const canvas of [front, back]) {
   if (canvas.width !== source.width) canvas.width = source.width;
   if (canvas.height !== source.height) canvas.height = source.height;
  }
 }
 function beforeProduct() {
  if (fine.matches && !backBitmap && back2D === undefined) back2D = back.getContext('2d');
  const needsBackdrop = fine.matches && Boolean(backBitmap || back2D);
  if (needsBackdrop !== split) {
   split = needsBackdrop;
   back.hidden = !split;
  }
  if (!split) return;
  if (buffer && backBitmap) backBitmap.transferFromImageBitmap(buffer.transferToImageBitmap());
  else if (back2D) {
   back2D.globalCompositeOperation = 'copy';
   back2D.drawImage(source, 0, 0);
  }
  renderer.clear(true, true, false);
 }
 function present() {
  if (buffer && frontBitmap) frontBitmap.transferFromImageBitmap(buffer.transferToImageBitmap());
  else if (buffer && front2D) {
   front2D.globalCompositeOperation = 'copy';
   front2D.drawImage(buffer, 0, 0);
  }
 }
 return {renderer, source, resize, beforeProduct, present, get split() { return split; }};
}
