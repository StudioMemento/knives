import {Matrix4,Vector2,Vector3,type Mesh,type PerspectiveCamera} from 'three';
import catalogue from './framing-proxies.json' with {type:'json'};

type Subject='product'|'blade'|'handle';
const proxies:Record<string,Record<string,number[][]>>=catalogue;
const SCANLINES=64;

// Each line stores the union of its occupied intervals. A hole contributes no
// weight, and a blade behind a handle contributes only once.
function cover(line:number[],left:number,right:number){
 let first=0;
 while(first<line.length&&line[first+1]<left)first+=2;
 if(first===line.length){line.push(left,right);return;}
 let end=first;
 while(end<line.length&&line[end]<=right){
  left=Math.min(left,line[end]);right=Math.max(right,line[end+1]);end+=2;
 }
 if(end===first+2){line[first]=left;line[first+1]=right;}
 else line.splice(first,end-first,left,right);
}

export function createSilhouetteMeter(id:string,meshes:Mesh[]){
 const parts=meshes.flatMap(mesh=>{
  const data=proxies[id]?.[mesh.name];
  if(!data)return [];
  const [packed,triangles]=data;
  mesh.geometry.computeBoundingBox();
  const box=mesh.geometry.boundingBox!,step=box.getSize(new Vector3()).divideScalar(4095);
  const positions=Float32Array.from(packed,(v,i)=>box.min.getComponent(i%3)+v*step.getComponent(i%3));
  return [{mesh,positions,triangles,xy:new Float64Array(positions.length/3*2),
   matrix:new Matrix4().makeScale(0,0,0),low:Infinity,high:-Infinity}];
 });
 const groups={product:parts,blade:parts.filter(p=>p.mesh.userData.surface==='blade'),
  handle:parts.filter(p=>p.mesh.userData.surface==='handle')};
 const view=new Matrix4(),matrix=new Matrix4(),p=new Vector3(),last=new Vector2();
 const lines=Array.from({length:SCANLINES},()=>[] as number[]);
 let previous:Subject|undefined;
 return function measure(camera:PerspectiveCamera,subject:Subject,out:Vector2){
  view.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  let low=Infinity,high=-Infinity,changed=subject!==previous;
  for(const part of groups[subject]){
   matrix.multiplyMatrices(view,part.mesh.matrixWorld);
   if(!matrix.equals(part.matrix)){
    changed=true;part.matrix.copy(matrix);part.low=Infinity;part.high=-Infinity;
    for(let i=0,j=0;i<part.positions.length;i+=3,j+=2){
     p.fromArray(part.positions,i).applyMatrix4(matrix);
     part.xy[j]=p.x;part.xy[j+1]=p.y;
     part.low=Math.min(part.low,p.y);part.high=Math.max(part.high,p.y);
    }
   }
   low=Math.min(low,part.low);high=Math.max(high,part.high);
  }
  if(!changed)return out.copy(last);
  previous=subject;
  const step=(high-low)/SCANLINES;
  if(!(step>0&&Number.isFinite(step)))return out.copy(last.set(0,0));
  for(const line of lines)line.length=0;
  for(const {triangles,xy} of groups[subject]){
   for(let i=0;i<triangles.length;i+=3){
    let a=triangles[i]*2,b=triangles[i+1]*2,c=triangles[i+2]*2;
    if(xy[a+1]>xy[b+1])[a,b]=[b,a];
    if(xy[b+1]>xy[c+1])[b,c]=[c,b];
    if(xy[a+1]>xy[b+1])[a,b]=[b,a];
    const ax=xy[a],ay=xy[a+1],bx=xy[b],by=xy[b+1],cx=xy[c],cy=xy[c+1];
    const start=Math.max(0,Math.ceil((ay-low)/step-.5)),end=Math.min(SCANLINES,Math.ceil((cy-low)/step-.5));
    if(start>=end)continue;
    const ac=(cx-ax)/(cy-ay),ab=by>ay?(bx-ax)/(by-ay):0,bc=cy>by?(cx-bx)/(cy-by):0;
    for(let row=start;row<end;row++){
     const y=low+(row+.5)*step,x1=ax+(y-ay)*ac,x2=y<by?ax+(y-ay)*ab:bx+(y-by)*bc;
     cover(lines[row],Math.min(x1,x2),Math.max(x1,x2));
    }
   }
  }
  let area=0,momentX=0,momentY=0;
  for(let row=0;row<SCANLINES;row++){
   const line=lines[row],y=low+(row+.5)*step;
   for(let i=0;i<line.length;i+=2){
    const width=line[i+1]-line[i];
    area+=width;momentX+=width*(line[i]+line[i+1])/2;momentY+=width*y;
   }
  }
  return out.copy(area>0?last.set(momentX/area,momentY/area):last.set(0,0));
 };
}
