import * as THREE from 'three';
import {RAIL} from './choreography.ts';
import {KNIVES} from './state.ts';
import {LIGHTS,STAGE_COLORS} from './art-direction.ts';
export {STAGE_COLORS} from './art-direction.ts';

export function createLightStage(){
 const group=new THREE.Group(),radius=RAIL.radius,edge=radius+.12,depth=18;
 group.position.set(0,RAIL.floorY,RAIL.centerZ);
 const tint=new THREE.Color(STAGE_COLORS.HYPER),target=new THREE.Color();
 const deck=new THREE.ShaderMaterial({uniforms:{uTint:{value:tint}},vertexShader:`varying vec2 p;
  void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec2 p;uniform vec3 uTint;
   void main(){
    float radius=length(p)/4.35,brim=smoothstep(.70,1.,radius);
    float sweep=.5+.5*dot(normalize(p+vec2(.001)),normalize(vec2(-1.,.55)));
    vec3 graphite=vec3(.004,.006,.009)+vec3(.006,.008,.010)*sweep*(.38+.62*brim);
    gl_FragColor=vec4(graphite+uTint*.017*pow(brim,5.),1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
 const lip=new THREE.MeshStandardMaterial({color:'#31353b',roughness:.39,metalness:.81,envMapIntensity:.60});
 const emitter=new THREE.MeshBasicMaterial({color:tint,side:THREE.DoubleSide,toneMapped:false});
 const shell=new THREE.ShaderMaterial({
  uniforms:{uTint:{value:tint}},vertexShader:`varying vec3 p;varying vec3 n;
   void main(){p=position;n=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec3 p,n; uniform vec3 uTint;
   void main(){
    float h=max(0.,9.-p.y),angle=atan(n.x,n.z);
    float shoulder=exp(-h*7.),fall=exp(-h*.91),strip=pow(max(0.,dot(normalize(n.xz),normalize(vec2(-.66,.86)))),5.);
    float brush=.5+.5*sin(angle*680.);brush=mix(.5,brush,1.-smoothstep(.15,.95,fwidth(angle)*680.));
    vec3 graphite=vec3(.014,.019,.026)*(.26+.82*fall+1.4*strip*fall);
    graphite+=(vec3(.025,.034,.045)+uTint*.025)*shoulder;
    graphite+=vec3(.003)*brush*fall;
    gl_FragColor=vec4(graphite,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 });
 const body=new THREE.Mesh(new THREE.CylinderGeometry(edge,edge,depth,144,1,true),shell);
 body.position.y=-depth/2;group.add(body);
 function flat(geometry:THREE.BufferGeometry,material:THREE.Material,y:number){
  const mesh=new THREE.Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;group.add(mesh);
 }
 flat(new THREE.CircleGeometry(radius-.045,144),deck,0);
 flat(new THREE.RingGeometry(radius-.045,edge,144),lip,-.006);
 flat(new THREE.RingGeometry(radius-.034,radius+.025,144),emitter,.003);
 const halo=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  uniforms:{uTint:{value:tint},uRadius:{value:radius}},
  vertexShader:'varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 p;uniform vec3 uTint;uniform float uRadius;
   void main(){float d=abs(length(p)-uRadius);gl_FragColor=vec4(uTint,.34*exp(-d*25.)+.07*exp(-d*5.));
    #include <colorspace_fragment>
   }`
 });
 flat(new THREE.RingGeometry(radius-.8,edge,144,2),halo,.006);
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
   // Frame the platform as a shallow ellipse and keep both shoulders visible.
   group.scale.x=Math.min(1.05,viewWidth*.49/edge);
   group.scale.z=.53+.16*Math.min(1,group.scale.x);
  },
  update(index:number,dt:number,hero?:THREE.Vector3,choice=0){
   const preset=LIGHTS[choice]??LIGHTS[0],mix=first?1:1-Math.exp(-dt*5.5);first=false;
   tint.lerp(target.set(STAGE_COLORS[KNIVES[index]]),mix);emitter.color.copy(tint);lamps.forEach(lamp=>lamp.color.copy(tint));
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
   [deck,lip,emitter,shell,halo].forEach(m=>m.dispose());[key,rim,fill,...lamps].forEach(l=>l.dispose());
  }
 };
}
