// Area tests run in the Painter atlas, in double precision. Shared edges have zero area.
function cross(a, b, p) {
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
}
function triangle(uv, indices, offset) {
  const points = [0, 1, 2].map(k => {
    const i = indices[offset + k] * 2;
    return [uv[i], uv[i + 1]];
  });
  const area = cross(points[0], points[1], points[2]) / 2;
  if (area < 0) [points[1], points[2]] = [points[2], points[1]];
  return {points, area, offset};
}
function intersection(a, b) {
  let polygon = a.points;
  for (let k = 0; k < 3 && polygon.length; k++) {
    const p0 = b.points[k], p1 = b.points[(k + 1) % 3];
    const clipped = [];
    let last = polygon.at(-1), d0 = cross(p0, p1, last);
    for (const point of polygon) {
      const d = cross(p0, p1, point);
      if ((d0 < 0) !== (d < 0)) {
        const t = d0 / (d0 - d);
        clipped.push([last[0] + t * (point[0] - last[0]), last[1] + t * (point[1] - last[1])]);
      }
      if (d >= 0) clipped.push(point);
      last = point; d0 = d;
    }
    polygon = clipped;
  }
  let area = 0;
  for (let i = 1; i + 1 < polygon.length; i++) area += cross(polygon[0], polygon[i], polygon[i + 1]);
  return Math.abs(area) / 2;
}
class Grid {
  cells = new Map();
  keys(face) {
    const u = face.points.map(p => Math.floor(p[0] * 256));
    const v = face.points.map(p => Math.floor(p[1] * 256));
    const keys = [];
    for (let y = Math.min(...v); y <= Math.max(...v); y++) {
      for (let x = Math.min(...u); x <= Math.max(...u); x++) keys.push(y * 512 + x);
    }
    return keys;
  }
  insert(face, keys) {
    for (const key of keys) {
      if (!this.cells.has(key)) this.cells.set(key, []);
      this.cells.get(key).push(face);
    }
  }
  neighbours(keys) {
    const out = new Set();
    for (const key of keys) for (const face of this.cells.get(key) ?? []) out.add(face);
    return out;
  }
}
export function atlasGuard(uv, source) {
  const atlas = new Grid();
  for (let i = 0; i < source.length; i += 3) {
    const face = triangle(uv, source, i);
    atlas.insert(face, atlas.keys(face));
  }
  return candidate => {
    const bad = new Set(), output = new Grid();
    for (let i = 0; i < candidate.length; i += 3) {
      const face = triangle(uv, candidate, i), area = Math.abs(face.area);
      const keys = atlas.keys(face);
      // Allow only floating point noise, well below a millionth of a 2K texel in area.
      const tolerance = Math.max(2e-15, area * 2e-9);
      let covered = 0;
      for (const old of atlas.neighbours(keys)) {
        if (Math.sign(old.area) === Math.sign(face.area)) covered += intersection(face, old);
      }
      if (area === 0 || covered + tolerance < area) bad.add(i);
      for (const other of output.neighbours(keys)) {
        if (intersection(face, other) > Math.max(2e-15, Math.min(area, Math.abs(other.area)) * 2e-9)) {
          bad.add(i); bad.add(other.offset);
        }
      }
      output.insert(face, keys);
    }
    return bad;
  };
}
