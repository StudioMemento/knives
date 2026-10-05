import * as THREE from 'three';
import {decodeContours,isSilhouette,type ContourMesh} from './contours';

/** Two bounded point draws: floor dust and luminous, view-dependent mesh trails. */
export function createParticleField(mobile:boolean){
 const count=mobile?350:850,trailCount=mobile?4000:8500;
 let seed=421;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const position=new Float32Array(count*3),seeds=new Float32Array(count*3);
 for(let i=0;i<count;i++){
  const x=random()*2.3-1.15,edge=Math.pow(Math.abs(x)/1.15,7);
  position.set([x,-.93+Math.pow(random(),2.4)*(.19+edge*.53),random()],i*3);
  seeds.set([random(),random(),random()],i*3);
 }
 const uniforms={uTime:{value:0},uPointer:{value:new THREE.Vector2(4,4)},uHover:{value:0},uAspect:{value:1},uRatio:{value:1},uAccent:{value:new THREE.Color('#ead7b9')},uSettle:{value:0},uOpacity:{value:1}};
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(position,3));geometry.setAttribute('seed',new THREE.BufferAttribute(seeds,3));
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
  vertexShader:`attribute vec3 seed;uniform float uTime,uHover,uAspect,uRatio,uSettle;uniform vec2 uPointer;varying float vAlpha;
  void main(){vec2 p=position.xy;float t=uTime*.19;p.y+=sin(p.x*5.+t+seed.x*1.8)*(.012+seed.z*.027);p.x+=sin(t*.57+seed.y*6.283)*.012;
  vec2 delta=uPointer-p;float distance=length(delta*vec2(uAspect,1.));float influence=exp(-distance*distance*4.)*uHover;
  p+=delta*influence*.27+vec2(-delta.y/uAspect,delta.x*uAspect)*influence*.10;
  p.y+=uSettle*.045*sin(p.x*5.+seed.x*2.);gl_Position=vec4(p,.99,1.);gl_PointSize=(1.+seed.y*1.8+influence)*uRatio;
  vAlpha=(.16+seed.z*.34)*(1.+uSettle*.4);}`,
  fragmentShader:`varying float vAlpha;uniform vec3 uAccent;uniform float uOpacity;
  void main(){float d=length(gl_PointCoord-.5);float core=1.-smoothstep(.06,.48,d);if(core<.01)discard;gl_FragColor=vec4(uAccent,core*vAlpha*uOpacity*.55);}`});
 const field=new THREE.Points(geometry,material);field.frustumCulled=false;field.renderOrder=310;
 const trailPositions=new Float32Array(trailCount*3),births=new Float32Array(trailCount).fill(-100),speeds=new Float32Array(trailCount*3);
 for(let i=0;i<trailCount;i++)speeds.set([(random()-.5)*.015,(random()-.5)*.018,random()],i*3);
 const trailGeometry=new THREE.BufferGeometry();trailGeometry.setAttribute('position',new THREE.BufferAttribute(trailPositions,3).setUsage(THREE.DynamicDrawUsage));trailGeometry.setAttribute('birth',new THREE.BufferAttribute(births,1).setUsage(THREE.DynamicDrawUsage));trailGeometry.setAttribute('velocity',new THREE.BufferAttribute(speeds,3));
 const depthUniforms={uSceneDepth:{value:null as THREE.Texture|null},uViewport:{value:new THREE.Vector2(1,1)},uRearDepth:{value:0}};
 const trailMaterial=new THREE.ShaderMaterial({uniforms:{...uniforms,...depthUniforms},transparent:true,depthTest:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
  vertexShader:`attribute float birth;attribute vec3 velocity;uniform float uTime,uRatio,uAspect;varying float vAlpha;varying float vTint;
  void main(){float age=max(0.,uTime-birth);float life=.85+velocity.z*.7;vec2 p=position.xy+velocity.xy*vec2(1./uAspect,1.)*age;
  gl_Position=vec4(p,position.z-.00001,1.);gl_PointSize=(6.+velocity.z*6.)*uRatio;
  vAlpha=pow(max(0.,1.-age/life),1.55)*.9;vTint=velocity.z;
  if(vAlpha<.001){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=0.;}}`,
  fragmentShader:`varying float vAlpha;varying float vTint;uniform vec3 uAccent;uniform float uOpacity,uRearDepth;uniform sampler2D uSceneDepth;uniform vec2 uViewport;
  void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;
  if(uRearDepth>.5&&gl_FragCoord.z>texture2D(uSceneDepth,gl_FragCoord.xy/uViewport).r+.000012)discard;
  float core=exp(-d*d*210.);float halo=exp(-d*d*23.)*.23;
  vec3 color=mix(vec3(1.,.97,.9),uAccent,.22+vTint*.22);gl_FragColor=vec4(color,(core+halo)*vAlpha*uOpacity);}`});
 const trail=new THREE.Points(trailGeometry,trailMaterial);trail.frustumCulled=false;trail.renderOrder=309;
 const group=new THREE.Group();group.add(field,trail);
 const pointer=new THREE.Vector2(4,4),contours:Array<ContourMesh[]|undefined>=[],lastSettle:number[]=[],credits:number[]=[];
 // Fixed scratch arrays avoid allocations while scanning the silhouette edges.
 const candidates=new Float32Array(4096*14),cumulative=new Float32Array(4096);
 const inverse=new THREE.Matrix4(),mvp=new THREE.Matrix4(),viewProjection=new THREE.Matrix4();
 const eye=new THREE.Vector3(),direction=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3(),oldA=new THREE.Vector3(),oldB=new THREE.Vector3();
 let cursor=0,hover=false,time=0,settle=0,settleRevision=0,dirty=false;
 return {group,pointer(x:number,y:number){pointer.set(x,y);hover=true;},leave(){hover=false;},settle(){settle=1;settleRevision++;},
  register(index:number,buffer:ArrayBuffer,meshes:THREE.Mesh[]){contours[index]=decodeContours(buffer,meshes);},
  depth(texture:THREE.Texture|null,width:number,height:number){depthUniforms.uSceneDepth.value=texture;depthUniforms.uRearDepth.value=texture?1:0;depthUniforms.uViewport.value.set(width,height);},
  track(index:number,_model:THREE.Object3D,camera:THREE.Camera,dt:number,enabled:boolean,focus=1){
   const surfaces=contours[index];if(!surfaces)return;
   viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
   let candidateCount=0,totalLength=0,movement=0;
   const perspective=!!(camera as THREE.PerspectiveCamera).isPerspectiveCamera;
   for(const surface of surfaces){
    const {mesh,edges}=surface;inverse.copy(mesh.matrixWorld).invert();
    eye.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inverse);
    direction.set(0,0,1).transformDirection(camera.matrixWorld).transformDirection(inverse);
    mvp.multiplyMatrices(viewProjection,mesh.matrixWorld);
    if(enabled&&surface.initialized){
     for(let offset=0;offset<edges.length;offset+=12){
      const x=perspective?eye.x-(edges[offset]+edges[offset+3])*.5:direction.x;
      const y=perspective?eye.y-(edges[offset+1]+edges[offset+4])*.5:direction.y;
      const z=perspective?eye.z-(edges[offset+2]+edges[offset+5])*.5:direction.z;
      if(!isSilhouette(edges,offset,x,y,z))continue;
      a.fromArray(edges,offset).applyMatrix4(mvp);b.fromArray(edges,offset+3).applyMatrix4(mvp);
      if(Math.min(a.z,b.z)>1||Math.max(a.z,b.z)<-1||Math.min(a.x,b.x)>1.1||Math.max(a.x,b.x)<-1.1||Math.min(a.y,b.y)>1.1||Math.max(a.y,b.y)<-1.1)continue;
      const length=Math.min(.4,Math.hypot((a.x-b.x)*uniforms.uAspect.value,a.y-b.y));if(length<.00008)continue;
      oldA.fromArray(edges,offset).applyMatrix4(surface.previous);oldB.fromArray(edges,offset+3).applyMatrix4(surface.previous);
      const speed=Math.min(.2,Math.hypot((a.x+b.x-oldA.x-oldB.x)*.5*uniforms.uAspect.value,(a.y+b.y-oldA.y-oldB.y)*.5));
      const j=candidateCount*14;
      candidates[j]=a.x;candidates[j+1]=a.y;candidates[j+2]=b.x;candidates[j+3]=b.y;
      candidates[j+4]=oldA.x;candidates[j+5]=oldA.y;candidates[j+6]=oldB.x;candidates[j+7]=oldB.y;candidates[j+8]=speed;
      candidates[j+9]=a.z;candidates[j+10]=b.z;candidates[j+11]=oldA.z;candidates[j+12]=oldB.z;
      totalLength+=length;cumulative[candidateCount++]=totalLength;movement+=speed*length;
     }
    }
    surface.previous.copy(mvp);surface.initialized=true;
   }
   if(!enabled||!candidateCount){credits[index]=0;return;}
   const speed=movement/Math.max(.0001,totalLength)/Math.max(dt,.001);
   const intensity=THREE.MathUtils.smoothstep(speed,.008,.8);
   const rate=(mobile?1350:2550)*intensity*(.22+.78*focus);
   credits[index]=(credits[index]??0)+dt*rate;
   const burst=lastSettle[index]!==settleRevision?Math.round((mobile?120:240)*(.25+.75*focus)):0;
   lastSettle[index]=settleRevision;
   const amount=Math.min(mobile?210:380,Math.floor(credits[index])+burst);credits[index]%=1;
   for(let k=0;k<amount;k++){
    const value=random()*totalLength;let lo=0,hi=candidateCount-1;while(lo<hi){const mid=(lo+hi)>>1;if(cumulative[mid]<value)lo=mid+1;else hi=mid;}
    const j=lo*14,u=random(),t=k<burst?1:random();
    const oldX=THREE.MathUtils.lerp(candidates[j+4],candidates[j+6],u),oldY=THREE.MathUtils.lerp(candidates[j+5],candidates[j+7],u);
    const x=THREE.MathUtils.lerp(candidates[j],candidates[j+2],u),y=THREE.MathUtils.lerp(candidates[j+1],candidates[j+3],u);
    // Reject camera teleports instead of painting a line across the screen.
    const blend=candidates[j+8]<.18?t:1;
    trailPositions[cursor*3]=THREE.MathUtils.lerp(oldX,x,blend)+(random()-.5)*.0016/uniforms.uAspect.value;
    trailPositions[cursor*3+1]=THREE.MathUtils.lerp(oldY,y,blend)+(random()-.5)*.0016;
    trailPositions[cursor*3+2]=THREE.MathUtils.lerp(THREE.MathUtils.lerp(candidates[j+11],candidates[j+12],u),THREE.MathUtils.lerp(candidates[j+9],candidates[j+10],u),blend);
    births[cursor]=time;cursor=(cursor+1)%trailCount;
   }
   dirty ||= amount>0;
  },
  update(dt:number,accent:THREE.Color,ratio:number,aspect:number,reduced:boolean,suspended:boolean){
   if(!suspended&&!reduced)time+=dt;const damping=1-Math.exp(-dt*5);uniforms.uTime.value=time;uniforms.uPointer.value.lerp(pointer,damping);uniforms.uHover.value+=((hover&&!reduced?1:0)-uniforms.uHover.value)*damping;uniforms.uAccent.value.lerp(accent,damping*.35);uniforms.uRatio.value=ratio;uniforms.uAspect.value=aspect;uniforms.uSettle.value=reduced?0:settle;uniforms.uOpacity.value=reduced?.12:1;
   settle*=Math.exp(-dt*2.2);if(dirty){trailGeometry.attributes.position.needsUpdate=true;trailGeometry.attributes.birth.needsUpdate=true;dirty=false;}trail.visible=!reduced;
  },dispose(){geometry.dispose();material.dispose();trailGeometry.dispose();trailMaterial.dispose();}
 };
}
