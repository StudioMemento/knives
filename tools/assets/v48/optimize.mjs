// Lossless payload compression + conservative hardware-only triangulation reduction.
// No protected component is reindexed, welded, quantized or otherwise rewritten.
import fs from 'node:fs';
import path from 'node:path';
import {MeshoptSimplifier as Simplifier,MeshoptEncoder as Encoder} from 'meshoptimizer';
import {makeBvh,sampleSurface} from './surface-distance.mjs';
import {parseGlb,decodeViews,accessor,updateAccessor,packGlb,protectedPart,sha256,components,constructors} from './glb.mjs';
const root=path.resolve(import.meta.dirname,'../../..');
const input=path.join(root,'public/models/v46/hyper.glb'),out=path.join(root,'public/models/v48');
await Promise.all([Simplifier.ready,Encoder.ready]);
const source=parseGlb(input),json=structuredClone(source.json),views=await decodeViews(source),parts=[];
// 10 micrometre appearance bound; each geometric result is checked independently
// by the verifier's bidirectional surface sampling. Border vertices and extrema
// are locked, and retained positions/normals/UVs remain original float32 values.
const maxErrorM=0.000010;
for(let i=0;i<json.meshes.length;i++){
 const name=json.nodes.find(n=>n.mesh===i).name,p=json.meshes[i].primitives[0],position=accessor(json,views,p.attributes.POSITION),normal=accessor(json,views,p.attributes.NORMAL),uv=accessor(json,views,p.attributes.TEXCOORD_0),originalIndex=accessor(json,views,p.indices);
 const before=originalIndex.length/3,protectedMesh=protectedPart(name);let after=before,error=0;
 if(!protectedMesh){
  const count=position.length/3,attributes=new Float32Array(count*5),locks=new Uint8Array(count),scale=Simplifier.getScale(position,3);
  for(let k=0;k<count;k++)attributes.set([...normal.subarray(k*3,k*3+3),...uv.subarray(k*2,k*2+2)],k*5);
  // Preserve the exact six local bounding planes, including every vertex on them.
  for(let axis=0;axis<3;axis++){
   let min=Infinity,max=-Infinity;for(let k=axis;k<position.length;k+=3){min=Math.min(min,position[k]);max=Math.max(max,position[k]);}
   for(let k=0;k<count;k++)if(Math.abs(position[k*3+axis]-min)<1e-8||Math.abs(position[k*3+axis]-max)<1e-8)locks[k]=1;
  }
  let indices=new Uint32Array(originalIndex),relativeError=0,budget=maxErrorM;
  const originalBvh=makeBvh(position,originalIndex);
  for(let attempt=0;attempt<10;attempt++){
   [indices,relativeError]=Simplifier.simplifyWithAttributes(new Uint32Array(originalIndex),position,3,attributes,5,[.06,.06,.06,.02,.02],locks,Math.floor(before*.35)*3,budget/scale,['LockBorder']);
   if(indices.length===originalIndex.length)break;
   const candidateBvh=makeBvh(position,indices);
   const measured=Math.max(sampleSurface(position,originalIndex,candidateBvh).maxM,sampleSurface(position,indices,originalBvh).maxM);
   if(measured<=maxErrorM)break;
   budget*=Math.min(.8,maxErrorM/measured*.85);
   if(attempt===9){indices=new Uint32Array(originalIndex);relativeError=0;}
  }
  after=indices.length/3;error=relativeError*scale;
  if(after<before){
   const [remap,vertices]=Simplifier.compactMesh(indices);
   for(const index of Object.values(p.attributes)){
    const old=accessor(json,views,index),size=components[json.accessors[index].type],next=new old.constructor(vertices*size);
    for(let k=0;k<remap.length;k++)if(remap[k]!==0xffffffff)next.set(old.subarray(k*size,(k+1)*size),remap[k]*size);
    updateAccessor(json,views,index,next);
   }
   // Preserve accessor component type to keep all references and schema stable.
   updateAccessor(json,views,p.indices,new originalIndex.constructor(indices));
  }
 }
 parts.push({name,protected:protectedMesh,trianglesBefore:before,triangles:after,vertices:json.accessors[p.attributes.POSITION].count,simplifierAppearanceErrorM:error});
}
const chunks=[],compressedViews=new Map();let compressedOffset=0,fallbackOffset=0;
for(let i=0;i<json.bufferViews.length;i++){
 const view=json.bufferViews[i],a=json.accessors.find(a=>a.bufferView===i);
 if(!a)throw Error('Unreferenced bufferView '+i);
 const size=view.byteStride||components[a.type]*constructors[a.componentType].BYTES_PER_ELEMENT;
 const mode=view.target===34963?'INDICES':'ATTRIBUTES';
 const bytes=views[i];if(bytes.length%size)throw Error('Unaligned view '+i);
 // INDICES, not TRIANGLES: preserve exact index order even for the boolean clip.
 const key=mode+':'+size+':'+sha256(bytes);let storage=compressedViews.get(key);
 if(!storage){
  const encoded=Encoder.encodeGltfBuffer(bytes,bytes.length/size,size,mode,0);
  const pad=(4-compressedOffset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));compressedOffset+=pad;}
  storage={byteOffset:compressedOffset,byteLength:encoded.length};compressedViews.set(key,storage);chunks.push(encoded);compressedOffset+=encoded.length;
 }
 const fallbackPad=(4-fallbackOffset%4)%4;fallbackOffset+=fallbackPad;
 view.buffer=1;view.byteOffset=fallbackOffset;view.byteLength=bytes.length;
 view.extensions={EXT_meshopt_compression:{buffer:0,...storage,byteStride:size,count:bytes.length/size,mode}};
 fallbackOffset+=bytes.length;
}
json.buffers=[{byteLength:compressedOffset},{byteLength:fallbackOffset,extensions:{EXT_meshopt_compression:{fallback:true}}}];
json.extensionsUsed=[...new Set([...(json.extensionsUsed||[]),'EXT_meshopt_compression'])];json.extensionsRequired=[...new Set([...(json.extensionsRequired||[]),'EXT_meshopt_compression'])];
const result=packGlb(json,Buffer.concat(chunks));fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'hyper.glb'),result);
const meta=JSON.parse(fs.readFileSync(path.join(root,'public/models/v46/hyper.json')));
meta.url='/models/v48/hyper.glb';meta.outputBytes=result.length;meta.triangles=parts.reduce((sum,p)=>sum+p.triangles,0);
meta.derivativeNotes.push('V48: byte-exact protected blade, both handles and complete boolean-lettered clip; only other hardware conservatively retriangulated with locked borders and extrema.','V48: lossless EXT_meshopt_compression, no quantization; animation values and original node hierarchy unchanged.');
meta.optimizationV48={baselineBytes:source.bytes.length,baselineTriangles:parts.reduce((sum,p)=>sum+p.trianglesBefore,0),maxSimplifierAppearanceErrorM:maxErrorM,protectedParts:parts.filter(p=>p.protected).map(p=>p.name),baselineSha256:sha256(source.bytes),sha256:sha256(result),parts};
meta.parts=meta.parts.map(p=>({...p,triangles:parts.find(x=>x.name===p.name).triangles,vertices:parts.find(x=>x.name===p.name).vertices}));
fs.writeFileSync(path.join(out,'hyper.json'),JSON.stringify(meta,null,2)+'\n');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/models/v46/manifest.json')));manifest.version=48;manifest.models[0]=meta;manifest.generatedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({trianglesBefore:meta.optimizationV48.baselineTriangles,triangles:meta.triangles,bytesBefore:source.bytes.length,bytes:result.length,protected:meta.optimizationV48.protectedParts},null,2));
