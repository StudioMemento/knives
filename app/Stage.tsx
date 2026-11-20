'use client';
import {useEffect,useRef,type MutableRefObject} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {createExplosion,sampleExplosion,compactExplosion,type ExplodedPart} from './lib/explosion';
import {stageFrame,chapterFrame,livingPose,presentation,productArea,CAMERA_DISTANCE,DISPLAY,type Frame,type ScreenRect} from './lib/presentation';
import {inspectionParts,partCenter,type InspectionPart} from './lib/inspection';
import {Carousel} from './lib/carousel';
import {slotOffset,RAIL,railAngle,railPoint,stationWeight,openBladeTip} from './lib/choreography';
import {MotionValue} from './lib/motion';
import {createLightStage} from './lib/lighting';
import {fitBoundsScale} from './lib/framing';
import {createForegroundFog} from './lib/foreground-fog';
import {bindGestures} from './lib/gestures';
import {makeMaterial,makeTextures,finishMaterial} from './lib/materials';
import {createDepthOfField} from './lib/soft-layers';
import {KNIVES,mod,clamp,smooth,sectionAt,hasManualRotation,type DemoState,type ModelMeta,type Surface} from './lib/state';

type Props={
 state:MutableRefObject<DemoState>;onFrame:(progress:number,id:number,ready:number)=>void;
 onError:(message:string)=>void;onInteract:()=>void;onChapter:(target:number)=>void;
};
type Rig={
 meta:ModelMeta;group:THREE.Group;content:THREE.Group;scene:THREE.Group;mixer:THREE.AnimationMixer;open:THREE.AnimationAction;
 parts:ExplodedPart[];meshes:THREE.Mesh[];materials:Record<Surface,THREE.MeshStandardMaterial>;key:string;
 fold:number;explosion:number;fit:number;tip:THREE.Vector3;manual:THREE.Quaternion;compact:number;shots:Frame[];fitMeshes:THREE.Mesh[];details:Record<'clip'|'screw',InspectionPart>;
};
const v=(a:number[])=>new THREE.Vector3(a[0],a[1],a[2]);

