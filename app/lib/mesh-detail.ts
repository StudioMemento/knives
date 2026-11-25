import {BufferAttribute, BufferGeometry, Material, Matrix4, Mesh, InterleavedBufferAttribute, type Object3D, type TypedArrayConstructor} from 'three';
import type {GLTF,GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {ModelMeta} from './state';

// The material grain is evaluated in the open rest pose, even if a refinement
// finishes loading while the product is folded or exploded.
export function addStockCoordinates(geometry:BufferGeometry, restMatrix:Matrix4) {
 const stock = geometry.getAttribute('position').clone() as BufferAttribute;
 stock.applyMatrix4(restMatrix);
 for (let i=0; i<stock.count; i++) stock.setXYZ(i, stock.getX(i)*1000, stock.getY(i)*1000, stock.getZ(i)*1000);
 geometry.setAttribute('stock', stock);
}

export function disposeImport(root:Object3D, disposeGeometry:boolean) {
 const materials = new Set<Material>(), geometries = new Set<BufferGeometry>();
 root.traverse(node => {
  if (!(node instanceof Mesh)) return;
  for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
  if (disposeGeometry) geometries.add(node.geometry);
 });
 for (const material of materials) material.dispose();
 for (const geometry of geometries) geometry.dispose();
}

type Refinement = {name:string; stageVertices:number; addedVertices:number; attributes:Record<string,number>; indices:number};
const attributes = {position:'POSITION',normal:'NORMAL',uv:'TEXCOORD_0',tangent:'TANGENT'};

type Attribute = BufferAttribute|InterleavedBufferAttribute;
function joinAttributes(first:Attribute, tail:Attribute) {
 const size=first.itemSize, ArrayType=first.array.constructor as TypedArrayConstructor;
 if (tail.itemSize!==size || tail.array.constructor!==ArrayType || first.normalized!==tail.normalized) throw Error('Incompatible refinement streams');
 const values=new ArrayType((first.count+tail.count)*size);
 let offset=0;
 for (const attr of [first,tail]) {
  if (attr instanceof InterleavedBufferAttribute) {
   for (let i=0; i<attr.count; i++) {
    const source=i*attr.data.stride+attr.offset;
    values.set(attr.array.subarray(source,source+size),offset+i*size);
   }
  } else values.set(attr.array,offset);
  offset+=attr.count*size;
 }
 return new BufferAttribute(values,size,first.normalized);
}

async function refineGeometry(gltf:GLTF, part:Refinement, stage:BufferGeometry, rest:Matrix4) {
 if (!Number.isInteger(part.addedVertices) || part.addedVertices<0 || stage.getAttribute('position').count!==part.stageVertices) throw Error('Mismatched Stage vertices for '+part.name);
 const result=new BufferGeometry();
 try {
  const index=await gltf.parser.getDependency('accessor',part.indices) as BufferAttribute;
  if (!index.count || index.count%3 || index.itemSize!==1) throw Error('Invalid refinement indices for '+part.name);
  const count=part.stageVertices+part.addedVertices;
  for (const i of index.array) if (i>=count) throw Error('Out-of-range refinement index for '+part.name);
  result.setIndex(index);
  for (const [attribute,semantic] of Object.entries(attributes)) {
   const first=stage.getAttribute(attribute);
   if (!part.addedVertices) {result.setAttribute(attribute,first); continue;}
   const id=part.attributes[semantic];
   if (!Number.isInteger(id)) throw Error('Missing refinement attribute '+semantic);
   const tail=await gltf.parser.getDependency('accessor',id) as BufferAttribute|InterleavedBufferAttribute;
   if (tail.count!==part.addedVertices) throw Error('Incomplete refinement attribute '+semantic);
   result.setAttribute(attribute,joinAttributes(first,tail));
  }
  addStockCoordinates(result,rest);
  return result;
 } catch(error) {result.dispose(); throw error;}
}

type Slot = {mesh:Mesh; stage:BufferGeometry; rest:Matrix4; mirror?:Mesh; detail?:BufferGeometry};
export class MeshDetail {
 private readonly slots = new Map<string,Slot>();
 private readonly refined:Slot[] = [];
 private busy = false;
 private disposed = false;
 private retryAt = 0;
 active = false;

 constructor(file:ModelMeta['detail'], loadFile:(url:string)=>ReturnType<GLTFLoader['loadAsync']>) {
  this.file=file; this.loadFile=loadFile;
 }
 private readonly file:ModelMeta['detail'];
 private readonly loadFile:(url:string)=>ReturnType<GLTFLoader['loadAsync']>;

 register(mesh:Mesh, rest:Matrix4, mirror?:Mesh) {
  this.slots.set(mesh.name, {mesh, stage:mesh.geometry, rest, mirror});
 }
 update(wanted:boolean, now:number) {
  if (!this.file || this.disposed) return;
  if (!this.refined.length) {
   if (wanted && !this.busy && now>=this.retryAt) void this.prepare();
   return;
  }
  if (wanted===this.active) return;
  for (const slot of this.refined) {
   slot.mesh.geometry = wanted ? slot.detail! : slot.stage;
   if (slot.mirror) slot.mirror.geometry = slot.mesh.geometry;
  }
  this.active=wanted;
 }
 private async prepare() {
  this.busy=true;
  const batch=new Map<Slot,BufferGeometry>();
  let accepted=false;
  try {
   const gltf=await this.loadFile(this.file!.url);
   if (this.disposed) return;
   const patches:Refinement[]=gltf.parser.json.extras?.refinements;
   if (!Array.isArray(patches) || patches.length!==this.file!.meshCount) throw Error('Incomplete refinement '+this.file!.url);
   for (const part of patches) {
    const slot=this.slots.get(part.name);
    if (!slot || batch.has(slot)) throw Error('Unmatched detail part '+part.name);
    if (this.disposed) return;
    batch.set(slot,await refineGeometry(gltf,part,slot.stage,slot.rest));
   }
   if (this.disposed) return;
   for (const [slot,geometry] of batch) {slot.detail=geometry; this.refined.push(slot);}
   accepted=true;
  } catch(error) {
   if (!this.disposed) {this.retryAt=performance.now()+12000; console.warn('Model refinement deferred.',error);}
  } finally {
   if (!accepted) for (const geometry of batch.values()) geometry.dispose();
   this.busy=false;
  }
 }
 dispose() {
  this.disposed=true;
  for (const slot of this.slots.values()) {slot.stage.dispose(); slot.detail?.dispose();}
  this.slots.clear(); this.refined.length=0;
 }
}
