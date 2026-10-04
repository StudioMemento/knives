import * as THREE from 'three';
type Vertex={p:THREE.Vector3;n:THREE.Vector3;uv:THREE.Vector2;part:number};
const mix=(a:Vertex,b:Vertex,t:number):Vertex=>({p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize(),uv:a.uv.clone().lerp(b.uv,t),part:a.part});
function clip(poly:Vertex[],level:number,above:boolean){
 const out:Vertex[]=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length];const da=(a.p.y-level)*(above?1:-1),db=(b.p.y-level)*(above?1:-1);
  if(da>=-1e-7)out.push(a);
  if((da>1e-7&&db< -1e-7)||(da< -1e-7&&db>1e-7))out.push(mix(a,b,(level-a.p.y)/(b.p.y-a.p.y)));
 }
 return out;
}
/** Slice the actual triangles; UVs, normals and surface IDs are interpolated at every cut. */
export function sliceGeometry(geometry:THREE.BufferGeometry,min:number,max:number){
 const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv,part=geometry.attributes.knifePart;
 const positions:number[]=[],normals:number[]=[],uvs:number[]=[],parts:number[]=[];
 for(let i=0;i<p.count;i+=3){
  const ay=p.getY(i),by=p.getY(i+1),cy=p.getY(i+2);if(Math.max(ay,by,cy)<min||Math.min(ay,by,cy)>max)continue;
  let poly:Vertex[]=[];for(let j=0;j<3;j++)poly.push({p:new THREE.Vector3().fromBufferAttribute(p,i+j),n:new THREE.Vector3().fromBufferAttribute(n,i+j),uv:new THREE.Vector2(uv.getX(i+j),uv.getY(i+j)),part:part.getX(i+j)});
  poly=clip(clip(poly,min,true),max,false);
  for(let j=1;j<poly.length-1;j++)for(const v of [poly[0],poly[j],poly[j+1]]){positions.push(...v.p.toArray());normals.push(...v.n.toArray());uvs.push(...v.uv.toArray());parts.push(v.part);}
 }
 const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));result.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));result.setAttribute('knifePart',new THREE.Float32BufferAttribute(parts,1));result.computeBoundingBox();result.computeBoundingSphere();return result;
}
function crossSection(meshes:THREE.Mesh[],level:number,normal:number){
 const points=new Map<string,THREE.Vector2>(),edges=new Map<string,Set<string>>();
 const key=(p:THREE.Vector2)=>`${Math.round(p.x*1e5)},${Math.round(p.y*1e5)}`;
 for(const mesh of meshes){const a=mesh.geometry.attributes.position;
  for(let i=0;i<a.count;i+=3){const hits:THREE.Vector2[]=[];
   for(let j=0;j<3;j++){const p=new THREE.Vector3().fromBufferAttribute(a,i+j),q=new THREE.Vector3().fromBufferAttribute(a,i+(j+1)%3);if((p.y<level&&q.y>=level)||(q.y<level&&p.y>=level)){const t=(level-p.y)/(q.y-p.y);hits.push(new THREE.Vector2(THREE.MathUtils.lerp(p.x,q.x,t),THREE.MathUtils.lerp(p.z,q.z,t)));}}
   if(hits.length!==2)continue;const u=key(hits[0]),v=key(hits[1]);if(u===v)continue;points.set(u,hits[0]);points.set(v,hits[1]);if(!edges.has(u))edges.set(u,new Set());if(!edges.has(v))edges.set(v,new Set());edges.get(u)!.add(v);edges.get(v)!.add(u);
  }
 }
 const loops:THREE.Vector2[][]=[];
 while(edges.size){const start=edges.keys().next().value!;let current=start;const loop:THREE.Vector2[]=[];let closed=false;
  for(let step=0;step<points.size+1;step++){
   loop.push(points.get(current)!);const next=edges.get(current)?.values().next().value;if(next===undefined){edges.delete(current);break;}
   edges.get(current)!.delete(next);edges.get(next)?.delete(current);if(!edges.get(current)?.size)edges.delete(current);if(!edges.get(next)?.size)edges.delete(next);current=next;if(current===start){closed=true;break;}
  }
  if(closed&&loop.length>=3&&Math.abs(THREE.ShapeUtils.area(loop))>1e-8)loops.push(loop);
 }
 const inside=(p:THREE.Vector2,poly:THREE.Vector2[])=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;};
 loops.sort((a,b)=>Math.abs(THREE.ShapeUtils.area(b))-Math.abs(THREE.ShapeUtils.area(a)));
 const parents=loops.map((loop,i)=>{for(let j=i-1;j>=0;j--)if(inside(loop[0],loops[j]))return j;return -1;});
 const depth=(i:number):number=>parents[i]<0?0:1+depth(parents[i]);const positions:number[]=[];
 loops.forEach((outer,i)=>{if(depth(i)%2)return;const holes=loops.filter((_,j)=>parents[j]===i);const all=[...outer,...holes.flat()];for(const face of THREE.ShapeUtils.triangulateShape(outer,holes))for(const id of(normal>0?face:[...face].reverse())){const p=all[id];positions.push(p.x,level,p.y);}});
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();return geometry;
}
export function* prepareSections(meshes:THREE.Mesh[],color:THREE.Color,count=8){
 const group=new THREE.Group();const capMaterial=new THREE.MeshStandardMaterial({color,metalness:.65,roughness:.33,side:THREE.DoubleSide,emissive:color,emissiveIntensity:.08});group.userData.capMaterial=capMaterial;
 for(let i=0;i<count;i++){
  const lo=-2.25+4.5*i/count,hi=-2.25+4.5*(i+1)/count,piece=new THREE.Group();
  for(const mesh of meshes){const geometry=sliceGeometry(mesh.geometry,lo,hi);if(!geometry.attributes.position.count){geometry.dispose();continue;}
   // Share the original finish uniforms; the sectioning geometry owns only its new vertex buffers.
   piece.add(new THREE.Mesh(geometry,mesh.material));
  }
  if(i>0)piece.add(new THREE.Mesh(crossSection(meshes,lo,-1),capMaterial));
  if(i<count-1)piece.add(new THREE.Mesh(crossSection(meshes,hi,1),capMaterial));
  group.add(piece);yield group;
 }
 group.userData.capMaterial=capMaterial;return group;
}
export function buildSections(meshes:THREE.Mesh[],color:THREE.Color,count=8){
 const iterator=prepareSections(meshes,color,count);let step=iterator.next();while(!step.done)step=iterator.next();return step.value;
}
export function updateSections(group:THREE.Group,progress:number){
 group.children.forEach((piece,index)=>{piece.position.y=(index-(group.children.length-1)/2)*.18*progress;});
}
