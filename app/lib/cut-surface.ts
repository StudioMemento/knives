import * as THREE from 'three';
import {LineSegments2} from 'three/addons/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/addons/lines/LineSegmentsGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import {sliceRange} from './framing.ts';

export const CUT_DIRECTIONS=[new THREE.Vector3(-1,0,0),new THREE.Vector3(0,-1,0),new THREE.Vector3(0,0,1)];
export const cutThreshold=(min:number,max:number,value:number)=>THREE.MathUtils.lerp(min,max,value);
export function setCutPlane(plane:THREE.Plane,axis:number,value:number,rotation:THREE.Quaternion,meshes:THREE.Mesh[]){
 plane.normal.copy(CUT_DIRECTIONS[axis]).applyQuaternion(rotation);
 const [min,max]=sliceRange(meshes,plane.normal,axis);
 plane.constant=-cutThreshold(min,max,value);
}

function contains(contour:THREE.Vector2[],p:THREE.Vector2){
 let inside=false;
 for(let i=0,j=contour.length-1;i<contour.length;j=i++){
  const a=contour[i],b=contour[j];
  if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }
 return inside;
}

/** Intersect the original triangles in mesh space. Only closed loops get a
 * face. Nested contours become holes, including through-holes in a handle. */
export function sectionGeometry(geometry:THREE.BufferGeometry,plane:THREE.Plane){
 const pos=geometry.getAttribute('position'),index=geometry.index;
 if(!geometry.boundingBox)geometry.computeBoundingBox();
 const box=geometry.boundingBox!,lines:number[]=[],faces:number[]=[];
 if(!box.intersectsPlane(plane))return {lines,faces};
 const size=box.getSize(new THREE.Vector3()).length(),tol=Math.max(1e-10,size*2e-6);
 const distances=new Float64Array(pos.count),pt=new THREE.Vector3();
 for(let i=0;i<pos.count;i++)distances[i]=plane.distanceToPoint(pt.fromBufferAttribute(pos,i));
 const points:THREE.Vector3[]=[],neighbours:Set<number>[]=[],nodes=new Map<string,number>();
 const a=new THREE.Vector3(),b=new THREE.Vector3();
 function endpoint(i:number,j:number){
  a.fromBufferAttribute(pos,i);b.fromBufferAttribute(pos,j);
  a.lerp(b,distances[i]/(distances[i]-distances[j]));
  const key=[Math.round(a.x/tol),Math.round(a.y/tol),Math.round(a.z/tol)].join(',');
  const existing=nodes.get(key);if(existing!==undefined)return existing;
  nodes.set(key,points.length);neighbours.push(new Set());points.push(a.clone());return points.length-1;
 }
 const count=index?.count??pos.count;
 for(let k=0;k<count;k+=3){
  const i=index?index.getX(k):k,j=index?index.getX(k+1):k+1,h=index?index.getX(k+2):k+2;
  const si=distances[i]<0,sj=distances[j]<0,sh=distances[h]<0;
  if(si===sj&&sj===sh)continue;
  const first=si!==sj?endpoint(i,j):endpoint(i,h);
  const second=sj!==sh?endpoint(j,h):endpoint(h,i);
  if(first===second||neighbours[first].has(second))continue;
  neighbours[first].add(second);neighbours[second].add(first);
  points[first].toArray(lines,lines.length);points[second].toArray(lines,lines.length);
 }
 const n=plane.normal;
 const ux=new THREE.Vector3(Math.abs(n.x)<.8?1:0,Math.abs(n.x)<.8?0:1,0).cross(n).normalize();
 const uy=new THREE.Vector3().crossVectors(n,ux),seen=new Set<number>();
 const rings:{ids:number[];uv:THREE.Vector2[];area:number;parent:number;level:number}[]=[];
 for(let start=0;start<points.length;start++){
  if(seen.has(start))continue;
  const ids:number[]=[];let prev=-1,current=start;
  while(!seen.has(current)&&neighbours[current].size===2){
   seen.add(current);ids.push(current);
   const [l,r]=neighbours[current];const next=l===prev?r:l;prev=current;current=next;
  }
  if(current!==start||ids.length<3)continue;
  const uv=ids.map(id=>new THREE.Vector2(points[id].dot(ux),points[id].dot(uy)));
  const area=Math.abs(THREE.ShapeUtils.area(uv));if(area>tol*tol)rings.push({ids,uv,area,parent:-1,level:0});
 }
 rings.sort((l,r)=>r.area-l.area);
 for(let i=1;i<rings.length;i++){
  for(let j=i-1;j>=0;j--)if(contains(rings[j].uv,rings[i].uv[0])){
   rings[i].parent=j;rings[i].level=rings[j].level+1;break;
  }
 }
 rings.forEach((outer,i)=>{
  if(outer.level%2)return;
  const holes=rings.filter(r=>r.parent===i),ids=outer.ids.concat(...holes.map(h=>h.ids));
  const triangles=THREE.ShapeUtils.triangulateShape(outer.uv,holes.map(h=>h.uv));
  for(const tri of triangles)for(const vertex of tri)points[ids[vertex]].toArray(faces,faces.length);
 });
 return {lines,faces};
}

