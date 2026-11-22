// Regenerate the low-resolution measurement geometry after changing a display GLB.
// Run from the showroom root. The renderer always draws the original model.
import {readFileSync,writeFileSync} from 'node:fs';
import {Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {MeshoptSimplifier} from 'three/addons/libs/meshopt_simplifier.module.js';

await MeshoptSimplifier.ready;
const {models}=JSON.parse(readFileSync('public/models/v48/manifest.json','utf8'));
const catalogue={};
for(const model of models){
 const buffer=readFileSync('public'+model.url);
 const {scene}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  .parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');
 scene.updateMatrixWorld(true);
 const parts={};
 scene.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const geometry=mesh.geometry,position=geometry.getAttribute('position');
  geometry.computeBoundingBox();
  const box=geometry.boundingBox,size=box.getSize(new Vector3());
  const worldSize=box.clone().applyMatrix4(mesh.matrixWorld).getSize(new Vector3());
  const extent=Math.max(worldSize.x,worldSize.y,worldSize.z)/model.bounds.size[0];
  if(extent<.025)return;
  const xyz=new Float32Array(position.count*3),point=new Vector3();
  for(let i=0;i<position.count;i++)point.fromBufferAttribute(position,i).toArray(xyz,i*3);
  const weld=MeshoptSimplifier.generatePositionRemap(xyz,3);
  const indices=Uint32Array.from({length:geometry.index?.count??position.count},(_,i)=>weld[geometry.index?.getX(i)??i]);
  // The pierced scales and curved blade outline carry most of the projected area.
  const budget=Math.max(18,Math.round((extent>.20?800:320)*extent));
  const maxError=extent>.25?.004:1;
  const [triangles]=MeshoptSimplifier.simplify(indices,xyz,3,Math.min(indices.length,3*budget),maxError,['Permissive']);
  const [compact,count]=MeshoptSimplifier.compactMesh(triangles);
  const vertices=new Array(3*count);
  for(let i=0;i<compact.length;i++){
   if(compact[i]===0xffffffff)continue;
   point.fromArray(xyz,3*i).sub(box.min);
   for(let axis=0;axis<3;axis++)vertices[3*compact[i]+axis]=Math.round(4095*point.getComponent(axis)/(size.getComponent(axis)||1));
  }
  parts[mesh.name]=[vertices,Array.from(triangles)];
 });
 catalogue[model.id]=parts;
}
writeFileSync('app/lib/framing-proxies.json',JSON.stringify(catalogue)+'\n');
