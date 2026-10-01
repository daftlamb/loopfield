import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProject,validateProject} from '../model.js';
import {hasInstruments,nativeNoteEvents} from '../auv3-model.js';
import {createAUHost} from './auv3.js';
import {renderWav} from '../audio.js';
const project=()=>{const p=makeProject();p.instruments=Array(8).fill(null);p.instruments[0]={id:'1635085685:1234:5678',name:'Test synth',state:'YWJj'};return p;};
test('old projects work and AUv3 state survives validation, clone and JSON restore',()=>{
 assert.equal(hasInstruments(validateProject(makeProject())),false);
 const p=project();assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))).instruments,p.instruments);
 for(const change of [p=>p.instruments.pop(),p=>p.instruments[0].id='bad',p=>p.instruments[0].state={x:1},p=>p.instruments[0].state='a'.repeat(2_000_001)]){const p=project();change(p);assert.throws(()=>validateProject(p));}
});
test('MIDI timestamps follow Web Audio output clock, with a fallback before first render',()=>{
 const notes=[{time:10.2,duration:.1,note:60,velocity:90}];
 assert.equal(nativeNoteEvents(notes,{currentTime:10,getOutputTimestamp:()=>({performanceTime:4900,contextTime:9.9})},100000,5000)[0].at,100200);
 assert.equal(nativeNoteEvents(notes,{currentTime:10},100000,5000)[0].at,100200);
});
test('missing plugin retries on playback; it never becomes a silently ready slot',async()=>{
 const calls=[],host=createAUHost({bridge:{postMessage:async msg=>{calls.push(msg.action);return {errors:['Plugin missing']};}}});
 await assert.rejects(host.start(project()),/Plugin missing/);await assert.rejects(host.start(project()),/Plugin missing/);
 assert.deepEqual(calls,['configure','configure']);
});
test('stop cancels an in-flight plugin load before audio can start',async()=>{
 let finish;const calls=[];const host=createAUHost({bridge:{postMessage:msg=>{calls.push(msg.action);return msg.action==='configure'?new Promise(r=>finish=r):Promise.resolve({});}}});
 const starting=host.start(project());await new Promise(r=>setImmediate(r));await host.stop();finish({errors:[]});await assert.rejects(starting,{name:'AbortError'});assert.ok(!calls.includes('start'));
});
test('plugin state capture does not reinstantiate unchanged tracks and mix follows mute/solo',async()=>{
 const calls=[],host=createAUHost({bridge:{postMessage:async msg=>{calls.push(msg);return {errors:[],slots:project().instruments};}}});
 const p=project();await host.start(p);await host.start(p);assert.equal(calls.filter(c=>c.action==='configure').length,1);
 p.patterns[0][1].solo=true;host.mix(p,p.patterns[0]);assert.equal(calls.at(-1).tracks[0].mute,true);
 assert.deepEqual(await host.states(p),p.instruments);p.instruments[0].state='YWJjZA==';host.accept(p);await host.prepare(p);assert.equal(calls.filter(c=>c.action==='configure').length,1);
});
test('browser playback cannot quietly use built-in sound; AUv3 WAV export is explicitly rejected',async()=>{
 const host=createAUHost({bridge:null});await assert.rejects(host.start(project()),/iOS/);await assert.rejects(renderWav(project()),/AUv3/);
});
