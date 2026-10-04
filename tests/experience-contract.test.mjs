import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const temporary=mkdtempSync(new URL('../.experience-test-',import.meta.url));
try{
 for(const name of ['KnifeExperience','KnifeStage','Configurator','Checkout','Icon','MementoWordmark','LaserControls','MaterialSwatches','RequestDialog','material-preview','particles','catalog','configuration','navigation','model','motion','lighting','laser','collection-loading','session']){
  const jsx=['KnifeExperience','KnifeStage','Configurator','Checkout','Icon','MementoWordmark','LaserControls','MaterialSwatches','RequestDialog'].includes(name);
  const source=readFileSync(new URL('../app/'+name+(jsx?'.tsx':'.ts'),import.meta.url),'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText.replace(/from ['"](\.\/[^'"]+)['"]/g,(_,p)=>"from '"+p+".mjs'");
  writeFileSync(temporary+'/'+name+'.mjs',output);
 }
 const module=async name=>import(pathToFileURL(temporary+'/'+name+'.mjs'));
 const {default:Experience}=await module('KnifeExperience');
 const {default:Configurator}=await module('Configurator');
 const {default:Checkout}=await module('Checkout');
 const {default:LaserControls}=await module('LaserControls');
 const {KNIVES,CHAPTERS}=await module('catalog');
 const {originalConfiguration,applyPreset}=await module('configuration');
 const noop=()=>{};

 test('minimal collection navigation and the integrated four-part journey remain available',()=>{
  const html=renderToStaticMarkup(React.createElement(Experience));
  for(const label of ['M9 Sentinel','Explore the knife','Pause carousel','Previous knife','Next knife','Preparing M9 Sentinel'])assert.ok(html.includes(label),label);
  assert.doesNotMatch(html,/collection-tabs/);
  assert.deepEqual(CHAPTERS.map(x=>x.label),['Blade','Handle','Configure','Collection']);
  assert.doesNotMatch(html,/<video[^>]+src=|posters\//);
 });

 test('all configuration categories are directly visible without a horizontal carousel',()=>{
  KNIVES.forEach((knife,index)=>{
   const config=applyPreset(index,1,originalConfiguration(index));
   const html=renderToStaticMarkup(React.createElement(Configurator,{knife,knifeIndex:index,config,onChange:noop,activeId:null,onActive:noop,placing:false,onPlace:noop,defaultAnchor:()=>null,preview:()=>null,laser:{axis:'z',direction:1,progress:0,disabled:false,onAxis:noop,onDirection:noop,onProgress:noop,onReset:noop},onSection:noop,disabled:false}));
   for(const label of ['Finishes','Symbols','Blade','Handle','Text','Section'])assert.ok(html.includes(label),knife.name+': '+label);
   assert.doesNotMatch(html,/<details/,'existing controls are not collapsed into optional details');
   assert.notDeepEqual(config.blade,originalConfiguration(index).blade);
  });
 });

 test('the bag retains shipping, payment and review with explicit demo-only checkout',()=>{
  const item={id:'test-item',knifeId:'folding',quantity:2,configuration:applyPreset(1,2,originalConfiguration(1)),thumbnail:''};
  const html=renderToStaticMarkup(React.createElement(Checkout,{items:[item],onItems:noop,onClose:noop}));
  for(const label of ['Folding Knife','Shipping','Payment','Review','type="email"','Standard delivery','Express delivery','Demo checkout. No charge, payment or shipment is created.'])assert.ok(html.includes(label),label);
 });

 test('Memento typefaces are self-hosted and available',()=>{
  for(const family of ['syne','manrope'])for(const weight of [400,500,600])assert.equal(readFileSync(new URL('../public/fonts/'+family+'-'+weight+'.woff2',import.meta.url)).toString('ascii',0,4),'wOF2');
 });

 test('laser UI exposes every axis, direction, percentage and reset',()=>{
  for(const axis of ['x','y','z']){
   const html=renderToStaticMarkup(React.createElement(LaserControls,{axis,direction:1,progress:.375,disabled:false,onAxis:noop,onDirection:noop,onProgress:noop,onReset:noop}));
   for(const label of ['Scan X · Length','Scan Y · Height','Scan Z · Depth','Reverse scan direction','38%','Reset'])assert.ok(html.includes(label),label);
   assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);
  }
 });
}finally{rmSync(temporary,{recursive:true,force:true});}
