import * as THREE from 'three';
/** Analytic multi-scale bloom stays on the light sources, not on the steel. */
export function createLightStage(){
 const group=new THREE.Group();
 const uniforms={uColor:{value:new THREE.Color('#f5dcb8')},uOpacity:{value:1},uFocus:{value:1},uRadius:{value:new THREE.Vector2(3.8,1.22)}};
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.ShaderMaterial({
  uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false,
  vertexShader:'varying vec2 vFloor; void main(){vFloor=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 vFloor;uniform vec3 uColor;uniform float uOpacity;uniform vec2 uRadius;
   void main(){
    vec2 p=vFloor/uRadius;float d=abs(length(p)-1.);
    float core=exp(-d*580.);float nearGlow=exp(-d*44.);float halo=exp(-d*12.);float spill=exp(-d*3.2);
    float grain=.97+.03*sin(vFloor.x*83.+sin(vFloor.y*173.))*sin(vFloor.y*317.);
    float brightness=(core*1.5+nearGlow*.46+halo*.17+spill*.052+exp(-dot(p,p)*.45)*.018)*grain;
    gl_FragColor=vec4(mix(uColor,vec3(1.),core*.85),clamp(brightness*uOpacity,0.,.98));
    #include <colorspace_fragment>
   }`
 }));
 floor.rotation.x=-Math.PI/2;group.add(floor);
 const shaft=new THREE.Mesh(new THREE.PlaneGeometry(4.3,8),new THREE.ShaderMaterial({
  uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 vUv;uniform float uFocus,uOpacity;
   void main(){float width=mix(.48,.055,vUv.y);float beam=exp(-pow((vUv.x-.5)/width,2.)*3.);
    float fade=smoothstep(0.,.2,vUv.y)*(1.-smoothstep(.55,1.,vUv.y));
    gl_FragColor=vec4(.97,.94,.88,beam*fade*uOpacity*(.025+uFocus*.055));
   }`
 }));
 shaft.position.set(.3,3.5,.15);group.add(shaft);
 return {group,update:(_time:number,_color:THREE.Color,weight:number,authority:number,radius=3.8)=>{
  uniforms.uOpacity.value=weight;uniforms.uFocus.value=authority;uniforms.uRadius.value.set(radius,1.22);shaft.visible=weight>.9;
 },dispose:()=>{floor.geometry.dispose();floor.material.dispose();shaft.geometry.dispose();shaft.material.dispose();}};
}
export const WORLDS=Array.from({length:5},()=>({key:'#fff6e9',fill:'#c4ced8',exposure:1.05}));
