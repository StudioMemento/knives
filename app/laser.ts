import * as THREE from 'three';
import type {ScanAxis} from './navigation';

// Axes are labelled in the horizontal presentation frame: length, height, depth.
// Calibrated assets have their blade along local +Y and cutting edge along -X.
export const SCAN_AXES={x:{label:'Length',vector:[0,1,0]},y:{label:'Height',vector:[-1,0,0]},z:{label:'Depth',vector:[0,0,1]}} as const;

export function isClosedSurface(geometry:THREE.BufferGeometry){
 const p=geometry.attributes.position,indices=geometry.index;
 const edges=new Map<string,number>();
 const key=(i:number)=>`${Math.round(p.getX(i)*1e5)},${Math.round(p.getY(i)*1e5)},${Math.round(p.getZ(i)*1e5)}`;
 for(let i=0;i<(indices?.count??p.count);i+=3){
  const ids=[0,1,2].map(j=>key(indices?indices.getX(i+j):i+j));if(new Set(ids).size<3)continue;
  for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3],edge=a<b?a+'|'+b:b+'|'+a;edges.set(edge,(edges.get(edge)??0)+1);}
 }
 return edges.size>0&&[...edges.values()].every(count=>count%2===0);
}

/** GPU boolean cut: stencil winding fills actual closed intersections, including holes.
 * Front shells are removed progressively; authored liners, screws and blade remain real geometry.
 */
export function createLaserSection(meshes:THREE.Mesh[],color:THREE.Color){
 const group=new THREE.Group();group.visible=false;
 const localPlane=new THREE.Plane(new THREE.Vector3(0,0,-1));
 const worldPlane=localPlane.clone();
 const box=new THREE.Box3();for(const mesh of meshes){mesh.geometry.computeBoundingBox();box.union(mesh.geometry.boundingBox!);}
 const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 const axisVector=new THREE.Vector3(0,0,1),planeOrigin=new THREE.Vector3(),forward=new THREE.Vector3(0,0,1);
 const owned:THREE.Material[]=[];
 const caps:THREE.Mesh[]=[];
 for(let i=0;i<meshes.length;i++){
  const source=meshes[i];const order=10+i*3;
  // Decals and open sheets have no solid volume: never invent a filled interior for them.
  if(!isClosedSurface(source.geometry))continue;
  const base=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,depthTest:false,stencilWrite:true,stencilFunc:THREE.AlwaysStencilFunc,clippingPlanes:[worldPlane]});
  const back=base.clone();back.side=THREE.BackSide;back.stencilFail=back.stencilZFail=back.stencilZPass=THREE.IncrementWrapStencilOp;
  const front=base.clone();front.side=THREE.FrontSide;front.stencilFail=front.stencilZFail=front.stencilZPass=THREE.DecrementWrapStencilOp;base.dispose();
  for(const [mat,offset] of [[back,0],[front,1]] as const){const pass=new THREE.Mesh(source.geometry,mat);pass.renderOrder=order+offset;pass.frustumCulled=false;group.add(pass);owned.push(mat);}
  const material=new THREE.MeshStandardMaterial({color:color.clone().lerp(new THREE.Color('#bdc6cb'),.7),metalness:.65,roughness:.36,emissive:color,emissiveIntensity:.26,side:THREE.DoubleSide,stencilWrite:true,stencilRef:0,stencilFunc:THREE.NotEqualStencilFunc,stencilFail:THREE.ReplaceStencilOp,stencilZFail:THREE.ReplaceStencilOp,stencilZPass:THREE.ReplaceStencilOp});
  const cap=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);cap.renderOrder=order+2;
  cap.onAfterRender=renderer=>renderer.clearStencil();caps.push(cap);group.add(cap);owned.push(material);
 }
 const uniforms={uColor:{value:color.clone()},uTime:{value:0}};
 const beamMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'varying vec2 vUv;uniform vec3 uColor;uniform float uTime;void main(){float edge=pow(abs(vUv.x-.5)*2.,14.);float sweep=exp(-pow((vUv.y-fract(uTime*.2))*35.,2.));float a=(.025+edge*.22+sweep*.055)*smoothstep(0.,.1,vUv.y)*(1.-smoothstep(.9,1.,vUv.y));gl_FragColor=vec4(uColor*2.,a);}'
 });
 const beam=new THREE.Mesh(new THREE.PlaneGeometry(1,1),beamMaterial);beam.renderOrder=100;group.add(beam);owned.push(beamMaterial);
 let enabled=false;
 return {group,update(progress:number,active:boolean,matrixWorld:THREE.Matrix4,time:number,axis:ScanAxis='z',direction:1|-1=1){
  axisVector.fromArray(SCAN_AXES[axis].vector).multiplyScalar(direction);
  const extent=axis==='x'?size.y:axis==='y'?size.x:size.z;
  const middle=center.dot(axisVector),minimum=middle-extent/2,maximum=middle+extent/2;
  const level=THREE.MathUtils.lerp(maximum+Math.max(.006,extent*.025),minimum+extent*.02,THREE.MathUtils.clamp(progress,0,1));
  group.visible=active;localPlane.normal.copy(axisVector).negate();localPlane.constant=level;worldPlane.copy(localPlane).applyMatrix4(matrixWorld);
  planeOrigin.copy(center).addScaledVector(axisVector,level-middle);
  const width=axis==='y'?size.z:size.x,height=axis==='x'?size.z:size.y;
  for(const cap of caps){cap.position.copy(planeOrigin);cap.quaternion.setFromUnitVectors(forward,axisVector);cap.scale.set(width+.04,height+.04,1);}
  beam.position.copy(planeOrigin).addScaledVector(axisVector,.001);beam.quaternion.setFromUnitVectors(forward,axisVector);beam.scale.set(width+.24,height+.24,1);uniforms.uTime.value=time;
  for(const mesh of meshes)for(const material of (Array.isArray(mesh.material)?mesh.material:[mesh.material])){
   if(enabled!==active){material.clippingPlanes=active?[worldPlane]:null;material.clipShadows=active;material.needsUpdate=true;}
   const u=material.userData.finishUniforms;if(u){u.uScanActive.value=active?1:0;u.uScanLevel.value=level;u.uScanAxis.value.copy(axisVector);u.uScanColor.value.copy(color);}
  }
  enabled=active;
 },dispose(){for(const material of owned)material.dispose();for(const cap of caps)cap.geometry.dispose();beam.geometry.dispose();}};
}
