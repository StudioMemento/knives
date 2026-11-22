'use client';
import {useEffect,useRef,type MutableRefObject} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {createExplosion,sampleExplosion,compactExplosion,type ExplodedPart} from './lib/explosion';
import {stageFrame,chapterFrame,livingPose,presentation,productArea,clearProductArea,CAMERA_DISTANCE,DISPLAY,type Frame,type ScreenRect} from './lib/presentation';
import {inspectionParts,partCenter,type InspectionPart} from './lib/inspection';
import {Carousel} from './lib/carousel';
import {exitFraction,railVisibility,backdropOpacity,slotOffset,RAIL,railPoint,animateBackdrop} from './lib/choreography';
import {MotionValue,orbitAngle} from './lib/motion';
import {createLightStage,createStudioEnvironments,FLOOR_FADE_END} from './lib/lighting';
import {LIGHT_PRESETS,type LightPreset} from './lib/light-presets';
import {fitBoundsScale,slideTravel} from './lib/framing';
import {alignStageCamera,focusLens} from './lib/optics';
import {contactMaterial} from './lib/reflection';
import {bindGestures} from './lib/gestures';
import {makeMaterial,makeTextures,finishMaterial} from './lib/materials';
import {createSoftLayers,REAR_LAYER,REFLECTION_LAYER,REAR_DEPTH_LAYER} from './lib/soft-layers';
import {KNIVES,mod,clamp,smooth,sectionAt,hasManualRotation,resetInspection,type DemoState,type ModelMeta,type Surface} from './lib/state';

type Props={
 state:MutableRefObject<DemoState>;onFrame:(progress:number,id:number,ready:number)=>void;
 onError:(message:string)=>void;onInteract:()=>void;onChapter:(target:number)=>void;
};
type Rig={
 meta:ModelMeta;group:THREE.Group;content:THREE.Group;scene:THREE.Group;mixer:THREE.AnimationMixer;open:THREE.AnimationAction;
 parts:ExplodedPart[];meshes:THREE.Mesh[];mirrors:{source:THREE.Mesh;image:THREE.Mesh}[];materials:Record<Surface,THREE.MeshStandardMaterial>;key:string;
 fold:number;explosion:number;fit:number;visibility:number;compact:number;shots:Frame[];fitMeshes:THREE.Mesh[];details:Record<'clip'|'screw',InspectionPart>;
};
const v=(a:number[])=>new THREE.Vector3(a[0],a[1],a[2]);
const FRONT=3;

