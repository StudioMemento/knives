// Independent closest-point distance against a median-split triangle BVH.
// Not a simplifier error readback. All vertices, edge midpoints and face centres
// are sampled in both directions; reported maxima are sampled surface errors.
function pointTriangleDistanceSq(px,py,pz,t,o){
 const ax=t[o],ay=t[o+1],az=t[o+2],abx=t[o+3]-ax,aby=t[o+4]-ay,abz=t[o+5]-az,acx=t[o+6]-ax,acy=t[o+7]-ay,acz=t[o+8]-az;
 const apx=px-ax,apy=py-ay,apz=pz-az,d1=abx*apx+aby*apy+abz*apz,d2=acx*apx+acy*apy+acz*apz;
 if(d1<=0&&d2<=0)return apx*apx+apy*apy+apz*apz;
 const bpx=apx-abx,bpy=apy-aby,bpz=apz-abz,d3=abx*bpx+aby*bpy+abz*bpz,d4=acx*bpx+acy*bpy+acz*bpz;
 if(d3>=0&&d4<=d3)return bpx*bpx+bpy*bpy+bpz*bpz;
 const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3),x=apx-v*abx,y=apy-v*aby,z=apz-v*abz;return x*x+y*y+z*z;}
 const cpx=apx-acx,cpy=apy-acy,cpz=apz-acz,d5=abx*cpx+aby*cpy+abz*cpz,d6=acx*cpx+acy*cpy+acz*cpz;
 if(d6>=0&&d5<=d6)return cpx*cpx+cpy*cpy+cpz*cpz;
 const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6),x=apx-w*acx,y=apy-w*acy,z=apz-w*acz;return x*x+y*y+z*z;}
 const va=d3*d6-d5*d4;if(va<=0&&d4-d3>=0&&d5-d6>=0){const w=(d4-d3)/((d4-d3)+(d5-d6)),x=bpx-w*(acx-abx),y=bpy-w*(acy-aby),z=bpz-w*(acz-abz);return x*x+y*y+z*z;}
 const denominator=va+vb+vc;if(Math.abs(denominator)<1e-35)return Math.min(apx*apx+apy*apy+apz*apz,bpx*bpx+bpy*bpy+bpz*bpz,cpx*cpx+cpy*cpy+cpz*cpz);
 const v=vb/denominator,w=vc/denominator,x=apx-abx*v-acx*w,y=apy-aby*v-acy*w,z=apz-abz*v-acz*w;return x*x+y*y+z*z;
}
export function makeBvh(position,index){
 const tri=new Float64Array(index.length*3),count=index.length/3,centres=Array(count),bounds=Array(count);
 for(let i=0;i<count;i++){const o=i*9;for(let k=0;k<3;k++)for(let a=0;a<3;a++)tri[o+k*3+a]=position[index[i*3+k]*3+a];centres[i]=[0,1,2].map(a=>(tri[o+a]+tri[o+3+a]+tri[o+6+a])/3);bounds[i]=[0,1,2].map(a=>Math.min(tri[o+a],tri[o+3+a],tri[o+6+a])).concat([0,1,2].map(a=>Math.max(tri[o+a],tri[o+3+a],tri[o+6+a])));}
 function split(ids){const b=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];for(const id of ids)for(let a=0;a<3;a++){b[a]=Math.min(b[a],bounds[id][a]);b[a+3]=Math.max(b[a+3],bounds[id][a+3]);}if(ids.length<=12)return {b,ids};let axis=0;for(let a=1;a<3;a++)if(b[a+3]-b[a]>b[axis+3]-b[axis])axis=a;ids.sort((a,c)=>centres[a][axis]-centres[c][axis]);const mid=ids.length>>1;return {b,left:split(ids.slice(0,mid)),right:split(ids.slice(mid))};}
 const root=split(Array.from({length:count},(_,i)=>i));
 const bound=(x,y,z,b)=>Math.max(b[0]-x,0,x-b[3])**2+Math.max(b[1]-y,0,y-b[4])**2+Math.max(b[2]-z,0,z-b[5])**2;
 return {distanceSq(x,y,z){let best=Infinity;const stack=[root];while(stack.length){const node=stack.pop();if(bound(x,y,z,node.b)>best)continue;if(node.ids){for(const id of node.ids)best=Math.min(best,pointTriangleDistanceSq(x,y,z,tri,id*9));}else{const l=bound(x,y,z,node.left.b),r=bound(x,y,z,node.right.b);if(l<r){if(r<best)stack.push(node.right);if(l<best)stack.push(node.left);}else{if(l<best)stack.push(node.left);if(r<best)stack.push(node.right);}}}return best;}};
}
export function sampleSurface(position,index,bvh){
 let max=0,sum=0,samples=0;const check=(x,y,z)=>{const d=bvh.distanceSq(x,y,z);max=Math.max(max,d);sum+=d;samples++;};
 for(let i=0;i<position.length;i+=3)check(position[i],position[i+1],position[i+2]);
 for(let i=0;i<index.length;i+=3){const a=index[i]*3,b=index[i+1]*3,c=index[i+2]*3;check((position[a]+position[b]+position[c])/3,(position[a+1]+position[b+1]+position[c+1])/3,(position[a+2]+position[b+2]+position[c+2])/3);for(const [u,v] of [[a,b],[b,c],[c,a]])check((position[u]+position[v])/2,(position[u+1]+position[v+1])/2,(position[u+2]+position[v+2])/2);}
 return {maxM:Math.sqrt(max),rmsM:Math.sqrt(sum/samples),samples};
}
