// Rebuild the small framing envelopes from the shipped meshes when a GLB changes.
import {readFileSync, writeFileSync} from 'node:fs';
import {AnimationMixer, LoopOnce, Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {ConvexHull} from 'three/addons/math/ConvexHull.js';
import {createExplosion,sampleExplosion} from '../../app/lib/explosion.ts';

const manifest=JSON.parse(readFileSync('public/models/v48/manifest.json','utf8'));
const outlines={};
for (const model of manifest.models) {
  const data=readFileSync('public'+model.url);
  const {scene,animations}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    .parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  const mixer=new AnimationMixer(scene);
  const action=mixer.clipAction(animations.find(clip=>clip.name===model.motion.openCloseClip));
  action.setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;
  const parts=createExplosion(scene,animations.find(clip=>clip.name===model.motion.explodeClip),model.motion.explodePeakTime);
  function outline(closed,onlyBlade=false) {
    action.time=closed?model.motion.closedTime:0;
    mixer.update(0);
    sampleExplosion(parts,0);
    scene.updateMatrixWorld(true);
    const points=new Map();
    scene.traverse(mesh=>{
      if (!mesh.isMesh) return;
      const role=String(mesh.userData.materialRole||mesh.material.name||mesh.name).toLowerCase();
      if (onlyBlade&&!role.includes('blade')) return;
      const position=mesh.geometry.getAttribute('position'),p=new Vector3();
      for (let i=0;i<position.count;i++) {
        p.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);
        // Original GLB units are metres. Five decimals keep sub-pixel precision.
        const v=p.toArray().map(value=>Math.round(value*1e5));
        const key=v.join(',');
        if (!points.has(key)) points.set(key,new Vector3(...v));
      }
    });
    const hull=new ConvexHull().setFromPoints([...points.values()]);
    const vertices=new Set();
    for (const face of hull.faces) {
      let edge=face.edge;
      do { vertices.add(edge.head().point);edge=edge.next; } while (edge!==face.edge);
    }
    return [...vertices].flatMap(point=>point.toArray());
  }
  outlines[model.id]={assembled:outline(false),blade:outline(false,true),folded:outline(true)};
}
writeFileSync('app/lib/shot-outlines.json',JSON.stringify(outlines)+'\n');
