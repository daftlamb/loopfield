import test from 'node:test';
import assert from 'node:assert/strict';
import {installShakePalette,SHAKE_PALETTE_KEY} from './shake-palette.js';

test('shake changes palette once, honors disabled / typing / background, and persists the toggle',()=>{
 const previous=new Map(['window','document','localStorage','performance'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 let now=0,changes=0;const store=new Map();const select=new EventTarget();
 select.options=['paper','gameboy','amber','midnight','ink'].map(value=>({value}));select.value='ink';
 select.addEventListener('change',()=>changes++);
 const window=new EventTarget(),document={hidden:false,activeElement:null,querySelector:()=>select};
 Object.defineProperties(globalThis,{window:{value:window,configurable:true},document:{value:document,configurable:true},localStorage:{value:{getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)},configurable:true},performance:{value:{now:()=>now},configurable:true}});
 try{
  const settings=installShakePalette();const shake=()=>window.dispatchEvent(new Event('loopfield-shake'));
  shake();assert.equal(select.value,'paper');shake();assert.equal(changes,1);
  now=1200;shake();assert.equal(select.value,'gameboy');
  settings.setEnabled(false);now=2400;shake();assert.equal(changes,2);assert.equal(store.get(SHAKE_PALETTE_KEY),'off');
  settings.setEnabled(true);document.hidden=true;shake();assert.equal(changes,2);
  document.hidden=false;document.activeElement={matches:()=>true};shake();assert.equal(changes,2);
  document.activeElement=null;shake();assert.equal(select.value,'amber');assert.equal(store.get(SHAKE_PALETTE_KEY),'on');
 }finally{for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
