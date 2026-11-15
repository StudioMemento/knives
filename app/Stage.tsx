'use client';
import {useEffect,useRef,type MutableRefObject} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {createExplosion,sampleExplosion,type ExplodedPart} from './lib/explosion';
import {chapterFrame,livingPose,presentation,rotation,DISPLAY,type Frame} from './lib/presentation';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {Carousel} from './lib/carousel';
import {assemblyWeight,turnTarget,turnPose,railPoint,anchorTip,animateBackdrop,TAU} from './lib/choreography';
import {MotionValue,focusWeight,orbitAngle} from './lib/motion';
import {createLightStage} from './lib/lighting';
import {fitBoundsScale,sliceRange} from './lib/framing';
import {makeMaterial,makeTextures,finishMaterial} from './lib/materials';
import {createSoftLayers,REAR_LAYER,REFLECTION_LAYER,REAR_DEPTH_LAYER} from './lib/soft-layers';
import {KNIVES,mod,clamp,smooth,sectionAt,type DemoState,type ModelMeta,type Surface} from './lib/state';

type Props={state:MutableRefObject<DemoState>;onFrame:(p:number,id:number,ready:number,authority:number)=>void;onError:(s:string)=>void;onInteract:()=>void};
type Rig={meta:ModelMeta;group:THREE.Group;scaleGroup:THREE.Group;content:THREE.Group;scene:THREE.Group;mixer:THREE.AnimationMixer;open:THREE.AnimationAction;parts:ExplodedPart[];meshes:THREE.Mesh[];mirrors:THREE.Mesh[];materials:Record<Surface,THREE.MeshStandardMaterial>;key:string;fold:number;explosion:number;fit:number;sharp:number;visibility:number;tip:THREE.Vector3;tipMesh:THREE.Mesh;tipLocal:THREE.Vector3;dance:MotionValue;danceBase:number;danceGoal:number;wasFocused:boolean};
const v=(a:number[])=>new THREE.Vector3(a[0],a[1],a[2]);
const FRONT=3;