export default function Stage({state,...callbacks}:Props){
 const canvas=useRef<HTMLCanvasElement>(null);const props=useRef(callbacks);props.current=callbacks;
 useEffect(()=>{
  if(!canvas.current)return;const s=state.current;s.ready=[];const element=canvas.current;element.dataset.boot='mounted';let dead=false,raf=0,renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({canvas:element,antialias:true,alpha:true,powerPreference:'high-performance'});}catch{props.current.onError('WebGL non disponibile. Apri la demo in un browser con accelerazione grafica.');return;}
  renderer.info.autoReset=false;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.setClearColor('#000000',0);renderer.autoClear=false;
  const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(34,1,.05,80);camera.position.set(0,0,CAMERA_DISTANCE);
  const textures=makeTextures(),optics=createDepthOfField(renderer),fog=createForegroundFog(renderer,camera),rigs:(Rig|undefined)[]=Array(5);
  const pmrem=new THREE.PMREMGenerator(renderer),studio=new THREE.Scene();
  studio.background=new THREE.Color('#2b2e35');
  for(const [x,y,z,w,h,power] of [[-3,4.8,4.3,5.4,1.8,5.4],[4,1.6,2.8,1.5,4.2,3.6],[-.7,3,-3.2,4.2,1.1,4.2],[0,.4,5.6,6.6,3.8,1.85],[2,-1.7,-4.5,4.2,2.1,1.6]]){
   const card=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(power,power*.99,power*.97),side:THREE.DoubleSide}));
   card.position.set(x,y,z);card.lookAt(0,0,0);studio.add(card);
  }
  const env=pmrem.fromScene(studio,.045);scene.environment=env.texture;scene.environmentRotation.y=.18;
  studio.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();o.material.dispose();}});pmrem.dispose();renderer.resetState();
  const lightStage=createLightStage();scene.add(lightStage.group,lightStage.rig);
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);let metas:ModelMeta[]=[],warmed=false;
  const depthOnly=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:THREE.DoubleSide});
  const getRole=(mesh:THREE.Mesh):Surface=>{const mat=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;const name=String(mesh.userData.materialRole||mat.name||mesh.name).toLowerCase();return name.includes('blade')?'blade':name.includes('handle')?'handle':'metals';};
  async function load(index:number){
   const meta=metas.find(m=>m.id===KNIVES[index]);if(!meta)throw Error('Manifest modello mancante: '+KNIVES[index]);
   const gltf=await loader.loadAsync(meta.url);if(dead)return;
   const group=new THREE.Group(),scaleGroup=new THREE.Group(),content=new THREE.Group();group.name=meta.id;group.add(scaleGroup);scaleGroup.add(content);content.add(gltf.scene);scene.add(group);scaleGroup.scale.setScalar(DISPLAY/meta.bounds.size[0]);content.position.copy(v(meta.bounds.center)).negate();
   const materials={blade:makeMaterial('blade'),handle:makeMaterial('handle'),metals:makeMaterial('metals')};
   for(const role of ['blade','handle','metals'] as const)finishMaterial(materials[role],index,role,s.configs[index][role],textures);
   const meshes:THREE.Mesh[]=[];
   gltf.scene.traverse(o=>{
    if(!(o instanceof THREE.Mesh))return;
    const role=getRole(o);o.material=materials[role];o.frustumCulled=false;o.userData.surface=role;
    meshes.push(o);
   });
   const mixer=new THREE.AnimationMixer(gltf.scene),openClip=gltf.animations.find(c=>c.name===meta.motion.openCloseClip),explodeClip=gltf.animations.find(c=>c.name===meta.motion.explodeClip);if(!openClip||!explodeClip)throw Error('Animazioni non disponibili: '+meta.id);
   const open=mixer.clipAction(openClip),parts=createExplosion(gltf.scene,explodeClip,meta.motion.explodePeakTime);for(const action of [open]){action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;action.setEffectiveWeight(1);}
   open.time=0;mixer.update(0);sampleExplosion(parts,0);group.updateMatrixWorld(true);
   const toLocal=gltf.scene.matrixWorld.clone().invert();
   const fitMeshes=meshes.map(mesh=>{
    const proxy=new THREE.Mesh(mesh.geometry,depthOnly);proxy.matrixAutoUpdate=false;
    proxy.matrix.multiplyMatrices(toLocal,mesh.matrixWorld);return proxy;
   });
   const rig:Rig={meta,group,content,scene:gltf.scene,mixer,open,parts,meshes,materials,key:JSON.stringify(s.configs[index]),
    fold:0,explosion:0,fit:1,tip:openBladeTip(gltf.scene,meshes),manual:new THREE.Quaternion(),compact:compactExplosion(parts,DISPLAY),shots:[],fitMeshes,details:inspectionParts(gltf.scene,meshes,meta.focusPoints.handle[2])};
   rigs[index]=rig;frameShots(rig);s.ready.push(index);s.ready.sort();
  }
  (async()=>{try{
   const response=await fetch('/models/v48/manifest.json');if(!response.ok)throw Error('Impossibile leggere i modelli');metas=(await response.json()).models;
   await load(0);await Promise.all([load(1),load(2)]);await Promise.all([load(3),load(4)]);if(dead)return;
   await renderer.compileAsync(scene,camera);if(!dead)warmed=true;
  }catch(e){if(!dead)props.current.onError('Caricamento 3D non riuscito: '+(e instanceof Error?e.message:String(e)));}})();
  let width=0,height=0,portrait=false,viewHeight=5.81,viewWidth=10.3;
  const host=element.parentElement!;
  const panels=[host.querySelector<HTMLElement>('[data-pose]')!,...host.querySelectorAll<HTMLElement>('.hud-layer [data-panel]')];
  const info=host.querySelector<HTMLElement>('.product-info')!;
  let areas:ScreenRect[]=[],rimHeights:number[]=[],arrowKey='',layoutRevision=0;
  function placeArrows(section:number){
   const area=areas[section],position=((area[1]+area[3])*50).toFixed(2)+'%';
   if(position!==arrowKey){arrowKey=position;host.style.setProperty('--arrow-y',position);}
  }
  function frameShots(rig:Rig){
   const hero=stageFrame(rig.meta,viewWidth,viewHeight,portrait,areas[0]);
   rig.shots=[hero,...[1,2,3,4].map(i=>chapterFrame(i,rig.meta,hero,viewWidth,viewHeight,portrait,areas[i])),hero];
  }
  const resize=()=>{
   const w=Math.max(1,element.clientWidth),h=Math.max(1,element.clientHeight);
   const changed=w!==width||h!==height;
   width=w;height=h;portrait=h>w;
   if(changed){
    const pixels=portrait?1150000:2250000;
    renderer.setPixelRatio(Math.min(devicePixelRatio,portrait?1.65:1.8,Math.sqrt(pixels/(w*h))));
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();camera.updateMatrixWorld();
    viewHeight=2*Math.tan(camera.fov*Math.PI/360)*camera.position.z;viewWidth=viewHeight*camera.aspect;
    optics.resize(w,h);fog.resize(w,h);lightStage.resize(viewWidth);
   }
   const canvasRect=element.getBoundingClientRect(),masthead=info.getBoundingClientRect();
   const cap=info.querySelector('h1')!.getBoundingClientRect().height;
   const top=Math.max(.075,Math.min(.22,(masthead.top-canvasRect.top+cap*.48)/h));
   const panelTops=panels.map(panel=>(panel.getBoundingClientRect().top-canvasRect.top)/h);
   const next=panelTops.map((panelTop,i)=>productArea(portrait,panelTop,portrait&&i===0?Math.max(.165,top):top,i===0?.14:.10,i===0?.86:.90,i===0?.02:.045));
   const rims=next.map((area,i)=>i===0?area[3]+.003:Math.min(area[3]+.025,panelTops[i]-.083));
   if(!changed&&next.every((rect,i)=>rims[i]===rimHeights[i]&&rect.every((n,k)=>n===areas[i]?.[k])))return;
   layoutRevision++;areas=[...next,next[0]];rimHeights=[...rims,rims[0]];placeArrows(sectionAt(s.target));
   for(const rig of rigs)if(rig)frameShots(rig);
  };
  resize();const observer=new ResizeObserver(resize);observer.observe(element);observer.observe(info);
  for(const panel of panels)observer.observe(panel);

  const raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2();
  raycaster.layers.enableAll();
  function hitAt(x:number,y:number,allowPlane=false){
   const rig=rigs[s.selected];if(!rig)return null;
   const rect=element.getBoundingClientRect();
   ndc.set((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2);
   raycaster.setFromCamera(ndc,camera);
   const hits=raycaster.intersectObjects(rig.meshes,false);
   const hit=hits[0];
   if(hit)return rig.scene.worldToLocal(hit.point.clone());
   if(!allowPlane)return null;
   const point=raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),-rig.group.position.z),new THREE.Vector3());
   if(!point)return null;
   const local=rig.scene.worldToLocal(point);
   return local.clamp(v(rig.meta.bounds.min),v(rig.meta.bounds.max));
  }
  let focusOwner=-1;
  const unbind=bindGestures(element,s,{
   hitsProduct:(x,y)=>!!hitAt(x,y),
   focus:(x,y,allowPlane)=>{const p=hitAt(x,y,allowPlane);if(p){focusOwner=s.selected;s.focus=p.toArray() as [number,number,number];props.current.onInteract();}},
   emptyTap:(x,y)=>{
    const row=document.elementsFromPoint(x,y).map(el=>el.closest<HTMLButtonElement>('[data-config]')).find(Boolean);
    if(row&&!rigs.some(rig=>rig&&raycaster.intersectObjects(rig.meshes,false).length))row.click();
   },
   chapter:target=>props.current.onChapter(target),renderUI:()=>props.current.onInteract(),
  });
  const lost=(e:Event)=>{e.preventDefault();props.current.onError('La sessione grafica è stata interrotta. Riprova per ripristinare lo showroom.');};
  element.addEventListener('webglcontextlost',lost);
  const cursor=new THREE.Vector2(),cursorX=new MotionValue(),cursorY=new MotionValue();
  const cursorMove=(e:PointerEvent)=>{if(e.pointerType==='mouse')cursor.set(e.clientX/width*2-1,1-e.clientY/height*2);};
  const cursorLeave=()=>cursor.set(0,0);
  element.addEventListener('pointermove',cursorMove,{passive:true});element.addEventListener('pointerleave',cursorLeave);
  const carousel=new Carousel(),scroll=new MotionValue(),zoom=new MotionValue(1),fold=new MotionValue(),explosion=new MotionValue();
  const customFold=s.customFold.map(x=>new MotionValue(x)),customExplode=s.customExplode.map(x=>new MotionValue(x));
  const views={side:[0,0],top:[Math.PI/2,0],edge:[0,Math.PI/2],perspective:[.38,-.52]};
  const carrier=new THREE.Vector3(),station=new THREE.Vector3(),home=new THREE.Vector3(),offset=new THREE.Vector3(),focus=new THREE.Vector3();
  const basePose=new THREE.Quaternion(),shotPose=new THREE.Quaternion(),adjustment=new THREE.Quaternion(),turn=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
  const fitPivot=new THREE.Object3D(),modelToFit=new THREE.Matrix4(),normalizer=new THREE.Matrix4();
  let last=performance.now(),time=0,lastActivity=-1,frames=0,frameWindow=0;
  const visibility=()=>{last=performance.now();};document.addEventListener('visibilitychange',visibility);
  const lightAim=new THREE.Vector3();
  let stillFor=0,previousDrawState='';
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
   const auto=Math.abs(s.target-Math.round(s.target))<.001&&sectionAt(s.target)===0&&heroWeight>.999&&s.ready.length===5&&warmed&&s.closed===0&&s.exploded===0&&Math.abs(s.zoom-1)<.001&&!hasManualRotation(s);
   if(!auto&&s.knifeDestination===null&&!carousel.manuallyTravelling&&Math.abs(carousel.phase-Math.round(carousel.phase))>1e-5)carousel.request(Math.round(carousel.phase),s.reduced);
   const phase=carousel.step(elapsed,auto,s.paused||s.interacting,s.reduced);
   s.orbit=phase;
   if(s.knifeDestination!==null&&Math.abs(phase-s.knifeDestination)<1e-7)s.knifeDestination=null;
   const currentSection=sectionAt(s.target);
   placeArrows(currentSection);
   const rimY=THREE.MathUtils.lerp(rimHeights[chapter],rimHeights[chapter+1],blend);
   const track=lightStage.group;
   const slope=(rimY-.5)*viewHeight/CAMERA_DISTANCE-.049;
   track.rotation.x=-Math.atan(slope);
   railPoint(0,track.scale.x,track.scale.z,0,station,slope);
   track.position.y=(.5-rimY)*viewHeight*(CAMERA_DISTANCE-station.z)/CAMERA_DISTANCE-station.y;
   station.y+=track.position.y;
   const nearest=mod(Math.round(phase));
   if(rigs[nearest])s.selected=nearest;
   if(!hasManualRotation(s)&&!s.interacting&&s.closed===0&&s.exploded===0&&fold.value<.0001&&explosion.value<.0001){
    lifeTime+=dt;idle=livingPose(lifeTime,cursorX.step(cursor.x,dt,5),cursorY.step(cursor.y,dt,5),s.reduced);
   }
   const macro=s.view==='clip'||s.view==='screw'?s.view:null;
   const foldValue=fold.step(s.closed,dt,10),explodeValue=explosion.step(s.exploded,dt,9);
   customFold.forEach((v,i)=>v.step(s.customFold[i],dt,10));customExplode.forEach((v,i)=>v.step(s.customExplode[i],dt,9));
   const magnification=zoom.step(s.zoom,dt,s.reduced?32:14);
   const value=(n:number,custom:MotionValue[],normal:number)=>n>=1&&n<=3?custom[n-1].value:normal;
   const shownFold=THREE.MathUtils.lerp(value(chapter,customFold,foldValue),value(chapter+1,customFold,foldValue),blend);
   const shownExplosion=THREE.MathUtils.lerp(value(chapter,customExplode,explodeValue),value(chapter+1,customExplode,explodeValue),blend);
   lightAim.set(0,0,0);let aimWeight=0;
   for(let i=0;i<rigs.length;i++){
    const rig=rigs[i];if(!rig)continue;
    const slot=slotOffset(i,phase),near=stationWeight(slot);
    const atStation=1-smooth(Math.abs(slot)/.76),chapterAmount=atStation*(1-heroWeight);
    const controls=THREE.MathUtils.lerp(atStation,near,heroWeight);
    const stage=rig.shots[0],a=rig.shots[chapter],b=rig.shots[chapter+1],units=DISPLAY/rig.meta.bounds.size[0];
    const baseScale=stage.scale*(CAMERA_DISTANCE-station.z)/CAMERA_DISTANCE;
    railPoint(slot,track.scale.x,track.scale.z,track.position.y,carrier,slope);
    const arc=railAngle(slot)-RAIL.landing;
    basePose.copy(presentation(.17,.57,.67+.10*Math.cos(arc+i*.7))).premultiply(turn.setFromAxisAngle(up,arc)).slerp(stage.rotation,near);
    // At the right shoulder the blade leans back into the frame, pivoting
    // around its rail contact as it crosses the foreground.
    const angle=arc+RAIL.landing;
    const facingIn=smooth((Math.sin(angle)-.015)/.39)*smooth((Math.cos(angle)-.13)/.60);
    if(facingIn>0){
     offset.set(-1,0,0).applyQuaternion(stage.rotation);
     basePose.slerp(presentation(.14,.17,Math.PI-Math.atan2(offset.y,offset.x)),facingIn);
    }
    basePose.premultiply(adjustment.identity().slerp(idle.rotation,near*heroWeight));
    // The open blade vertex sits on the rail in world space. A folded blade
    // moves about its authored hinge, while its handle keeps the carrier pivot.
    offset.subVectors(stage.focus,rig.tip).multiplyScalar(units*baseScale);
    home.copy(offset).applyQuaternion(stage.rotation).add(station);
    rig.group.position.copy(offset).applyQuaternion(basePose).add(carrier);
    rig.group.position.y+=.018;
    offset.lerpVectors(a.position,b.position,blend).sub(home);
    rig.group.position.addScaledVector(offset,chapterAmount);
    shotPose.slerpQuaternions(a.rotation,b.rotation,blend);
    rig.group.quaternion.copy(basePose).slerp(shotPose,chapterAmount);
    const inspection=rig.shots[4],detail=macro?rig.details[macro]:null;
    if(detail){
     adjustment.copy(presentation(macro==='clip'?.13:.04,detail.positiveZ?Math.PI-.09:.09,portrait?.74:.10));
     adjustment.multiply(turn.copy(inspection.rotation).invert());
    }else{
     const angles=views[s.view as keyof typeof views]??views.side;
     adjustment.setFromEuler(new THREE.Euler(angles[0],angles[1],0,'YXZ'));
    }
    turn.identity().slerp(adjustment,inspectWeight).premultiply(s.rotation);
    rig.manual.slerp(turn,1-Math.exp(-dt*11));
    rig.group.quaternion.premultiply(adjustment.identity().slerp(rig.manual,controls));
    rig.fold=shownFold*controls;rig.explosion=rig.compact*shownExplosion*controls;
    rig.open.time=clamp(rig.fold)*rig.meta.motion.closedTime;rig.mixer.update(0);sampleExplosion(rig.parts,rig.explosion);
    focus.lerpVectors(a.focus,b.focus,blend);
    const picked=s.focus&&focusOwner===i;
    if(inspectWeight>.001){
     if(picked)focus.lerp(offset.fromArray(s.focus!),inspectWeight);
     else if(detail)focus.lerp(partCenter(rig.scene,detail),inspectWeight);
    }
    focus.lerp(stage.focus,1-atStation);
    rig.content.position.lerp(focus.negate(),1-Math.exp(-dt*(s.reduced?28:16)));
    const scale=THREE.MathUtils.lerp(baseScale,THREE.MathUtils.lerp(a.scale,b.scale,blend),chapterAmount);
    let cap=1;
    if(inspectWeight>.001&&atStation>.001){
     if(detail){
      const size=detail.span*units*inspection.scale;
      cap=clamp(Math.min(viewWidth*.67,viewHeight*.52)*(macro==='screw'?.24:1)/size,1,12);
     }else if((s.view!=='side'||hasManualRotation(s))&&!picked){
      fitPivot.position.copy(inspection.position);fitPivot.scale.setScalar(inspection.scale);
      fitPivot.quaternion.copy(inspection.rotation).premultiply(rig.manual);fitPivot.updateMatrixWorld();
      normalizer.makeScale(units,units,units).setPosition(offset.copy(rig.content.position).multiplyScalar(units));
      modelToFit.multiplyMatrices(fitPivot.matrixWorld,normalizer);
      for(const mesh of rig.fitMeshes)mesh.matrixWorld.multiplyMatrices(modelToFit,mesh.matrix);
      cap=fitBoundsScale(camera,fitPivot,rig.fitMeshes,areas[4]);
     }
    }
    rig.fit=THREE.MathUtils.lerp(rig.fit,1+(cap-1)*inspectWeight,1-Math.exp(-dt*12));
    rig.group.scale.setScalar(scale*THREE.MathUtils.lerp(1,rig.fit*magnification,controls));
    rig.group.updateMatrixWorld(true);
    lightAim.addScaledVector(rig.group.position,near);aimWeight+=near;
    const configKey=JSON.stringify(s.configs[i]);
    if(configKey!==rig.key){for(const role of ['blade','handle','metals'] as const)finishMaterial(rig.materials[role],i,role,s.configs[i][role],textures);rig.key=configKey;}
   }
   if(aimWeight>0)lightAim.divideScalar(aimWeight);
   const active=rigs[s.selected];
   lightStage.update(s.selected,dt,lightAim,s.lighting);
   scene.environmentIntensity=lightStage.environment;scene.environmentRotation.y=lightStage.rotation;
   // Once the reduced-motion frame has settled, the browser can retain it.
   // Input, camera travel, newly loaded assets and layout changes wake the lens.
   const drawState=s.reduced?[s.activity,s.ready.length,layoutRevision,phase.toFixed(5)].join('/'):'';
   stillFor=s.reduced&&drawState===previousDrawState?stillFor+dt:0;previousDrawState=drawState;
   try{if(stillFor<1.6){
    renderer.info.reset();
    optics.render(scene,camera,THREE.MathUtils.lerp(CAMERA_DISTANCE-station.z,CAMERA_DISTANCE,1-heroWeight),track.position.y+(CAMERA_DISTANCE-RAIL.centerZ)*slope,slope);
    fog.render(s.reduced?0:time,lightStage.tint,lightStage.fog);
   }}catch(e){props.current.onError('Errore di rendering. Riprova per ripristinare la scena.');cancelAnimationFrame(raf);console.error(e);return;}
   props.current.onFrame(s.progress,s.selected,s.ready.length);
   frames++;frameWindow+=elapsed;
   if(frameWindow>1){
    element.dataset.fps=String(Math.round(frames/frameWindow));frames=0;frameWindow=0;
   }
   element.dataset.closed=active?.fold.toFixed(3)??'0';element.dataset.exploded=active?.explosion.toFixed(3)??'0';
   element.dataset.zoom=magnification.toFixed(3);element.dataset.light=String(s.lighting);
   element.dataset.orbit=phase.toFixed(4);element.dataset.warmed=String(warmed);element.dataset.dragging=String(s.interacting);
  }
  raf=requestAnimationFrame(animate);
  return ()=>{
   dead=true;cancelAnimationFrame(raf);observer.disconnect();unbind();document.removeEventListener('visibilitychange',visibility);
   element.removeEventListener('pointermove',cursorMove);element.removeEventListener('pointerleave',cursorLeave);element.removeEventListener('webglcontextlost',lost);
   for(const rig of rigs)if(rig){rig.mixer.stopAllAction();rig.mixer.uncacheRoot(rig.scene);for(const mesh of rig.meshes)mesh.geometry.dispose();Object.values(rig.materials).forEach(m=>m.dispose());}
   Object.values(textures).forEach(t=>t.dispose());fog.dispose();env.dispose();optics.dispose();lightStage.dispose();depthOnly.dispose();renderer.dispose();
  };
 },[state]);
 return <canvas className="stage" ref={canvas} tabIndex={0} aria-label="Modello 3D. Trascina per ruotare. Usa rotella, pinch o i tasti più e meno per lo zoom."/>;
}
