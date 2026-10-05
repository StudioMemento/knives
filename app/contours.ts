import * as THREE from 'three';

export type ContourMesh={mesh:THREE.Mesh;edges:Float32Array;previous:THREE.Matrix4;initialized:boolean};
/** Offline-baked triangle adjacencies. Each record is A, B, normal A, normal B.
 * Names refer to the calibrated meshes, so a folding blade keeps its own matrix. */
export function decodeContours(buffer:ArrayBuffer,meshes:THREE.Mesh[]):ContourMesh[]{
 const headerLength=new DataView(buffer).getUint32(0,true);
 if(headerLength>buffer.byteLength-4)throw new Error('Invalid contour header');
 const header=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,4,headerLength))) as {version:number;meshes:{name:string;index:number;offset:number;count:number}[]};
 if(header.version!==1)throw new Error('Unsupported contour format');
 const start=Math.ceil((4+headerLength)/4)*4;
 return header.meshes.flatMap(entry=>{
  const mesh=meshes[entry.index];
  if(!mesh||entry.count<0||start+(entry.offset+entry.count*12)*4>buffer.byteLength)return [];
  return [{mesh,edges:new Float32Array(buffer,start+entry.offset*4,entry.count*12),previous:new THREE.Matrix4(),initialized:false}];
 });
}

/** A real mesh edge is a silhouette when its adjacent faces straddle the view. */
export function isSilhouette(edges:Float32Array,offset:number,x:number,y:number,z:number){
 const a=edges[offset+6]*x+edges[offset+7]*y+edges[offset+8]*z;
 const b=edges[offset+9]*x+edges[offset+10]*y+edges[offset+11]*z;
 return a*b<=0&&(a>1e-7||b>1e-7);
}
