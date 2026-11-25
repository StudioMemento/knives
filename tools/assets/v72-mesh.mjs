import fs from 'node:fs';
import path from 'node:path';
import {MeshoptEncoder} from 'meshoptimizer';
import {parseGlb,decodeViews,packGlb,packUncompressed} from './v48/glb.mjs';

const [operation,source,destination]=process.argv.slice(2);
if (!['decode','encode'].includes(operation)||!destination) throw Error('Usage: node tools/assets/v72-mesh.mjs decode|encode INPUT.glb OUTPUT.glb');
const asset=parseGlb(source);
const views=await decodeViews(asset);
fs.mkdirSync(path.dirname(destination),{recursive:true});
if (operation==='decode') {
 fs.writeFileSync(destination,packUncompressed(asset,views));
} else {
 await MeshoptEncoder.ready;
 const doc=asset.json, chunks=[];
 const frame=new Set(),triangles=new Set();
 for(const mesh of doc.meshes)for(const primitive of mesh.primitives){
  frame.add(primitive.attributes.NORMAL);frame.add(primitive.attributes.TANGENT);
  if((primitive.mode??4)===4)triangles.add(primitive.indices);
 }let compressedSize=0,virtualSize=0;
 for(const [index,v] of doc.bufferViews.entries()){
  const a=doc.accessors.find(a=>a.bufferView===index);
  const bytes=views[index],stride=v.byteStride||bytes.length/a.count;
  const ai=doc.accessors.indexOf(a);
  const mode=triangles.has(ai)?'TRIANGLES':v.target===34963?'INDICES':'ATTRIBUTES';
  const filter=frame.has(ai)&&a.componentType===5126?'EXPONENTIAL':'NONE';
  const input=filter==='EXPONENTIAL'
   ? MeshoptEncoder.encodeFilterExp(new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4),a.count,stride,14,'SharedComponent')
   : bytes;
  const encoded=MeshoptEncoder.encodeGltfBuffer(input,a.count,stride,mode,0);
  const padding=(4-compressedSize%4)%4;
  if(padding){chunks.push(Buffer.alloc(padding));compressedSize+=padding;}
  virtualSize=(virtualSize+3)&~3;
  v.buffer=1;v.byteOffset=virtualSize;
  v.extensions={EXT_meshopt_compression:{buffer:0,byteOffset:compressedSize,byteLength:encoded.length,byteStride:stride,count:a.count,mode,filter}};
  virtualSize+=bytes.length;chunks.push(encoded);compressedSize+=encoded.length;
 }
 doc.extensionsUsed=['EXT_meshopt_compression'];doc.extensionsRequired=['EXT_meshopt_compression'];
 doc.buffers=[{byteLength:compressedSize},{byteLength:virtualSize,extensions:{EXT_meshopt_compression:{fallback:true}}}];
 fs.writeFileSync(destination,packGlb(doc,Buffer.concat(chunks)));
}
