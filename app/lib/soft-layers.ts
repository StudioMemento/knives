import * as THREE from 'three';
export const REAR_DEPTH_LAYER=5;

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
  void main(){
   vec4 c=texture2D(uMap,vUv)*0.1335712203;
   c+=texture2D(uMap,vUv+uStep*1.4584295168)*0.2333084327;
   c+=texture2D(uMap,vUv-uStep*1.4584295168)*0.2333084327;
   c+=texture2D(uMap,vUv+uStep*3.4039848067)*0.1359278107;
   c+=texture2D(uMap,vUv-uStep*3.4039848067)*0.1359278107;
   c+=texture2D(uMap,vUv+uStep*5.3518057801)*0.0513831778;
   c+=texture2D(uMap,vUv-uStep*5.3518057801)*0.0513831778;
   c+=texture2D(uMap,vUv+uStep*7.3029407160)*0.0125949686;
   c+=texture2D(uMap,vUv-uStep*7.3029407160)*0.0125949686;
   gl_FragColor=c;
  }`});
 // Integrate a circular aperture over the per-pixel depth buffer. A sample
 // may cover neighbouring empty pixels only inside its own circle of confusion.
 const bokeh=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,blending:THREE.NoBlending,toneMapped:false,
  uniforms:{uMap:{value:source.texture},uDepth:{value:source.depthTexture},uPixel:{value:new THREE.Vector2()},
   uNear:{value:.05},uFar:{value:80},uFocus:{value:9.5},uAperture:{value:30},uMax:{value:12}},
  vertexShader:vertex,fragmentShader:`varying vec2 vUv; uniform sampler2D uMap,uDepth; uniform vec2 uPixel;
   uniform float uNear,uFar,uFocus,uAperture,uMax;
   float distanceAt(vec2 uv){float z=texture2D(uDepth,uv).r;return uNear*uFar/(uFar-(uFar-uNear)*z);}
   float coc(float z){return min(uMax,uAperture*abs(1.-uFocus/z));}
   void main(){
    vec4 centre=texture2D(uMap,vUv);float centreZ=distanceAt(vUv),centreR=coc(centreZ);
    vec4 sum=vec4(0.);
    for(int i=0;i<32;i++){
     float t=(float(i)+.5)/32.,r=uMax*t,angle=float(i)*2.39996323;
     vec2 pos=clamp(vUv+uPixel*vec2(cos(angle),sin(angle))*r,0.,1.);
     vec4 c=texture2D(uMap,pos);float z=distanceAt(pos),disk=max(.75,coc(z));
     float visibility=centre.a>.98&&centreR<1.&&z>centreZ+.12?0.:1.;
     float w=(2.*uMax*uMax*t/32.)/max(1.,disk*disk);
     sum+=c*visibility*w*(1.-smoothstep(max(0.,disk-.6),disk+.6,r));
    }
    sum/=max(1.,sum.a);
    gl_FragColor=mix(centre,sum,centre.a<.001?1.:smoothstep(.6,2.,centreR));
   }`});
 const composite=new THREE.ShaderMaterial({transparent:true,premultipliedAlpha:true,depthTest:false,depthWrite:false,
  uniforms:{uMap:{value:source.texture},uOpacity:{value:1},uFloor:{value:0}},vertexShader:vertex,
  fragmentShader:`varying vec2 vUv;uniform sampler2D uMap;uniform float uOpacity,uFloor;
  void main(){vec4 c=texture2D(uMap,vUv);float fade=mix(1.,smoothstep(.015,.32,vUv.y),uFloor);
   float visible=smoothstep(.00006,.012,max(c.r,max(c.g,c.b)));
   gl_FragColor=vec4(c.rgb/max(c.a,.00001),c.a*uOpacity*fade*visible);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   gl_FragColor.rgb*=gl_FragColor.a;
  }`});
 const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),blur);quad.frustumCulled=false;scene.add(quad);
 const depthOnly=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:THREE.DoubleSide});
 let width=1,height=1,checked=false,enabled=true;
 function layer(world:THREE.Scene,view:THREE.Camera,index:number,radiusX:number,radiusY:number,opacity:number,floor:boolean){
  view.layers.set(index);renderer.setRenderTarget(source);renderer.clear();
  // Only the partially faded products need an additional depth pass. Fully
  // opaque rear products write their own depth. Resolve the nearest surface
  // before fading an entire knife. Without this,
  // overlapping triangles/parts show through one another during the focus blend.
  if(index===REAR_LAYER){view.layers.set(REAR_DEPTH_LAYER);world.overrideMaterial=depthOnly;renderer.render(world,view);world.overrideMaterial=null;view.layers.set(REAR_LAYER);}
  renderer.render(world,view);
  if(index===REAR_LAYER){
   quad.material=bokeh;renderer.setRenderTarget(ping);renderer.render(scene,camera);
   composite.uniforms.uMap.value=ping.texture;
  }else{
   quad.material=blur;blur.uniforms.uMap.value=source.texture;blur.uniforms.uStep.value.set(radiusX/(width*8),0);
   renderer.setRenderTarget(ping);renderer.render(scene,camera);
   blur.uniforms.uMap.value=ping.texture;blur.uniforms.uStep.value.set(0,radiusY/(height*8));
   renderer.setRenderTarget(source);renderer.render(scene,camera);composite.uniforms.uMap.value=source.texture;
  }
  quad.material=composite;composite.uniforms.uOpacity.value=opacity;composite.uniforms.uFloor.value=floor?1:0;
  renderer.setRenderTarget(null);renderer.render(scene,camera);
 }
 return {
  get enabled(){return enabled;},
  get depth(){return enabled&&checked?source.depthTexture:null;},
  disable(){enabled=false;},
  resize(w:number,h:number){
   width=w;height=h;const scale=Math.min(1,(w<800?480:960)/Math.max(w,h));
   bokeh.uniforms.uPixel.value.set(1/w,1/h);
   bokeh.uniforms.uMax.value=Math.min(18,Math.max(7,h*.016));bokeh.uniforms.uAperture.value=h*.057;
   source.setSize(Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)));ping.setSize(source.width,source.height);checked=false;
  },
  render(world:THREE.Scene,view:THREE.PerspectiveCamera,hero:boolean,focusDistance:number){
   if(!enabled)return;
   const mask=view.layers.mask,autoClear=renderer.autoClear,clearAlpha=renderer.getClearAlpha();
   try{
    renderer.autoClear=false;renderer.setClearAlpha(0);
    if(!checked){
     const gl=renderer.getContext();for(const target of [source,ping]){renderer.setRenderTarget(target);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){enabled=false;return;}}
     checked=true;
    }
    layer(world,view,REFLECTION_LAYER,22,32,.64,true);
    bokeh.uniforms.uNear.value=view.near;bokeh.uniforms.uFar.value=view.far;bokeh.uniforms.uFocus.value=focusDistance;
    if(hero)layer(world,view,REAR_LAYER,0,0,1,false);
   }finally{view.layers.mask=mask;renderer.setRenderTarget(null);renderer.autoClear=autoClear;renderer.setClearAlpha(clearAlpha);}
  },
  dispose(){source.dispose();ping.dispose();quad.geometry.dispose();blur.dispose();bokeh.dispose();composite.dispose();depthOnly.dispose();}
 };
}
