import {BufferGeometry, Matrix4, Mesh, MeshPhysicalMaterial, type Object3D} from 'three';
import {deinterleaveGeometry,mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Only the opaque fittings with one material can share an assembled draw.
// The individual mesh nodes remain the targets for animation, picking and macro views.
export class AssembledHardware {
 private readonly parts:Mesh[];
 private readonly rest:Matrix4[];
 private readonly group:Object3D;
 private readonly cached=new Map<boolean,Mesh|null>();
 private active?:Mesh;
 private pending?:{detail:boolean; sources:BufferGeometry[]; copies:BufferGeometry[]};
 private scheduled?:number;
 private disposed=false;

 constructor(group:Object3D, meshes:Mesh[]) {
  this.group=group;
  const buckets=new Map<MeshPhysicalMaterial,Mesh[]>();
  const inverse=group.matrixWorld.clone().invert();
  for (const mesh of meshes) {
   const material=mesh.material;
   if (mesh.userData.surface!=='metals'||mesh.children.length||!(material instanceof MeshPhysicalMaterial)||material.transmission>0) continue;
   if (new Matrix4().multiplyMatrices(inverse,mesh.matrixWorld).determinant()<=0) continue;
   if (!buckets.has(material)) buckets.set(material,[]);
   buckets.get(material)!.push(mesh);
  }
  const largest=[...buckets.values()].sort((a,b)=>b.length-a.length)[0]??[];
  this.parts=largest.length>=8?largest:[];
  this.rest=this.parts.map(mesh=>new Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));
 }
 get drawSavings() {return this.active?this.parts.length-1:0;}
 private schedule() {
  // Prepare a few components between frames and keep the original parts drawable throughout.
  const run=()=>{
   this.scheduled=undefined;
   const task=this.pending;
   if (!task || this.disposed) return;
   const start=performance.now();
   while (task.copies.length<task.sources.length) {
    const i=task.copies.length;
    const copy=task.sources[i].clone();
    deinterleaveGeometry(copy);copy.applyMatrix4(this.rest[i]);
    task.copies.push(copy);
    if (performance.now()-start>4) {this.schedule();return;}
   }
   const merged=mergeGeometries(task.copies);
   for (const copy of task.copies) copy.dispose();
   this.pending=undefined;
   if (!merged) {this.cached.set(task.detail,null);return;}
   const batch=new Mesh(merged,this.parts[0].material);
   batch.name='Assembled fittings';batch.visible=false;batch.castShadow=true;batch.receiveShadow=true;
   batch.frustumCulled=false;batch.matrixAutoUpdate=false;
   this.group.add(batch);this.cached.set(task.detail,batch);
  };
  this.scheduled=window.setTimeout(run,0);
 }
 update(assembled:boolean,detail:boolean) {
  if (!this.parts.length) return;
  const eligible=assembled&&(this.parts[0].material as MeshPhysicalMaterial).transmission===0;
  const batch=eligible?this.cached.get(detail)??undefined:undefined;
  if (eligible && !this.cached.has(detail) && !this.pending) {
   this.pending={detail,sources:this.parts.map(p=>p.geometry),copies:[]};this.schedule();
  }
  if (this.active===batch) return;
  if (this.active) this.active.visible=false;
  this.active=batch;
  if (batch) {batch.layers.mask=this.parts[0].layers.mask;batch.visible=true;}
  for (const part of this.parts) part.visible=!batch;
 }
 syncLayers() {if (this.active) this.active.layers.mask=this.parts[0].layers.mask;}
 dispose() {
  this.disposed=true;
  if (this.scheduled!==undefined) window.clearTimeout(this.scheduled);
  for (const copy of this.pending?.copies??[]) copy.dispose();
  for (const batch of this.cached.values()) if (batch) {batch.removeFromParent();batch.geometry.dispose();}
  this.pending=undefined;this.cached.clear();
 }
}
