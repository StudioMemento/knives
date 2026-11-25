import fs from 'node:fs';
import path from 'node:path';
import {MeshoptEncoder} from 'meshoptimizer';
import {parseGlb,decodeViews,packGlb,packUncompressed} from './v48/glb.mjs';

const [operation,source,destination]=process.argv.slice(2);
if (!['decode','encode'].includes(operation)||!destination) throw Error('Usage: node tools/assets/v71-mesh.mjs decode|encode INPUT.glb OUTPUT.glb');
const asset=parseGlb(source);
const views=await decodeViews(asset);
fs.mkdirSync(path.dirname(destination),{recursive:true});
if (operation==='decode') {
 fs.writeFileSync(destination,packUncompressed(asset,views));
} else {
 await MeshoptEncoder.ready;
 const doc=asset.json, chunks=[];let compressedSize=0,virtualSize=0;
 for(const [index,v] of doc.bufferViews.entries()){
  const a=doc.accessors.find(a=>a.bufferView===index);
  const bytes=views[index],stride=v.byteStride||bytes.length/a.count;
  const mode=v.target===34963?'INDICES':'ATTRIBUTES';
  const encoded=MeshoptEncoder.encodeGltfBuffer(bytes,a.count,stride,mode,0);
  const padding=(4-compressedSize%4)%4;
  if(padding){chunks.push(Buffer.alloc(padding));compressedSize+=padding;}
  virtualSize=(virtualSize+3)&~3;
  v.buffer=1;v.byteOffset=virtualSize;
  v.extensions={EXT_meshopt_compression:{buffer:0,byteOffset:compressedSize,byteLength:encoded.length,byteStride:stride,count:a.count,mode,filter:'NONE'}};
  virtualSize+=bytes.length;chunks.push(encoded);compressedSize+=encoded.length;
 }
 doc.extensionsUsed=['EXT_meshopt_compression'];doc.extensionsRequired=['EXT_meshopt_compression'];
 doc.buffers=[{byteLength:compressedSize},{byteLength:virtualSize,extensions:{EXT_meshopt_compression:{fallback:true}}}];
 fs.writeFileSync(destination,packGlb(doc,Buffer.concat(chunks)));
}
