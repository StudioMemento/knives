import fs from 'node:fs';
import crypto from 'node:crypto';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

export const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export const protectedPart=name=>/__blade__|__handle_[LR]__|__clip__/.test(name);
export const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
export const constructors={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
export function parseGlb(input){
 const bytes=typeof input==='string'?fs.readFileSync(input):input;
 if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2)throw Error('Expected glTF 2 GLB');
 const jsonLength=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonLength));
 const bin=bytes.subarray(28+jsonLength,bytes.readUInt32LE(8));
 return {json,bin,bytes};
}
export async function decodeViews(asset){
 await MeshoptDecoder.ready;
 return asset.json.bufferViews.map(v=>{
  const ext=v.extensions?.EXT_meshopt_compression;
  if(!ext)return new Uint8Array(asset.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength));
  const out=new Uint8Array(ext.count*ext.byteStride);
  MeshoptDecoder.decodeGltfBuffer(out,ext.count,ext.byteStride,asset.bin.subarray(ext.byteOffset||0,(ext.byteOffset||0)+ext.byteLength),ext.mode,ext.filter);
  return out;
 });
}
export function accessor(json,views,index){
 const a=json.accessors[index],v=json.bufferViews[a.bufferView],C=constructors[a.componentType],size=components[a.type],stride=v.byteStride||size*C.BYTES_PER_ELEMENT,source=views[a.bufferView];
 const out=new C(a.count*size);const packed=new Uint8Array(out.buffer);
 for(let i=0;i<a.count;i++)packed.set(source.subarray((a.byteOffset||0)+i*stride,(a.byteOffset||0)+i*stride+size*C.BYTES_PER_ELEMENT),i*size*C.BYTES_PER_ELEMENT);
 return out;
}
export function updateAccessor(json,views,index,array){
 const a=json.accessors[index],size=components[a.type],view=json.bufferViews[a.bufferView];
 if(a.byteOffset||view.byteStride&&view.byteStride!==size*array.BYTES_PER_ELEMENT)throw Error('Only packed single-accessor views can be updated');
 a.count=array.length/size;
 if(a.min)a.min=Array(size).fill(Infinity);if(a.max)a.max=Array(size).fill(-Infinity);
 for(let i=0;i<array.length;i++){if(a.min)a.min[i%size]=Math.min(a.min[i%size],array[i]);if(a.max)a.max[i%size]=Math.max(a.max[i%size],array[i]);}
 views[a.bufferView]=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);view.byteLength=array.byteLength;
}
export function packGlb(json,bin){
 const txt=Buffer.from(JSON.stringify(json));const j=Buffer.alloc(Math.ceil(txt.length/4)*4,32);txt.copy(j);
 const b=Buffer.alloc(Math.ceil(bin.length/4)*4);Buffer.from(bin).copy(b);
 const out=Buffer.alloc(28+j.length+b.length);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(j.length,12);out.writeUInt32LE(0x4e4f534a,16);j.copy(out,20);out.writeUInt32LE(b.length,20+j.length);out.writeUInt32LE(0x004e4942,24+j.length);b.copy(out,28+j.length);return out;
}
export function packUncompressed(asset,views){
 const j=structuredClone(asset.json);delete j.extensionsUsed;delete j.extensionsRequired;let offset=0;const chunks=[];
 j.bufferViews.forEach((view,i)=>{const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}view.buffer=0;view.byteOffset=offset;view.byteLength=views[i].length;delete view.extensions;chunks.push(views[i]);offset+=views[i].length;});
 j.buffers=[{byteLength:offset}];return packGlb(j,Buffer.concat(chunks));
}
