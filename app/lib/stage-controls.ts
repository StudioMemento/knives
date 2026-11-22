import {CanvasTexture,Color,OrthographicCamera,Scene,Sprite,SpriteMaterial,type WebGLRenderer} from 'three';
import {STAGE_GLYPHS,type StageGlyph} from './stage-glyphs';

/** Paint the resting controls between the floor and the active product.
 * The native buttons provide hit testing, focus and the elevated SVG artwork. */
export function createStageControls(nav:HTMLElement){
 const textures=new Map<StageGlyph,CanvasTexture>();
 for(const name of Object.keys(STAGE_GLYPHS) as StageGlyph[]){
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=144;
  const ink=canvas.getContext('2d');
  if(!ink){textures.forEach(t=>t.dispose());return null;}
  ink.scale(6,6);ink.strokeStyle=ink.fillStyle='white';
  ink.lineWidth=1.55;ink.lineCap='square';ink.lineJoin='miter';
  const {stroke,fill}=STAGE_GLYPHS[name];
  if(stroke)ink.stroke(new Path2D(stroke));
  if(fill)ink.fill(new Path2D(fill));
  textures.set(name,new CanvasTexture(canvas));
 }
 const scene=new Scene(),camera=new OrthographicCamera(0,1,1,0,.1,10);
 camera.position.z=1;
 const controls=Array.from(nav.querySelectorAll('button'),button=>{
  const svg=button.querySelector<SVGSVGElement>('svg[data-stage-glyph]')!;
  const material=new SpriteMaterial({map:textures.get(svg.dataset.stageGlyph as StageGlyph),
   transparent:true,depthWrite:false,depthTest:false,toneMapped:false});
  const sprite=new Sprite(material);scene.add(sprite);
  return {button,svg,sprite};
 });
 let band:DOMRect;
 function resize(viewport:DOMRect){
  band=nav.getBoundingClientRect();
  camera.right=viewport.width;camera.top=viewport.height;camera.updateProjectionMatrix();
  for(const {button,svg,sprite} of controls){
   const hit=button.getBoundingClientRect(),icon=svg.getBoundingClientRect();
   sprite.position.set(hit.left-viewport.left+hit.width/2,viewport.bottom-hit.top-hit.height/2,0);
   sprite.scale.set(icon.width,icon.height,1);
  }
 }
 // Track the whole strip, including the space where the canvas still accepts drags.
 let pointerX=NaN,pointerY=NaN,pressedId=-1;
 let initialHover=matchMedia('(any-hover:hover)').matches&&nav.matches(':hover');
 const track=(e:PointerEvent)=>{
  initialHover=false;
  pointerX=e.pointerType==='touch'?NaN:e.clientX;pointerY=e.clientY;
 };
 const reset=()=>{pointerX=NaN;initialHover=false;pressedId=-1;};
 const exit=(e:PointerEvent)=>{if(!e.relatedTarget&&e.pointerType!=='touch')reset();};
 const down=(e:PointerEvent)=>{track(e);if(e.button===0&&e.isPrimary)pressedId=e.pointerId;};
 const up=(e:PointerEvent)=>{if(e.pointerId===pressedId)pressedId=-1;};
 window.addEventListener('pointerover',track,true);window.addEventListener('pointermove',track,true);
 window.addEventListener('pointerout',exit,true);nav.addEventListener('pointerdown',down);
 window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true);window.addEventListener('blur',reset);
 const stage=nav.closest('main')?.querySelector('canvas.stage');
 const contrast=matchMedia('(forced-colors:active)'),ring=new Color(),ink=new Color(),white=new Color(0xffffff);
 let lastTint=-1;
 function render(renderer:WebGLRenderer,tint:number){
  const inside=band&&pointerX>=band.left&&pointerX<=band.right&&pointerY>=band.top&&pointerY<=band.bottom;
  const raised=Boolean(inside||initialHover||pressedId!==-1||nav.querySelector(':focus-visible')||stage?.matches(':focus-visible'));
  nav.toggleAttribute('data-depth',true);
  nav.toggleAttribute('data-raised',raised);
  if(raised)return;
  if(tint!==lastTint){
   ring.setHex(tint);
   ink.copy(ring).convertLinearToSRGB().lerp(white,.32).convertSRGBToLinear();
   lastTint=tint;
  }
  for(const {button,svg,sprite} of controls){
   const name=svg.dataset.stageGlyph as StageGlyph,material=sprite.material;
   material.map=textures.get(name)!;
   material.opacity=button.disabled ? .3 : 1;
   if(contrast.matches)material.color.setStyle(getComputedStyle(button).color);
   else{
    const highlighted=name==='left'||name==='right'||button.getAttribute('aria-pressed')==='true';
    material.color.copy(highlighted?ring:ink);
   }
  }
  renderer.render(scene,camera);
 }
 function restore(){
  nav.removeAttribute('data-depth');nav.removeAttribute('data-raised');
 }
 return {resize,render,restore,dispose(){
  restore();window.removeEventListener('pointerover',track,true);window.removeEventListener('pointermove',track,true);
  window.removeEventListener('pointerout',exit,true);nav.removeEventListener('pointerdown',down);
  window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',up,true);window.removeEventListener('blur',reset);
  textures.forEach(t=>t.dispose());for(const {sprite} of controls)sprite.material.dispose();
 }};
}
