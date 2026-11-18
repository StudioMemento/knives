import * as THREE from 'three';
import {sliceRange} from './framing.ts';

/** Distance >= 0 is kept by Three. The negative X/Y normals therefore sweep
 * from the positive ends. Z retains the original front-to-rear convention. */
export const CUT_DIRECTIONS=[new THREE.Vector3(-1,0,0),new THREE.Vector3(0,-1,0),new THREE.Vector3(0,0,1)];
export const cutThreshold=(min:number,max:number,value:number)=>THREE.MathUtils.lerp(min,max,value);

export function setCutPlane(plane:THREE.Plane,axis:number,value:number,rotation:THREE.Quaternion,meshes:THREE.Mesh[]){
 plane.normal.copy(CUT_DIRECTIONS[axis]).applyQuaternion(rotation);
 const [min,max]=sliceRange(meshes,plane.normal);
 plane.constant=-cutThreshold(min,max,value);
}

/** Winding counts delimit the exposed silhouette. Each cap is depth tested
 * against the product and clipped by the other active section planes. */
export function createCutSurface(renderer:THREE.WebGLRenderer){
 const stencilScene=new THREE.Scene(),capScene=new THREE.Scene();
 const makeStencil=(side:THREE.Side,op:THREE.StencilOp)=>new THREE.MeshBasicMaterial({
  side,depthWrite:false,depthTest:false,colorWrite:false,stencilWrite:true,stencilFunc:THREE.AlwaysStencilFunc,
  stencilFail:op,stencilZFail:op,stencilZPass:op,
 });
 const back=makeStencil(THREE.BackSide,THREE.IncrementWrapStencilOp),front=makeStencil(THREE.FrontSide,THREE.DecrementWrapStencilOp);
 const material=new THREE.ShaderMaterial({
  side:THREE.DoubleSide,clipping:true,depthTest:true,depthWrite:true,toneMapped:false,
  stencilWrite:true,stencilFunc:THREE.NotEqualStencilFunc,stencilRef:0,stencilFail:THREE.KeepStencilOp,stencilZFail:THREE.KeepStencilOp,stencilZPass:THREE.KeepStencilOp,
  polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
  uniforms:{uTime:{value:0}},
  vertexShader:`
   #include <clipping_planes_pars_vertex>
   varying vec2 vSection;
   void main(){
    vSection=position.xy;
    vec4 mvPosition=modelViewMatrix*vec4(position,1.);
    gl_Position=projectionMatrix*mvPosition;
    #include <clipping_planes_vertex>
   }`,
  fragmentShader:`
   #include <clipping_planes_pars_fragment>
   uniform float uTime;
   varying vec2 vSection;
   void main(){
    #include <clipping_planes_fragment>
    float coordinate=dot(vSection,vec2(.87,.49))*36.;
    float line=abs(fract(coordinate)-.5);
    float etching=1.-smoothstep(.035,.035+max(fwidth(coordinate),.02),line);
    float sweep=.5+.5*cos(dot(vSection,vec2(5.,3.))-uTime*1.55);
    vec3 color=mix(vec3(.23,.086,.05),vec3(.97,.42,.19),.38+.33*sweep);
    color+=vec3(.42,.33,.22)*etching;
    gl_FragColor=vec4(color,1.);
    #include <colorspace_fragment>
   }`,
 });
 const cap=new THREE.Mesh(new THREE.PlaneGeometry(48,48),material);cap.frustumCulled=false;capScene.add(cap);
 const meshes:THREE.Mesh[]=[];
 let source:THREE.Mesh[]|null=null;
 const zAxis=new THREE.Vector3(0,0,1);
 function render(camera:THREE.Camera,original:THREE.Mesh[],planes:THREE.Plane[],time:number){
  if(!planes.length)return;
  if(original!==source){
   source=original;stencilScene.clear();meshes.length=0;
   for(const mesh of original){
    const proxy=new THREE.Mesh(mesh.geometry,back);proxy.matrixAutoUpdate=false;proxy.frustumCulled=false;meshes.push(proxy);stencilScene.add(proxy);
   }
  }
  for(let i=0;i<original.length;i++){meshes[i].matrix.copy(original[i].matrixWorld);meshes[i].matrixWorldNeedsUpdate=true;}
  const previous=camera.layers.mask;camera.layers.set(0);
  material.uniforms.uTime.value=time;
  for(const plane of planes){
   renderer.clearStencil();
   back.clippingPlanes=[plane];front.clippingPlanes=back.clippingPlanes;
   stencilScene.overrideMaterial=back;renderer.render(stencilScene,camera);
   stencilScene.overrideMaterial=front;renderer.render(stencilScene,camera);
   plane.coplanarPoint(cap.position);cap.quaternion.setFromUnitVectors(zAxis,plane.normal);
   material.clippingPlanes=planes.filter(p=>p!==plane);
   renderer.render(capScene,camera);
  }
  renderer.clearStencil();camera.layers.mask=previous;
 }
 return {render,dispose(){stencilScene.clear();back.dispose();front.dispose();cap.geometry.dispose();material.dispose();}};
}
