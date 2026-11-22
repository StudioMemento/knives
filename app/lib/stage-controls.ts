import {Camera, CanvasTexture, LinearFilter, Mesh, PlaneGeometry, Scene,
 ShaderMaterial, Vector2, Vector3, type WebGLRenderer} from 'three';
import {STAGE_GLYPHS, type StageGlyph} from './stage-glyphs';

/** At rest, paint the four marks after the floor and before the product. The
 * mask contains only glyph coverage. Empty pixels never touch the framebuffer. */
export function createStageControls(nav: HTMLElement, input: HTMLElement, renderer: WebGLRenderer) {
 const rail = nav.parentElement!;
 const hover = matchMedia('(any-hover:hover) and (any-pointer:fine) and (forced-colors:none)');
 const mask = document.createElement('canvas');
 // Keep the GPU allocation fixed across viewport and device-pixel-ratio changes.
 mask.width = 768;
 mask.height = 128;
 const ctx = mask.getContext('2d');
 const texture = new CanvasTexture(mask);
 texture.generateMipmaps = false;
 texture.minFilter = texture.magFilter = LinearFilter;
 const material = new ShaderMaterial({
  transparent:true, depthTest:false, depthWrite:false, toneMapped:false,
  uniforms:{art:{value:texture}, center:{value:new Vector2()}, extent:{value:new Vector2()}, ring:{value:new Vector3()}},
  vertexShader:`
   uniform vec2 center, extent;
   varying vec2 tex;
   void main() {
    tex = uv;
    gl_Position = vec4(center + position.xy * extent, 0., 1.);
   }`,
  fragmentShader:`
   uniform sampler2D art;
   uniform vec3 ring;
   varying vec2 tex;
   void main() {
    vec4 mark = texture2D(art, tex);
    if (mark.a == 0.) discard;
    // Encoded sRGB matches the two CSS accents, including their transition.
    gl_FragColor = vec4(mix(vec3(1.), ring, mix(.68, 1., mark.r)), mark.a);
   }`,
 });
 const scene = new Scene(), camera = new Camera();
 const quad = new Mesh(new PlaneGeometry(2, 2), material);
 quad.frustumCulled = false;
 scene.add(quad);

 let band: DOMRect, dirty = true;
 let pointerX = NaN, pointerY = NaN, pressed: number | null = null;
 let usingTouch = false, initiallyHovered = hover.matches && nav.matches(':hover');

 function resize(view: DOMRect) {
  band = nav.getBoundingClientRect();
  const extent = material.uniforms.extent.value;
  extent.set(band.width / view.width, band.height / view.height);
  material.uniforms.center.value.set(
   2 * (band.left - view.left) / view.width + extent.x - 1,
   1 - 2 * (band.top - view.top) / view.height - extent.y,
  );
  dirty = true;
 }

 // The white marks follow the ring. Black marks use its lighter text tint.
 // Rebuild this small texture only when the layout or a button state changes.
 function paint(ink: CanvasRenderingContext2D) {
  ink.clearRect(0, 0, mask.width, mask.height);
  for (const button of nav.querySelectorAll('button')) {
   const svg = button.querySelector('svg')!;
   const art = STAGE_GLYPHS[svg.dataset.stageGlyph as StageGlyph];
   const box = button.getBoundingClientRect();
   const size = svg.clientWidth;
   ink.save();
   ink.scale(mask.width / band.width, mask.height / band.height);
   ink.translate(box.left - band.left + (box.width - size) / 2, box.top - band.top + (box.height - size) / 2);
   ink.scale(size / art.units, size / art.units);
   const accent = button.classList.contains('knife-step') || button.getAttribute('aria-pressed') === 'true';
   ink.fillStyle = ink.strokeStyle = accent ? '#fff' : '#000';
   ink.globalAlpha = button.disabled ? .3 : 1;
   ink.lineWidth = art.weight;
   ink.lineCap = 'square';
   ink.lineJoin = 'miter';
   for (const mark of art.marks) {
    ink.save();
    ink.translate(0, mark.plateOffset ?? 0);
    const path = new Path2D(mark.d);
    if (mark.solid) ink.fill(path);
    else ink.stroke(path);
    ink.restore();
   }
   ink.restore();
  }
  texture.needsUpdate = true;
  dirty = false;
 }
 const changes = new MutationObserver(() => { dirty = true; });
 changes.observe(nav, {subtree:true, attributes:true, attributeFilter:['data-stage-glyph','disabled','aria-pressed']});

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

 function raise() { rail.removeAttribute('data-behind-model'); }
 function beforeProduct(tint: number) {
  const over = pointerX >= band.left && pointerX <= band.right && pointerY >= band.top && pointerY <= band.bottom;
  if (!ctx || !hover.matches || usingTouch || !band.width || !band.height || over || initiallyHovered ||
      pressed !== null || nav.querySelector(':focus-visible') || input.matches(':focus-visible')) {
   raise();
   return;
  }
  if (dirty) paint(ctx);
  material.uniforms.ring.value.set((tint >> 16) / 255, ((tint >> 8) & 255) / 255, (tint & 255) / 255);
  renderer.render(scene, camera);
  rail.toggleAttribute('data-behind-model', true);
 }
 function dispose() {
  raise();
  changes.disconnect();
  window.removeEventListener('pointerover', track, true);
  window.removeEventListener('pointermove', track, true);
  window.removeEventListener('pointerout', leave, true);
  window.removeEventListener('pointerup', up, true);
  window.removeEventListener('pointercancel', up, true);
  window.removeEventListener('blur', reset);
  nav.removeEventListener('pointerdown', down);
  quad.geometry.dispose();
  material.dispose();
  texture.dispose();
 }
 return {resize, beforeProduct, raise, dispose};
}
