// CPU-only regression of the implemented framing helpers. Each projected mesh
// sphere conservatively encloses its actual geometry; no WebGL is required.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AnimationMixer,LoopOnce,Vector3,Quaternion,Euler,PerspectiveCamera,Group} from 'three';
const site=fileURLToPath(new URL('../../',import.meta.url)).replace(/\/$/,'');
const {safeSphereRadius,animatedRadius}=await import(`${site}/app/lib/framing.ts`);
const dir=`${site}/public/models/v46`;
const metas=JSON.parse(fs.readFileSync(`${dir}/manifest.json`)).models;
const rotation=(x,y,z)=>new Quaternion().setFromEuler(new Euler(x,y,z,'XYZ'));
const empty=()=>[Infinity,Infinity,-Infinity,-Infinity];
function union(a,b){for(let k=0;k<4;k++)a[k]=k<2?Math.min(a[k],b[k]):Math.max(a[k],b[k]);}
function sphereBounds(center,radius,camera){
 const p=center.clone().applyMatrix4(camera.matrixWorldInverse),d=-p.z,t=Math.tan(camera.fov*Math.PI/360),a=camera.aspect;
 if(d<=radius+camera.near)return [-Infinity,-Infinity,Infinity,Infinity];
 const tangent=(c)=>{const root=radius*Math.sqrt(d*d+c*c-radius*radius),den=d*d-radius*radius;return [(c*d-root)/den,(c*d+root)/den];};
 const [xmin,xmax]=tangent(p.x),[ymin,ymax]=tangent(p.y);
 return [(xmin/(t*a)+1)/2,(1-ymax/t)/2,(xmax/(t*a)+1)/2,(1-ymin/t)/2];
}
const reports=[];
for(const meta of metas){
 const bytes=fs.readFileSync(`${dir}/${meta.id.toLowerCase()}.glb`);
 const {scene,animations}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const group=new Group(),normalization=new Group(),content=new Group();group.add(normalization);normalization.add(content);content.add(scene);
 normalization.scale.setScalar(4.2/meta.bounds.size[0]);content.position.set(...meta.focusPoints.assembled).negate();
 const mixer=new AnimationMixer(scene),open=mixer.clipAction(animations.find(c=>c.name===meta.motion.openCloseClip)),explode=mixer.clipAction(animations.find(c=>c.name===meta.motion.explodeClip));
 for(const action of [open,explode]){action.setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;action.setEffectiveWeight(1);}
 const meshes=[];scene.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.computeBoundingSphere();meshes.push(mesh);}});
 const poses=[];
 for(const fold of [0,.25,.5,.75,1])for(const amount of [0,.25,.5,.75,1]){
  open.time=fold*6;explode.time=amount*meta.motion.explodePeakTime;mixer.update(0);group.updateMatrixWorld(true);
  const radius=animatedRadius(meshes,group),spheres=meshes.map(mesh=>({center:mesh.geometry.boundingSphere.center.clone().applyMatrix4(mesh.matrixWorld),radius:mesh.geometry.boundingSphere.radius*mesh.matrixWorld.getMaxScaleOnAxis()}));
  poses.push({fold,amount,radius,spheres});
 }
 for(const mobile of [false,true]){
  const width=mobile?390:1363,height=mobile?844:936,camera=new PerspectiveCamera(38,width/height,.05,80);
  camera.position.set(mobile?0:.3,mobile?.65:.45,mobile?9.35:8.7);camera.lookAt(mobile?0:.25,mobile?.15:-.05,0);camera.updateMatrixWorld();
  const center=mobile?new Vector3(0,1.4,.65):new Vector3(-1.1,-.12,.65);
  const safeRect=mobile?[.04,.10,.96,.49]:[.04,.08,.69,.92],fullRect=[.02,.02,.98,.98];
  const safe=safeSphereRadius(camera,center,safeRect),screen=safeSphereRadius(camera,center,fullRect);
  const hud=mobile?[.4428,.49,.93,.88]:[.72,.19,.935,.62];
  const zooms=[];
  for(const zoom of [1,1.3]){
   const rect=zoom===1?safeRect:fullRect,bounds=empty();let violations=0,poseCount=0,potentialHudOverlapPoses=0,minScale=Infinity,maxScale=0;
   for(const pose of poses){
    const desired=1.08*(mobile?.64:1)*zoom,worldRadius=pose.radius*desired,baseRadius=worldRadius/zoom;
    const cap=Math.min(1,safe/baseRadius,screen/(baseRadius*zoom)),scale=desired*cap;
    minScale=Math.min(minScale,scale);maxScale=Math.max(maxScale,scale);
    for(const [viewPitch,viewYaw] of [[0,0],[Math.PI/2,0],[0,Math.PI/2],[-.33,.56]])for(const pitch of [-1.05,0,1.05])for(let yawDeg=0;yawDeg<360;yawDeg+=10){
     const q=rotation(0,0,Math.PI).multiply(rotation(viewPitch+pitch,viewYaw+yawDeg*Math.PI/180,0));
     let overlap=false;
     for(const sphere of pose.spheres){
      const point=sphere.center.clone().multiplyScalar(scale).applyQuaternion(q).add(center),b=sphereBounds(point,sphere.radius*scale,camera);
      union(bounds,b);
      if(b[0]<rect[0]-1e-10||b[1]<rect[1]-1e-10||b[2]>rect[2]+1e-10||b[3]>rect[3]+1e-10)violations++;
      if(b[2]>hud[0]&&b[0]<hud[2]&&b[3]>hud[1]&&b[1]<hud[3])overlap=true;
     }
     if(overlap)potentialHudOverlapPoses++;
     poseCount++;
    }
   }
   const result={zoom,poseCount,rect,bounds,minGroupScale:minScale,maxGroupScale:maxScale,violations,potentialHudOverlapPoses};zooms.push(result);
   if(violations||(zoom===1&&potentialHudOverlapPoses))throw Error(`Framing violation ${meta.id} ${mobile?'mobile':'desktop'} zoom${zoom}`);
  }
  const report={model:meta.id,viewport:mobile?'mobile':'desktop',safeWorldRadius:safe,fullViewportWorldRadius:screen,zooms};reports.push(report);console.log(JSON.stringify(report));
 }
 mixer.stopAllAction();mixer.uncacheRoot(scene);
}
fs.writeFileSync(fileURLToPath(new URL('./orbit-fit-report.json',import.meta.url)),JSON.stringify({note:'No renderer used. Imports the actual app/lib/framing.ts helpers. Each mesh sphere conservatively encloses real geometry; the production radius includes spheres plus all AABB corners. 25 fold/explosion states, 4 views, 36 yaws, 3 pitch offsets, zoom1/1.3:216000 states. At zoom1 require HUD-safe rect and no potential HUD overlap. Intentional zoom1.3 may enter HUD region but must remain in viewport[.02,.02,.98,.98]. No camera pan tested; picked-detail pan is intentional. Original source motion QA unchanged.',reports},null,2)+'\n');
