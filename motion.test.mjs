import test from 'node:test';
import assert from 'node:assert/strict';
import {drawMotion} from './motion-player.js';

function frame(scene,phase,low=0,high=0){
  const cells=[];
  assert.equal(drawMotion(scene,phase,low,high,(x,y,char,tone)=>{
    assert.ok(Number.isInteger(x)&&x>=0&&x<64);
    assert.ok(Number.isInteger(y)&&y>=0&&y<32);
    assert.equal([...char].length,1);
    assert.ok([1,2,3].includes(tone));cells.push([x,y,char,tone]);
  }),true);
  return cells;
}
test('all animation poses and maximum music response stay within the common grid',()=>{
  for(const scene of ['memeBird','memeDance','rain'])for(let f=0;f<48;f++){
    assert.ok(frame(scene,f/12).length>50);frame(scene,f/12,1,1);
  }
});
test('four-beat loops return to the same pose and contain distinct motions',()=>{
  for(const scene of ['memeBird','memeDance','rain']){
    assert.deepEqual(frame(scene,0),frame(scene,4));
    assert.notDeepEqual(frame(scene,0),frame(scene,1));
  }
});
test('rain intensity responds to highs without changing the static architecture',()=>{
  const quiet=frame('rain',0),loud=frame('rain',0,0,1);
  assert.ok(loud.length>quiet.length);
  assert.deepEqual(quiet.filter(c=>c[0]===49&&c[1]===8),loud.filter(c=>c[0]===49&&c[1]===8));
});
