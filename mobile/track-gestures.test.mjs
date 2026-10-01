import test from 'node:test';
import assert from 'node:assert/strict';
import {installTrackGestures} from '../track-gestures.js';
function fixture(){
 let time=0,ctx={},tasks=new Map(),id=0;const calls=[];
 const buttons=[0,1].map(()=>({handlers:{},addEventListener(k,fn){this.handlers[k]=fn;}}));
 installTrackGestures(buttons,{select:i=>calls.push(['select',i]),toggle:(i,k)=>calls.push([k,i]),context:()=>ctx,now:()=>time,schedule:(fn,ms)=>{tasks.set(++id,{fn,at:time+ms});return id;},cancel:id=>tasks.delete(id)});
 const send=(i,type,extra={})=>buttons[i].handlers[type]?.({button:0,isPrimary:true,pointerId:1,clientX:0,clientY:0,preventDefault(){},...extra});
 const advance=ms=>{time+=ms;for(const [key,t] of tasks)if(t.at<=time){tasks.delete(key);t.fn();}};
 const tap=i=>{send(i,'pointerdown');send(i,'pointerup');send(i,'lostpointercapture');send(i,'click');};
 return {calls,send,tap,advance,replace:()=>ctx={}};
}
test('single taps select immediately; double taps toggle mute once',()=>{const f=fixture();f.tap(0);assert.deepEqual(f.calls,[['select',0]]);f.advance(100);f.tap(0);assert.equal(f.calls.filter(x=>x[0]==='mute').length,1);f.advance(400);f.tap(0);assert.equal(f.calls.filter(x=>x[0]==='mute').length,1);});
test('holding toggles solo once and suppresses trailing click and double tap',()=>{const f=fixture();f.send(0,'pointerdown');f.advance(450);f.advance(1000);f.send(0,'pointerup');f.send(0,'lostpointercapture');f.send(0,'click');assert.deepEqual(f.calls,[['solo',0]]);f.tap(0);assert.deepEqual(f.calls,[['solo',0],['select',0]]);});
test('dragging, cancellation, and project changes never toggle a track',()=>{for(const kind of ['move','cancel','context']){const f=fixture();f.send(0,'pointerdown');if(kind==='move')f.send(0,'pointermove',{clientY:15});if(kind==='cancel')f.send(0,'pointercancel');if(kind==='context')f.replace();f.advance(500);f.send(0,'pointerup');assert.deepEqual(f.calls,[]);}});
test('another track breaks double tap; keyboard clicks only select',()=>{const f=fixture();f.tap(0);f.tap(1);f.tap(0);f.send(0,'click');assert.ok(f.calls.every(c=>c[0]==='select'));});
