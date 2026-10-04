import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source=readFileSync(new URL('../app/collection-loading.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {loadCollection,nextReadyKnife}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function pending(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}

test('first visible frame unlocks two lanes; a slow Folding knife cannot delay Pocket and Gerber',async()=>{
 const started=[],jobs=Array.from({length:4},pending);let firstFrame=false;
 const run=loadCollection([0,1,2,3],index=>{started.push(index);return jobs[index].promise;},()=>false,()=>{firstFrame=true;});
 assert.deepEqual(started,[0]);assert.equal(firstFrame,false);
 jobs[0].resolve();await flush();assert.equal(firstFrame,true);assert.deepEqual(started,[0,1,2]);
 jobs[2].resolve();await flush();assert.deepEqual(started,[0,1,2,3]);
 jobs[3].resolve();jobs[1].resolve();await run;
});

test('an individual load failure does not leave the remaining collection blocked',async()=>{
 const started=[];
 await loadCollection([0,1,2,3],async index=>{started.push(index);if(index===0||index===1)throw new Error('offline asset');},()=>false,()=>{});
 assert.deepEqual(started,[0,1,2,3]);
});

test('unmount during the first frame prevents all subsequent requests',async()=>{
 const started=[],first=pending();let stopped=false,decorativeRequests=0;
 const run=loadCollection([2,0,1,3],index=>{started.push(index);return first.promise;},()=>stopped,()=>{decorativeRequests++;});
 stopped=true;first.resolve();await run;
 assert.deepEqual(started,[2]);assert.equal(decorativeRequests,0);
});

test('navigation skips unloaded slots in either direction and wraps correctly',()=>{
 assert.equal(nextReadyKnife(0,1,[0,2],4),2);
 assert.equal(nextReadyKnife(2,1,[0,2],4),0);
 assert.equal(nextReadyKnife(0,-1,[0,2,3],4),3);
 assert.equal(nextReadyKnife(0,1,[0],4),0);
 assert.equal(nextReadyKnife(2,-1,[0,1,2,3],4),1);
});
