import * as THREE from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import catalogue from './catalogue-data.json' with {type:'json'};
import {RAIL} from './choreography.ts';
import {KNIVES} from './state.ts';
import {LIGHT_PRESETS,type LightPreset,type StudioEnvironment} from './light-presets.ts';

type Knife=typeof KNIVES[number];
export const STAGE_COLORS=Object.fromEntries(KNIVES.map(id=>[id,catalogue[id].handle.colors[0].hex[0]])) as Record<Knife,string>;
const emissionWhite=new THREE.Color(1,1,1);
function luminous(ink:THREE.Color){
 return ink.multiplyScalar(.94/Math.max(.01,ink.r,ink.g,ink.b)).lerp(emissionWhite,.065);
}
export const FLOOR_FADE_END=10;

// A rig is photographed only on its first selection. All five products share its filtered environment.
export function createStudioEnvironments(renderer:THREE.WebGLRenderer) {
 const generator = new THREE.PMREMGenerator(renderer);
 const cache = new Map<LightPreset,THREE.WebGLRenderTarget>();
 function texture(id:LightPreset) {
  const cached = cache.get(id);
  if(cached)return cached.texture;
  const setup:StudioEnvironment = LIGHT_PRESETS[id].environment;
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(setup.background);
  const plane = new THREE.PlaneGeometry();
  const materials:THREE.MeshBasicMaterial[] = [];
  let dome:THREE.SphereGeometry|undefined;
  try {
   if(setup.dome){
    dome=new THREE.SphereGeometry(20,32,20);
    const positions=dome.getAttribute('position'), colors=new Float32Array(positions.count*3);
    const sky=new THREE.Color(setup.dome.sky), ground=new THREE.Color(setup.dome.ground);
    const horizon=new THREE.Color(setup.dome.horizon), color=new THREE.Color();
    for(let i=0;i<positions.count;i++){
     const elevation=positions.getY(i)/20;
     color.copy(horizon).lerp(elevation>0?sky:ground,Math.abs(elevation)).toArray(colors,i*3);
    }
    dome.setAttribute('color',new THREE.BufferAttribute(colors,3));
    const surface=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide});
    materials.push(surface);studio.add(new THREE.Mesh(dome,surface));
   }
   for(const box of setup.cards) {
    const material = new THREE.MeshBasicMaterial({
     color:new THREE.Color(box.color).multiplyScalar(box.output), side:THREE.DoubleSide,
    });
    materials.push(material);
    const card = new THREE.Mesh(plane,material);
    card.position.fromArray(box.position);
    card.scale.set(box.size[0],box.size[1],1);
    card.lookAt(0,0,0);
    card.rotateZ(box.roll ?? 0);
    studio.add(card);
   }
   const size=matchMedia('(pointer:coarse)').matches?128:256;
   const maxSigma=18*Math.PI/(6*size);
   const target=generator.fromScene(studio,Math.min(setup.blur,maxSigma),.1,60,{size});
   cache.set(id,target);
   return target.texture;
  } finally {
   plane.dispose();
   dome?.dispose();
   materials.forEach(material=>material.dispose());
  }
 }
 return {texture,dispose(){for(const target of cache.values())target.dispose();generator.dispose();}};
}

