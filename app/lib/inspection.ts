import {Matrix4,Mesh,Object3D,Vector3} from 'three';

export type InspectionPart={mesh:Mesh;center:Vector3;span:number;positiveZ:boolean};
export function inspectionParts(scene:Object3D,meshes:Mesh[],handleZ:number){
 const inverse=scene.matrixWorld.clone().invert();
 function part(mesh:Mesh):InspectionPart{
  mesh.geometry.computeBoundingBox();
  const box=mesh.geometry.boundingBox!,center=box.getCenter(new Vector3());
  const toModel=new Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);
  const size=box.clone().applyMatrix4(toModel).getSize(new Vector3());
  return {mesh,center,span:Math.max(size.x,size.y,size.z),positiveZ:center.clone().applyMatrix4(toModel).z>handleZ};
 }
 const attachment=meshes.find(m=>/__(clip|clip_front|tail_loop)__low$/i.test(m.name));
 const screw=meshes.find(m=>/__clip_screw(?:_01)?__low$/i.test(m.name))??meshes.find(m=>/screw.*__low$/i.test(m.name));
 if(!attachment||!screw)throw Error('Vista dettaglio assente nel modello');
 return {clip:part(attachment),screw:part(screw)};
}
export function partCenter(scene:Object3D,part:InspectionPart){
 part.mesh.updateWorldMatrix(true,false);
 return scene.worldToLocal(part.mesh.localToWorld(part.center.clone()));
}
