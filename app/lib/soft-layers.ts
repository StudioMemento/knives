import * as THREE from 'three';

export const REFLECTION_LAYER=1,REAR_LAYER=2,REAR_DEPTH_LAYER=5;
const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';

/** Split covered samples by optical depth before filtering. Each defocus band
 * spreads premultiplied light and coverage through a filled circular aperture. */
export function createSoftLayers(renderer:THREE.WebGLRenderer){
 const type=renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType;
 const target=(depth=false)=>new THREE.WebGLRenderTarget(1,1,{type,depthBuffer:depth,stencilBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
 const source=target(true),weighted=target(),bands=[target(),target(),target(),target()],reflection=target(true),blurBuffer=target();
 source.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
 weighted.texture.generateMipmaps=true;weighted.texture.minFilter=THREE.LinearMipmapLinearFilter;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 function shader(uniforms:Record<string,THREE.IUniform>,fragmentShader:string){
  return new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader,depthTest:false,depthWrite:false,blending:THREE.NoBlending,toneMapped:false});
 }
 const split=shader({uColor:{value:source.texture},uDepth:{value:source.depthTexture},uNear:{value:.05},uFar:{value:80},uFocus:{value:9.5},uBand:{value:0}},
  `varying vec2 vUv;uniform sampler2D uColor,uDepth;uniform float uNear,uFar,uFocus,uBand;
   void main(){
    vec4 light=texture2D(uColor,vUv);float z=texture2D(uDepth,vUv).r;
    float distanceToSample=uNear*uFar/(uFar-z*(uFar-uNear));
    float coc=abs(1.-uFocus/distanceToSample);
    float band=coc<.065?clamp((coc-.004)/.061,0.,1.):
     (coc<.155?1.+(coc-.065)/.09:2.+clamp((coc-.155)/.225,0.,1.));
    gl_FragColor=light*max(1.-abs(band-uBand),0.);
   }`);
 function aperture(radius:2|4){return shader({uMap:{value:weighted.texture},uTexel:{value:new THREE.Vector2()}},
  `varying vec2 vUv;uniform sampler2D uMap;uniform vec2 uTexel;
   void main(){
    vec4 sum=vec4(0.);float total=0.;
    for(int y=-${radius};y<=${radius};y++){for(int x=-${radius};x<=${radius};x++){
     vec2 p=vec2(float(x),float(y));float weight=1.-smoothstep(${radius-.15},${radius+.65},length(p));
     if(weight>0.){sum+=texture2D(uMap,vUv+p*uTexel)*weight;total+=weight;}
    }}
    gl_FragColor=sum/total;
   }`);}
 const smallDisk=aperture(2),disk=aperture(4);
 const copy=shader({uMap:{value:weighted.texture}},'varying vec2 vUv;uniform sampler2D uMap;void main(){gl_FragColor=texture2D(uMap,vUv);}');
 const blur=shader({uMap:{value:reflection.texture},uStep:{value:new THREE.Vector2()}},`
  varying vec2 vUv;uniform sampler2D uMap;uniform vec2 uStep;
  void main(){
   vec4 sum=texture2D(uMap,vUv)*.227027;
   sum+=(texture2D(uMap,vUv+uStep*1.384615)+texture2D(uMap,vUv-uStep*1.384615))*.316216;
   sum+=(texture2D(uMap,vUv+uStep*3.230769)+texture2D(uMap,vUv-uStep*3.230769))*.070270;
   gl_FragColor=sum;
  }`);
 const composite=new THREE.ShaderMaterial({transparent:true,premultipliedAlpha:true,depthTest:false,depthWrite:false,
  uniforms:{uFine:{value:bands[0].texture},uClose:{value:bands[1].texture},uMiddle:{value:bands[2].texture},uFar:{value:bands[3].texture},uReflection:{value:reflection.texture},uFloor:{value:0}},
  vertexShader:vertex,fragmentShader:`varying vec2 vUv;uniform sampler2D uFine,uClose,uMiddle,uFar,uReflection;uniform float uFloor;
   void main(){
    vec4 c;
    if(uFloor>.5){c=texture2D(uReflection,vUv);c*=.50*smoothstep(.015,.32,vUv.y);}
    else{c=texture2D(uFine,vUv)+texture2D(uClose,vUv)+texture2D(uMiddle,vUv)+texture2D(uFar,vUv);}
    gl_FragColor=vec4(c.rgb/max(c.a,.00001),min(1.,c.a));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    gl_FragColor.rgb*=gl_FragColor.a;
   }`});
 const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),copy);quad.frustumCulled=false;scene.add(quad);
 const depthOnly=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:THREE.DoubleSide});
 const targets=[source,weighted,...bands,reflection,blurBuffer];
 let checked=false,enabled=true,width=1,height=1,cachedKey='';
 function draw(material:THREE.ShaderMaterial,buffer:THREE.WebGLRenderTarget|null){
  quad.material=material;renderer.setRenderTarget(buffer);renderer.render(scene,camera);
 }
 function reflect(world:THREE.Scene,view:THREE.PerspectiveCamera){
  view.layers.set(REFLECTION_LAYER);renderer.setRenderTarget(reflection);renderer.clear();renderer.render(world,view);
  blur.uniforms.uMap.value=reflection.texture;blur.uniforms.uStep.value.set(5/width,0);draw(blur,blurBuffer);
  blur.uniforms.uMap.value=blurBuffer.texture;blur.uniforms.uStep.value.set(0,8/height);draw(blur,reflection);
  composite.uniforms.uFloor.value=1;draw(composite,null);
 }
 function rear(world:THREE.Scene,view:THREE.PerspectiveCamera,focusDistance:number){
  renderer.setRenderTarget(source);renderer.clear();view.layers.set(REAR_DEPTH_LAYER);world.overrideMaterial=depthOnly;
  try{renderer.render(world,view);}finally{world.overrideMaterial=null;}
  view.layers.set(REAR_LAYER);renderer.render(world,view);
  split.uniforms.uNear.value=view.near;split.uniforms.uFar.value=view.far;split.uniforms.uFocus.value=focusDistance;
  for(const [i,band] of bands.entries()){
   split.uniforms.uBand.value=i;draw(split,weighted);
   const filter=i===1?smallDisk:disk;
   filter.uniforms.uTexel.value.set(1/band.width,1/band.height);
   draw(i===0?copy:filter,band);
  }
 }
 return {
  get enabled(){return enabled;},
  resize(w:number,h:number){
   width=w;height=h;const scale=Math.min(renderer.getPixelRatio(),1.5,Math.sqrt(2100000/(w*h)));
   const size=(buffer:THREE.WebGLRenderTarget,s:number)=>buffer.setSize(Math.max(1,Math.round(w*s)),Math.max(1,Math.round(h*s)));
   size(source,scale);size(weighted,scale);size(bands[0],scale);
   // Approximately 3, 7 and 17 CSS pixels at 800 px high. The filled disk kernel
   // operates on prefiltered mip levels, so bright edges stay continuous.
   size(bands[1],Math.min(scale,2/Math.max(2.5,h*.004)));
   size(bands[2],Math.min(scale,4/Math.max(4,h*.009)));
   size(bands[3],Math.min(scale,4/Math.max(10,h*.022)));
   const mirrorScale=Math.min(.45,720/Math.max(w,h));size(reflection,mirrorScale);size(blurBuffer,mirrorScale);checked=false;cachedKey='';
  },
  render(world:THREE.Scene,view:THREE.PerspectiveCamera,hero:boolean,focusDistance:number,rearKey:string){
   if(!enabled)return;const mask=view.layers.mask,alpha=renderer.getClearAlpha();
   try{
    renderer.setClearAlpha(0);
    if(!checked){
     const gl=renderer.getContext();
     for(const buffer of targets){renderer.setRenderTarget(buffer);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){enabled=false;return;}}
     checked=true;
    }
    reflect(world,view);
    if(hero){
     if(rearKey!==cachedKey){rear(world,view,focusDistance);cachedKey=rearKey;}
     composite.uniforms.uFloor.value=0;draw(composite,null);
    }else cachedKey='';

   }finally{view.layers.mask=mask;renderer.setRenderTarget(null);renderer.setClearAlpha(alpha);}
  },
  dispose(){targets.forEach(t=>t.dispose());[split,smallDisk,disk,copy,blur,composite,depthOnly].forEach(m=>m.dispose());quad.geometry.dispose();}
 };
}
