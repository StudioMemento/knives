import {MeshoptSimplifier} from 'meshoptimizer';
import {atlasGuard} from './uv.mjs';
import {makeBvh, sampleSurface} from '../v48/surface-distance.mjs';

const lanes = {POSITION: 3, NORMAL: 3, TEXCOORD_0: 2, TANGENT: 4};
function compact(data, remap, count) {
  return Object.fromEntries(Object.entries(data).map(([name, values]) => {
    const size = lanes[name], out = new Float32Array(count * size);
    for (let i = 0; i < remap.length; i++) {
      const dest = remap[i];
      if (dest !== 0xffffffff) out.set(values.subarray(i * size, (i + 1) * size), dest * size);
    }
    return [name, out];
  }));
}
export {compact};
function faceVector(p, a, b, c) {
  const ux = p[b * 3] - p[a * 3], uy = p[b * 3 + 1] - p[a * 3 + 1], uz = p[b * 3 + 2] - p[a * 3 + 2];
  const vx = p[c * 3] - p[a * 3], vy = p[c * 3 + 1] - p[a * 3 + 1], vz = p[c * 3 + 2] - p[a * 3 + 2];
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}
export function clean(data, indices) {
  const vertices = data.POSITION.length / 3;
  const ids = new Uint32Array(vertices), keys = new Map();
  // UV, normal, tangent and tangent handedness all participate in the weld.
  for (let i = 0; i < vertices; i++) {
    const values = [];
    for (const [name, size] of Object.entries(lanes)) values.push(...data[name].subarray(i * size, (i + 1) * size));
    const key = values.join('/');
    if (!keys.has(key)) keys.set(key, i);
    ids[i] = keys.get(key);
  }
  const seen = new Set(), kept = [];
  let zeroArea = 0, duplicates = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const a = ids[indices[i]], b = ids[indices[i + 1]], c = ids[indices[i + 2]];
    if (faceVector(data.POSITION, a, b, c).every(x => x === 0)) {zeroArea++; continue;}
    const key = a < b && a < c ? `${a}/${b}/${c}` : b < c ? `${b}/${c}/${a}` : `${c}/${a}/${b}`;
    if (seen.has(key)) {duplicates++; continue;}
    seen.add(key); kept.push(a, b, c);
  }
  const faces = Uint32Array.from(kept);
  const [remap, count] = MeshoptSimplifier.compactMesh(faces);
  return {data: compact(data, remap, count), indices: faces, removedVertices: vertices - count, zeroArea, duplicates};
}
function boundary(indices, ids, count) {
  const edges = new Map();
  for (let i = 0; i < indices.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const a = ids[indices[i + k]], b = ids[indices[i + (k + 1) % 3]];
      const key = Math.min(a, b) * count + Math.max(a, b);
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  return new Map([...edges].filter(([,n]) => n !== 2));
}
function normalFailures(p, n, indices) {
  const bad = new Set();
  for (let i = 0; i < indices.length; i += 3) {
    const verts = indices.subarray(i, i + 3);
    const [x,y,z] = faceVector(p, ...verts), len = Math.hypot(x, y, z);
    if (!len || verts.some(j => x*n[j*3] + y*n[j*3+1] + z*n[j*3+2] < -1e-5*len)) bad.add(i);
  }
  return bad;
}
export function stageGeometry(part, relativeLimit, role, name) {
  const {data, indices} = part;
  const original = {indices, measuredError: 0};
  // Keep blade, liner holes and clip lettering at source topology on both levels.
  if (role === 'blade' || /__(?:clip|clip_front|clip_edge|clip_back|tail_loop|liner_[LR])__/.test(name) || indices.length < 3 * 150) return original;
  if (role === 'handle') relativeLimit *= .30;
  const p = data.POSITION, n = data.NORMAL, uv = data.TEXCOORD_0, count = p.length / 3;
  const positionIds = MeshoptSimplifier.generatePositionRemap(p, 3);
  const sourceBoundary = boundary(indices, positionIds, count);
  const locks = new Uint8Array(count), attrs = new Float32Array(count * 5);
  for (let i = 0; i < count; i++) {
    attrs.set(n.subarray(i * 3, i * 3 + 3), i * 5);
    attrs.set(uv.subarray(i * 2, i * 2 + 2), i * 5 + 3);
  }
  for (let axis = 0; axis < 3; axis++) {
    let low = 0, high = 0;
    for (let i = 1; i < count; i++) {
      if (p[i * 3 + axis] < p[low * 3 + axis]) low = i;
      if (p[i * 3 + axis] > p[high * 3 + axis]) high = i;
    }
    locks[low] = locks[high] = 1;
  }
  // Keep the entire boundary of every Painter island in place. UV seams that
  // coincide in 3D remain distinct on both sides of the atlas.
  const chartIds = new Uint32Array(count), chartKeys = new Map();
  for (let i=0; i<count; i++) {
    const key=[positionIds[i],uv[2*i],uv[2*i+1]].join('/');
    if (!chartKeys.has(key)) chartKeys.set(key,chartKeys.size);
    chartIds[i]=chartKeys.get(key);
  }
  const borderIds=new Set();
  for (const edge of boundary(indices,chartIds,count).keys()) {
    borderIds.add(Math.floor(edge/count)); borderIds.add(edge%count);
  }
  for (let i=0; i<count; i++) if (borderIds.has(chartIds[i])) locks[i]=1;
  const validUV = atlasGuard(uv, indices);
  const oldNormals = normalFailures(p, n, indices);
  if (oldNormals.size) return original;
  const target = Math.floor(indices.length / 3 * .23) * 3;
  const scale = MeshoptSimplifier.getScale(p, 3);
  let budget = Math.min(.022, relativeLimit / scale);
  let reference;
  for (let attempt = 0; attempt < 24; attempt++) {
    const [candidate] = MeshoptSimplifier.simplifyWithAttributes(indices, p, 3, attrs, 5, [.022,.022,.022,.32,.32], locks, target, budget, ['LockBorder']);
    if (candidate.length >= indices.length * .97) return original;
    const bad = validUV(candidate);
    for (const face of normalFailures(p, n, candidate)) bad.add(face);
    const edges = boundary(candidate, positionIds, count);
    if (edges.size !== sourceBoundary.size || [...edges].some(([edge, value]) => sourceBoundary.get(edge) !== value)) {
      budget *= .5; continue;
    }
    if (bad.size) {
      // Lock the original one-ring around rejected collapses, including split seam vertices.
      const seeds = new Set();
      for (const face of bad) for (let k = 0; k < 3; k++) seeds.add(positionIds[candidate[face+k]]);
      const ring = new Set(seeds);
      for (let i = 0; i < indices.length; i += 3) {
        const tri = indices.subarray(i, i + 3);
        if (tri.some(v => seeds.has(positionIds[v]))) for (const v of tri) ring.add(positionIds[v]);
      }
      for (let i = 0; i < count; i++) if (ring.has(positionIds[i])) locks[i] = 1;
      continue;
    }
    reference ??= makeBvh(p, indices);
    const reduced = makeBvh(p, candidate);
    const error = Math.max(sampleSurface(p, indices, reduced).maxM, sampleSurface(p, candidate, reference).maxM);
    if (error <= relativeLimit) return {indices: candidate, measuredError: error};
    budget *= Math.min(.8, relativeLimit / error * .85);
  }
  return original;
}
