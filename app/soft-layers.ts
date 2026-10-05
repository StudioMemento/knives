import * as THREE from 'three';

export const REFLECTION_LAYER=1;
export const REAR_LAYER=2;

/** Isolated low-resolution blur. The foreground product always renders directly
 * to the antialiased canvas; an unsupported optional target cannot hide it. */
export function createSoftLayers(renderer:THREE.WebGLRenderer){
 const type=renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType;
 const source=new THREE.WebGLRenderTarget(1,1,{type,depthBuffer:true,stencilBuffer:false});
 source.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
 const ping=new THREE.WebGLRenderTarget(1,1,{type,depthBuffer:false,stencilBuffer:false});
 source.texture.name='Memento soft layer';ping.texture.name='Memento blur scratch';
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
 const blur=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,blending:THREE.NoBlending,toneMapped:false,
  uniforms:{uMap:{value:source.texture},uStep:{value:new THREE.Vector2()}},vertexShader:vertex,
  fragmentShader:`varying vec2 vUv;uniform sampler2D uMap;uniform vec2 uStep;
  void main(){vec4 c=texture2D(uMap,vUv)*.227027027;
   c+=texture2D(uMap,vUv+uStep*1.3846153846)*.3162162162;
   c+=texture2D(uMap,vUv-uStep*1.3846153846)*.3162162162;
   c+=texture2D(uMap,vUv+uStep*3.2307692308)*.0702702703;
   c+=texture2D(uMap,vUv-uStep*3.2307692308)*.0702702703;
   gl_FragColor=c;
  }`});
 const composite=new THREE.ShaderMaterial({transparent:true,premultipliedAlpha:true,depthTest:false,depthWrite:false,
  uniforms:{uMap:{value:source.texture},uOpacity:{value:1},uFloor:{value:0}},vertexShader:vertex,
  fragmentShader:`varying vec2 vUv;uniform sampler2D uMap;uniform float uOpacity,uFloor;
  void main(){vec4 c=texture2D(uMap,vUv);float fade=mix(1.,smoothstep(.015,.32,vUv.y),uFloor);
   gl_FragColor=vec4(c.rgb/max(c.a,.00001),c.a*uOpacity*fade);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   gl_FragColor.rgb*=gl_FragColor.a;
  }`});
 const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),blur);quad.frustumCulled=false;scene.add(quad);
 let width=1,height=1,checked=false,enabled=true;
 function layer(world:THREE.Scene,view:THREE.Camera,index:number,radiusX:number,radiusY:number,opacity:number,floor:boolean){
  view.layers.set(index);renderer.setRenderTarget(source);renderer.clear();renderer.render(world,view);
  quad.material=blur;blur.uniforms.uMap.value=source.texture;blur.uniforms.uStep.value.set(radiusX/(width*3.230769),0);
  renderer.setRenderTarget(ping);renderer.render(scene,camera);
  blur.uniforms.uMap.value=ping.texture;blur.uniforms.uStep.value.set(0,radiusY/(height*3.230769));
  renderer.setRenderTarget(source);renderer.render(scene,camera);
  quad.material=composite;composite.uniforms.uOpacity.value=opacity;composite.uniforms.uFloor.value=floor?1:0;
  renderer.setRenderTarget(null);renderer.render(scene,camera);
 }
 return {
  get enabled(){return enabled;},
  get depth(){return enabled&&checked?source.depthTexture:null;},
  disable(){enabled=false;},
  resize(w:number,h:number){
   width=w;height=h;const scale=Math.min(1,(w<800?480:960)/Math.max(w,h));
   source.setSize(Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)));ping.setSize(source.width,source.height);checked=false;
  },
  render(world:THREE.Scene,view:THREE.Camera,hero:boolean,focus:number){
   if(!enabled)return;
   const mask=view.layers.mask,autoClear=renderer.autoClear;
   try{
    renderer.autoClear=false;
    if(!checked){
     const gl=renderer.getContext();for(const target of [source,ping]){renderer.setRenderTarget(target);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){enabled=false;return;}}
     checked=true;
    }
    layer(world,view,REFLECTION_LAYER,22,32,.64,true);
    if(hero){
     // At the handover both knives converge to zero blur, avoiding a focus pop.
     const blurAmount=THREE.MathUtils.smoothstep(focus,.5,.95);
     layer(world,view,REAR_LAYER,1+blurAmount*7,1+blurAmount*7,.72+(.28*(1-blurAmount)),false);
    }
   }finally{view.layers.mask=mask;renderer.setRenderTarget(null);renderer.autoClear=autoClear;}
  },
  dispose(){source.dispose();ping.dispose();quad.geometry.dispose();blur.dispose();composite.dispose();}
 };
}
