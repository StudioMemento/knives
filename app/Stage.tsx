'use client';
import {useEffect,useRef,type MutableRefObject} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {createExplosion,sampleExplosion,compactExplosion,type ExplodedPart} from './lib/explosion';
import {stageFrame,chapterFrame,livingPose,heroTiltFit,presentation,productArea,CAMERA_DISTANCE,DISPLAY,type Frame,type ScreenRect} from './lib/presentation';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {Carousel} from './lib/carousel';
import {assemblyWeight,backdropOpacity,slotOffset,RAIL,railPoint,animateBackdrop} from './lib/choreography';
import {MotionValue,focusWeight,orbitAngle} from './lib/motion';
import {createLightStage} from './lib/lighting';
import {fitBoundsScale,slideTravel} from './lib/framing';
import {createCutSurface,setCutPlane} from './lib/cut-surface';
import {bindGestures} from './lib/gestures';
import {makeMaterial,makeTextures,finishMaterial} from './lib/materials';
import {createSoftLayers,REAR_LAYER,REFLECTION_LAYER,REAR_DEPTH_LAYER} from './lib/soft-layers';
import {KNIVES,mod,clamp,smooth,sectionAt,hasManualRotation,resetInspection,type DemoState,type ModelMeta,type Surface} from './lib/state';

type Props={
 state:MutableRefObject<DemoState>;onFrame:(progress:number,id:number,ready:number)=>void;
 onError:(message:string)=>void;onInteract:()=>void;onChapter:(target:number)=>void;
};
type Departure={position:THREE.Vector3;rotation:THREE.Quaternion;content:THREE.Vector3;scale:number;fold:number;explosion:number};
type Rig={
 meta:ModelMeta;group:THREE.Group;content:THREE.Group;scene:THREE.Group;mixer:THREE.AnimationMixer;open:THREE.AnimationAction;
 parts:ExplodedPart[];meshes:THREE.Mesh[];mirrors:THREE.Mesh[];materials:Record<Surface,THREE.MeshStandardMaterial>;key:string;
 fold:number;explosion:number;fit:number;sharp:number;visibility:number;compact:number;shots:Frame[];fitMeshes:THREE.Mesh[];slideX:number;departure:Departure|null;
};
const v=(a:number[])=>new THREE.Vector3(a[0],a[1],a[2]);
const FRONT=3;

