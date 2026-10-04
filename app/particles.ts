import * as THREE from 'three';

/** Two point draws: an elastic edge field and a bounded, fading product trail. */
export function createParticleField(mobile:boolean){
 const count=mobile?2600:6400,trailCount=mobile?900:1800;
 let seed=421;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const position=new Float32Array(count*3),seeds=new Float32Array(count*3);
 for(let i=0;i<count;i++){
  const x=random()*2.3-1.15,edge=Math.pow(Math.abs(x)/1.15,7);
  position.set([x,-.93+Math.pow(random(),2.4)*(.19+edge*.53),random()],i*3);
  seeds.set([random(),random(),random()],i*3);
 }
 const uniforms={uTime:{value:0},uPointer:{value:new THREE.Vector2(4,4)},uHover:{value:0},uAspect:{value:1},uRatio:{value:1},uAccent:{value:new THREE.Color('#a4bdd8')},uSettle:{value:0},uOpacity:{value:1}};
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(position,3));geometry.setAttribute('seed',new THREE.BufferAttribute(seeds,3));
 const fragment=`varying float vAlpha;varying float vTint;uniform vec3 uAccent;uniform float uOpacity;
 void main(){float d=length(gl_PointCoord-.5);float core=1.-smoothstep(.09,.48,d);if(core<.01)discard;vec3 c=mix(vec3(.26,.48,.70),uAccent,vTint*.45);gl_FragColor=vec4(c,core*vAlpha*uOpacity);}`;
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
  vertexShader:`attribute vec3 seed;uniform float uTime,uHover,uAspect,uRatio,uSettle;uniform vec2 uPointer;varying float vAlpha;varying float vTint;
  void main(){vec2 p=position.xy;float t=uTime*.19;p.y+=sin(p.x*5.+t+seed.x*1.8)*(.012+seed.z*.027);p.x+=sin(t*.57+seed.y*6.283)*.012;
  vec2 delta=uPointer-p;float distance=length(delta*vec2(uAspect,1.));float influence=exp(-distance*distance*4.)*uHover;
  p+=delta*influence*.27+vec2(-delta.y/uAspect,delta.x*uAspect)*influence*.10;
  p.y+=uSettle*.045*sin(p.x*5.+seed.x*2.);gl_Position=vec4(p,.99,1.);gl_PointSize=(.75+seed.y*1.2+influence*.9)*uRatio;
  vAlpha=(.12+seed.z*.36)*(1.+uSettle*.35);vTint=seed.x;}`,fragmentShader:fragment});
 const field=new THREE.Points(geometry,material);field.frustumCulled=false;field.renderOrder=310;
 const trailPositions=new Float32Array(trailCount*3),births=new Float32Array(trailCount).fill(-100),speeds=new Float32Array(trailCount*3);
 for(let i=0;i<trailCount;i++)speeds.set([(random()-.5)*.04,(random()-.5)*.035,random()],i*3);
 const trailGeometry=new THREE.BufferGeometry();trailGeometry.setAttribute('position',new THREE.BufferAttribute(trailPositions,3).setUsage(THREE.DynamicDrawUsage));trailGeometry.setAttribute('birth',new THREE.BufferAttribute(births,1).setUsage(THREE.DynamicDrawUsage));trailGeometry.setAttribute('velocity',new THREE.BufferAttribute(speeds,3));
 const trailMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
  vertexShader:`attribute float birth;attribute vec3 velocity;uniform float uTime,uRatio;varying float vAlpha;varying float vTint;
  void main(){float age=max(0.,uTime-birth);float life=.65+velocity.z*.65;vec2 p=position.xy+velocity.xy*age;gl_Position=vec4(p,.98,1.);gl_PointSize=(.85+velocity.z)*uRatio;vAlpha=pow(max(0.,1.-age/life),2.)*.32;vTint=velocity.z;}`,fragmentShader:fragment});
 const trail=new THREE.Points(trailGeometry,trailMaterial);trail.frustumCulled=false;trail.renderOrder=309;
 const group=new THREE.Group();group.add(field,trail);
 const pointer=new THREE.Vector2(4,4),previous:Array<THREE.Vector3[]|undefined>=[],anchors=[-1.8,-.9,0,.9,1.8],point=new THREE.Vector3();let cursor=0,hover=false,time=0,settle=0,dirty=false;
 return {group,pointer(x:number,y:number){pointer.set(x,y);hover=true;},leave(){hover=false;},settle(){settle=1;},
  track(index:number,model:THREE.Object3D,camera:THREE.Camera,dt:number,enabled:boolean){
   const last=previous[index]??(previous[index]=anchors.map(()=>new THREE.Vector3(4,4,4)));
   anchors.forEach((y,j)=>{point.set(0,y,0).applyMatrix4(model.matrixWorld).project(camera);const distance=point.distanceTo(last[j]);
    if(enabled&&distance>.00025&&distance<.35&&Math.abs(point.x)<1.15&&Math.abs(point.y)<1.1){
     const amount=Math.min(12,Math.ceil(distance/Math.max(.0002,dt*.018)));
     for(let k=0;k<amount;k++){const t=random();trailPositions[cursor*3]=THREE.MathUtils.lerp(last[j].x,point.x,t)+(random()-.5)*.018;trailPositions[cursor*3+1]=THREE.MathUtils.lerp(last[j].y,point.y,t)+(random()-.5)*.018;births[cursor]=time;cursor=(cursor+1)%trailCount;}dirty=true;
    }last[j].copy(point);
   });
  },update(dt:number,accent:THREE.Color,ratio:number,aspect:number,reduced:boolean,suspended:boolean){
   if(!suspended&&!reduced)time+=dt;const damping=1-Math.exp(-dt*5);uniforms.uTime.value=time;uniforms.uPointer.value.lerp(pointer,damping);uniforms.uHover.value+=((hover&&!reduced?1:0)-uniforms.uHover.value)*damping;uniforms.uAccent.value.lerp(accent,damping*.35);uniforms.uRatio.value=ratio;uniforms.uAspect.value=aspect;uniforms.uSettle.value=reduced?0:settle;uniforms.uOpacity.value=reduced?.35:1;
   settle*=Math.exp(-dt*1.5);if(dirty){trailGeometry.attributes.position.needsUpdate=true;trailGeometry.attributes.birth.needsUpdate=true;dirty=false;}trail.visible=!reduced;
  },dispose(){geometry.dispose();material.dispose();trailGeometry.dispose();trailMaterial.dispose();}};
}
