import fs from 'node:fs';
import path from 'node:path';
import {MeshoptEncoder, MeshoptSimplifier} from 'meshoptimizer';
import {parseGlb, decodeViews, accessor, components, packGlb, sha256} from '../v48/glb.mjs';
import {clean, compact, stageGeometry} from './simplify.mjs';

const sourceDir = path.resolve(import.meta.dirname, '../../../public/models/v72');
const outDir = path.join(path.dirname(sourceDir), 'v73');
const source = JSON.parse(fs.readFileSync(path.join(sourceDir, 'manifest.json')));
const extension = 'EXT_meshopt_compression';
const roles = ['POSITION', 'NORMAL', 'TEXCOORD_0', 'TANGENT'];
const template = j => ({asset: {...j.asset, generator: 'Memento V73 web export'}, materials: j.materials, meshes: [], nodes: [], scenes: [{nodes: []}], scene: 0});
function writer(doc) {
  doc.bufferViews = []; doc.accessors = [];
  const chunks = [], cache = new Map();
  let packedSize = 0, decodedSize = 0;
  function stream(header, bytes, stride, mode = 'ATTRIBUTES', filter = 'NONE', target) {
    const key = [JSON.stringify(header), stride, mode, filter, target, sha256(bytes)].join('/');
    if (cache.has(key)) return cache.get(key);
    const encoded = MeshoptEncoder.encodeGltfBuffer(bytes, header.count, stride, mode, 0);
    const padding = (4 - packedSize % 4) % 4;
    if (padding) {chunks.push(Buffer.alloc(padding)); packedSize += padding;}
    decodedSize = Math.ceil(decodedSize / 4) * 4;
    const view = {buffer: 1, byteOffset: decodedSize, byteLength: bytes.byteLength, target,
      extensions: {[extension]: {buffer: 0, byteOffset: packedSize, byteLength: encoded.length, byteStride: stride, count: header.count, mode, filter}}};
    if (filter === 'OCTAHEDRAL' && header.type === 'VEC3') view.byteStride = stride;
    const id = doc.accessors.length;
    doc.accessors.push({...header, bufferView: doc.bufferViews.length}); doc.bufferViews.push(view);
    chunks.push(encoded); packedSize += encoded.length; decodedSize += bytes.byteLength;
    cache.set(key, id); return id;
  }
  function attributesFor(streams, count) {
    const attributes = {};
    for (const [name, values] of Object.entries(streams)) {
      const lanes = values.length / count, type = `VEC${lanes}`;
      if (name === 'NORMAL' || name === 'TANGENT') {
        const vectors = new Float32Array(count * 4);
        for (let i = 0; i < count; i++) vectors.set(values.subarray(i * lanes, (i + 1) * lanes), i * 4);
        const packed = MeshoptEncoder.encodeFilterOct(vectors, count, 8, 16);
        attributes[name] = stream({type, count, componentType: 5122, normalized: true}, packed, 8, 'ATTRIBUTES', 'OCTAHEDRAL', 34962);
      } else {
        const header = {type, count, componentType: 5126};
        if (name === 'POSITION') {
          header.min = [Infinity,Infinity,Infinity]; header.max = [-Infinity,-Infinity,-Infinity];
          for (let i = 0; i < values.length; i++) {
            header.min[i%3] = Math.min(header.min[i%3], values[i]); header.max[i%3] = Math.max(header.max[i%3], values[i]);
          }
        }
        attributes[name] = stream(header, new Uint8Array(values.buffer), lanes * 4, 'ATTRIBUTES', 'NONE', 34962);
      }
    }
    return attributes;
  }
  function indexStream(reordered, count) {
    const small = count <= 65535, elements = small ? Uint16Array.from(reordered) : reordered;
    const indices = stream({type:'SCALAR', count:elements.length, componentType:small ? 5123 : 5125}, new Uint8Array(elements.buffer), elements.BYTES_PER_ELEMENT, 'TRIANGLES', 'NONE', 34963);
    return indices;
  }
  function mesh(data, triangles, material) {
    const elements = triangles.slice();
    const [remap, count] = MeshoptEncoder.reorderMesh(elements, true, true);
    const attributes = attributesFor(compact(data, remap, count), count);
    const indices = indexStream(elements, count);
    doc.meshes.push({primitives: [{attributes, indices, material, mode: 4}]});
    return {remap, count};
  }
  function finish() {
    doc.extensionsUsed = [extension,'KHR_mesh_quantization']; doc.extensionsRequired = [...doc.extensionsUsed];
    doc.buffers = [{byteLength:packedSize},{byteLength:decodedSize,extensions:{[extension]:{fallback:true}}}];
    return packGlb(doc, Buffer.concat(chunks));
  }
  return {doc, stream, mesh, attributesFor, indexStream, finish};
}
// A refinement GLB stores ordinary glTF accessors. Its index stream addresses the
// stage vertices followed by only the new vertices needed by the original topology.
function appendRefinement(output, name, part, stage) {
  const indices = part.indices.slice();
  // reorderMesh renumbers the indices; recover the original vertex IDs before
  // addressing the shared Stage buffers. Keep its GPU-friendly triangle order.
  const [optimized, unique] = MeshoptEncoder.reorderMesh(indices, true, true);
  const original = new Uint32Array(unique);
  for (let i=0; i<optimized.length; i++) if (optimized[i]!==0xffffffff) original[optimized[i]]=i;
  const total = part.data.POSITION.length/3;
  const tail = new Uint32Array(total).fill(0xffffffff);
  let added = 0;
  for (let i=0; i<indices.length; i++) {
    const id = original[indices[i]];
    if (id < stage.remap.length && stage.remap[id]!==0xffffffff) indices[i]=stage.remap[id];
    else {
      if (tail[id]===0xffffffff) tail[id]=added++;
      indices[i]=stage.count+tail[id];
    }
  }
  const attributes = added ? output.attributesFor(compact(part.data,tail,added),added) : {};
  return {name, stageVertices:stage.count, addedVertices:added, attributes, indices:output.indexStream(indices,stage.count+added)};
}
function copyAnimations(j, views, output) {
  const doc = output.doc;
  doc.animations = structuredClone(j.animations);
  const accessors = new Map();
  function copy(i) {
    if (accessors.has(i)) return accessors.get(i);
    const {bufferView, byteOffset, ...header} = j.accessors[i];
    const array = accessor(j, views, i);
    const id = output.stream(header, new Uint8Array(array.buffer), components[header.type] * array.BYTES_PER_ELEMENT);
    accessors.set(i,id); return id;
  }
  for (const clip of doc.animations) for (const sample of clip.samplers) {
    sample.input = copy(sample.input); sample.output = copy(sample.output);
  }
}
await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
fs.mkdirSync(outDir, {recursive:true});
const models = [], audit = [];
for (const meta of source.models) {
  const input = parseGlb(path.join(sourceDir, path.basename(meta.url))), j = input.json;
  const views = await decodeViews(input), base = writer(template(j)), detail = writer({asset:{version:'2.0'}, extras:{refinements:[]}});
  base.doc.nodes = structuredClone(j.nodes); base.doc.scenes = j.scenes; base.doc.scene = j.scene;
  const parts = [];
  for (const [id, m] of j.meshes.entries()) {
    const n = j.nodes.find(n => n.mesh === id), p = m.primitives[0];
    if (!n || m.primitives.length !== 1 || (p.mode ?? 4) !== 4 || p.targets || n.skin !== undefined || !roles.every(key => key in p.attributes)) throw Error('Unsupported source mesh '+id);
    const data = Object.fromEntries(roles.map(key => [key, accessor(j, views, p.attributes[key])]));
    const indices = accessor(j, views, p.indices), part = clean(data, indices);
    const stage = stageGeometry(part, meta.bounds.size[0] * .00045, n.extras.materialRole, n.name);
    const stored = base.mesh(part.data, stage.indices, p.material);
    if (stage.indices !== part.indices) detail.doc.extras.refinements.push(appendRefinement(detail,n.name,part,stored));
    parts.push({name:n.name, zone:n.extras.materialRole, originalTriangles:indices.length/3, stageTriangles:stage.indices.length/3,
      detailTriangles:part.indices.length/3, originalVertices:data.POSITION.length/3, cleanVertices:part.data.POSITION.length/3,
      unusedOrWeldedVertices:part.removedVertices, zeroAreaFaces:part.zeroArea, duplicateFaces:part.duplicates,
      maxSampledErrorAt1024px:stage.measuredError/meta.bounds.size[0]*1024});
  }
  copyAnimations(j, views, base);
  const stem = meta.id.toLowerCase(), filename = stem+'.glb', detailFilename = stem+'-detail.glb';
  const output = base.finish(); fs.writeFileSync(path.join(outDir,filename), output);
  const sum = key => parts.reduce((total,row) => total+row[key],0);
  const model = {...meta, url:'/models/v73/'+filename, triangles:sum('stageTriangles'), outputBytes:output.length,
    inspectionTriangles:sum('detailTriangles')};
  if (detail.doc.extras.refinements.length) {
    const patch = detail.finish(); fs.writeFileSync(path.join(outDir,detailFilename), patch);
    model.detail = {url:'/models/v73/'+detailFilename, meshCount:detail.doc.extras.refinements.length, outputBytes:patch.length};
  }
  models.push(model);
  audit.push({id:meta.id, sourceBytes:input.bytes.length, stageBytes:output.length, refinementBytes:model.detail?.outputBytes ?? 0,
    originalTriangles:sum('originalTriangles'), stageTriangles:model.triangles, inspectionTriangles:model.inspectionTriangles,
    removedVertices:sum('unusedOrWeldedVertices'), maxSampledErrorAt1024px:Math.max(...parts.map(p=>p.maxSampledErrorAt1024px)), parts});
  console.log(meta.id, model.triangles, 'triangles,', output.length, 'stage bytes,', model.detail?.meshCount ?? 0, 'refined parts');
}
fs.writeFileSync(path.join(outDir,'manifest.json'), JSON.stringify({version:73, models},null,2)+'\n');
fs.writeFileSync(path.join(import.meta.dirname,'mesh-audit.json'), JSON.stringify(audit,null,2)+'\n');
