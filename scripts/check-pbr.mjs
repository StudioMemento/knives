import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Texture} from 'three';
import {CATALOGUE,SURFACES} from '../app/lib/catalogue.ts';
import {MaterialBinding,materialPaths} from '../app/lib/materials.ts';
import {parseGlb} from '../tools/assets/v48/glb.mjs';

const manifest=JSON.parse(fs.readFileSync('public/models/v72/manifest.json'));
const images=new Set();
let combinations=0;
for(const meta of manifest.models){
 const mesh=fs.readFileSync('public'+meta.url);assert.equal(mesh.length,meta.outputBytes);
 const gltf=parseGlb(mesh).json;
 assert.ok(gltf.meshes.every(m=>m.primitives.every(p=>['POSITION','NORMAL','TEXCOORD_0','TEXCOORD_1','TANGENT'].every(a=>a in p.attributes))));
 for(const role of SURFACES){
  const g=CATALOGUE[meta.id][role];
  for(let color=0;color<g.colors.length;color++)for(let style=0;style<g.styles.length;style++){
   combinations++;
   for(const level of ['lo','web']){
    const m=materialPaths(meta.id,role,{color,style},level);
    for(const f of [m.base,m.normal,m.orm,m.optics,m.direction,m.curvature,m.timber]){
     if(!f||images.has(f))continue;
     const bytes=fs.readFileSync('public'+f);assert.equal(bytes.toString('ascii',8,12),'WEBP');images.add(f);
    }
   }
  }
  for(const item of [...g.colors,...g.styles])if(item.sample)assert.ok(fs.statSync('public'+item.sample).size>0);
 }
}
assert.equal(combinations,540);
console.log('PASS — '+combinations+' colour/finish pairs, '+images.size+' web maps and five animated UV0/UV1 meshes');

// Force the previous selection to finish last. The final material has to keep the new set intact.
const unblock=[];const counts=new Map();
const bank={acquire(url){
 let resolve;const texture=new Promise(done=>{resolve=done;});
 unblock.push(()=>{const t=new Texture();t.name=url;resolve(t);});
 counts.set(url,(counts.get(url)||0)+1);
 return {texture,release(){counts.set(url,counts.get(url)-1);}};
}};
const binding=new MaterialBinding('HYPER','blade',bank);
const first=binding.select({color:0,style:1},'web'),previous=unblock.splice(0);
const second=binding.select({color:1,style:5},'web');unblock.splice(0).forEach(f=>f());await second;
previous.forEach(f=>f());await first;
assert.ok(binding.material.map.name.endsWith('C02_BaseColor.webp')&&binding.material.normalMap.name.endsWith('S06_NormalGL.webp'));
assert.ok(binding.material.metalnessMap===binding.material.roughnessMap&&binding.material.aoMap===null);
assert.equal(binding.material.anisotropy,.27);
binding.dispose();assert.ok([...counts.values()].every(n=>n===0));
console.log('PASS — out-of-order texture requests and GPU lease cleanup');
