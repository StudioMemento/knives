import * as THREE from 'three';

// Integrate extinction through a low, finite volume between the lens and the
// platform. Render at reduced resolution: the fog contains only broad features.
export function createForegroundFog(renderer:THREE.WebGLRenderer,camera:THREE.PerspectiveCamera){
 const scene=new THREE.Scene(),screen=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 const target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false,stencilBuffer:false});
 const vertexShader='varying vec2 st;void main(){st=uv;gl_Position=vec4(position.xy,0.,1.);}';
 const volume=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,blending:THREE.NoBlending,
  uniforms:{uTime:{value:0},uAspect:{value:1},uSlope:{value:Math.tan(THREE.MathUtils.degToRad(camera.fov/2))},
   uEye:{value:camera.position},uTint:{value:new THREE.Color()},uStrength:{value:1}},
  vertexShader,fragmentShader:`varying vec2 st;uniform float uTime,uAspect,uSlope,uStrength;uniform vec3 uEye,uTint;
   float hash3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
   float noise3(vec3 p){
    vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
     mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1)),f.x),f.y),f.z);
   }
   void main(){
    if(st.y>.52){gl_FragColor=vec4(0.);return;}
    vec3 ray=vec3((st*2.-1.)*vec2(uAspect,1.)*uSlope,-1.);
    float optical=0.;
    for(int i=0;i<8;i++){
     vec3 p=uEye+ray*(2.5+float(i)*.56);
     vec3 q=p*vec3(.55,1.1,.5)+vec3(uTime*.065,0.,uTime*.019);
     float n=noise3(q)*.72+noise3(q*2.36)*.28;
     float height=(p.y+1.12+(n-.5)*.8)/.45;
     optical+=.56*exp(-height*height)*smoothstep(.29,.80,n)*.37;
    }
    gl_FragColor=vec4(mix(vec3(.29,.33,.40),uTint,.15),(1.-exp(-optical))*uStrength);
   }`
 });
 const composite=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,transparent:true,toneMapped:false,
  uniforms:{uMap:{value:target.texture}},vertexShader,fragmentShader:`varying vec2 st; uniform sampler2D uMap;
   void main(){gl_FragColor=texture2D(uMap,st);}`});
 const quad=new THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>(new THREE.PlaneGeometry(2,2),volume);quad.frustumCulled=false;scene.add(quad);
 let previous='';
 return {
  resize(w:number,h:number){const scale=Math.min(.4,560/w);target.setSize(Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)));volume.uniforms.uAspect.value=w/h;previous='';},
  render(time:number,tint:THREE.Color,strength:number){
   const tick=Math.floor(time*15),key=tick+'/'+tint.getHex()+'/'+strength.toFixed(2);
   if(previous!==key){
    volume.uniforms.uTime.value=tick/15;volume.uniforms.uTint.value.copy(tint);volume.uniforms.uStrength.value=strength;
    quad.material=volume;renderer.setRenderTarget(target);renderer.render(scene,screen);previous=key;
   }
   renderer.setRenderTarget(null);quad.material=composite;renderer.render(scene,screen);
  },
  dispose(){target.dispose();volume.dispose();composite.dispose();quad.geometry.dispose();}
 };
}