export default function Stage({state,onFrame,onError,onInteract}:Props){
 const canvas=useRef<HTMLCanvasElement>(null);const props=useRef({onFrame,onError,onInteract});props.current={onFrame,onError,onInteract};
 useEffect(()=>{
  if(!canvas.current)return;const element=canvas.current;element.dataset.boot='mounted';let dead=false,raf=0,renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({canvas:element,antialias:true,alpha:true,powerPreference:'high-performance'});}catch{props.current.onError('WebGL non disponibile. Apri la demo in un browser con accelerazione grafica.');return;}
  renderer.info.autoReset=false;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.setClearColor('#000000',0);renderer.localClippingEnabled=true;renderer.autoClear=false;
  const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(34,1,.05,80);camera.position.set(0,0,9.5);
  const textures=makeTextures(),soft=createSoftLayers(renderer),rigs:(Rig|undefined)[]=Array(5),reflectionGroup=new THREE.Group();scene.add(reflectionGroup);
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
  for(const [x,y,z,w,h,intensity] of [[-3,7,6,8,1.4,4],[5,4,-3,2,6,2.5]]){
   const card=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(intensity,intensity*.97,intensity*.92),side:THREE.DoubleSide}));
   card.position.set(x,y,z);card.lookAt(0,3.5,0);room.add(card);
  }
  const env=pmrem.fromScene(room,.025);scene.environment=env.texture;scene.environmentRotation.y=.18;room.dispose();pmrem.dispose();
  const ambient=new THREE.HemisphereLight('#eaf2fa','#242326',.45);ambient.layers.enableAll();scene.add(ambient);
  const key=new THREE.DirectionalLight('#fff6e9',2.65);key.position.set(3,4,5);key.layers.enableAll();scene.add(key);
  const rim=new THREE.DirectionalLight('#ffdfb9',2.2);rim.position.set(-3,2,-3);rim.layers.enableAll();scene.add(rim);
  const fill=new THREE.DirectionalLight('#bdd6ea',.85);fill.position.set(-4,1,3);fill.layers.enableAll();scene.add(fill);
  const spot=new THREE.SpotLight('#fff2df',7,30,.32,.88,0);spot.position.set(.4,6,3.5);spot.layers.enableAll();scene.add(spot,spot.target);
  // The reference has no opaque floor or horizon: just light and soft reflections.
  const lightStage=createLightStage();scene.add(lightStage.group);
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);let metas:ModelMeta[]=[],warmed=false;
  const depthOnly=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:THREE.DoubleSide});
  const fitCamera=new THREE.PerspectiveCamera(34,1,.05,80);
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
   // Measure the actual blade tip before animation, including its native Y offset.
   gltf.scene.updateMatrixWorld(true);let maxX=-Infinity;const tip=new THREE.Vector3(),point=new THREE.Vector3();
   const inverse=gltf.scene.matrixWorld.clone().invert();let tipMesh:THREE.Mesh|undefined;const tipLocal=new THREE.Vector3();
   for(const mesh of meshes){if(mesh.userData.surface!=='blade')continue;const attr=mesh.geometry.getAttribute('position');const matrix=new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);
    for(let j=0;j<attr.count;j++){point.fromBufferAttribute(attr,j).applyMatrix4(matrix);if(point.x>maxX){maxX=point.x;tip.copy(point);tipMesh=mesh;tipLocal.fromBufferAttribute(attr,j);}}
   }
   rigs[index]={meta,group,scaleGroup,content,scene:gltf.scene,mixer,open,parts,meshes,mirrors,materials,key:JSON.stringify(state.current.configs[index]),fold:0,explosion:0,fit:1,sharp:0,visibility:1,tip,tipMesh:tipMesh!,tipLocal,dance:new MotionValue(),danceBase:0,danceGoal:0,wasFocused:false};state.current.ready.push(index);state.current.ready.sort();
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
  let width=1,height=1,mobile=false,viewHeight=5.81,viewWidth=10.3,floorY=-1.51,radius=3.8,stageX=-1.4;
  const resize=()=>{
   width=element.clientWidth;height=element.clientHeight;mobile=width<700&&height>width;
   renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.5:1.75,Math.sqrt((mobile?1100000:2200000)/(width*height))));renderer.setSize(width,height,false);
   camera.aspect=width/height;camera.updateProjectionMatrix();fitCamera.aspect=camera.aspect;fitCamera.updateProjectionMatrix();fitCamera.position.set(0,0,9.5);fitCamera.lookAt(0,0,0);fitCamera.updateMatrixWorld();
   viewHeight=2*Math.tan(camera.fov*Math.PI/360)*9.5;viewWidth=viewHeight*camera.aspect;floorY=-viewHeight*(mobile?.04:.26);stageX=mobile?-.05*viewWidth:-.14*viewWidth;radius=viewWidth*(mobile?.43:.36);
   soft.resize(width,height);
  };resize();const observer=new ResizeObserver(resize);observer.observe(element);
  function heroFrame(index:number,phase:number,rig:Rig,life:ReturnType<typeof livingPose>):Frame{
   const raw=mod(index-phase),distance=Math.min(raw,5-raw),authority=focusWeight(distance),angle=orbitAngle(raw)-.28;
   const length=Math.min(viewHeight*(mobile?.20+.27*authority:.28+.46*authority),viewWidth*(mobile?.85:1));
   const scale=length/DISPLAY,focus=v(rig.meta.focusPoints.assembled);
   // All products share the same canonical face. The orbit carries a restrained
   // bank into the front pose; the moving light reveals the steel as it assembles.
   const quat=presentation(.055*Math.sin(angle)*(1-authority),.20*Math.sin(angle)*(1-authority),Math.PI/2-.60*authority);
   quat.multiply(turnPose(rig.dance.value));quat.premultiply(life.rotation);
   const tip=rig.tip.clone().sub(focus).multiplyScalar(DISPLAY/rig.meta.bounds.size[0]*scale).applyQuaternion(quat);
   const position=railPoint(angle,radius,stageX,floorY).sub(tip);
   return {position,rotation:quat,scale,focus,closed:0};
  }
  const mirrorMatrix=new THREE.Matrix4(),mirrorFlip=new THREE.Matrix4().makeScale(1,-1,1);
  const raycaster=new THREE.Raycaster();raycaster.layers.set(FRONT);const pointer=new THREE.Vector2();
  let gesture:{x:number;y:number;lastX:number;lastY:number;total:number;technical:boolean}|null=null;let lastTap=0;
  const pick=(clientX:number,clientY:number)=>{const s=state.current;if(sectionAt(s.progress)!==4)return;const rig=rigs[s.selected];if(!rig)return;const rect=element.getBoundingClientRect();pointer.set((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(rig.meshes,false);if(!hits.length)return;const hit=hits[0].point.clone();rig.group.worldToLocal(hit);s.focus=hit.toArray() as [number,number,number];s.zoom=1.27;props.current.onInteract();};
  const down=(e:PointerEvent)=>{if(e.button!==0||sectionAt(state.current.progress)!==4)return;element.setPointerCapture(e.pointerId);gesture={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,total:0,technical:sectionAt(state.current.progress)===4};};
  const move=(e:PointerEvent)=>{if(!gesture)return;const dx=e.clientX-gesture.lastX,dy=e.clientY-gesture.lastY;gesture.total+=Math.abs(dx)+Math.abs(dy);gesture.lastX=e.clientX;gesture.lastY=e.clientY;const s=state.current;if(gesture.technical){s.yaw+=dx*.008;s.pitch=clamp(s.pitch+dy*.006,-1.05,1.05);s.focus=null;s.spin=false;}};
  const up=(e:PointerEvent)=>{if(!gesture)return;const s=state.current;if(gesture.total<9&&gesture.technical){const now=performance.now();if(now-lastTap<330)pick(e.clientX,e.clientY);lastTap=now;}gesture=null;props.current.onInteract();};
  const dbl=(e:MouseEvent)=>pick(e.clientX,e.clientY);
  element.addEventListener('pointerdown',down);element.addEventListener('pointermove',move);element.addEventListener('pointerup',up);element.addEventListener('pointercancel',up);element.addEventListener('dblclick',dbl);
  const lost=(e:Event)=>{e.preventDefault();props.current.onError('La sessione grafica è stata interrotta. Riprova per ripristinare lo showroom.');};element.addEventListener('webglcontextlost',lost);
  const cursor=new THREE.Vector2(),cursorX=new MotionValue(),cursorY=new MotionValue();
  const cursorMove=(event:PointerEvent)=>{if(event.pointerType!=='mouse')return;cursor.set(event.clientX/width*2-1,1-event.clientY/height*2);};
  const cursorLeave=()=>cursor.set(0,0);
  window.addEventListener('pointermove',cursorMove,{passive:true});document.documentElement.addEventListener('pointerleave',cursorLeave);
  const carousel=new Carousel(),scroll=new MotionValue(),zoom=new MotionValue(1),bladeControl=new MotionValue(),explodeControl=new MotionValue();
  const yawMotion=new MotionValue(),pitchMotion=new MotionValue(),viewRotation=new THREE.Quaternion();
  let last=performance.now(),time=0,phase=0,lastOrbit=0;
  const cameraTarget=new THREE.Vector3(),cameraDesired=new THREE.Vector3(),cameraAim=new THREE.Vector3();
  const white=new THREE.Color('#f5dcb8'),normals=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
  const views={side:[0,0],top:[Math.PI/2,0],edge:[0,Math.PI/2],perspective:[-.33,.56]};
  let uiTime=0,frames=0,frameWindow=0;const frameTimes:number[]=[];
  function renderProducts(sharp:boolean){
   for(const rig of rigs){if(!rig)continue;const opacity=rig.visibility*(sharp?rig.sharp:1-rig.sharp);
    for(const material of Object.values(rig.materials))material.opacity=opacity;
    for(const mesh of rig.meshes){mesh.layers.set(opacity>.001?(sharp?FRONT:REAR_LAYER):4);if(!sharp&&opacity>.001&&opacity<.999)mesh.layers.enable(REAR_DEPTH_LAYER);}
   }
  }
  const animate=(now:number)=>{if(dead)return;raf=requestAnimationFrame(animate);const elapsed=(now-last)/1000,dt=Math.min(.1,elapsed);last=now;if(document.hidden)return;time+=dt;const s=state.current;
   s.progress=scroll.step(s.target,dt,s.reduced?20:4.6);
   const u=mod(s.progress),chapter=Math.floor(u),blend=smooth(u-chapter),heroWeight=1-smooth(Math.min(u,5-u)/.85),techWeight=smooth(Math.max(0,1-Math.abs(u-4)));
   if(s.dragging&&heroWeight>.98)phase=carousel.dragTo(s.dragPhase,dt);
   else{if(Math.abs(s.orbit-lastOrbit)>.00001)carousel.request(s.orbit,s.reduced);phase=carousel.step(dt,heroWeight>.995&&s.ready.length===5&&warmed,s.paused,s.reduced);}
   s.orbit=phase;lastOrbit=phase;const nearest=mod(Math.round(phase));if(heroWeight>.95&&rigs[nearest])s.selected=nearest;
   const authority=focusWeight(Math.min(mod(s.selected-phase),5-mod(s.selected-phase)));
   if(s.spin&&techWeight>.8)s.yaw+=dt*.2;
   const zoomValue=zoom.step(s.zoom,dt,8),foldValue=bladeControl.step(s.closed,dt,8),explodeValue=explodeControl.step(s.exploded,dt,7);
   const yaw=yawMotion.step(s.yaw,dt,14),pitch=pitchMotion.step(s.pitch,dt,14),view=views[s.view];
   viewRotation.slerp(rotation(view[0]+pitch,view[1]+yaw,0),1-Math.exp(-dt*7));
   // A single continuous camera track; no aim jump on inspection or section changes.
   const travel=Math.sin(Math.PI*(u-chapter))**2;
   cameraDesired.set(mobile?0:Math.sin(u*Math.PI*.4)*.10*travel,.06*travel,9.5-.12*travel);cameraTarget.set(0,0,0);
   const life=livingPose(time,cursorX.step(cursor.x,dt,5),cursorY.step(cursor.y,dt,5),s.reduced);
   const active=rigs[s.selected];
   mirrorMatrix.makeTranslation(0,2*floorY,0).multiply(mirrorFlip);
   for(let i=0;i<rigs.length;i++){
    const rig=rigs[i];if(!rig)continue;
    const distance=Math.min(mod(i-phase),5-mod(i-phase));
    const settled=distance<.00001&&heroWeight>.995&&!s.dragging;
    if(settled&&!rig.wasFocused){rig.danceBase=Math.round(rig.dance.value/TAU)*TAU;rig.wasFocused=true;}
    if(settled)rig.danceGoal=rig.danceBase+(s.reduced?0:turnTarget(carousel.hold));
    else if(rig.wasFocused){rig.danceGoal=rig.danceBase+TAU;rig.wasFocused=false;}
    rig.dance.step(s.reduced?0:rig.danceGoal,dt,10);
    const front=i===s.selected,hero=heroFrame(i,phase,rig,life);let pos=hero.position,quat=hero.rotation,scale=hero.scale,focus=hero.focus,closed=0;
    if(front){const a=chapterFrame(chapter,rig.meta,hero,viewWidth,viewHeight,mobile),b=chapterFrame(chapter+1,rig.meta,hero,viewWidth,viewHeight,mobile);
     pos=new THREE.Vector3().lerpVectors(a.position,b.position,blend);quat=new THREE.Quaternion().slerpQuaternions(a.rotation,b.rotation,blend);scale=THREE.MathUtils.lerp(a.scale,b.scale,blend);focus=new THREE.Vector3().lerpVectors(a.focus,b.focus,blend);closed=THREE.MathUtils.lerp(a.closed,b.closed,blend);
     // Hero already has living movement before tip compensation. Blend the same
     // movement into all other shots, avoiding a double rotation at the seam.
     quat.premultiply(new THREE.Quaternion().slerp(life.rotation,1-heroWeight));pos.addScaledVector(life.offset,1-heroWeight);
     if(techWeight>0){quat.multiply(new THREE.Quaternion().slerp(viewRotation,techWeight));closed=THREE.MathUtils.lerp(closed,foldValue,techWeight);scale*=1+(zoomValue-1)*techWeight;}
    }
    // Pose and tip compensation use the SAME quaternion. An additional rotation
    // damping here used to detach the tip from its orbit and produce small slips.
    rig.group.position.copy(pos);rig.group.quaternion.copy(quat);rig.group.scale.setScalar(scale);rig.content.position.copy(focus).negate();
    const relative=mod(i-phase),weight=focusWeight(Math.min(relative,5-relative));
    const scenery=(1-assemblyWeight(distance))*heroWeight;
    rig.fold=closed;rig.explosion=.82*scenery+(front?explodeValue*techWeight:0);
    rig.visibility=front?1:heroWeight;rig.sharp=front?1-(1-weight)*heroWeight:weight;
    rig.open.time=rig.fold*rig.meta.motion.closedTime;rig.mixer.update(0);
    sampleExplosion(rig.parts,rig.explosion);
    animateBackdrop(rig.parts,s.reduced?0:scenery,time,i);
    const configKey=JSON.stringify(s.configs[i]);if(configKey!==rig.key){for(const role of ['blade','handle','metals'] as const)finishMaterial(rig.materials[role],role,s.configs[i][role],textures);rig.key=configKey;}
    const planes=front&&techWeight>.7?s.cuts.flatMap((cut,k)=>cut>.001?[clipPlanes[k]]:[]):[];
    for(const m of Object.values(rig.materials))m.clippingPlanes=planes;
    rig.group.visible=rig.visibility>.001;rig.group.updateMatrixWorld(true);
    anchorTip(rig.group,rig.tipMesh,rig.tipLocal,railPoint(orbitAngle(mod(i-phase))-.28,radius,stageX,floorY),heroWeight);
    if(front&&techWeight>0){
     const safeRect=mobile?[.04,.10,.96,.49]:[.04,.08,.69,.92];
     const zoomFactor=1+(zoomValue-1)*techWeight;
     rig.group.scale.divideScalar(zoomFactor);rig.group.updateMatrixWorld(true);
     const safe=fitBoundsScale(fitCamera,rig.group,rig.meshes,safeRect);
     rig.group.scale.multiplyScalar(zoomFactor);rig.group.updateMatrixWorld(true);
     const screen=fitBoundsScale(fitCamera,rig.group,rig.meshes,[.02,.02,.98,.98]);
     const cap=Math.min(safe,s.focus?1:screen),desired=1+(cap-1)*techWeight;
     rig.fit=Math.min(desired,rig.fit+(desired-rig.fit)*(1-Math.exp(-dt*8)));
     rig.group.scale.multiplyScalar(rig.fit);rig.group.updateMatrixWorld(true);
    }else rig.fit=1;
    // Reflections are blurred beyond screw detail. Keep the exact blade/handle
    // silhouettes and omit subpixel hardware from this secondary pass only.
    rig.mirrors.forEach((mirror,j)=>{if(rig.meshes[j].userData.surface==='metals'){mirror.visible=false;return;}mirror.visible=rig.group.visible&&(front||!mobile);(mirror.material as THREE.MeshBasicMaterial).opacity=(rig.meshes[j].userData.surface==='handle'?.16:.27)*rig.visibility;mirror.matrix.multiplyMatrices(mirrorMatrix,rig.meshes[j].matrixWorld);mirror.matrixWorldNeedsUpdate=true;});
   }
   if(active){
    for(let k=0;k<3;k++){normals[k].set(k===0?1:0,k===1?1:0,k===2?1:0).applyQuaternion(active.group.quaternion);if(s.cuts[k]>.001&&techWeight>.7){const [min,max]=sliceRange(active.meshes,normals[k]);clipPlanes[k].set(normals[k],-THREE.MathUtils.lerp(min,max,s.cuts[k]));}}
    if(s.focus&&techWeight>.8){const point=active.group.localToWorld(v(s.focus)),shift=point.sub(active.group.position).multiplyScalar(.45*techWeight);cameraTarget.add(shift);cameraDesired.add(shift);}
    spot.target.position.copy(active.group.position);
   }
   spot.position.x=stageX+.4+(s.reduced?0:Math.sin(time*.25)*.25);spot.intensity=1.4+(5.6+12*authority)*heroWeight;
   camera.position.lerp(cameraDesired,1-Math.exp(-dt*6));cameraAim.lerp(cameraTarget,1-Math.exp(-dt*6));camera.lookAt(cameraAim);camera.updateMatrixWorld();
   lightStage.group.position.set(stageX,floorY,0);lightStage.update(time,white,.62+.38*heroWeight,authority,radius);
   try{
    renderer.info.reset();renderer.setRenderTarget(null);renderer.clear();camera.layers.set(0);renderer.render(scene,camera);
    renderProducts(false);soft.render(scene,camera,heroWeight>.005);
    renderProducts(true);renderer.clearDepth();camera.layers.set(FRONT);
    if(heroWeight>.005&&rigs.some(r=>r&&r.sharp>.001&&r.sharp<.999)){scene.overrideMaterial=depthOnly;renderer.render(scene,camera);scene.overrideMaterial=null;}
    renderer.render(scene,camera);
    if(!soft.enabled){renderProducts(false);camera.layers.set(REAR_LAYER);renderer.render(scene,camera);renderProducts(true);}
   }catch(e){props.current.onError('Errore di rendering. Riprova per ripristinare la scena.');cancelAnimationFrame(raf);console.error(e);return;}
   uiTime+=dt;if(uiTime>.04){uiTime=0;element.parentElement?.style.setProperty('--title-x',String(-cursorX.value*5));element.parentElement?.style.setProperty('--title-y',String(-cursorY.value*3));props.current.onFrame(s.progress,s.selected,s.ready.length,authority);}
   frames++;frameWindow+=elapsed;frameTimes.push(elapsed*1000);
   if(frameWindow>2){frameTimes.sort((a,b)=>a-b);element.dataset.fps=String(Math.round(frames/frameWindow));element.dataset.frameP95=frameTimes[Math.floor(frameTimes.length*.95)].toFixed(1);element.dataset.pixels=String(element.width*element.height);frames=0;frameWindow=0;frameTimes.length=0;}
   element.dataset.drawCalls=String(renderer.info.render.calls);element.dataset.triangles=String(renderer.info.render.triangles);
   element.dataset.closed=rigs[s.selected]?.fold.toFixed(3)||'0';element.dataset.exploded=rigs[s.selected]?.explosion.toFixed(3)||'0';element.dataset.hold=carousel.hold.toFixed(2);element.dataset.orbit=phase.toFixed(4);element.dataset.warmed=String(warmed);element.dataset.turn=String(rigs[s.selected]?.dance.value.toFixed(4));element.dataset.dragging=String(s.dragging);
  };raf=requestAnimationFrame(animate);
  return()=>{dead=true;cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener('pointermove',cursorMove);document.documentElement.removeEventListener('pointerleave',cursorLeave);element.removeEventListener('pointerdown',down);element.removeEventListener('pointermove',move);element.removeEventListener('pointerup',up);element.removeEventListener('pointercancel',up);element.removeEventListener('dblclick',dbl);element.removeEventListener('webglcontextlost',lost);for(const rig of rigs){if(!rig)continue;rig.mixer.stopAllAction();rig.mixer.uncacheRoot(rig.scene);rig.meshes.forEach(m=>m.geometry.dispose());Object.values(rig.materials).forEach(m=>m.dispose());rig.mirrors.forEach(m=>(m.material as THREE.Material).dispose());}textures.forEach(t=>t.dispose());env.dispose();soft.dispose();lightStage.dispose();depthOnly.dispose();renderer.dispose();};
 },[state]);
 return <canvas className="stage" ref={canvas} aria-label="Showroom tridimensionale: trascina per esplorare il coltello nella sezione tecnica"/>;
}
