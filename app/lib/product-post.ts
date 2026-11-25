import * as THREE from 'three';

// Both attachments are written by the physical material, including its final tangent-space normal.
export const gBufferHeader=`
layout(location=1) out highp vec4 surfaceData;
vec2 packSurfaceNormal(vec3 n) {
 n/=abs(n.x)+abs(n.y)+abs(n.z);
 vec2 p=n.z>=0.?n.xy:(1.-abs(n.yx))*mix(vec2(-1.),vec2(1.),step(vec2(0.),n.xy));
 return p*.5+.5;
}`;

const fragment=`
varying vec2 uvScreen;
uniform sampler2D beauty, geometry, sceneDepth;
uniform mat4 lens, inverseLens;
uniform vec2 pixel;
uniform float aoRadius,aoAmount,aoBias,ssrAmount,sharpness;
vec3 positionAt(vec2 uv,float depth) {
 vec4 p=inverseLens*vec4(uv*2.-1.,depth*2.-1.,1.);
 return p.xyz/p.w;
}
vec2 projectAt(vec3 p) {
 vec4 h=lens*vec4(p,1.);return .5+.5*h.xy/h.w;
}
vec3 unpackN(vec2 uv) {
 vec2 p=uv*2.-1.;vec3 n=vec3(p,1.-abs(p.x)-abs(p.y));
 n.xy-=mix(vec2(-1.),vec2(1.),step(vec2(0.),n.xy))*max(-n.z,0.);
 return normalize(n);
}
float occlusion(vec3 p,vec3 n) {
 vec2 radius=.5*vec2(lens[0][0],lens[1][1])*aoRadius/max(.05,-p.z);
 float acc=0.;vec2 dir=vec2(.739,.674);
 for(int i=0;i<12;i++){
  dir=mat2(-.73737,.67549,-.67549,-.73737)*dir;
  vec2 uv=uvScreen+dir*radius*sqrt((float(i)+.55)/12.);
  float d=texture2D(sceneDepth,uv).r;
  vec3 delta=positionAt(uv,d)-p;
  float dist=length(delta);
  acc+=max(0.,dot(n,delta)/max(.0001,dist)-aoBias)*(1.-smoothstep(.0,aoRadius,dist))*step(d,.999985);
 }
 return clamp(1.-aoAmount*acc*.48,.48,1.);
}
vec4 reflection(vec3 p,vec3 n,float rough) {
 vec3 direction=reflect(normalize(p),n);
 vec3 origin=p+n*.009;float travel=.024,previous=0.;
 for(int i=0;i<23;i++){
  vec3 point=origin+direction*travel;vec2 uv=projectAt(point);
  if(point.z>-.06||min(min(uv.x,uv.y),min(1.-uv.x,1.-uv.y))<.002)break;
  float depth=texture2D(sceneDepth,uv).r;
  if(depth<.999985){
   float delta=positionAt(uv,depth).z-point.z;
   if(delta>0.&&delta<.018+travel*.105&&travel>.045){
    float lo=previous,hi=travel;
    for(int j=0;j<3;j++){
     float m=.5*(lo+hi);vec3 q=origin+direction*m;vec2 uq=projectAt(q);
     if(positionAt(uq,texture2D(sceneDepth,uq).r).z>q.z)hi=m;else lo=m;
    }
    uv=projectAt(origin+direction*hi);
    vec3 other=unpackN(texture2D(geometry,uv).rg);
    float valid=smoothstep(.03,.46,-dot(other,direction))*smoothstep(.030,.115,hi);
    valid*=smoothstep(.012,.065,min(min(uv.x,uv.y),min(1.-uv.x,1.-uv.y)))*(1.-smoothstep(.8,2.4,hi));
    vec2 spread=(.4+rough*3.)*pixel;vec4 hit=texture2D(beauty,uv)*.5+
     .25*(texture2D(beauty,uv+spread)+texture2D(beauty,uv-spread));
    return vec4(hit.rgb/max(.03,hit.a),valid*hit.a);
   }
  }
  previous=travel;travel+=.025+travel*.18;if(travel>2.65)break;
 }
 return vec4(0.);
}
void main() {
 vec4 src=texture2D(beauty,uvScreen);
 if(src.a<.004)discard;
 vec4 props=texture2D(geometry,uvScreen);
 float d=texture2D(sceneDepth,uvScreen).r;
 vec3 rgb=src.rgb/max(src.a,.03);
 if(src.a>.96&&d<.999985){
  vec3 p=positionAt(uvScreen,d),n=unpackN(props.rg);
  vec3 sum=vec3(0.);float weights=0.;
  for(int k=0;k<4;k++){
   vec2 axis=k==0?vec2(1,0):k==1?vec2(-1,0):k==2?vec2(0,1):vec2(0,-1);
   vec2 uv=uvScreen+axis*pixel;vec4 neighbor=texture2D(beauty,uv);
   float range=abs(positionAt(uv,texture2D(sceneDepth,uv).r).z-p.z);
   float w=neighbor.a*(1.-smoothstep(.006,.045,range));sum+=neighbor.rgb*w;weights+=w;
  }
  vec3 high=rgb-sum/max(weights,.0001);
  if(weights>.01)rgb+=sharpness*clamp(high,-.13*(rgb+.03),.13*(rgb+.03));
  float ao=occlusion(p,n);
  float reflectionWeight=ssrAmount*(.06+.44*props.a)*(1.-smoothstep(.15,.55,props.b));
  if(reflectionWeight>.015){
   vec4 hit=reflection(p,n,props.b);
   rgb=mix(rgb,hit.rgb,hit.a*reflectionWeight);
  }
  rgb*=ao;
 }
 gl_FragColor=vec4(max(rgb,vec3(0.)),src.a);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 float dither=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
 gl_FragColor.rgb+=dither/255.;
}
`;
export function createProductPost(renderer:THREE.WebGLRenderer){
 const hdr=renderer.extensions.has('EXT_color_buffer_float');
 const buffer=new THREE.WebGLRenderTarget(1,1,{count:2,type:hdr?THREE.HalfFloatType:THREE.UnsignedByteType,
  minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true,stencilBuffer:false,
  samples:Math.min(4,renderer.capabilities.maxSamples)});
 buffer.textures[0].name='Linear product radiance';
 buffer.textures[1].name='View normal, perceptual roughness and metallic';
 buffer.textures[1].type=THREE.UnsignedByteType;
 buffer.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
 const uniforms={beauty:{value:buffer.textures[0]},geometry:{value:buffer.textures[1]},sceneDepth:{value:buffer.depthTexture},
  lens:{value:new THREE.Matrix4()},inverseLens:{value:new THREE.Matrix4()},pixel:{value:new THREE.Vector2()},
  aoRadius:{value:.13},aoAmount:{value:.5},aoBias:{value:.026},ssrAmount:{value:1},sharpness:{value:.36}};
 const mat=new THREE.ShaderMaterial({uniforms,fragmentShader:fragment,
  vertexShader:'varying vec2 uvScreen;void main(){uvScreen=uv;gl_Position=vec4(position.xy,0.,1.);}',
  depthTest:false,depthWrite:false,transparent:true});
 const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat);quad.frustumCulled=false;
 const scene2d=new THREE.Scene();scene2d.add(quad);const camera2d=new THREE.Camera();
 return {
  resize(w:number,h:number){buffer.setSize(w,h);uniforms.pixel.value.set(1/w,1/h);},
  render(scene:THREE.Scene,camera:THREE.PerspectiveCamera){
   uniforms.lens.value.copy(camera.projectionMatrix);uniforms.inverseLens.value.copy(camera.projectionMatrixInverse);
   renderer.setRenderTarget(buffer);renderer.clear(true,true,false);renderer.render(scene,camera);
   renderer.setRenderTarget(null);renderer.render(scene2d,camera2d);
  },
  dispose(){buffer.dispose();buffer.depthTexture?.dispose();mat.dispose();quad.geometry.dispose();},
 };
}