export default function Stage({state,...callbacks}:Props){
 const canvas=useRef<HTMLCanvasElement>(null);const props=useRef(callbacks);props.current=callbacks;
 useEffect(()=>{
  if(!canvas.current)return;const s=state.current;s.ready=[];const element=canvas.current;element.dataset.boot='mounted';let dead=false,raf=0,renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({canvas:element,antialias:true,alpha:true,powerPreference:'high-performance'});}catch{props.current.onError('WebGL is unavailable. Open the showroom in a browser with graphics acceleration enabled.');return;}
  renderer.info.autoReset=false;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.setClearColor('#000000',0);renderer.autoClear=false;
  const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(34,1,.05,80);camera.position.set(0,0,CAMERA_DISTANCE);
  const productCamera=camera.clone(),reflectionProjection={value:1},contact=contactMaterial(reflectionProjection);
  const textures=makeTextures(),soft=createSoftLayers(renderer),rigs:(Rig|undefined)[]=Array(5),reflectionGroup=new THREE.Group();scene.add(reflectionGroup);
  const lightStage=createLightStage(FRONT),environments=createStudioEnvironments(renderer);
  scene.add(lightStage.group);
  let appliedPreset:LightPreset|null=null,environmentPower=1;
  function applyStudio(id:LightPreset){
   if(id===appliedPreset)return;
   const setup=LIGHT_PRESETS[id];
   scene.environment=environments.texture(id);
   scene.environmentRotation.y=setup.environment.yaw;
   environmentPower=setup.environment.intensity;
   lightStage.setPreset(id);
   appliedPreset=id;
  }
  applyStudio(s.lightPreset);
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);let metas:ModelMeta[]=[],warmed=false;
  const depthOnly=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:THREE.DoubleSide});
  const getRole=(mesh:THREE.Mesh):Surface=>{const mat=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;const name=String(mesh.userData.materialRole||mat.name||mesh.name).toLowerCase();return name.includes('blade')?'blade':name.includes('handle')?'handle':'metals';};
  async function load(index:number){
   const meta=metas.find(m=>m.id===KNIVES[index]);if(!meta)throw Error('Missing model manifest for '+KNIVES[index]);
   const gltf=await loader.loadAsync(meta.url);if(dead)return;
   const group=new THREE.Group(),scaleGroup=new THREE.Group(),content=new THREE.Group();group.add(scaleGroup);scaleGroup.add(content);content.add(gltf.scene);scene.add(group);scaleGroup.scale.setScalar(DISPLAY/meta.bounds.size[0]);content.position.copy(v(meta.bounds.center)).negate();
   const materials={blade:makeMaterial('blade'),handle:makeMaterial('handle'),metals:makeMaterial('metals')};
   for(const role of ['blade','handle','metals'] as const){const m=materials[role];m.transparent=true;m.depthWrite=true;m.forceSinglePass=true;finishMaterial(m,role,state.current.configs[index][role],textures);}
   const meshes:THREE.Mesh[]=[],mirrors:Rig['mirrors']=[];
   gltf.scene.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    const role=getRole(object);
    object.material=materials[role];object.frustumCulled=false;object.userData.surface=role;
    object.layers.set(index===state.current.selected?FRONT:REAR_LAYER);meshes.push(object);
    if(role!=='metals'){
     const image=new THREE.Mesh(object.geometry,contact);
     image.matrixAutoUpdate=false;image.frustumCulled=false;image.layers.set(REFLECTION_LAYER);
     reflectionGroup.add(image);mirrors.push({source:object,image});
    }
   });
   const mixer=new THREE.AnimationMixer(gltf.scene),openClip=gltf.animations.find(c=>c.name===meta.motion.openCloseClip),explodeClip=gltf.animations.find(c=>c.name===meta.motion.explodeClip);if(!openClip||!explodeClip)throw Error('Missing animations for '+meta.id);
   const open=mixer.clipAction(openClip),parts=createExplosion(gltf.scene,explodeClip,meta.motion.explodePeakTime);for(const action of [open]){action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;action.setEffectiveWeight(1);}
   group.updateMatrixWorld(true);
   const toLocal=gltf.scene.matrixWorld.clone().invert();
   const fitMeshes=meshes.map(mesh=>{
    const proxy=new THREE.Mesh(mesh.geometry,depthOnly);proxy.matrixAutoUpdate=false;
    proxy.matrix.multiplyMatrices(toLocal,mesh.matrixWorld);return proxy;
   });
   const rig:Rig={meta,group,content,scene:gltf.scene,mixer,open,parts,meshes,mirrors,materials,key:JSON.stringify(s.configs[index]),
    fold:0,explosion:0,fit:1,visibility:1,compact:compactExplosion(parts,DISPLAY),shots:[],fitMeshes,details:inspectionParts(gltf.scene,meshes,meta.focusPoints.handle[2])};
   rigs[index]=rig;frameShots(rig);s.ready.push(index);s.ready.sort();
  }
  (async()=>{try{
   const response=await fetch('/models/v48/manifest.json');if(!response.ok)throw Error('Could not read the model manifest');metas=(await response.json()).models;
   await load(0);await Promise.all([load(1),load(2)]);await Promise.all([load(3),load(4)]);if(dead)return;
   const mask=camera.layers.mask;let shaders:Promise<THREE.Object3D>,depthShaders:Promise<THREE.Object3D>;
   try{camera.layers.enableAll();shaders=renderer.compileAsync(scene,camera);scene.overrideMaterial=depthOnly;depthShaders=renderer.compileAsync(scene,camera);}
   finally{scene.overrideMaterial=null;camera.layers.mask=mask;}
   // Never leave an override material on the live scene while compilation waits.
   await Promise.all([shaders,depthShaders]);if(!dead)warmed=true;
  }catch(e){if(!dead){console.error(e);props.current.onError('The 3D collection could not be loaded. Please try again.');}}})();
  let width=0,height=0,portrait=false,viewHeight=5.81,viewWidth=10.3;
  const host=element.parentElement!;
  const rimAnchor=host.querySelector<HTMLElement>('.stage-foreground')!;
  const dock=host.querySelector<HTMLElement>('.control-dock')!;
  const summary=host.querySelector<HTMLElement>('.configuration')!,price=host.querySelector<HTMLElement>('.price')!;
  const floorBack=new THREE.Vector3(0,RAIL.floorY,RAIL.centerZ-FLOOR_FADE_END);
  let lastRingTint=-1;
  let shotRect:ScreenRect=productArea(false),lastRingLine=-1,cameraShift=0;
  const frustum=new THREE.Frustum();
  function frameShots(rig:Rig){
   const hero=stageFrame(rig.meta,viewWidth,viewHeight,portrait,shotRect);
   rig.shots=[hero,...[1,2,3,4].map(i=>chapterFrame(i,rig.meta,hero,viewWidth,viewHeight,portrait,shotRect)),hero];
  }
  const resize=()=>{
   const w=Math.max(1,element.clientWidth),h=Math.max(1,element.clientHeight);
   const viewport=element.getBoundingClientRect();
   const ringLine=(rimAnchor.getBoundingClientRect().top-viewport.top)/h;
   const changed=w!==width||h!==height;
   if(changed){
    width=w;height=h;portrait=h>w;
    const pixels=portrait?1150000:2250000;
    renderer.setPixelRatio(Math.min(devicePixelRatio,portrait?1.65:1.8,Math.sqrt(pixels/(w*h))));
    renderer.setSize(w,h,false);
    viewHeight=2*Math.tan(camera.fov*Math.PI/360)*CAMERA_DISTANCE;viewWidth=viewHeight*w/h;
    soft.resize(w,h);
   }
   if(changed||Math.abs(lastRingLine-ringLine)>=.00001){
    lastRingLine=ringLine;
    cameraShift=alignStageCamera(camera,w,h,ringLine);
    const floorTop=(1-floorBack.clone().project(camera).y)*h/2;
    host.style.setProperty('--floor-top',floorTop+'px');
    productCamera.copy(camera,false);productCamera.updateMatrixWorld();
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
   }
   const list=summary.getBoundingClientRect(),amount=price.getBoundingClientRect();
   const gap=THREE.MathUtils.clamp(w*.012,8,24);
   const [left,top,right,bottom]=clearProductArea(productArea(portrait,ringLine),
    (list.right-viewport.left+gap)/w,(list.bottom-viewport.top+gap)/h,
    (amount.left-viewport.left-gap)/w,(amount.bottom-viewport.top+gap)/h);
   // The fitted-shot solver uses an unshifted lens. Account for the stage composition once here.
   const next:ScreenRect=[left,top+cameraShift,right,bottom+cameraShift];
   if(!changed&&next.every((v,i)=>Math.abs(v-shotRect[i])<.00001))return;
   shotRect=next;
   for(const rig of rigs)if(rig)frameShots(rig);
  };
  resize();
  const observer=new ResizeObserver(resize);
  for(const observed of [element,rimAnchor,dock,summary,price])observer.observe(observed);

  const raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2();
  raycaster.layers.enableAll();
  function hitAt(x:number,y:number,allowPlane=false){
   const rig=rigs[s.selected];if(!rig)return null;
   const rect=element.getBoundingClientRect();
   ndc.set((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2);
   raycaster.setFromCamera(ndc,productCamera);
   const [hit]=raycaster.intersectObjects(rig.meshes,false);
   if(hit)return rig.scene.worldToLocal(hit.point.clone());
   if(!allowPlane)return null;
   const point=raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),-rig.group.position.z),new THREE.Vector3());
   if(!point)return null;
   const local=rig.scene.worldToLocal(point);
   return local.clamp(v(rig.meta.bounds.min),v(rig.meta.bounds.max));
  }
  const unbind=bindGestures(element,s,{
   hitsProduct:(x,y)=>!!hitAt(x,y),
   focus:(x,y,allowPlane)=>{const p=hitAt(x,y,allowPlane);if(p){s.focus=p.toArray() as [number,number,number];props.current.onInteract();}},
   chapter:target=>props.current.onChapter(target),renderUI:()=>props.current.onInteract(),
  });
  const lost=(e:Event)=>{e.preventDefault();props.current.onError('The graphics session was interrupted. Reload to restore the showroom.');};
  element.addEventListener('webglcontextlost',lost);
  const cursor=new THREE.Vector2(),cursorX=new MotionValue(),cursorY=new MotionValue();
  const cursorMove=(e:PointerEvent)=>{if(e.pointerType==='mouse')cursor.set(e.clientX/width*2-1,1-e.clientY/height*2);};
  const cursorLeave=()=>cursor.set(0,0);
  element.addEventListener('pointermove',cursorMove,{passive:true});element.addEventListener('pointerleave',cursorLeave);
  const carousel=new Carousel(),scroll=new MotionValue(),zoom=new MotionValue(1),fold=new MotionValue(),explosion=new MotionValue();
  const customFold=s.customFold.map(x=>new MotionValue(x)),customExplode=s.customExplode.map(x=>new MotionValue(x));
  const viewRotation=new THREE.Quaternion(),views={side:[0,0],top:[Math.PI/2,0],edge:[0,Math.PI/2],perspective:[.38,-.52]};
  const mirrorMatrix=new THREE.Matrix4(),mirrorFlip=new THREE.Matrix4().makeScale(1,-1,1);
  function renderProducts(sharp:boolean){
   scene.environmentIntensity=environmentPower*(sharp?1:.33);
   for(const rig of rigs){
    if(!rig?.group.visible)continue;
    const opacity=rig===rigs[s.selected]?(sharp?1:0):(sharp?0:rig.visibility);
    for(const mat of Object.values(rig.materials))mat.opacity=opacity;
    for(const mesh of rig.meshes){
     mesh.layers.set(opacity>.001?(sharp?FRONT:REAR_LAYER):4);
     if(!sharp&&opacity>.001&&opacity<.999)mesh.layers.enable(REAR_DEPTH_LAYER);
    }
   }
  }
  let railPhase=0,showBackdrop=true;
  let last=performance.now(),time=0,lastActivity=-1,frames=0,frameWindow=0;
  const visibility=()=>{last=performance.now();};document.addEventListener('visibilitychange',visibility);
  const identity=new THREE.Quaternion(),lightAim=new THREE.Vector3();
  let lifeTime=0,idle=livingPose(0,0,0,s.reduced);
  function animate(now:number){
   if(dead)return;
   raf=requestAnimationFrame(animate);
   const elapsed=Math.max(0,(now-last)/1000);last=now;
   if(document.hidden)return;
   const dt=Math.min(.18,elapsed);time+=elapsed;
   if(lastActivity!==s.activity){lastActivity=s.activity;carousel.rest();}
   if(s.knifeRequest!==null){carousel.request(s.knifeRequest,s.reduced);s.knifeRequest=null;}
   s.progress=scroll.step(s.target,dt,s.reduced?25:8);
   const u=mod(s.progress),chapter=Math.floor(u),blend=smooth(u-chapter);
   const heroWeight=1-smooth(Math.min(u,5-u)),inspectWeight=1-smooth(Math.min(1,Math.abs(u-4)));
   const auto=Math.abs(s.target-Math.round(s.target))<.001&&sectionAt(s.target)===0&&heroWeight>.999&&s.ready.length===5&&warmed&&s.closed===0&&s.exploded===0&&s.zoom===1&&!hasManualRotation(s);
   if(!auto&&s.knifeDestination===null&&!carousel.manuallyTravelling&&Math.abs(carousel.phase-Math.round(carousel.phase))>1e-5)carousel.request(Math.round(carousel.phase),s.reduced);
   const phase=carousel.step(elapsed,auto,s.paused||s.interacting,s.reduced);
   s.orbit=phase;
   if(s.knifeDestination!==null&&Math.abs(phase-s.knifeDestination)<1e-7)s.knifeDestination=null;
   const stageDistance=Math.min(u,5-u),headingToStage=sectionAt(s.target)===0;
   if(headingToStage){railPhase=phase;showBackdrop=true;}
   else if(stageDistance>=.62)showBackdrop=false;
   const rearAlpha=showBackdrop?backdropOpacity(stageDistance):0;
   const nearest=mod(Math.round(phase));
   if(rigs[nearest]&&nearest!==s.selected){
    s.selected=nearest;resetInspection(s);fold.reset(0);explosion.reset(0);viewRotation.identity();
    customFold.forEach((m,i)=>m.reset(s.customFold[i]));customExplode.forEach(m=>m.reset(0));
   }
   if(!hasManualRotation(s)&&!s.interacting&&s.closed===0&&s.exploded===0&&fold.value<.0001&&explosion.value<.0001){
    lifeTime+=dt;idle=livingPose(lifeTime,cursorX.step(cursor.x,dt,5),cursorY.step(cursor.y,dt,5),s.reduced);
   }
   const current=rigs[s.selected],macro=s.view==='clip'||s.view==='screw'?s.view:null;
   if(current)lightAim.lerpVectors(current.shots[chapter].position,current.shots[chapter+1].position,blend);
   const magnification=s.reduced?s.zoom:zoom.step(s.zoom,dt,16);
   focusLens(productCamera,camera,lightAim,magnification);
   reflectionProjection.value=height*productCamera.projectionMatrix.elements[5];
   let viewOffset:THREE.Quaternion;
   if(macro&&current){
    const part=current.details[macro];
    const shot=presentation(macro==='clip'?.13:.04,part.positiveZ?Math.PI-.09:.09,portrait?.74:.10);
    viewOffset=shot.multiply(current.shots[4].rotation.clone().invert());
   }else{
    const angles=views[s.view as keyof typeof views]??views.side;
    viewOffset=new THREE.Quaternion().setFromEuler(new THREE.Euler(angles[0],angles[1],0,'YXZ'));
   }
   const orbit=identity.clone().slerp(viewOffset,inspectWeight).premultiply(s.rotation);
   viewRotation.slerp(orbit,1-Math.exp(-dt*11));
   const foldValue=fold.step(s.closed,dt,10),explodeValue=explosion.step(s.exploded,dt,9);
   customFold.forEach((v,i)=>v.step(s.customFold[i],dt,10));customExplode.forEach((v,i)=>v.step(s.customExplode[i],dt,9));
   mirrorMatrix.makeTranslation(0,2*RAIL.floorY,0).multiply(mirrorFlip);
   let visibleRear=false;
   for(let i=0;i<rigs.length;i++){
    const rig=rigs[i];if(!rig)continue;
    const front=i===s.selected,wasVisible=rig.group.visible;
    const delta=slotOffset(i,phase),railSlot=slotOffset(i,railPhase);
    rig.visibility=front?1:rearAlpha*railVisibility(railSlot);
    rig.group.visible=rig.visibility>.001;
    if(!rig.group.visible){for(const {image} of rig.mirrors)image.visible=false;continue;}
    const stage=rig.shots[0],scenicScale=.36;
    if(!front){
     const angle=orbitAngle(railSlot),spin=s.reduced?i*1.31:time*.43+i*1.31;
     rig.group.position.copy(railPoint(angle));rig.group.position.y+=scenicScale*DISPLAY*.56;
     rig.group.quaternion.copy(presentation(.12+.20*Math.sin(spin),.42*Math.sin(spin*.76)+.20*Math.sin(angle),1.03+.18*Math.cos(spin)));
     rig.group.scale.setScalar(scenicScale);rig.content.position.copy(stage.focus).negate();
     rig.fold=0;rig.explosion=rig.compact*.55;rig.fit=1;
    }else{
     const a=rig.shots[chapter],b=rig.shots[chapter+1];
     const pose=new THREE.Quaternion().slerpQuaternions(a.rotation,b.rotation,blend);
     pose.premultiply(identity.clone().slerp(idle.rotation,heroWeight)).premultiply(viewRotation);
     rig.group.quaternion.copy(pose);rig.group.position.lerpVectors(a.position,b.position,blend);
     const scale=THREE.MathUtils.lerp(a.scale,b.scale,blend);
     rig.group.scale.setScalar(scale);
     const value=(n:number,custom:MotionValue[],normal:number)=>n>=1&&n<=3?custom[n-1].value:normal;
     rig.fold=THREE.MathUtils.lerp(value(chapter,customFold,foldValue),value(chapter+1,customFold,foldValue),blend);
     rig.explosion=rig.compact*THREE.MathUtils.lerp(value(chapter,customExplode,explodeValue),value(chapter+1,customExplode,explodeValue),blend);
    }
    rig.open.time=clamp(rig.fold)*rig.meta.motion.closedTime;rig.mixer.update(0);sampleExplosion(rig.parts,rig.explosion);
    if(!front)animateBackdrop(rig.parts,s.reduced?0:.64,time,i);
    if(front){
     const a=rig.shots[chapter],b=rig.shots[chapter+1],focus=new THREE.Vector3().lerpVectors(a.focus,b.focus,blend);
     const detail=macro&&inspectWeight>.001?rig.details[macro]:null;
     if(inspectWeight>.001){
      if(s.focus)focus.lerp(v(s.focus),inspectWeight);
      else if(detail)focus.lerp(partCenter(rig.scene,detail),inspectWeight);
     }
     focus.negate();
     if(!wasVisible||heroWeight>.999)rig.content.position.copy(focus);
     else rig.content.position.lerp(focus,1-Math.exp(-dt*(s.reduced?28:14)));
     rig.group.updateMatrixWorld(true);
     let cap=1;
     if(detail){
      const extent=detail.span*DISPLAY/rig.meta.bounds.size[0]*rig.group.scale.x;
      cap=clamp(Math.min(viewWidth*.67,viewHeight*.52)*(macro==='screw'?.24:1)/extent,1,12);
     }else if(inspectWeight>.001&&(s.view!=='side'||hasManualRotation(s))&&!s.focus){
      for(const mesh of rig.fitMeshes)mesh.matrixWorld.multiplyMatrices(rig.scene.matrixWorld,mesh.matrix);
      cap=fitBoundsScale(camera,rig.group,rig.fitMeshes,shotRect);
     }
     if(inspectWeight>.001)rig.fit+=(1+(cap-1)*inspectWeight-rig.fit)*(1-Math.exp(-dt*10));
     else rig.fit=1;
     rig.group.scale.multiplyScalar(rig.fit);rig.group.updateMatrixWorld(true);
     if(Math.abs(delta)>.00001){
      const direction=Math.sign(delta);
      rig.group.position.x+=direction*exitFraction(delta)*slideTravel(productCamera,rig.meshes,direction);
     }
    }
    rig.group.updateMatrixWorld(true);
    if(!front&&!visibleRear)visibleRear=rig.meshes.some(mesh=>frustum.intersectsObject(mesh));
    const configKey=JSON.stringify(s.configs[i]);
    if(configKey!==rig.key){for(const role of ['blade','handle','metals'] as const)finishMaterial(rig.materials[role],role,s.configs[i][role],textures);rig.key=configKey;}
    for(const {source,image} of rig.mirrors) {
     image.visible=front;
     if(!front)continue;
     image.matrix.multiplyMatrices(mirrorMatrix,source.matrixWorld);
     image.matrixWorldNeedsUpdate=true;
    }
   }
   const active=rigs[s.selected];
   try{
    applyStudio(s.lightPreset);
    const tint=lightStage.update(s.selected,dt,lightAim);
    if(tint!==lastRingTint){
     host.style.setProperty('--ring-light','#'+tint.toString(16).padStart(6,'0'));
     lastRingTint=tint;
    }
    // A changed studio rig also invalidates the cached background pass.
    const depthKey=[s.ready.length,s.selected,railPhase.toFixed(4),rearAlpha.toFixed(3),tint,s.lightPreset,s.reduced?0:Math.floor(time*30)].join('/');
    scene.environmentIntensity=environmentPower;
    renderer.info.reset();renderer.setRenderTarget(null);renderer.clear();camera.layers.set(0);renderer.render(scene,camera);
    renderProducts(false);soft.render(scene,camera,productCamera,visibleRear,CAMERA_DISTANCE-(active?.group.position.z??0),depthKey);
    if(!soft.enabled){camera.layers.set(REAR_LAYER);renderer.render(scene,camera);}
    renderProducts(true);renderer.clearDepth();productCamera.layers.set(FRONT);
    renderer.render(scene,productCamera);
   }catch(e){props.current.onError('The scene could not be rendered. Reload to restore the showroom.');cancelAnimationFrame(raf);console.error(e);return;}
   props.current.onFrame(s.progress,s.selected,s.ready.length);
   frames++;frameWindow+=elapsed;
   if(frameWindow>1){
    element.dataset.fps=String(Math.round(frames/frameWindow));frames=0;frameWindow=0;
   }
   element.dataset.closed=active?.fold.toFixed(3)??'0';element.dataset.exploded=active?.explosion.toFixed(3)??'0';
   element.dataset.zoom=magnification.toFixed(3);element.dataset.orbit=phase.toFixed(4);element.dataset.warmed=String(warmed);element.dataset.dragging=String(s.interacting);
  }
  raf=requestAnimationFrame(animate);
  return ()=>{
   dead=true;cancelAnimationFrame(raf);observer.disconnect();unbind();document.removeEventListener('visibilitychange',visibility);
   element.removeEventListener('pointermove',cursorMove);element.removeEventListener('pointerleave',cursorLeave);element.removeEventListener('webglcontextlost',lost);
   for(const rig of rigs)if(rig){rig.mixer.stopAllAction();rig.mixer.uncacheRoot(rig.scene);for(const mesh of rig.meshes)mesh.geometry.dispose();Object.values(rig.materials).forEach(m=>m.dispose());}
   textures.forEach(t=>t.dispose());environments.dispose();soft.dispose();lightStage.dispose();depthOnly.dispose();contact.dispose();renderer.dispose();
  };
 },[state]);
 return <canvas className="stage" ref={canvas} tabIndex={0} aria-label="3D model. Drag or use the arrow keys to rotate. Scroll or pinch to zoom."/>;
}
