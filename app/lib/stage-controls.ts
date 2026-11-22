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
 function resize(viewport:DOMRect){
  camera.right=viewport.width;camera.top=viewport.height;camera.updateProjectionMatrix();
  for(const {button,svg,sprite} of controls){
   const hit=button.getBoundingClientRect(),icon=svg.getBoundingClientRect();
   sprite.position.set(hit.left-viewport.left+hit.width/2,viewport.bottom-hit.top-hit.height/2,0);
   sprite.scale.set(icon.width,icon.height,1);
  }
 }
 function buttonAt(target:EventTarget|null){
  return target instanceof Element&&nav.contains(target)?target.closest('button'):null;
 }
 let hovered=matchMedia('(hover:hover)').matches?nav.querySelector<HTMLButtonElement>('button:hover'):null;
 let held:HTMLButtonElement|null=null,heldId=-1;
 const enter=(e:PointerEvent)=>{hovered=e.pointerType==='touch'?null:buttonAt(e.target);};
 const leave=(e:PointerEvent)=>{hovered=e.pointerType==='touch'?null:buttonAt(e.relatedTarget);};
 const down=(e:PointerEvent)=>{if(e.isPrimary){held=buttonAt(e.target);heldId=e.pointerId;}};
 const up=(e:PointerEvent)=>{if(e.pointerId===heldId){held=null;heldId=-1;}};
 const reset=()=>{hovered=null;held=null;heldId=-1;};
 nav.addEventListener('pointerover',enter);nav.addEventListener('pointerout',leave);nav.addEventListener('pointerdown',down);
 window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true);window.addEventListener('blur',reset);
 const contrast=matchMedia('(forced-colors:active)'),ring=new Color(),ink=new Color(),white=new Color(0xffffff);
 let lastTint=-1;
 function render(renderer:WebGLRenderer,tint:number){
  if(tint!==lastTint){
   ring.setHex(tint);
   ink.copy(ring).convertLinearToSRGB().lerp(white,.32).convertSRGBToLinear();
   lastTint=tint;
  }
  for(const {button,svg,sprite} of controls){
   const raised=!button.disabled&&(button===hovered||button===held||button.matches(':focus-visible'));
   button.toggleAttribute('data-raised',raised);sprite.visible=!raised;
   if(raised)continue;
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
  nav.toggleAttribute('data-depth',true);
 }
 function restore(){
  nav.removeAttribute('data-depth');
  for(const {button} of controls)button.removeAttribute('data-raised');
 }
 return {resize,render,restore,dispose(){
  restore();nav.removeEventListener('pointerover',enter);nav.removeEventListener('pointerout',leave);nav.removeEventListener('pointerdown',down);
  window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',up,true);window.removeEventListener('blur',reset);
  textures.forEach(t=>t.dispose());for(const {sprite} of controls)sprite.material.dispose();
 }};
}
