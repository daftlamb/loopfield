import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProject} from './model.js';
import {MidiOut,midiNotes} from './midi.js';

function rig(){
  const sent=[],port={send:(data,time)=>sent.push({data,time}),clear:()=>sent.push({clear:true}),open:async()=>{},close:async()=>{}};
  const midi=new MidiOut(()=>{},()=>1000),ctx={currentTime:0};midi.port=port;
  return {midi,ctx,sent};
}
test('MIDI ratchets, Gate and velocity preserve step timing',()=>{
  const t=makeProject().patterns[0][0],s={...t.steps[0],ratchet:4,gate:200,velocity:.5};
  const notes=midiNotes(t,s,1,.5,120);
  assert.deepEqual(notes.map(n=>n.time),[1,1.125,1.25,1.375]);
  assert.ok(notes.every(n=>n.duration===.25&&n.velocity===64&&n.note===s.note));
});
test('normal and CHIP arpeggios produce pitched MIDI notes at the selected rhythm',()=>{
  const t=makeProject().patterns[0][0],s={...t.steps[0],gate:100,ratchet:1};
  Object.assign(t.mod.arp,{enabled:true,rate:32,style:'chip'});
  const chip=midiNotes(t,s,0,.5,120);assert.equal(chip.length,8);
  assert.deepEqual(chip.slice(0,3).map(n=>n.note),[s.note,s.note+4,s.note+7]);
  assert.equal(chip[0].duration,.0625);
  t.mod.arp.style='normal';assert.equal(midiNotes(t,s,0,.5,120)[0].duration,.05);
});
test('MIDI channel messages and note-off timestamps are correct',()=>{
  const {midi,ctx,sent}=rig();midi.channels[0]=16;
  midi.schedule(0,[{time:.01,note:60,velocity:100,duration:.1,arp:false}],.01);midi.flush(ctx);
  assert.deepEqual(sent[0],{data:[0x9f,60,100],time:1010});
  ctx.currentTime=.1;midi.flush(ctx);assert.deepEqual(sent.at(-1).data,[0x8f,60,0]);
  assert.equal(midi.active.size,0);
});
test('retriggered same-pitch notes are not cut by an older gate ending',()=>{
  const {midi,ctx,sent}=rig();
  midi.schedule(0,[{time:0,note:60,velocity:100,duration:.2,arp:false}],0);midi.flush(ctx);
  midi.schedule(0,[{time:.1,note:60,velocity:100,duration:.3,arp:false}],.1);ctx.currentTime=.1;midi.flush(ctx);
  const count=sent.length;ctx.currentTime=.2;midi.flush(ctx);assert.equal(sent.length,count);
  ctx.currentTime=.4;midi.flush(ctx);assert.equal(midi.active.size,0);assert.deepEqual(sent.at(-1).data,[0x80,60,0]);
});
test('a new root cancels the previous MIDI arpeggio beyond the root boundary',()=>{
  const {midi,ctx,sent}=rig();
  midi.schedule(0,[{time:0,note:60,velocity:100,duration:.5,arp:true},{time:.2,note:64,velocity:100,duration:.1,arp:true}],0);midi.flush(ctx);
  midi.schedule(0,[{time:.1,note:67,velocity:100,duration:.1,arp:true}],.1);ctx.currentTime=.1;midi.flush(ctx);
  ctx.currentTime=.25;midi.flush(ctx);
  assert.ok(!sent.some(e=>e.data?.[0]===0x90&&e.data[1]===64));assert.equal(midi.active.size,0);
});
test('panic clears pending messages and releases only channels used by this app',()=>{
  const {midi,ctx,sent}=rig();midi.channels[0]=3;
  midi.schedule(0,[{time:0,note:60,velocity:100,duration:4,arp:false}],0);midi.flush(ctx);midi.panic();
  assert.ok(sent.some(e=>e.clear));assert.ok(sent.some(e=>e.data?.[0]===0xb2&&e.data[1]===123));
  assert.ok(!sent.some(e=>e.data?.[0]===0xb0));assert.equal(midi.queue.length,0);assert.equal(midi.active.size,0);
});
test('OFF routing emits nothing and device changes close the old port',async()=>{
  const {midi,ctx,sent}=rig();midi.channels[0]=0;
  midi.schedule(0,[{time:0,note:60,velocity:100,duration:1}],0);midi.flush(ctx);assert.equal(sent.length,0);
  let closed=false;midi.port.close=async()=>{closed=true;};await midi.connect(null);assert.equal(closed,true);assert.equal(midi.port,null);
});


test('pressure LFO reaches Tabla between notes and releases on mute and panic',async()=>{
  const {dispatchMidi}=await import('../tabla-study/midi.js');
  const {midi,ctx,sent}=rig(),tracks=makeProject().patterns[0],origins=tracks.map(()=>0);
  Object.assign(tracks[0].mod.lfos[0],{enabled:true,points:Array(16).fill(1),routes:[{target:'midi.pressureLeft',from:0,to:100}]});
  Object.assign(tracks[2].mod.lfos[0],{enabled:true,points:Array(16).fill(.5),routes:[{target:'midi.pressureRight',from:0,to:100}]});
  midi.schedulePressure(tracks,0,.1,120,origins);ctx.currentTime=.08;midi.flush(ctx);
  const pressures=[];
  for(const e of sent)dispatchMidi(e.data,{hit:()=>assert.fail('CC must not hit'),stop:()=>{},pressure:(...v)=>pressures.push(v)});
  assert.ok(pressures.some(([c,v])=>c===0&&v===1));assert.ok(pressures.some(([c,v])=>c===1&&v===64/127));
  assert.ok(sent.filter(e=>e.data[0]===0xb0).length>=9);
  tracks[0].mute=true;midi.schedulePressure(tracks,.1,.1,120,origins);ctx.currentTime=.1;midi.flush(ctx);
  assert.ok(sent.some(e=>e.data[0]===0xb0&&e.data[2]===0));
  midi.panic();assert.ok(sent.some(e=>e.data?.[0]===0xb2&&e.data[1]===1&&e.data[2]===0));assert.equal(midi.queue.length,0);
});

test('pressure retrigger phase, range and duplicate owner are deterministic',()=>{
  const {midi,ctx,sent}=rig(),tracks=makeProject().patterns[0],origins=tracks.map(()=>0);
  Object.assign(tracks[0].mod.lfos[0],{enabled:true,routes:[{target:'midi.pressureLeft',from:0,to:100}]});
  Object.assign(tracks[1].mod.lfos[0],{enabled:true,retrigger:true,routes:[{target:'midi.pressureLeft',from:25,to:75}]});
  midi.lastTriggers.set(1,1);midi.schedulePressure(tracks,1,.1,120,origins);ctx.currentTime=1;midi.flush(ctx);
  assert.deepEqual(sent[0].data,[0xb0,1,32]);
});