/** A physical annular slot, in the same XZ coordinates as the orbiting products. */
export function createLightStage(frontLayer=3){
 const group=new THREE.Group(),r=RAIL.radius,half=.069,depth=.013;
 group.position.set(0,RAIL.floorY,RAIL.centerZ);
 const floor=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
  vertexShader:'varying vec2 ground;void main(){ground=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 ground;void main(){
   float radius2=dot(ground,ground);
   float density=.17*exp(-radius2/20.)+.035*exp(-radius2/74.);
   gl_FragColor=vec4(vec3(.0066,.0070,.0073),density);
   #include <colorspace_fragment>
  }`});
 const lip=new THREE.MeshStandardMaterial({color:'#282722',roughness:.57,metalness:.68,envMapIntensity:.28,side:THREE.DoubleSide});
 const emitter=new THREE.MeshBasicMaterial({color:new THREE.Color(STAGE_COLORS.HYPER),side:THREE.DoubleSide,toneMapped:false});
 const halo=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  uniforms:{uLight:{value:new THREE.Color(STAGE_COLORS.HYPER)},uRadius:{value:r}},
  vertexShader:'varying vec2 p; void main(){p=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 p; uniform vec3 uLight; uniform float uRadius;
   void main(){float d=abs(length(p)-uRadius);float a=.35*exp(-d*27.)+.105*exp(-d*5.)+.018*exp(-d*1.4);
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
  const a=2*Math.PI*i/8,light=new THREE.PointLight(STAGE_COLORS.HYPER,3.6,10,2);
  light.position.set(Math.sin(a)*r,-.008,Math.cos(a)*r);light.layers.enableAll();group.add(light);lamps.push(light);
 }
 // The key tracks the product pivot. Rim direction is relative to its target.
 RectAreaLightUniformsLib.init();
 const keyCard=new THREE.RectAreaLight('#fff8eb',1.8,4.2,1.20),edgeCard=new THREE.RectAreaLight('#d5e0f0',1.6,.72,4.5);
 keyCard.layers.set(frontLayer);edgeCard.layers.set(frontLayer);group.add(keyCard,edgeCard);
 const spot=new THREE.SpotLight();
 spot.castShadow=true;spot.shadow.mapSize.set(1536,1536);
 spot.shadow.camera.near=.55;spot.shadow.camera.far=19;spot.shadow.focus=1;
 spot.shadow.bias=-.00015;spot.shadow.normalBias=.004;spot.shadow.radius=2.2;
 spot.shadow.camera.layers.set(frontLayer);
 spot.distance=16;spot.decay=2;spot.layers.enableAll();
 const point=new THREE.PointLight(0xffffff,0,20,2);
 point.name='Point key';point.layers.enableAll();
 const fill=new THREE.HemisphereLight();fill.position.set(0,1,0).sub(group.position);fill.layers.enableAll();
 const rim=new THREE.DirectionalLight();rim.layers.set(frontLayer);
 group.add(spot,spot.target,point,fill,rim,rim.target);
 const aim=new THREE.Vector3(),worldAim=new THREE.Vector3();
 const lightColor=new THREE.Color(STAGE_COLORS.HYPER),target=new THREE.Color();

 function setPreset(id:LightPreset) {
  const preset=LIGHT_PRESETS[id];
  const cards=preset.environment.cards;
  keyCard.position.fromArray(cards[0].position);keyCard.color.set(cards[0].color);keyCard.width=cards[0].size[0];keyCard.height=cards[0].size[1];
  keyCard.intensity=cards[0].output*.74;const edge=cards[cards.length-1];
  edgeCard.position.fromArray(edge.position);edgeCard.color.set(edge.color);edgeCard.width=edge.size[0];edgeCard.height=edge.size[1];edgeCard.intensity=edge.output*.57;
  spot.position.fromArray(preset.key.position);
  spot.color.set(preset.key.color);spot.intensity=preset.key.power;
  spot.angle=preset.key.angle;spot.penumbra=preset.key.softness;
  point.intensity=0;
  if('point' in preset){
   point.position.fromArray(preset.point.position);
   point.color.set(preset.point.color);point.intensity=preset.point.intensity;
  }
  fill.color.set(preset.fill.sky);fill.groundColor.set(preset.fill.ground);fill.intensity=preset.fill.intensity;
  rim.position.fromArray(preset.rim.direction);
  rim.color.set(preset.rim.color);rim.intensity=preset.rim.intensity;
  for(const lamp of lamps)lamp.intensity=3.6*preset.ringLight;
 }
 setPreset('studio');
 return {group,setPreset,shadowReady:()=>Boolean(spot.shadow.map),update(index:number,dt:number,hero?:THREE.Vector3){
  aim.set(hero?.x??0,hero?.y??.35,hero?.z??0).sub(group.position);spot.target.position.copy(aim);
  worldAim.copy(aim).add(group.position);keyCard.lookAt(worldAim);edgeCard.lookAt(worldAim);
  luminous(target.set(STAGE_COLORS[KNIVES[index]]));lightColor.lerp(target,1-Math.exp(-4*dt));
  emitter.color.copy(lightColor);halo.uniforms.uLight.value.copy(lightColor);
  lamps.forEach(lamp=>lamp.color.copy(lightColor));return lightColor.getHex();
 },dispose(){
  group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
  [floor,lip,emitter,halo].forEach(m=>m.dispose());
  lamps.forEach(l=>l.dispose());point.dispose();spot.dispose();rim.dispose();fill.dispose();keyCard.dispose();edgeCard.dispose();
 }};
}
