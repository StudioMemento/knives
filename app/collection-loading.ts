/** The active product gets the first frame; two independent lanes fill the collection.
 * Each load callback reports its own errors. A failed asset cannot stop the queue.
 */
export async function loadCollection(
 order:number[],load:(index:number)=>Promise<void>,stopped:()=>boolean,afterFirst:()=>void,
){
 if(!order.length||stopped())return;
 try{await load(order[0]);}catch{/* Keep the other products available. */}
 if(stopped())return;
 afterFirst();
 let cursor=1;
 async function lane(){
  while(!stopped()&&cursor<order.length){
   const index=order[cursor++];
   try{await load(index);}catch{/* The callback reports the individual failure. */}
  }
 }
 await Promise.all([lane(),lane()]);
}

/** Arrow navigation can use available products without stopping at an empty slot. */
export function nextReadyKnife(selected:number,direction:number,ready:number[],count:number){
 for(let step=1;step<count;step++){
  const index=((selected+Math.sign(direction)*step)%count+count)%count;
  if(ready.includes(index))return index;
 }
 return selected;
}
