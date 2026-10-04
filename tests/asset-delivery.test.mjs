import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {test} from 'node:test';
import path from 'node:path';

const root=path.resolve('public/models');
for(const [name,budget] of [['folding/folding_knife',12000000],['pocket/pocket_knife',1700000],['gerber/gerber_pocket_knife',2100000]]){
 test(`${name}: delivery budget, original geometry and fold metadata`,()=>{
  const original=JSON.parse(readFileSync(path.join(root,`${name}.gltf`),'utf8'));
  const file=path.join(root,`${name}.optimized.gltf`),delivery=JSON.parse(readFileSync(file,'utf8'));
  for(const key of ['accessors','bufferViews','buffers','meshes','nodes','scenes','animations','skins','materials'])assert.deepEqual(delivery[key],original[key],`${key} must retain the original product`);
  assert.ok(delivery.extensionsRequired.includes('EXT_texture_webp'));
  for(const [index,texture] of delivery.textures.entries())assert.equal(texture.extensions.EXT_texture_webp.source,original.textures[index].source);
  const uris=new Set([...delivery.images,...delivery.buffers].map(item=>item.uri).filter(Boolean));
  let bytes=statSync(file).size;
  for(const uri of uris){assert.ok(!uri.startsWith('http'),'all resources are local');bytes+=statSync(path.join(path.dirname(file),uri)).size;}
  for(const image of delivery.images){
   const data=readFileSync(path.join(path.dirname(file),image.uri));
   assert.equal(image.mimeType,'image/webp');assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');
  }
  assert.ok(bytes<budget,`${bytes} bytes exceeds ${budget}`);
 });
}
