import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProject} from '../model.js';
import {parseProject,restoreLatest,readLibrary,createWriter,exportBudget,safeFilename} from './storage.js';
test('recovery prefers latest valid local edit over old native write',()=>{
 const older=makeProject(),newer=makeProject();newer.name='latest';
 const result=restoreLatest([JSON.stringify({savedAt:1,project:older}),JSON.stringify({savedAt:2,project:newer}),'{broken']);
 assert.equal(result.project.name,'latest');
 const invalid=makeProject();invalid.bpm=999;
 assert.equal(restoreLatest([JSON.stringify({savedAt:9,project:invalid}),JSON.stringify(older)]).savedAt,0);
});
test('native writes stay ordered and recover after failure',async()=>{
 const values=[];let release;const first=new Promise(resolve=>release=resolve);let errors=0;
 const write=createWriter(async({value})=>{if(value==='first')await first;if(value==='bad')throw Error('disk');values.push(value);},()=>errors++);
 const a=write('p','first'),b=write('p','second');release();await Promise.all([a,b]);
 await assert.rejects(write('p','bad'));await write('p','third');
 assert.deepEqual(values,['first','second','third']);assert.equal(errors,1);
});
test('imports and saved copies reject corrupt data without accepting partial projects',()=>{
 assert.throws(()=>parseProject('x'.repeat(2_000_001)));assert.throws(()=>parseProject('{"version":1}'));
 const p=makeProject();assert.equal(parseProject(JSON.stringify(p)).patterns.length,4);
 assert.throws(()=>readLibrary(JSON.stringify([{id:'x',name:'copy',savedAt:1,project:{}}])));
 assert.equal(readLibrary(JSON.stringify([{id:'x',name:'copy',savedAt:1,project:p}]))[0].project.name,p.name);
});
test('long song render is refused before allocating OfflineAudioContext',()=>{
 const p=makeProject();assert.equal(exportBudget(p,'pattern').allowed,true);
 p.bpm=40;p.song=Array.from({length:32},()=>({pattern:0,repeats:8}));
 assert.equal(exportBudget(p,'song').allowed,false);
 assert.equal(exportBudget(p,'pattern').allowed,true);
 assert.equal(safeFilename('../节奏/one','wav'),'节奏one.wav');
});
