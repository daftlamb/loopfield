import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProject,selectVoice,validateProject,clone,transformNotes} from '../model.js';
import {midiNotes} from '../midi.js';
test('Pitched voices retain notes and routing through selection and project roundtrip',()=>{
  for(const kind of ['bell','pluck','pad','bass','vowel','va']){
    const p=makeProject(),t=p.patterns[0][0],before=clone(t);
    selectVoice(t,kind);
    assert.equal(t.kind,kind);assert.deepEqual(t.steps,before.steps);
    for(const key of ['volume','pan','mute','solo','mod','name'])assert.deepEqual(t[key],before[key]);
    const restored=validateProject(clone(p));assert.deepEqual(restored,p);
    assert.equal(restored.patterns[1][0].kind,'fm');
    assert.ok(t.attack>0);assert.ok(t.decay>0);
  }
});
test('new pitched voices transpose and produce MIDI arpeggios',()=>{
  for(const kind of ['bell','pluck','pad','bass','vowel','va']){
    const t=makeProject().patterns[0][0];selectVoice(t,kind);const note=t.steps[0].note;
    transformNotes([t],{octave:1});assert.equal(t.steps[0].note,note+12);
    t.mod.arp.enabled=true;t.steps[0].gate=400;
    const events=midiNotes(t,t.steps[0],0,.25,120);
    assert.ok(events.length>1);assert.ok(events.every(e=>Number.isFinite(e.note)));
  }
});