export default function Stage({state,...callbacks}:Props){
 const canvas=useRef<HTMLCanvasElement>(null);const props=useRef(callbacks);props.current=callbacks;
 useEffect(()=>{
  if(!canvas.current)return;const s=state.current;s.ready=[];const element=canvas.current;element.dataset.boot='mounted';let dead=false,raf=0,renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({canvas:element,antialias:true,alpha:true,stencil:true,powerPreference:'high-performance'});}catch{props.current.onError('WebGL non disponibile. Apri la demo in un browser con accelerazione grafica.');return;}
  renderer.info.autoReset=false;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.setClearColor('#000000',0);renderer.localClippingEnabled=true;renderer.autoClear=false;
  const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(34,1,.05,80);camera.position.set(0,0,CAMERA_DISTANCE);
  const textures=makeTextures(),soft=createSoftLayers(renderer),rigs:(Rig|undefined)[]=Array(5),reflectionGroup=new THREE.Group();scene.add(reflectionGroup);
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
  const studioCards=[
   [-3,7,6,8,1.4,4],[5,4,-3,2,6,2.5],
   [.8,4.4,6,8,5,2.2],[-6,3.8,2.3,3,7,3],
  ];
  for(const [x,y,z,w,h,intensity] of studioCards){
   const card=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(intensity,intensity*.97,intensity*.92),side:THREE.DoubleSide}));
   card.position.set(x,y,z);card.lookAt(0,3.5,0);room.add(card);
  }
  const env=pmrem.fromScene(room,.025);scene.environment=env.texture;scene.environmentRotation.y=.18;room.dispose();pmrem.dispose();
  // The generator releases its temporary framebuffer and textures. Rebind
  // renderer state before the carousel starts sampling its own blur targets.
  renderer.resetState();
  const ambient=new THREE.HemisphereLight('#eaf2fa','#242326',.45);ambient.layers.enableAll();scene.add(ambient);
  const key=new THREE.DirectionalLight('#fff6e9',2.65);key.position.set(3,4,5);key.layers.enableAll();scene.add(key);
  const face=new THREE.DirectionalLight('#ffffff',1.5);face.position.set(.5,1,7);face.layers.enableAll();scene.add(face);
  const rim=new THREE.DirectionalLight('#ffdfb9',2.2);rim.position.set(-3,2,-3);rim.layers.enableAll();scene.add(rim);
  const fill=new THREE.DirectionalLight('#bdd6ea',.85);fill.position.set(-4,1,3);fill.layers.enableAll();scene.add(fill);
  const lightStage=createLightStage();scene.add(lightStage.group);
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);let metas:ModelMeta[]=[],warmed=false;
  const depthOnly=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:THREE.DoubleSide});
  const cutSurface=createCutSurface(renderer);
  const clipPlanes=[new THREE.Plane(),new THREE.Plane(),new THREE.Plane()];
  const getRole=(mesh:THREE.Mesh):Surface=>{const mat=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;const name=String(mesh.userData.materialRole||mat.name||mesh.name).toLowerCase();return name.includes('blade')?'blade':name.includes('handle')?'handle':'metals';};
  async function load(index:number){
   const meta=metas.find(m=>m.id===KNIVES[index]);if(!meta)throw Error('Manifest modello mancante: '+KNIVES[index]);
   const gltf=await loader.loadAsync(meta.url);if(dead)return;
   const group=new THREE.Group(),scaleGroup=new THREE.Group(),content=new THREE.Group();group.add(scaleGroup);scaleGroup.add(content);content.add(gltf.scene);scene.add(group);scaleGroup.scale.setScalar(DISPLAY/meta.bounds.size[0]);content.position.copy(v(meta.bounds.center)).negate();
   const materials={blade:makeMaterial('blade'),handle:makeMaterial('handle'),metals:makeMaterial('metals')};
   for(const role of ['blade','handle','metals'] as const){const m=materials[role];m.transparent=true;m.depthWrite=true;m.forceSinglePass=true;finishMaterial(m,role,state.current.configs[index][role],textures);}
   const meshes:THREE.Mesh[]=[],mirrors:THREE.Mesh[]=[];
   gltf.scene.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const role=getRole(o);o.material=materials[role];o.frustumCulled=false;o.userData.surface=role;o.layers.set(index===state.current.selected?FRONT:REAR_LAYER);meshes.push(o);
    const mirror=new THREE.Mesh(o.geometry,new THREE.MeshBasicMaterial({color:role==='handle'?'#5b5249':'#bca082',transparent:true,opacity:role==='handle'?.20:.35,side:THREE.DoubleSide,depthWrite:false,forceSinglePass:true}));mirror.matrixAutoUpdate=false;mirror.frustumCulled=false;mirror.layers.set(REFLECTION_LAYER);reflectionGroup.add(mirror);mirrors.push(mirror);
   });
   const mixer=new THREE.AnimationMixer(gltf.scene),openClip=gltf.animations.find(c=>c.name===meta.motion.openCloseClip),explodeClip=gltf.animations.find(c=>c.name===meta.motion.explodeClip);if(!openClip||!explodeClip)throw Error('Animazioni non disponibili: '+meta.id);
   const open=mixer.clipAction(openClip),parts=createExplosion(gltf.scene,explodeClip,meta.motion.explodePeakTime);for(const action of [open]){action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;action.setEffectiveWeight(1);}
   group.updateMatrixWorld(true);
   const toLocal=gltf.scene.matrixWorld.clone().invert();
   const fitMeshes=meshes.map(mesh=>{
    const proxy=new THREE.Mesh(mesh.geometry,depthOnly);proxy.matrixAutoUpdate=false;
    proxy.matrix.multiplyMatrices(toLocal,mesh.matrixWorld);return proxy;
   });
   const rig:Rig={meta,group,content,scene:gltf.scene,mixer,open,parts,meshes,mirrors,materials,key:JSON.stringify(s.configs[index]),
    fold:0,explosion:0,fit:1,sharp:0,visibility:1,compact:compactExplosion(parts,DISPLAY),shots:[],fitMeshes,slideX:0,departure:null};
   rigs[index]=rig;frameShots(rig);s.ready.push(index);s.ready.sort();
  }
  (async()=>{try{
   const response=await fetch('/models/v48/manifest.json');if(!response.ok)throw Error('Impossibile leggere i modelli');metas=(await response.json()).models;
   await load(0);await Promise.all([load(1),load(2)]);await Promise.all([load(3),load(4)]);if(dead)return;
   const mask=camera.layers.mask;let shaders:Promise<THREE.Object3D>,depthShaders:Promise<THREE.Object3D>;
   try{camera.layers.enableAll();shaders=renderer.compileAsync(scene,camera);scene.overrideMaterial=depthOnly;depthShaders=renderer.compileAsync(scene,camera);}
   finally{scene.overrideMaterial=null;camera.layers.mask=mask;}
   // Never leave an override material on the live scene while compilation waits.
   await Promise.all([shaders,depthShaders]);if(!dead)warmed=true;
  }catch(e){if(!dead)props.current.onError('Caricamento 3D non riuscito: '+(e instanceof Error?e.message:String(e)));}})();
  let width=0,height=0,portrait=false,viewHeight=5.81,viewWidth=10.3;
  const host=element.parentElement!;
  const panels=[host.querySelector<HTMLElement>('[data-pose]')!,...host.querySelectorAll<HTMLElement>('.hud-layer [data-panel]')];
  let areas:ScreenRect[]=[];
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
    soft.resize(w,h);
   }
   const top=element.getBoundingClientRect().top;
   const next=panels.map(panel=>productArea(portrait,(panel.getBoundingClientRect().top-top)/h));
   if(!changed&&next.every((rect,i)=>rect[3]===areas[i]?.[3]))return;
   areas=[...next,next[0]];
   for(const rig of rigs)if(rig)frameShots(rig);
  };
  resize();const observer=new ResizeObserver(resize);observer.observe(element);
  for(const panel of panels)observer.observe(panel);

  const raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2();
  raycaster.layers.enableAll();
  function hitAt(x:number,y:number,allowPlane=false){
   const rig=rigs[s.selected];if(!rig)return null;
   const rect=element.getBoundingClientRect();
   ndc.set((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2);
   raycaster.setFromCamera(ndc,camera);
   const hits=raycaster.intersectObjects(rig.meshes,false);
   const planes=rig.materials.blade.clippingPlanes??[];
   const hit=hits.find(h=>planes.every(p=>p.distanceToPoint(h.point)>=-.0001));
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
  const lost=(e:Event)=>{e.preventDefault();props.current.onError('La sessione grafica è stata interrotta. Riprova per ripristinare lo showroom.');};
  element.addEventListener('webglcontextlost',lost);
  const cursor=new THREE.Vector2(),cursorX=new MotionValue(),cursorY=new MotionValue();
  const cursorMove=(e:PointerEvent)=>{if(e.pointerType==='mouse')cursor.set(e.clientX/width*2-1,1-e.clientY/height*2);};
  const cursorLeave=()=>cursor.set(0,0);
  element.addEventListener('pointermove',cursorMove,{passive:true});element.addEventListener('pointerleave',cursorLeave);
  const carousel=new Carousel(),scroll=new MotionValue(),zoom=new MotionValue(1),idleAmount=new MotionValue(1),fold=new MotionValue(),explosion=new MotionValue();
  const customFold=s.customFold.map(x=>new MotionValue(x)),customExplode=s.customExplode.map(x=>new MotionValue(x));
  const viewRotation=new THREE.Quaternion(),views={side:[0,0],top:[Math.PI/2,0],edge:[0,Math.PI/2],perspective:[.38,-.52]};
  const mirrorMatrix=new THREE.Matrix4(),mirrorFlip=new THREE.Matrix4().makeScale(1,-1,1);
  function renderProducts(sharp:boolean){
   for(const rig of rigs){
    if(!rig?.group.visible)continue;
    const opacity=rig.visibility*(sharp?rig.sharp:1-rig.sharp);
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
  const identity=new THREE.Quaternion();
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
   const auto=Math.abs(s.target-Math.round(s.target))<.001&&sectionAt(s.target)===0&&heroWeight>.999&&s.ready.length===5&&warmed&&s.closed===0&&s.exploded===0;
   const phase=carousel.step(elapsed,auto,s.paused||s.interacting,s.reduced);
   s.orbit=phase;
   if(s.knifeDestination!==null&&Math.abs(phase-s.knifeDestination)<1e-7)s.knifeDestination=null;
   const stageDistance=Math.min(u,5-u),headingToStage=sectionAt(s.target)===0;
   if(headingToStage){railPhase=phase;showBackdrop=true;}
   else if(stageDistance>=.62)showBackdrop=false;
   const rearAlpha=showBackdrop?backdropOpacity(stageDistance):0;
   const inDetail=!showBackdrop&&!headingToStage;
   const nearest=mod(Math.round(phase));
   if(rigs[nearest]&&nearest!==s.selected){
    const leaving=rigs[s.selected];
    if(leaving&&inDetail){
     const position=leaving.group.position.clone();position.x-=leaving.slideX;
     leaving.departure={position,rotation:leaving.group.quaternion.clone(),content:leaving.content.position.clone(),
      scale:leaving.group.scale.x,fold:leaving.fold,explosion:leaving.explosion};
    }
    s.selected=nearest;resetInspection(s);
    if(inDetail){
     fold.reset(0);explosion.reset(0);zoom.reset(1);viewRotation.identity();
     customFold.forEach((m,i)=>m.reset(s.customFold[i]));customExplode.forEach(m=>m.reset(0));
    }
   }
   if(s.closed===0&&s.exploded===0&&fold.value<.0001&&explosion.value<.0001){
    lifeTime+=dt;idle=livingPose(lifeTime,cursorX.step(cursor.x,dt,5),cursorY.step(cursor.y,dt,5),s.reduced);
   }
   const idleWeight=idleAmount.step(s.interacting?.3:1,dt,7);
   const view=views[s.view],orbit=new THREE.Quaternion().setFromEuler(new THREE.Euler(view[0]*inspectWeight,view[1]*inspectWeight,0,'YXZ')).premultiply(s.rotation);
   viewRotation.slerp(orbit,1-Math.exp(-dt*11));
   const zoomValue=zoom.step(s.zoom,dt,12),foldValue=fold.step(s.closed,dt,10),explodeValue=explosion.step(s.exploded,dt,9);
   customFold.forEach((v,i)=>v.step(s.customFold[i],dt,10));customExplode.forEach((v,i)=>v.step(s.customExplode[i],dt,9));
   mirrorMatrix.makeTranslation(0,2*RAIL.floorY,0).multiply(mirrorFlip);
   let caps:THREE.Plane[]=[];
   for(let i=0;i<rigs.length;i++){
    const rig=rigs[i];if(!rig)continue;
    const front=i===s.selected,wasVisible=rig.group.visible;
    const delta=slotOffset(i,phase),traveller=inDetail&&Math.abs(delta)<1;
    if(front||!traveller)rig.departure=null;
    const held=rig.departure;
    const slot=mod(i-(front?phase:railPhase)),distance=Math.min(slot,5-slot),weight=focusWeight(distance);
    rig.visibility=front||traveller?1:rearAlpha;
    rig.group.visible=rig.visibility>.001;
    if(!rig.group.visible){for(const mirror of rig.mirrors)mirror.visible=false;continue;}
    rig.sharp=inDetail?1:front?THREE.MathUtils.lerp(1,weight,heroWeight):weight;
    const assembly=assemblyWeight(distance);
    const scenery=inDetail?0:(1-assembly)*(front?heroWeight:1);
    const angle=orbitAngle(slot);
    const stage=rig.shots[0],rail=railPoint(angle);
    const scenicScale=.43;
    const heroScale=THREE.MathUtils.lerp(scenicScale,stage.scale,weight);
    rail.y+=scenicScale*DISPLAY*.45;
    const heroPos=rail.lerp(stage.position,weight);
    const spin=s.reduced?0:time*.56+i*1.31;
    const heroRotation=presentation(.15+.24*Math.sin(spin),.45*Math.sin(spin*.76)+.24*Math.sin(angle),1.03+.22*Math.cos(spin)-.14*Math.cos(angle)).slerp(stage.rotation,weight);
    const hero={...stage,position:heroPos,rotation:heroRotation,scale:heroScale};
    const base=(n:number)=>(!front&&!traveller)||n===0||n===5?hero:rig.shots[n];
    const a=base(chapter),b=base(chapter+1);
    const pose=new THREE.Quaternion().slerpQuaternions(a.rotation,b.rotation,blend);
    const lifeStrength=heroWeight*weight*idleWeight;
    pose.premultiply(identity.clone().slerp(idle.rotation,lifeStrength));
    if(front)pose.premultiply(identity.clone().slerp(viewRotation,inDetail?1:weight));
    rig.group.quaternion.copy(pose);
    rig.group.position.lerpVectors(a.position,b.position,blend);
    let scale=THREE.MathUtils.lerp(a.scale,b.scale,blend);
    const controlWeight=front?heroWeight+inspectWeight:0;
    const authored=(n:number,value:number)=>n>=1&&n<=3&&front?customFold[n-1].value:value;
    const spread=(n:number)=>n>=1&&n<=3&&front?customExplode[n-1].value:0;
    rig.fold=THREE.MathUtils.lerp(authored(chapter,a.closed),authored(chapter+1,b.closed),blend)+foldValue*controlWeight*assembly;
    rig.explosion=.75*scenery+rig.compact*(explodeValue*controlWeight*assembly+THREE.MathUtils.lerp(spread(chapter),spread(chapter+1),blend));
    if(held){
     rig.group.position.copy(held.position);rig.group.quaternion.copy(held.rotation);
     scale=held.scale;rig.fold=held.fold;rig.explosion=held.explosion;
    }
    rig.open.time=clamp(rig.fold)*rig.meta.motion.closedTime;rig.mixer.update(0);
    sampleExplosion(rig.parts,rig.explosion);
    animateBackdrop(rig.parts,s.reduced?0:scenery,time,i);
    const focus=new THREE.Vector3().lerpVectors(a.focus,b.focus,blend);
    if(s.focus&&front&&inspectWeight>.001)focus.lerp(v(s.focus),inspectWeight);
    focus.negate();
    if(held)rig.content.position.copy(held.content);
    else if(!wasVisible)rig.content.position.copy(focus);
    else rig.content.position.lerp(focus,1-Math.exp(-dt*(s.reduced?28:14)));
    rig.group.scale.setScalar(scale);rig.group.updateMatrixWorld(true);
    if(inspectWeight>.001&&front){
     const moved=s.view!=='side'||hasManualRotation(s);
     if(moved)for(const mesh of rig.fitMeshes)mesh.matrixWorld.multiplyMatrices(rig.scene.matrixWorld,mesh.matrix);
     const cap=moved&&!s.focus?fitBoundsScale(camera,rig.group,rig.fitMeshes,areas[4]):1;
     const desired=1+(cap-1)*inspectWeight;
     rig.fit+=(desired-rig.fit)*(1-Math.exp(-dt*10));
     scale*=rig.fit*(1+(zoomValue-1)*inspectWeight);
     rig.group.scale.setScalar(scale);rig.group.updateMatrixWorld(true);
    }else if(front&&heroWeight>.005&&weight>.9){
     const cap=heroTiltFit(rig.meta,stage.focus,pose,rig.group.position,scale,viewWidth,viewHeight,areas[0][3]+.025);
     rig.fit=1+(cap-1)*heroWeight*smooth((weight-.9)/.1);
     rig.group.scale.setScalar(scale*rig.fit);rig.group.updateMatrixWorld(true);
    }else rig.fit=1;
    rig.slideX=0;
    if(traveller&&Math.abs(delta)>.00001){
     rig.slideX=delta*slideTravel(camera,rig.meshes,Math.sign(delta));rig.group.position.x+=rig.slideX;
     rig.group.updateMatrixWorld(true);
    }
    const configKey=JSON.stringify(s.configs[i]);
    if(configKey!==rig.key){for(const role of ['blade','handle','metals'] as const)finishMaterial(rig.materials[role],role,s.configs[i][role],textures);rig.key=configKey;}
    const planes:THREE.Plane[]=[];
    if(front&&inspectWeight>.98){
     for(let k=0;k<3;k++)if(s.cuts[k]>0){setCutPlane(clipPlanes[k],k,s.cuts[k],rig.group.quaternion,rig.meshes);planes.push(clipPlanes[k]);}
     caps=planes;
    }
    for(const mat of Object.values(rig.materials))mat.clippingPlanes=planes;
    rig.mirrors.forEach((mirror,j)=>{
     mirror.visible=rig.meshes[j].userData.surface!=='metals'&&(front||!portrait)&&!planes.length;
     if(!mirror.visible)return;
     (mirror.material as THREE.MeshBasicMaterial).opacity=(rig.meshes[j].userData.surface==='handle'?.14:.22)*rig.visibility;
     mirror.matrix.multiplyMatrices(mirrorMatrix,rig.meshes[j].matrixWorld);mirror.matrixWorldNeedsUpdate=true;
    });
   }
   const active=rigs[s.selected];
   lightStage.update(s.selected,dt);
   try{
    renderer.info.reset();renderer.setRenderTarget(null);renderer.clear();camera.layers.set(0);renderer.render(scene,camera);
    renderProducts(false);soft.render(scene,camera,rearAlpha>.001,CAMERA_DISTANCE-(active?.group.position.z??0));
    if(!soft.enabled){camera.layers.set(REAR_LAYER);renderer.render(scene,camera);}
    renderProducts(true);renderer.clearDepth();camera.layers.set(FRONT);
    if(rigs.some(r=>r?.group.visible&&r.sharp>.001&&(r.sharp<.999||r.visibility<.999))){scene.overrideMaterial=depthOnly;renderer.render(scene,camera);scene.overrideMaterial=null;}
    renderer.render(scene,camera);
    if(active&&caps.length)cutSurface.render(camera,active.meshes,caps);
   }catch(e){props.current.onError('Errore di rendering. Riprova per ripristinare la scena.');cancelAnimationFrame(raf);console.error(e);return;}
   props.current.onFrame(s.progress,s.selected,s.ready.length);
   frames++;frameWindow+=elapsed;
   if(frameWindow>1){
    element.dataset.fps=String(Math.round(frames/frameWindow));frames=0;frameWindow=0;
   }
   element.dataset.closed=active?.fold.toFixed(3)??'0';element.dataset.exploded=active?.explosion.toFixed(3)??'0';
   element.dataset.orbit=phase.toFixed(4);element.dataset.warmed=String(warmed);element.dataset.dragging=String(s.interacting);
  }
  raf=requestAnimationFrame(animate);
  return ()=>{
   dead=true;cancelAnimationFrame(raf);observer.disconnect();unbind();document.removeEventListener('visibilitychange',visibility);
   element.removeEventListener('pointermove',cursorMove);element.removeEventListener('pointerleave',cursorLeave);element.removeEventListener('webglcontextlost',lost);
   for(const rig of rigs)if(rig){rig.mixer.stopAllAction();rig.mixer.uncacheRoot(rig.scene);for(const mesh of rig.meshes)mesh.geometry.dispose();Object.values(rig.materials).forEach(m=>m.dispose());rig.mirrors.forEach(m=>(m.material as THREE.Material).dispose());}
   textures.forEach(t=>t.dispose());env.dispose();soft.dispose();lightStage.dispose();depthOnly.dispose();cutSurface.dispose();renderer.dispose();
  };
 },[state]);
 return <canvas className="stage" ref={canvas} tabIndex={0} aria-label="Modello 3D. Trascina o usa i tasti freccia per ruotare in tutte le direzioni."/>;
}
