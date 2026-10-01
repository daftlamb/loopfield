import test from 'node:test';
import assert from 'node:assert/strict';
import {createPitchContinuation,dragDistance} from '../step-editing.js';
const track=()=>({steps:[{on:true,note:60},{on:false,note:48},{on:false,note:72}]});
test('new note steps continue an edited pitch, without touching existing notes or other tracks',()=>{
 const cursor=createPitchContinuation(),a=track(),b=track();
 cursor.remember(a,65);cursor.toggle(a,1,'note');assert.deepEqual(a.steps[1],{on:true,note:65});
 cursor.toggle(a,0,'note');assert.deepEqual(a.steps[0],{on:false,note:60});
 cursor.toggle(b,1,'note');assert.equal(b.steps[1].note,48);
 cursor.toggle(a,2,'velocity');assert.equal(a.steps[2].note,72);
 assert.equal(cursor.next(a,48),65);
 const restored=structuredClone(a);assert.equal(cursor.next(restored,60),60);
});
test('pitch drag uses a smaller interval while other parameter drags stay unchanged',()=>{
 assert.equal(dragDistance('note'),11);
 for(const mode of ['velocity','probability','ratchet','gate'])assert.equal(dragDistance(mode),14);
});
