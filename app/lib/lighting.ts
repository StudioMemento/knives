import * as THREE from 'three';
import {RAIL} from './choreography.ts';
import {KNIVES} from './state.ts';
import {LIGHTS,STAGE_COLORS} from './art-direction.ts';
export {STAGE_COLORS} from './art-direction.ts';

export function createLightStage(){
 const group=new THREE.Group(),radius=RAIL.radius,half=.043,depth=.005;
 group.name='Stage rail';group.position.set(0,RAIL.floorY,RAIL.centerZ);group.rotation.x=-Math.atan(RAIL.slope);
 const tint=new THREE.Color(STAGE_COLORS.HYPER),target=new THREE.Color();
 const deck=new THREE.ShaderMaterial({uniforms:{uTint:{value:tint}},vertexShader:`varying vec2 p;
  void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec2 p;uniform vec3 uTint;
   void main(){
    float r=length(p),nearRing=exp(-abs(r-4.35)*1.8);
    float field=exp(-r*r*.014),sweep=.5+.5*dot(normalize(p+vec2(.001)),normalize(vec2(-.8,.55)));
    vec3 graphite=mix(vec3(.0012,.0015,.0021),vec3(.007,.008,.010),field*(.58+.42*sweep));
    gl_FragColor=vec4(graphite+uTint*nearRing*.007,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
 const lip=new THREE.MeshStandardMaterial({color:'#24262a',roughness:.72,metalness:.55,envMapIntensity:.15,side:THREE.DoubleSide});
 const emitter=new THREE.MeshBasicMaterial({color:tint,side:THREE.DoubleSide});
 function flat(geometry:THREE.BufferGeometry,material:THREE.Material,y:number,name:string){
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.rotation.x=-Math.PI/2;mesh.position.y=y;group.add(mesh);
 }
 flat(new THREE.CircleGeometry(radius-half,256),deck,0,'Stage interior');
 flat(new THREE.RingGeometry(radius+half,900,256),deck,0,'Stage exterior');
 for(const edge of [radius-half,radius+half]){
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(edge,edge,depth,256,1,true),lip);
  wall.position.y=-depth/2;group.add(wall);
 }
 flat(new THREE.RingGeometry(radius-half,radius+half,256),lip,-depth,'Groove bed');
 flat(new THREE.RingGeometry(radius-.024,radius+.024,256),emitter,-depth*.26,'Recessed light');
 const halo=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  uniforms:{uTint:{value:tint}},vertexShader:'varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 p;uniform vec3 uTint;
   void main(){float d=abs(length(p)-4.35);gl_FragColor=vec4(uTint,.032*exp(-d*38.)+.008*exp(-d*6.));
    #include <colorspace_fragment>
   }`
 });
 flat(new THREE.RingGeometry(radius-.8,radius+.8,256,3),halo,.001,'Reflected rail light');
 const lamps:THREE.PointLight[]=[];
 for(let i=0;i<4;i++){
  const a=2*Math.PI*i/4,lamp=new THREE.PointLight(tint,3.8,9,2);
  lamp.position.set(Math.sin(a)*radius,.045,Math.cos(a)*radius);lamp.layers.enableAll();group.add(lamp);lamps.push(lamp);
 }
 // The light rig is independent of the platform's responsive scale.
 const rig=new THREE.Group(),key=new THREE.SpotLight(),rim=new THREE.DirectionalLight();
 const fill=new THREE.HemisphereLight('#e2e8ef','#27232a');
 key.angle=.86;key.penumbra=.77;key.distance=25;key.decay=2;
 for(const light of [key,rim,fill])light.layers.enableAll();
 rig.add(key,key.target,rim,rim.target,fill);
 const desired=new THREE.Vector3(),colour=new THREE.Color(),origin=new THREE.Vector3();
 let env=LIGHTS[0].env as number,rotation=LIGHTS[0].rotation as number,fog=LIGHTS[0].fog as number,first=true;
 return {group,rig,tint,get environment(){return env;},get rotation(){return rotation;},get fog(){return fog;},
  resize(viewWidth:number){
   group.scale.x=viewWidth*.675/radius;
   group.scale.z=20/radius;
  },
  update(index:number,dt:number,hero?:THREE.Vector3,choice=0){
   const preset=LIGHTS[choice]??LIGHTS[0],mix=first?1:1-Math.exp(-dt*5.5);first=false;
   tint.lerp(target.set(STAGE_COLORS[KNIVES[index]]),mix);emitter.color.copy(tint).multiplyScalar(1.10);lamps.forEach(lamp=>lamp.color.copy(tint));
   key.position.lerp(desired.fromArray(preset.position),mix);rim.position.lerp(desired.fromArray(preset.reverse),mix);
   key.color.lerp(colour.set(preset.key),mix);rim.color.lerp(colour.set(preset.rim),mix);
   key.intensity=THREE.MathUtils.lerp(key.intensity,preset.power,mix);
   rim.intensity=THREE.MathUtils.lerp(rim.intensity,preset.edge,mix);
   fill.intensity=THREE.MathUtils.lerp(fill.intensity,preset.fill,mix);
   key.target.position.copy(hero??origin);rim.target.position.copy(hero??origin);
   env=THREE.MathUtils.lerp(env,preset.env,mix);rotation=THREE.MathUtils.lerp(rotation,preset.rotation,mix);fog=THREE.MathUtils.lerp(fog,preset.fog,mix);
   return tint.getHex();
  },
  dispose(){
   group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
   [deck,lip,emitter,halo].forEach(m=>m.dispose());[key,rim,fill,...lamps].forEach(l=>l.dispose());
  }
 };
}
