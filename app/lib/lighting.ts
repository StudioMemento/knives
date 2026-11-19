import * as THREE from 'three';
import {RAIL} from './choreography.ts';
import {KNIVES} from './state.ts';

type Knife=typeof KNIVES[number];
export const STAGE_COLORS:Record<Knife,string>={HYPER:'#ffe6c5',VERTEX:'#ffe6c5',EDGE:'#ffe6c5',TRIS:'#ffe6c5',QUAD:'#ffe6c5'};

/** A physical annular slot, in the same XZ coordinates as the orbiting products. */
export function createLightStage(){
 const group=new THREE.Group(),r=RAIL.radius,half=.069,depth=.013;
 group.position.set(0,RAIL.floorY,RAIL.centerZ);
 const floor=new THREE.MeshStandardMaterial({color:'#12110f',roughness:.98,metalness:0,envMapIntensity:.025,transparent:true});
 floor.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec2 vGround;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vGround=position.xy;');
  shader.fragmentShader='varying vec2 vGround;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`
   float extent=length(vGround);
   diffuseColor.a*=1.-smoothstep(4.6,10.0,extent);
   outgoingLight*=.105;
   #include <opaque_fragment>`);
 };
 const lip=new THREE.MeshStandardMaterial({color:'#282722',roughness:.57,metalness:.68,envMapIntensity:.28,side:THREE.DoubleSide});
 const emitter=new THREE.MeshBasicMaterial({color:new THREE.Color(STAGE_COLORS.HYPER).multiplyScalar(3.4),side:THREE.DoubleSide});
 const halo=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  uniforms:{uLight:{value:new THREE.Color(STAGE_COLORS.HYPER)},uRadius:{value:r}},
  vertexShader:'varying vec2 p; void main(){p=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 p; uniform vec3 uLight; uniform float uRadius;
   void main(){float d=abs(length(p)-uRadius);float a=.26*exp(-d*27.)+.075*exp(-d*5.)+.018*exp(-d*1.4);
    gl_FragColor=vec4(uLight,a);
    #include <colorspace_fragment>
   }`
 });
 function flat(geometry:THREE.BufferGeometry,material:THREE.Material,y:number){
  const mesh=new THREE.Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;group.add(mesh);
 }
 flat(new THREE.CircleGeometry(r-half,192),floor,0);
 flat(new THREE.RingGeometry(r+half,65,192),floor,0);
 for(const radius of [r-half,r+half]){
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,depth,192,1,true),lip);
  wall.position.y=-depth/2;group.add(wall);
 }
 flat(new THREE.RingGeometry(r-half,r+half,192),lip,-depth);
 flat(new THREE.RingGeometry(r-.047,r+.047,192),emitter,-depth+.002);
 flat(new THREE.RingGeometry(r-1.2,r+1.2,192,3),halo,.002);
 const lamps:Array<THREE.PointLight>=[];
 for(let i=0;i<8;i++){
  const a=2*Math.PI*i/8,light=new THREE.PointLight(STAGE_COLORS.HYPER,4.6,12,2);
  light.position.set(Math.sin(a)*r,-.008,Math.cos(a)*r);light.layers.enableAll();group.add(light);lamps.push(light);
 }
 const lightColor=new THREE.Color(STAGE_COLORS.HYPER),target=new THREE.Color();
 return {group,update(index:number,dt:number){
  target.set(STAGE_COLORS[KNIVES[index]]);lightColor.lerp(target,1-Math.exp(-4*dt));
  emitter.color.copy(lightColor).multiplyScalar(3.4);halo.uniforms.uLight.value.copy(lightColor);
  lamps.forEach(lamp=>lamp.color.copy(lightColor));
 },dispose(){group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});[floor,lip,emitter,halo].forEach(m=>m.dispose());lamps.forEach(l=>l.dispose());}};
}
