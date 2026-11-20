import * as THREE from 'three';
import {RAIL} from './choreography.ts';

// One colour and depth buffer for the entire stage. Optical blur and the
// subdued distant light follow camera depth, independently of catalogue focus.
export function createDepthOfField(renderer:THREE.WebGLRenderer){
 const source=new THREE.WebGLRenderTarget(1,1,{
  type:renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType,
  depthBuffer:true,stencilBuffer:false,samples:Math.min(2,renderer.capabilities.maxSamples),
  minFilter:THREE.LinearMipmapLinearFilter,generateMipmaps:true,
 });
 source.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
 const screen=new THREE.Scene(),lens=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,blending:THREE.NoBlending,
  uniforms:{uColor:{value:source.texture},uDepth:{value:source.depthTexture},uNear:{value:.05},uFar:{value:80},
   uFocus:{value:9.5},uFloorAtEye:{value:0},uSlope:{value:RAIL.slope},uTan:{value:.3},uRadius:{value:8},uTexel:{value:new THREE.Vector2()}},
  vertexShader:'varying vec2 st;void main(){st=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`varying vec2 st;uniform sampler2D uColor,uDepth;uniform vec2 uTexel;uniform float uNear,uFar,uFocus,uFloorAtEye,uSlope,uTan,uRadius;
   float distanceAt(vec2 uv){float z=texture2D(uDepth,uv).r;return uNear*uFar/(uFar-z*(uFar-uNear));}
   float blurAt(float d){return smoothstep(.10,.51,max(0.,1.-uFocus/d));}
   bool floorAt(vec2 uv,float d){
    float slope=(uv.y*2.-1.)*uTan+uSlope;
    return abs(d*slope-uFloorAtEye)<.04&&d<uFar-.3;
   }
   vec4 lightAt(vec2 uv,float d,float lod){
    vec4 c=textureLod(uColor,uv,lod);
    if(floorAt(uv,d))return c;
    c.rgb*=mix(1.,.27,smoothstep(uFocus+2.,uFocus+21.,d));
    return c;
   }
   void main(){
    float d=distanceAt(st),blur=floorAt(st,d)?0.:blurAt(d);vec4 c=lightAt(st,d,0.);
    if(c.a<.0001&&textureLod(uColor,st,4.).a<.00001){gl_FragColor=vec4(0.);return;}
    if(blur>.01){
     float lod=max(0.,log2(max(1.,uRadius*blur))-.95);
     vec4 sum=lightAt(st,d,lod);float weights=1.;
     for(int i=0;i<8;i++){
      float k=float(i)+.5,r=sqrt(k/8.),a=k*2.399963;
      vec2 uv=st+vec2(cos(a),sin(a))*r*uTexel*blur;
      float sampleD=distanceAt(uv),w=smoothstep(.02,.42,blurAt(sampleD));
      sum+=lightAt(uv,sampleD,lod)*w;weights+=w;
     }
     c=sum/weights;
    }
    gl_FragColor=vec4(c.rgb/max(c.a,.00001),c.a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    gl_FragColor.rgb*=gl_FragColor.a;
   }`});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);mesh.frustumCulled=false;screen.add(mesh);
 let valid=true;
 return {
  resize(w:number,h:number){
   const ratio=renderer.getPixelRatio();source.setSize(Math.max(1,Math.round(w*ratio)),Math.max(1,Math.round(h*ratio)));
   const radius=THREE.MathUtils.clamp(h*.009,3.8,11);material.uniforms.uRadius.value=radius*ratio;material.uniforms.uTexel.value.set(radius/w,radius/h);
   renderer.setRenderTarget(source);const gl=renderer.getContext();
   valid=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;renderer.setRenderTarget(null);
  },
  render(world:THREE.Scene,camera:THREE.PerspectiveCamera,focusDistance:number,floorAtEye:number,slope:number){
   material.uniforms.uSlope.value=slope;material.uniforms.uFloorAtEye.value=floorAtEye;material.uniforms.uTan.value=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
   material.uniforms.uFocus.value=focusDistance;material.uniforms.uNear.value=camera.near;material.uniforms.uFar.value=camera.far;
   renderer.setRenderTarget(valid?source:null);renderer.clear();renderer.render(world,camera);
   if(valid){renderer.setRenderTarget(null);renderer.render(screen,lens);}
  },
  dispose(){source.dispose();material.dispose();mesh.geometry.dispose();}
 };
}
