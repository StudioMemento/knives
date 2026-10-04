'use client';
import {useEffect,useRef,type MutableRefObject} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {DecalGeometry} from 'three/examples/jsm/geometries/DecalGeometry.js';
import {KNIVES} from './catalog';
import {calibrateModel,getKnifeMeshes,installFinish,updateFinish,surfaceBounds,updateFold} from './model';
import {easeInOut,TRANSITION_MS,CONFIG_CHAPTER,SECTION_CHAPTER,OUTRO_CHAPTER,type View,type InspectionView} from './navigation';
import {HeroCarousel,heroPose,sectionFrame} from './motion';
import {createLaserSection} from './laser';
import {createLightStage,WORLDS} from './lighting';
import {loadCollection} from './collection-loading';
import {createParticleField} from './particles';
import {createMaterialPreview} from './material-preview';
import type {Configuration,Decoration,Anchor,Surface,MaterialId} from './configuration';
export type {View} from './navigation';
export type StageAPI={focus:(index:number,direction?:number)=>void;capture:()=>string;reset:()=>void;back:()=>void;anchor:(surface:Surface)=>Anchor|null;materials:(color:string)=>Record<MaterialId,string>|null};
type Props={view:View;configurations:Configuration[];folded:boolean;placing:boolean;api:MutableRefObject<StageAPI|null>;onReady:(index:number)=>void;onError:(message:string)=>void;onPick:(anchor:Anchor)=>void;onSwipe:(x:number,y:number)=>void;reduced:boolean;suspended:boolean;autoplay:boolean;configuring:boolean;onHeroFocus:(index:number)=>void;inspection:InspectionView;onInspect:()=>void;dockHeight:number};
const vec=(a:number[])=>new THREE.Vector3(a[0],a[1],a[2]);
export default function KnifeStage(props:Props){
 const canvasRef=useRef<HTMLCanvasElement>(null);const current=useRef(props);current.current=props;
 useEffect(()=>{
  const canvas=canvasRef.current;if(!canvas)return;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,stencil:true,powerPreference:'high-performance'});}catch{current.current.onError('3D is unavailable on this device. Try a browser with WebGL enabled.');return;}
  const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,.05,80);camera.position.set(0,0,9.5);
  const orthographic=new THREE.OrthographicCamera(-5,5,3,-3,.05,80);let renderCamera:THREE.Camera=camera;
  let materialPreview:ReturnType<typeof createMaterialPreview>|undefined;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
  renderer.localClippingEnabled=true;
  // Draw directly into the browser's canvas. The optional HDR/MSAA/bloom
  // framebuffer chain must not determine whether the product is visible.
  renderer.setClearColor(0x000000,0);
  let renderFailed=false;
  const reportRenderFailure=()=>{if(renderFailed)return;renderFailed=true;current.current.onError('The 3D view could not be drawn. Reload the collection to try again.');};
  renderer.debug.onShaderError=(gl,program,vertexShader,fragmentShader)=>{
   console.error('Memento 3D shader error',gl.getProgramInfoLog(program),gl.getShaderInfoLog(vertexShader),gl.getShaderInfoLog(fragmentShader));
   reportRenderFailure();
  };
  const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();
  // Broad photographic reflection cards give steel readable highlights without bloom.
  for(const [x,y,z,width,height,intensity] of [[-3,7,6,8,1.4,4],[5,4,-3,2,6,2.5]]){
   const panel=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({color:new THREE.Color(intensity,intensity*.97,intensity*.92),side:THREE.DoubleSide}));panel.position.set(x,y,z);panel.lookAt(0,3.5,0);room.add(panel);
  }
  const envTarget=pmrem.fromScene(room,.025);scene.environment=envTarget.texture;scene.environmentRotation.y=.18;room.dispose();pmrem.dispose();
  const key=new THREE.DirectionalLight(0xffffff,3.2);key.position.set(3,4,5);const fill=new THREE.DirectionalLight(0xbdd6ea,.85);fill.position.set(-4,1,3);const rim=new THREE.DirectionalLight(KNIVES[0].accent,2.6);rim.position.set(-3,2,-3);scene.add(key,fill,rim,new THREE.HemisphereLight(0xeaf2fa,0x242326,.45));
  const lightStage=createLightStage();scene.add(lightStage.group);
  const particles=createParticleField(innerWidth<800);scene.add(particles.group);
  const spotlight=new THREE.SpotLight(0xfff2dc,0,30,.85,.95,0);spotlight.position.set(-3,5,5);scene.add(spotlight,spotlight.target);
  const models:Array<THREE.Group|undefined>=[];const decorationGroups:THREE.Group[]=[];const baseMeshes:THREE.Mesh[][]=[];const signatures:string[]=[];const appliedConfigurations:Array<Configuration|undefined>=[];const pendingReady=new Map<number,()=>void>();const lasers:Array<ReturnType<typeof createLaserSection>|undefined>=[];const cutAmounts:number[]=[];const foldAmounts:number[]=[];const revisions:number[]=[];
  let disposed=false;let frame=0;let lastRender=0;let viewportRevision=0;let stateKey='';let transitionStart=0;let cameraFrom=new THREE.Vector3();let cameraGoal=new THREE.Vector3();let lastTime=performance.now();let idleTime=0;
  const carousel=new HeroCarousel();carousel.reset(current.current.view.selected);let previousMode:View['mode']='hero';let entering=false;let reportedIndex=-1;
  let fovFrom=34,fovGoal=34;
  let previousStudy=-1,previousInspection='',settledTransition=-1,settledHero=-1;
  const from:Array<{p:THREE.Vector3;q:THREE.Quaternion;s:number}>=[];const goals:Array<{p:THREE.Vector3;q:THREE.Quaternion;s:number}>=[];
  let orbitX=0,orbitY=0,smoothOrbitX=0,smoothOrbitY=0;const extraRotation=new THREE.Quaternion();
  const euler=new THREE.Euler(),vertical=new THREE.Vector3(0,1,0);const appliedFoldAmounts:number[]=[];
  let pedestal:THREE.Group|undefined;let pedestalScale=1;let pedestalMix=0;const pedestalMaterials=new Set<THREE.MeshStandardMaterial>();
  const palette=KNIVES.map((knife,index)=>({accent:new THREE.Color(knife.accent),key:new THREE.Color(WORLDS[index].key),fill:new THREE.Color(WORLDS[index].fill)}));
  const textureCache=new Map<string,Promise<{texture:THREE.CanvasTexture;aspect:number}>>();const ownedTextures=new Set<THREE.Texture>();
  const disposeTree=(root:THREE.Object3D)=>root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});
  const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
  // Resolution is budgeted in delivery assets, retaining original aspect ratios.
  async function load(index:number){
   const timeout=setTimeout(()=>{if(!disposed&&current.current.view.selected===index)current.current.onError(`${KNIVES[index].name} is taking longer to load. You can reload to try again.`);},60000);
   try{
    const gltf=await loader.loadAsync(KNIVES[index].model);if(disposed){disposeTree(gltf.scene);return;}
    const model=calibrateModel(gltf.scene,index);
    baseMeshes[index]=getKnifeMeshes(model);
    for(const mesh of baseMeshes[index])for(const material of (Array.isArray(mesh.material)?mesh.material:[mesh.material]))if(material instanceof THREE.MeshStandardMaterial){material.envMapIntensity=1.1;installFinish(material);for(const t of [material.map,material.normalMap,material.roughnessMap,material.metalnessMap,material.aoMap,material.emissiveMap])if(t){t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);ownedTextures.add(t);}}
    disposeTree(gltf.scene); // Geometry and materials are cloned; embedded texture references remain owned above.
    const decals=new THREE.Group();decorationGroups[index]=decals;model.add(decals);
    // Mount at the final pose. Arrival is not a scene transition and must not
    // reset an active close-up, carousel movement or inspection gesture.
    const view=current.current.view,goal=modelGoal(index,view);
    goals[index]=goal;from[index]={p:goal.p.clone(),q:goal.q.clone(),s:goal.s};
    model.position.copy(goal.p);model.quaternion.copy(goal.q);model.scale.setScalar(goal.s);
    model.visible=view.mode==='hero'||index===view.selected;model.updateMatrixWorld(true);
    models[index]=model;scene.add(model);
    // Compile/upload in the real canvas render, then unlock the UI. An
    // additional shader compilation gate would hold every later network
    // request behind the GPU driver.
    await new Promise<void>(resolve=>pendingReady.set(index,resolve));
   }catch{if(!disposed)current.current.onError(`${KNIVES[index].name} could not load. Reload to try again.`);}finally{clearTimeout(timeout);}
  }
  async function loadPedestal(){await loader.loadAsync('/models/sci-fi-displayer.glb').then(gltf=>{
   if(disposed){disposeTree(gltf.scene);return;}
   const bounds=new THREE.Box3().setFromObject(gltf.scene);const size=bounds.getSize(new THREE.Vector3());gltf.scene.position.sub(bounds.getCenter(new THREE.Vector3()));
   pedestal=new THREE.Group();pedestal.add(gltf.scene);pedestalScale=2.15/Math.max(size.x,size.y,size.z);
   gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){
    for(const value of Object.values(m))if(value instanceof THREE.Texture)ownedTextures.add(value);
    if(m instanceof THREE.MeshStandardMaterial){m.emissive.set(KNIVES[0].accent);m.emissiveIntensity=.18;m.roughness=Math.max(m.roughness,.38);pedestalMaterials.add(m);}
   }});scene.add(pedestal);
  }).catch(()=>{});}
  const first=current.current.view.selected;
  void loadCollection([first,...[1,2,3,0].filter(index=>index!==first)],load,()=>disposed||renderFailed,()=>{void loadPedestal();});
  function decorationTexture(item:Decoration){
   const cacheKey=JSON.stringify([item.type,item.content,item.color,item.font,item.treatment]);let cached=textureCache.get(cacheKey);if(cached)return cached;
   cached=(async()=>{
    await document.fonts.ready;const c=document.createElement('canvas');c.width=1024;c.height=item.type==='text'?256:1024;const ctx=c.getContext('2d')!;
    if(item.treatment==='sticker'){ctx.fillStyle='#f4f2ec';ctx.beginPath();ctx.roundRect(12,12,c.width-24,c.height-24,item.type==='text'?80:180);ctx.fill();}
    const color=item.color;
    if(item.type==='text'){
     const families={sans:'Arial, sans-serif',serif:'Georgia, serif',mono:'monospace'};let size=160;ctx.font=`600 ${size}px ${families[item.font]}`;size=Math.min(size,880/Math.max(1,ctx.measureText(item.content).width)*size);ctx.font=`600 ${size}px ${families[item.font]}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(item.content,c.width/2,c.height/2+4);
    }else{
     const img=new Image();img.src=`/stencils/${item.content}.svg`;await img.decode();if(disposed)throw new Error('disposed');const ink=document.createElement('canvas');ink.width=ink.height=1024;const ic=ink.getContext('2d')!;const pad=item.treatment==='sticker'?175:55;ic.drawImage(img,pad,pad,1024-pad*2,1024-pad*2);ic.globalCompositeOperation='source-in';ic.fillStyle=color;ic.fillRect(0,0,1024,1024);ctx.drawImage(ink,0,0);
    }
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;ownedTextures.add(texture);return {texture,aspect:c.width/c.height};
   })();textureCache.set(cacheKey,cached);return cached;
  }
  async function rebuildDecorations(index:number,config:Configuration){
   const revision=(revisions[index]??0)+1;revisions[index]=revision;const next=new THREE.Group();
   try{for(const item of config.decorations){
    if(!item.anchor)continue;const mesh=baseMeshes[index].find(m=>m.name===item.anchor!.mesh);if(!mesh)continue;
    const {texture,aspect}=await decorationTexture(item);if(disposed||revision!==revisions[index]){disposeTree(next);return;}
    const point=vec(item.anchor.point),normal=vec(item.anchor.normal).normalize();const projector=new THREE.Object3D();projector.position.copy(point);projector.lookAt(point.clone().add(normal));projector.rotateZ(THREE.MathUtils.degToRad(item.rotation));
    const proxy=new THREE.Mesh(mesh.geometry);proxy.updateMatrixWorld(true);
    const geometry=new DecalGeometry(proxy,point,projector.rotation,new THREE.Vector3(item.width,item.width/aspect,.045));
    // Keep only the facing surface, even on very thin blades. Do not project onto the reverse side.
    const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;const positions:number[]=[],normals:number[]=[],uvs:number[]=[];
    for(let i=0;i<p.count;i+=3){if(new THREE.Vector3().fromBufferAttribute(n,i).dot(normal)<.12)continue;for(let j=0;j<3;j++){positions.push(p.getX(i+j),p.getY(i+j),p.getZ(i+j));normals.push(n.getX(i+j),n.getY(i+j),n.getZ(i+j));uvs.push(uv.getX(i+j),uv.getY(i+j));}}
    geometry.dispose();const clipped=new THREE.BufferGeometry();clipped.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));clipped.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));clipped.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    const material=new THREE.MeshStandardMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4-next.children.length,roughness:item.treatment==='sticker'?.42:.65,metalness:0});const decal=new THREE.Mesh(clipped,material);decal.userData.movingBlade=!!mesh.userData.movingBlade;decal.renderOrder=200+next.children.length;next.add(decal);
   }}catch{disposeTree(next);if(!disposed)current.current.onError('A decoration could not be rendered. Please select it again.');return;}
   if(disposed||revision!==revisions[index]){disposeTree(next);return;}
   const group=decorationGroups[index];disposeTree(group);group.clear();group.add(next);appliedFoldAmounts[index]=NaN;
  }
  const raycaster=new THREE.Raycaster();
  function pick(x:number,y:number):Anchor|null{
   const index=current.current.view.selected;const model=models[index];if(!model)return null;scene.updateMatrixWorld(true);renderCamera.updateMatrixWorld(true);raycaster.setFromCamera(new THREE.Vector2(x/innerWidth*2-1,-y/innerHeight*2+1),renderCamera);const hit=raycaster.intersectObjects(baseMeshes[index],false)[0];if(!hit?.face)return null;
   return {mesh:hit.object.name,point:hit.object.worldToLocal(hit.point.clone()).toArray() as Anchor['point'],normal:hit.face.normal.toArray() as Anchor['normal']};
  }
  function defaultAnchor(surface:Surface):Anchor|null{
   const meshes=baseMeshes[current.current.view.selected];if(!meshes)return null;
   const targetPart=surface==='blade'?1:2;
   const model=models[current.current.view.selected];if(!model)return null;
   const localCamera=model.worldToLocal(renderCamera.position.clone());const side=localCamera.z<0?-1:1;
   const proxies=meshes.map(m=>{const proxy=new THREE.Mesh(m.geometry,m.material);proxy.name=m.name;proxy.updateMatrixWorld(true);return proxy;});
   for(const y of (surface==='blade'?[.65,1.0,1.4,.2]:[-1.2,-1.5,-.8]))for(const x of [0,-.13,.13,-.3,.3]){
    raycaster.set(new THREE.Vector3(x,y,side*4),new THREE.Vector3(0,0,-side));const hit=raycaster.intersectObjects(proxies,false)[0];if(!hit?.face)continue;const part=(hit.object as THREE.Mesh).geometry.attributes.knifePart.getX(hit.face.a);if(Math.abs(part-targetPart)>.4)continue;
    return {mesh:hit.object.name,point:hit.point.toArray() as Anchor['point'],normal:hit.face.normal.toArray() as Anchor['normal']};
   }return null;
  }
  current.current.api.current={focus:(index,direction=0)=>{if(current.current.view.mode!=='hero')return;if(current.current.reduced||models.filter(Boolean).length<KNIVES.length)carousel.reset(index);else carousel.focus(index,direction);},capture:()=>{
    if(!renderScene())return '';const model=models[current.current.view.selected];if(!model)return '';
    const box=new THREE.Box3().setFromObject(model);const points=[];
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(renderCamera));
    const minX=Math.max(0,(Math.min(...points.map(v=>v.x))*.5+.5)*canvas.width-20),maxX=Math.min(canvas.width,(Math.max(...points.map(v=>v.x))*.5+.5)*canvas.width+20);
    const minY=Math.max(0,(-Math.max(...points.map(v=>v.y))*.5+.5)*canvas.height-20),maxY=Math.min(canvas.height,(-Math.min(...points.map(v=>v.y))*.5+.5)*canvas.height+20);
    const c=document.createElement('canvas');c.width=512;c.height=320;const ctx=c.getContext('2d')!;const width=Math.max(1,maxX-minX),height=Math.max(1,maxY-minY),scale=Math.min(480/width,288/height);
    ctx.drawImage(canvas,minX,minY,width,height,(512-width*scale)/2,(320-height*scale)/2,width*scale,height*scale);return c.toDataURL('image/png');
   },materials:(color)=>{try{materialPreview??=createMaterialPreview(renderer,envTarget.texture);return materialPreview.render(color);}catch{return null;}},reset:()=>{orbitX=orbitY=0;},back:()=>{orbitX=0;orbitY=orbitY===0?Math.PI:0;},anchor:defaultAnchor};
  const resize=()=>{const ratio=Math.min(devicePixelRatio,innerWidth<800?1.5:1.75,Math.sqrt(2200000/(innerWidth*innerHeight)));renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();viewportRevision++;stateKey='';};resize();addEventListener('resize',resize);
  const particlePointer=(e:PointerEvent)=>{if(e.pointerType!=='touch')particles.pointer(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);};const particleLeave=()=>particles.leave();addEventListener('pointermove',particlePointer,{passive:true});document.addEventListener('pointerleave',particleLeave);
  const contextLost=(event:Event)=>{event.preventDefault();current.current.onError('The 3D view was interrupted. Reload to restore your session.');};canvas.addEventListener('webglcontextlost',contextLost);
  let gesture:{x:number;y:number;id:number;lastX:number;lastY:number;axis:string}|null=null;
  const down=(e:PointerEvent)=>{
   if(e.button!==0||!e.isPrimary||current.current.suspended)return;
   gesture={x:e.clientX,y:e.clientY,id:e.pointerId,lastX:e.clientX,lastY:e.clientY,axis:''};canvas.setPointerCapture(e.pointerId);
  };
  const move=(e:PointerEvent)=>{
   if(!gesture||e.pointerId!==gesture.id)return;const p=current.current;
   const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
   if(!gesture.axis&&Math.max(Math.abs(dx),Math.abs(dy))>7){gesture.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';if(p.view.mode==='hero'&&!p.configuring&&gesture.axis==='x'&&models.filter(Boolean).length===4)carousel.beginDrag();}
   if(p.view.mode==='hero'&&!p.configuring&&gesture.axis==='x')carousel.drag(-(e.clientX-gesture.lastX)/Math.max(240,innerWidth*.38));
   else if((p.configuring||(p.view.mode==='experience'&&p.view.chapter===SECTION_CHAPTER&&gesture.axis==='x'))&&!p.placing){orbitY+=(e.clientX-gesture.lastX)*.009;orbitX=THREE.MathUtils.clamp(orbitX+(e.clientY-gesture.lastY)*.006,-Math.PI/2,Math.PI/2);if(p.inspection!=='free')p.onInspect();}
   gesture.lastX=e.clientX;gesture.lastY=e.clientY;
  };
  const up=(e:PointerEvent)=>{
   if(!gesture||e.pointerId!==gesture.id)return;const p=current.current;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
   if(carousel.dragging)carousel.endDrag();
   else if(p.placing&&p.configuring&&Math.max(Math.abs(dx),Math.abs(dy))<10){const anchor=pick(e.clientX,e.clientY);if(anchor)p.onPick(anchor);else p.onError('Select a point on the knife to place your design.');}
   else if(!p.configuring&&Math.abs(dy)>45)p.onSwipe(dx,dy);
   gesture=null;
  };
  const cancel=()=>{if(carousel.dragging)carousel.endDrag();gesture=null;};canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);
  function setHeroGoal(index:number){
   const height=2*Math.tan(THREE.MathUtils.degToRad(34/2))*9.5;
   const pose=heroPose(index,carousel,height*camera.aspect,height,innerWidth<800,current.current.reduced);
   const b=goals[index];b.p.set(pose.x,pose.y,pose.z);b.s=pose.scale;
   b.q.setFromEuler(euler.set(pose.pitch,pose.yaw,pose.roll));
  }
  function modelGoal(index:number,view:View){
   const goal={p:new THREE.Vector3(),q:new THREE.Quaternion(),s:1};
   if(view.mode==='hero'&&!current.current.configuring){
    const height=2*Math.tan(THREE.MathUtils.degToRad(34/2))*9.5;
    const pose=heroPose(index,carousel,height*camera.aspect,height,innerWidth<800,current.current.reduced);
    goal.p.set(pose.x,pose.y,pose.z);goal.s=pose.scale;goal.q.setFromEuler(new THREE.Euler(pose.pitch,pose.yaw,pose.roll));
   }else{
    const foldReview=current.current.folded&&view.chapter<2&&!!KNIVES[view.selected].folding;
    const framing=sectionFrame(innerWidth,innerHeight,foldReview?CONFIG_CHAPTER:view.chapter,current.current.configuring||foldReview,current.current.dockHeight);
    const active=index===view.selected;
    goal.p.set(active?framing.x:(index<view.selected?-12:12),framing.y,active?0:-4);
    goal.s=framing.scale;goal.q.setFromEuler(new THREE.Euler(framing.pitch,framing.yaw,framing.roll));
    if(active&&!current.current.configuring&&!foldReview&&view.chapter<2){
     const bounds=surfaceBounds(baseMeshes[index],view.chapter===0?1:2);
     if(!bounds.isEmpty()){goal.s=framing.visibleLength/Math.max(1,bounds.getSize(new THREE.Vector3()).y);goal.p.sub(bounds.getCenter(new THREE.Vector3()).multiplyScalar(goal.s).applyQuaternion(goal.q));}
    }
   }
   return goal;
  }
  function resolveGoals(view:View){
   entering=view.mode==='experience'&&previousMode==='hero';
   if(view.mode==='hero'&&previousMode!=='hero')carousel.reset(view.selected);
   const continuingInspection=previousMode==='experience'&&previousStudy===CONFIG_CHAPTER&&current.current.configuring;
   if(previousMode!==view.mode||previousStudy!==view.chapter){orbitX=orbitY=smoothOrbitX=smoothOrbitY=0;previousInspection='';}
   previousMode=view.mode;previousStudy=view.chapter;
   const foldReview=current.current.folded&&view.chapter<2&&!!KNIVES[view.selected].folding;
   const framing=sectionFrame(innerWidth,innerHeight,foldReview?CONFIG_CHAPTER:view.chapter,current.current.configuring||foldReview,current.current.dockHeight);
   models.forEach((model,index)=>{if(!model)return;
    from[index]={p:model.position.clone(),q:model.quaternion.clone(),s:model.scale.x};
    if(continuingInspection&&index===view.selected){const inspectionRotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(smoothOrbitX,smoothOrbitY,0));from[index].q.premultiply(inspectionRotation.invert());}
    goals[index]=modelGoal(index,view);
    model.visible=view.mode==='hero'||index===view.selected;
   });
   const hero=view.mode==='hero';cameraFrom.copy(camera.position);cameraGoal.set(hero?0:framing.cameraX,hero?0:framing.cameraY,hero?9.5:framing.cameraZ);fovFrom=camera.fov;fovGoal=hero?34:framing.fov;
   transitionStart=performance.now();
  }
  function renderScene(){
   if(renderFailed||renderer.getContext().isContextLost())return false;
   try{
    renderer.setRenderTarget(null);renderer.render(scene,renderCamera);
    // A loader success does not prove that WebGL drew the frame. Check once
    // per arriving asset; do not poll the GPU on every animation frame.
    if(pendingReady.size){const gl=renderer.getContext(),error=gl.getError();if(error!==gl.NO_ERROR){console.error('Memento 3D drawing error',error);reportRenderFailure();}}
   }catch(error){console.error('Memento 3D rendering failed',error);reportRenderFailure();}
   return !renderFailed;
  }
  function animate(now:number){
   frame=requestAnimationFrame(animate);const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;
   if(document.hidden)return;if(current.current.suspended&&now-lastRender<200)return;lastRender=now;
   const p=current.current;idleTime+=p.suspended?0:dt;
   // Hero focus changes only the UI. It must not restart the orbit or the scene transition.
   const state=JSON.stringify([p.view.mode,p.view.mode==='hero'?0:p.view.selected,p.view.mode==='hero'?0:p.view.chapter,p.configuring,p.folded,p.dockHeight,viewportRevision]);
   if(state!==stateKey){stateKey=state;resolveGoals(p.view);}
   const t=easeInOut((now-transitionStart)/(p.reduced?1:TRANSITION_MS));
   if(p.view.mode==='hero'&&!p.configuring){
    if(t===1&&!p.suspended)carousel.tick(dt,p.autoplay);
    const index=((Math.round(carousel.position)%4)+4)%4;
    if(index!==reportedIndex&&models[index]){reportedIndex=index;p.onHeroFocus(index);}
   }
   camera.position.lerpVectors(cameraFrom,cameraGoal,t);const nextFov=THREE.MathUtils.lerp(fovFrom,fovGoal,t);if(camera.fov!==nextFov){camera.fov=nextFov;camera.updateProjectionMatrix();}
   if(t<1&&!p.reduced&&p.view.mode==='experience'){camera.position.x+=Math.sin(t*Math.PI)*.28;camera.position.y+=Math.sin(t*Math.PI)*.09;}
   camera.lookAt(0,0,0);camera.updateMatrixWorld();
   const halfHeight=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.z;
   if(orthographic.top!==halfHeight||orthographic.right!==halfHeight*camera.aspect){orthographic.top=halfHeight;orthographic.bottom=-halfHeight;orthographic.left=-halfHeight*camera.aspect;orthographic.right=halfHeight*camera.aspect;orthographic.updateProjectionMatrix();}
   orthographic.position.copy(camera.position);orthographic.quaternion.copy(camera.quaternion);orthographic.updateMatrixWorld();renderCamera=p.configuring?orthographic:camera;
   if(p.configuring&&previousInspection!==p.inspection){previousInspection=p.inspection;const poses={front:[0,0],back:[0,Math.PI],spine:[Math.PI/2,0],edge:[-Math.PI/2,0],tip:[0,-Math.PI/2],base:[0,Math.PI/2]};if(p.inspection!=='free')[orbitX,orbitY]=poses[p.inspection];}
   if(t===1&&settledTransition!==transitionStart){settledTransition=transitionStart;particles.settle();}
   if(p.view.mode==='hero'&&Math.abs(carousel.position-Math.round(carousel.position))<.0001&&settledHero!==Math.round(carousel.position)){settledHero=Math.round(carousel.position);particles.settle();}
   models.forEach((model,index)=>{if(!model||!goals[index])return;
    if(p.view.mode==='hero'&&!p.configuring)setHeroGoal(index);
    const a=from[index],b=goals[index];model.position.lerpVectors(a.p,b.p,t);model.scale.setScalar(THREE.MathUtils.lerp(a.s,b.s,t));model.quaternion.slerpQuaternions(a.q,b.q,t);
    const active=index===p.view.selected;
    if(t<1&&!p.reduced&&p.view.mode==='experience'&&active){
     const arc=Math.sin(t*Math.PI);model.position.y+=arc*.09;model.position.z+=arc*.26;
     extraRotation.setFromEuler(euler.set(arc*.09,arc*(entering?.19:.13),0));model.quaternion.premultiply(extraRotation);
    }
    if((t===1&&p.view.mode==='experience')||p.configuring){
     if(active&&(p.configuring||p.view.chapter===SECTION_CHAPTER)){const damping=1-Math.exp(-dt*14);smoothOrbitX+=(orbitX-smoothOrbitX)*damping;smoothOrbitY+=(orbitY-smoothOrbitY)*damping;extraRotation.setFromEuler(euler.set(smoothOrbitX,smoothOrbitY,0));model.quaternion.premultiply(extraRotation);}
     else if(!p.reduced&&!p.suspended){model.position.y+=Math.sin(idleTime*.55)*.018;extraRotation.setFromAxisAngle(vertical,Math.sin(idleTime*.38)*.035);model.quaternion.premultiply(extraRotation);}
    }
    model.visible=p.view.mode==='hero'||active;
    const cutting=p.configuring&&!!p.view.scanEnabled&&active;
    const target=cutting?(p.view.cut??0):0;
    cutAmounts[index]=(cutAmounts[index]??0)+(target-(cutAmounts[index]??0))*(p.reduced?1:1-Math.exp(-dt*7));
    const foldTarget=active&&p.view.mode==='experience'&&!cutting&&p.view.chapter!==OUTRO_CHAPTER&&p.folded?1:0;
    foldAmounts[index]=(foldAmounts[index]??0)+(foldTarget-(foldAmounts[index]??0))*(p.reduced?1:1-Math.exp(-dt*5));
    if(Math.abs(foldTarget-foldAmounts[index])<.0001)foldAmounts[index]=foldTarget;
    if(appliedFoldAmounts[index]!==foldAmounts[index]){updateFold(model,foldAmounts[index]);appliedFoldAmounts[index]=foldAmounts[index];}
    if(cutting&&!lasers[index]){lasers[index]=createLaserSection(baseMeshes[index],new THREE.Color(KNIVES[index].accent));model.add(lasers[index]!.group);}
    model.updateMatrixWorld(true);particles.track(index,model,renderCamera,dt,model.visible&&!p.reduced&&!p.suspended);lasers[index]?.update(cutAmounts[index],cutting&&t===1&&foldAmounts[index]<.001,model.matrixWorld,idleTime,p.view.scanAxis??'z',p.view.scanDirection??1);
    decorationGroups[index].visible=!cutting;
    const config=p.configurations[index];if(appliedConfigurations[index]!==config){
     appliedConfigurations[index]=config;baseMeshes[index].forEach(mesh=>(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(m=>updateFinish(m,config)));
     const signature=JSON.stringify(config.decorations);if(signatures[index]!==signature){signatures[index]=signature;void rebuildDecorations(index,config);}
    }
   });
   const hero=p.view.mode==='hero'||p.view.chapter===OUTRO_CHAPTER;
   pedestalMix+=((hero?1:0)-pedestalMix)*(1-Math.exp(-dt*4));
   const height=2*Math.tan(THREE.MathUtils.degToRad(34/2))*9.5;
   const baseY=-height*.19,baseZ=.45;
   if(pedestal){pedestal.visible=pedestalMix>.01;pedestal.scale.setScalar(pedestalScale*Math.max(.001,pedestalMix));pedestal.position.set(0,baseY-.18-(1-pedestalMix),baseZ);if(!p.reduced&&!p.suspended)pedestal.rotation.y+=dt*.19;}
   lightStage.group.position.set(0,baseY-(1-pedestalMix),baseZ);lightStage.group.visible=pedestalMix>.01;
   const authority=Math.pow((Math.cos((Math.round(carousel.position)-carousel.position)*Math.PI/2)+1)*.5,6);
   const world=WORLDS[p.view.selected],colors=palette[p.view.selected],accent=colors.accent;
   lightStage.update(p.reduced?0:idleTime,accent,pedestalMix,authority);
   for(const m of pedestalMaterials){m.emissive.lerp(accent,1-Math.exp(-dt*3));m.emissiveIntensity=.12+authority*.12;}
   const damping=1-Math.exp(-dt*2);key.color.lerp(colors.key,damping);fill.color.lerp(colors.fill,damping);rim.color.lerp(accent,damping);renderer.toneMappingExposure+=(world.exposure-renderer.toneMappingExposure)*damping;
   const sweep=p.reduced?0:Math.sin(idleTime*.22);
   key.position.set(3+sweep*1.2,4,5);rim.position.set(-3-sweep,2,-2);
   const detail=p.view.mode==='experience'&&p.view.chapter<2&&!p.folded;
   spotlight.intensity+=((detail?1.25:0)-spotlight.intensity)*(1-Math.exp(-dt*4));spotlight.target.position.set(-1.5,0,0);
   particles.update(dt,accent,renderer.getPixelRatio(),camera.aspect,p.reduced,p.suspended);
   const drawn=renderScene();
   for(const [index,resolve] of pendingReady){if(drawn)p.onReady(index);resolve();}pendingReady.clear();
  }frame=requestAnimationFrame(animate);
  return()=>{disposed=true;for(const resolve of pendingReady.values())resolve();pendingReady.clear();cancelAnimationFrame(frame);removeEventListener('resize',resize);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('webglcontextlost',contextLost);current.current.api.current=null;removeEventListener('pointermove',particlePointer);document.removeEventListener('pointerleave',particleLeave);particles.dispose();materialPreview?.dispose();lightStage.dispose();lasers.forEach(l=>l?.dispose());disposeTree(scene);ownedTextures.forEach(t=>t.dispose());envTarget.dispose();renderer.dispose();};
 },[]);
 return <canvas ref={canvasRef} className={`knife-canvas ${props.placing?'is-placing':''}`} aria-label="3D knife collection. Drag horizontally to slide the orbit. In the configurator, drag to rotate the knife."/>;
}
