import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../audio.js';
import {makeProject} from '../model.js';
test('background stop cancels an in-flight audio start',async()=>{
 let resume;const pending=new Promise(resolve=>resume=resolve);
 const old=globalThis.AudioContext;
 globalThis.AudioContext=class{constructor(){this.state='suspended';}async resume(){await pending;this.state='running';}async close(){this.state='closed';}};
 try{
   const engine=new Engine(makeProject,()=>{}),start=engine.start();
   await engine.stop();resume();await assert.rejects(start,{name:'AbortError'});
   assert.equal(engine.playing,false);assert.equal(engine.ctx,null);assert.equal(engine.worker,undefined);
 }finally{globalThis.AudioContext=old;}
});
test('closing an old context cannot clear a new context',async()=>{
 let closed;const engine=new Engine(makeProject,()=>{});
 engine.ctx={close:()=>new Promise(resolve=>closed=resolve)};
 const stopping=engine.stop(),newContext={};engine.ctx=newContext;closed();await stopping;
 assert.equal(engine.ctx,newContext);
});
