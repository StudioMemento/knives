import {Vector3,PropertyBinding,Object3D,type AnimationClip} from 'three';

export type ExplodedPart={node:Object3D;assembled:Vector3;exploded:Vector3};
/** The delivered EXPLODE timeline is staggered. Retain its authored endpoints,
 * but give every part the same normalized clock. Never mix a second position
 * action or accumulate additive offsets: reversing must return exactly home. */
export function createExplosion(root:Object3D,clip:AnimationClip,peak:number):ExplodedPart[]{
 return clip.tracks.filter(track=>track.name.endsWith('.position')).map(track=>{
  const binding=PropertyBinding.parseTrackName(track.name);
  const node=PropertyBinding.findNode(root,binding.nodeName);
  if(!(node instanceof Object3D))throw Error('Missing explosion node: '+binding.nodeName);
  const interpolant=track.InterpolantFactoryMethodLinear();
  const assembled=new Vector3().fromArray(interpolant.evaluate(0));
  const exploded=new Vector3().fromArray(interpolant.evaluate(peak));
  return {node,assembled,exploded};
 });
}
export function sampleExplosion(parts:ExplodedPart[],amount:number){
 const progress=Math.max(0,Math.min(1,amount));
 for(const part of parts)part.node.position.lerpVectors(part.assembled,part.exploded,progress);
}
