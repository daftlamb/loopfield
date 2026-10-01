import test from 'node:test';
import assert from 'node:assert/strict';
import {factoryProjects,makeFactoryProject} from './factory-projects.js';
import {makeProject,validateProject,clone} from '../model.js';
import {vowelFormants} from '../voice-shaping.js';
test('factory projects have distinct arrangements and independent editable copies',()=>{
 for(const info of factoryProjects){
  const a=makeFactoryProject(info.id),b=makeFactoryProject(info.id);
  assert.deepEqual(validateProject(clone(a)),a);
  assert.equal(a.song.length,4);assert.equal(a.playMode,'song');
  assert.notDeepEqual(a.patterns[0],a.patterns[1]);
  assert.ok(a.patterns.every(ts=>ts.some(t=>!t.mute&&t.steps.some(s=>s.on))));
  a.patterns[0][0].steps[0].note=96;assert.deepEqual(makeFactoryProject(info.id),b);
 }
 assert.throws(()=>makeFactoryProject('missing'));
});
test('legacy projects migrate new voice fields; invalid controls are rejected',()=>{
 const p=makeProject();for(const ts of p.patterns)for(const t of ts)for(const k of ['vowel','vaWave','vaDetune','vaEnvelope'])delete t[k];
 const restored=validateProject(p);assert.equal(restored.patterns[0][0].vowel,0);
 for(const [key,value] of [['vowel',NaN],['vaWave',.5],['vaDetune',31],['vaEnvelope',-1]]){
  const invalid=clone(restored);invalid.patterns[0][0][key]=value;assert.throws(()=>validateProject(invalid));
 }
});
test('vowel morph remains finite, positive and continuous between positions',()=>{
 for(let i=0;i<=400;i++){
  const f=vowelFormants(i/100);assert.ok(f.every(v=>Number.isFinite(v)&&v>=300&&v<=3000));
  if(i>0){const prev=vowelFormants((i-1)/100);assert.ok(f.every((v,k)=>Math.abs(v-prev[k])<20));}
 }
 assert.notDeepEqual(vowelFormants(0),vowelFormants(4));
});
