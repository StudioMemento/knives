import * as THREE from 'three';
/** Soft additive light volumes and actual lights share the same emitter at the platform. */
export function createLightStage(){
 const group=new THREE.Group();const rotor=new THREE.Group();group.add(rotor);
 const white=new THREE.Color('white');
 const uniforms={color:{value:new THREE.Color('#ffe8bc')},strength:{value:1},time:{value:0}};
 const glowMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'varying vec2 vUv;uniform vec3 color;uniform float strength;void main(){float r=length((vUv-.5)*2.);float a=exp(-r*r*5.5)*(1.-smoothstep(.3,1.,r));gl_FragColor=vec4(color*1.2,a*.08*strength);}' });
 const halo=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.5),glowMaterial);halo.position.set(0,.08,0);group.add(halo);
 const floorHalo=new THREE.Mesh(new THREE.PlaneGeometry(2.8,2.8),glowMaterial);floorHalo.rotation.x=-Math.PI/2;floorHalo.position.y=-.08;group.add(floorHalo);
 const ledMaterial=new THREE.MeshBasicMaterial({color:0xfff4dc,toneMapped:false,transparent:true,opacity:.3});
 for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.75+i*.15,.008,8,120,Math.PI*(i===1?1.65:2)),ledMaterial);ring.rotation.x=Math.PI/2;ring.position.y=i*.065;rotor.add(ring);}
 const volume=new THREE.Mesh(new THREE.CylinderGeometry(1.05,.45,3.7,48,1,true),new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false,
  vertexShader:'varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=-p.xyz;gl_Position=projectionMatrix*p;}',
  fragmentShader:'varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;uniform vec3 color;uniform float strength;uniform float time;void main(){float facing=pow(abs(dot(normalize(vNormal),normalize(vView))),2.);float fade=pow(1.-vUv.y,2.3)*smoothstep(0.,.1,vUv.y);float ray=.7+.3*sin(vUv.x*37.+time*.09);gl_FragColor=vec4(color,fade*facing*ray*.025*strength);}' }));volume.position.y=1.78;group.add(volume);
 const spot=new THREE.SpotLight(0xffe6b8,8,9,.48,1,1.5);spot.position.set(0,.07,.5);spot.target.position.set(0,2.1,0);group.add(spot,spot.target);
 const glow=new THREE.PointLight(0xffe6b8,2,3,1.7);glow.position.set(0,.14,.3);group.add(glow);
 return {group,update:(time:number,color:THREE.Color,weight:number,authority:number)=>{uniforms.time.value=time;uniforms.color.value.lerp(color,.035);uniforms.strength.value=weight*(.4+authority*.4);rotor.rotation.y=time*.19;ledMaterial.opacity=weight*.3;ledMaterial.color.copy(uniforms.color.value).lerp(white,.45);spot.color.copy(uniforms.color.value);spot.intensity=weight*(5+authority*5);glow.color.copy(uniforms.color.value);glow.intensity=weight*1.6;},dispose:()=>{group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});glowMaterial.dispose();ledMaterial.dispose();(volume.material as THREE.Material).dispose();}};
}
export const WORLDS=[
 {key:'#fff2e8',fill:'#6a8299',rim:'#ff552c',exposure:1.0,rough:.4},
 {key:'#fff8da',fill:'#becbd2',rim:'#ffd14c',exposure:1.06,rough:.4},
 {key:'#e4ffff',fill:'#497cba',rim:'#45e3cf',exposure:1.04,rough:.4},
 {key:'#f0ffe5',fill:'#728985',rim:'#b1e788',exposure:1.02,rough:.4},
];
