import {Vector3,type PerspectiveCamera,type Object3D,type Mesh} from 'three';
/** Fit the currently rotated, animated geometry, not a circumscribed sphere.
 * This keeps the horizontal product large while leaving room for any orbit. */
export function fitBoundsScale(camera:PerspectiveCamera,pivot:Object3D,meshes:Mesh[],rect:number[]){
 const center=pivot.position.clone().applyMatrix4(camera.matrixWorldInverse),point=new Vector3();
 const t=Math.tan(camera.fov*Math.PI/360),a=camera.aspect,[x0,y0,x1,y1]=rect;
 const planes=[new Vector3(1,0,(2*x0-1)*t*a),new Vector3(-1,0,-(2*x1-1)*t*a),new Vector3(0,1,(1-2*y1)*t),new Vector3(0,-1,-(1-2*y0)*t)];
 let cap=1;
 for(const mesh of meshes){
  if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
  const box=mesh.geometry.boundingBox!;
  for(let i=0;i<8;i++){
   point.set(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z).applyMatrix4(mesh.matrixWorld).applyMatrix4(camera.matrixWorldInverse).sub(center);
   for(const plane of planes){const direction=plane.dot(point);if(direction<0)cap=Math.min(cap,plane.dot(center)/-direction);}
   if(point.z>0)cap=Math.min(cap,(-camera.near-center.z)/point.z);
  }
 }
 return Math.max(.01,Math.min(1,cap*.985));
}
/** Radius of a sphere about the orbit pivot that fits a normalized screen rect. */
export function safeSphereRadius(camera:PerspectiveCamera,center:Vector3,rect:number[]){
 const p=center.clone().applyMatrix4(camera.matrixWorldInverse),t=Math.tan(camera.fov*Math.PI/360),a=camera.aspect;
 const [x0,y0,x1,y1]=rect;
 return Math.max(.1,Math.min(...[
  new Vector3(1,0,(2*x0-1)*t*a),new Vector3(-1,0,-(2*x1-1)*t*a),
  new Vector3(0,1,(1-2*y1)*t),new Vector3(0,-1,-(1-2*y0)*t),
 ].map(n=>p.dot(n.normalize()))))*.985;
}
export function animatedRadius(meshes:Mesh[],pivot:Object3D){
 let radius=0;const center=new Vector3();
 for(const mesh of meshes){
  if(!mesh.geometry.boundingSphere)mesh.geometry.computeBoundingSphere();
  const sphere=mesh.geometry.boundingSphere!;
  center.copy(sphere.center).applyMatrix4(mesh.matrixWorld);
  radius=Math.max(radius,center.distanceTo(pivot.position)+sphere.radius*mesh.matrixWorld.getMaxScaleOnAxis());
  if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
  const box=mesh.geometry.boundingBox!;
  for(let i=0;i<8;i++){
   center.set(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z).applyMatrix4(mesh.matrixWorld);
   radius=Math.max(radius,center.distanceTo(pivot.position));
  }
 }
 return radius;
}
const supports=new WeakMap<Mesh,{normal:Vector3;low:number;high:number}[]>();
export function sliceRange(meshes:Mesh[],axis:Vector3,axisIndex=0){
 let min=Infinity,max=-Infinity;const n=new Vector3();
 for(const mesh of meshes){
  const m=mesh.matrixWorld.elements;
  n.set(m[0]*axis.x+m[1]*axis.y+m[2]*axis.z,m[4]*axis.x+m[5]*axis.y+m[6]*axis.z,m[8]*axis.x+m[9]*axis.y+m[10]*axis.z);
  const scale=n.length();if(scale===0)continue;n.divideScalar(scale);
  const offset=m[12]*axis.x+m[13]*axis.y+m[14]*axis.z;
  const rows=supports.get(mesh)??[],last=rows[axisIndex];let support=last;
  if(!last||last.normal.distanceToSquared(n)>1e-10){
   const pos=mesh.geometry.getAttribute('position');let low=Infinity,high=-Infinity;
   for(let i=0;i<pos.count;i++){
    const d=pos.getX(i)*n.x+pos.getY(i)*n.y+pos.getZ(i)*n.z;low=Math.min(low,d);high=Math.max(high,d);
   }
   support={normal:n.clone(),low,high};rows[axisIndex]=support;supports.set(mesh,rows);
  }
  min=Math.min(min,support.low*scale+offset);max=Math.max(max,support.high*scale+offset);
 }
 const margin=Math.max(1e-6,(max-min)*.00005);return [min-margin,max+margin];
}

/** Translate the complete, posed object past a screen edge. The extra width
 * accounts for the off-camera handle in a blade close-up. */
export function slideTravel(camera:PerspectiveCamera,meshes:Mesh[],direction:number){
 const p=new Vector3(),t=Math.tan(camera.fov*Math.PI/360)*camera.aspect;
 let distance=0;
 for(const mesh of meshes){
  if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
  const box=mesh.geometry.boundingBox!;
  for(let i=0;i<8;i++){
   p.set(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z).applyMatrix4(mesh.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
   distance=Math.max(distance,-p.z*t*1.05-direction*p.x);
  }
 }
 return distance;
}