/** Each mesh keeps its own solid section and boundary. A cached local plane
 * lets the camera, zoom and entire product move without intersecting it again. */
export function createCutSurface(renderer:THREE.WebGLRenderer){
 const scene=new THREE.Scene(),inverse=new THREE.Matrix4(),local=new THREE.Plane();
 type Entry={source:THREE.Mesh;group:THREE.Group;cap:THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;edge:LineSegments2;cached:THREE.Plane|null};
 const slots=new Map<THREE.Plane,{entries:Entry[];face:THREE.MeshBasicMaterial;laser:LineMaterial}>();
 let source:THREE.Mesh[]|null=null;
 function clear(){
  for(const slot of slots.values()){
   for(const e of slot.entries){e.cap.geometry.dispose();e.edge.geometry.dispose();}
   slot.face.dispose();slot.laser.dispose();
  }
  slots.clear();scene.clear();
 }
 function slotFor(plane:THREE.Plane,original:THREE.Mesh[]){
  const saved=slots.get(plane);if(saved)return saved;
  const face=new THREE.MeshBasicMaterial({color:'#393633',side:THREE.DoubleSide,depthTest:true,depthWrite:true,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
  const laser=new LineMaterial({color:0xffffff,linewidth:5.5,transparent:true,depthTest:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  laser.clipping=true;
  laser.onBeforeCompile=program=>{
   program.fragmentShader=program.fragmentShader.replace('gl_FragColor = vec4( diffuseColor.rgb, alpha );',`
    float edge=length(vec2(vUv.x,max(abs(vUv.y)-1.,0.)));
    float core=exp(-edge*edge*32.);
    vec3 light=mix(vec3(1.,.20,.045),vec3(1.,.91,.70),core);
    gl_FragColor=vec4(light,alpha*(.92*core+.30*exp(-edge*edge*4.)));`);
  };
  const entries=original.map(source=>{
   const group=new THREE.Group();group.matrixAutoUpdate=false;group.visible=false;
   const cap=new THREE.Mesh(new THREE.BufferGeometry(),face),edge=new LineSegments2(new LineSegmentsGeometry(),laser);
   cap.frustumCulled=false;edge.frustumCulled=false;edge.renderOrder=2;group.add(cap,edge);scene.add(group);
   return {source,group,cap,edge,cached:null} as Entry;
  });
  const slot={entries,face,laser};slots.set(plane,slot);return slot;
 }
 function render(camera:THREE.Camera,original:THREE.Mesh[],planes:THREE.Plane[]){
  if(source!==original){clear();source=original;}
  for(const [p,slot] of slots)if(!planes.includes(p))for(const e of slot.entries)e.group.visible=false;
  for(const plane of planes){
   const slot=slotFor(plane,original),others=planes.filter(p=>p!==plane);
   slot.face.clippingPlanes=others;slot.laser.clippingPlanes=others;
   for(const e of slot.entries){
    local.copy(plane).applyMatrix4(inverse.copy(e.source.matrixWorld).invert());
    if(!e.source.geometry.boundingSphere)e.source.geometry.computeBoundingSphere();
    const tolerance=Math.max(1e-9,e.source.geometry.boundingSphere!.radius*1e-5);
    if(!e.cached||Math.abs(local.constant-e.cached.constant)>tolerance||local.normal.distanceToSquared(e.cached.normal)>1e-10){
     const {lines,faces}=sectionGeometry(e.source.geometry,local);
     e.cap.geometry.dispose();e.edge.geometry.dispose();
     e.cap.geometry=new THREE.BufferGeometry();e.edge.geometry=new LineSegmentsGeometry();
     e.cap.visible=faces.length>0;e.edge.visible=lines.length>0;
     if(e.cap.visible)e.cap.geometry.setAttribute('position',new THREE.Float32BufferAttribute(faces,3));
     if(e.edge.visible)e.edge.geometry.setPositions(lines);
     e.cached=local.clone();
    }
    e.group.visible=e.cap.visible||e.edge.visible;
    e.group.matrix.copy(e.source.matrixWorld);e.group.matrixWorldNeedsUpdate=true;
   }
  }
  const mask=camera.layers.mask;camera.layers.set(0);
  try{renderer.render(scene,camera);}finally{camera.layers.mask=mask;}
 }
 return {render,dispose:clear};
}
