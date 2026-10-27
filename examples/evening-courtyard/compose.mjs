import {writeFileSync} from 'node:fs';
import {makeEmptyProject,clone,validateProject} from '../../model.js';
const p=makeEmptyProject();p.name='Evening Courtyard - Sitar + Tabla';p.bpm=84;p.swing=0;p.master=0;p.patterns=p.patterns.slice(0,3);p.pattern=0;p.playMode='song';p.song=[0,1,2].map(pattern=>({pattern,repeats:1}));p.songLoop=true;
const names=['GE - CH1','KE - CH2','TUN - CH3','TIN - CH4','NA - CH5','TA - CH6','SITAR - CH7','REST - CH8'];
for(const tracks of p.patterns)for(const [i,t] of tracks.entries()){t.name=names[i];t.kind=i===6?'triangle':i===0?'kick':i===1?'noise':i===5?'hat':'sine';t.volume=.5;t.attack=.004;t.decay=i===6?.8:.12;t.mute=false;t.solo=false;for(const s of t.steps)Object.assign(s,{on:false,note:i===6?60:60,velocity:.65,probability:1,ratchet:1,gate:i===6?200:25});}
function put(pattern,track,step,velocity,note=60,gate=25,ratchet=1){Object.assign(p.patterns[pattern][track].steps[step],{on:true,note,velocity,probability:1,ratchet,gate});}
for(let a=0;a<3;a++){
 for(const [track,step,v] of [[0,0,.94],[4,0,.84],[0,4,.66],[4,8,.76],[5,12,.56],[4,16,.69],[1,20,.6],[0,24,.82],[3,24,.76],[4,28,.7]])put(a,track,step,v);
 const l=p.patterns[a][0].mod.lfos[0];Object.assign(l,{enabled:true,shape:'custom',points:[0,.04,.1,.2,.35,.6,.85,1,.8,.5,.25,.1,0,0,0,0],smooth:true,sync:true,rate:2,retrigger:true,routes:[{target:'midi.pressureLeft',from:0,to:a===1?32:24}]});
}
for(const [a,events] of [[0,[[5,6,.27],[3,10,.38],[5,14,.31],[4,22,.4],[5,30,.35]]],[1,[[5,2,.3],[0,6,.43],[3,10,.48],[5,15,.27],[4,18,.43],[5,22,.32],[3,26,.44],[5,30,.36],[4,31,.28]]],[2,[[5,6,.38],[3,7,.35],[0,10,.48],[5,14,.4],[3,15,.37],[5,22,.39],[2,26,.52],[5,29,.38],[4,30,.54],[5,31,.26]]]])for(const [t,s,v] of events)put(a,t,s,v);
const melodies=[
 [[0,59,.64,180],[2,62,.72,180],[4,64,.81,350],[8,66,.69,350],[12,64,.67,180],[14,62,.58,180],[16,67,.86,350],[20,66,.7,180],[22,64,.72,300],[26,62,.63,180],[28,59,.57,350]],
 [[0,67,.85,300],[3,69,.71,250],[6,71,.78,180],[8,72,.91,400],[14,71,.65,180],[16,69,.76,300],[20,67,.7,180],[22,66,.64,180],[24,64,.76,350],[28,62,.59,300]],
 [[0,62,.73,180],[2,64,.67,180],[4,66,.81,350],[10,62,.69,180],[12,64,.64,180],[14,66,.77,350],[20,62,.76,180],[22,64,.69,180],[24,66,.84,180],[26,62,.58,170],[28,60,.89,350]]
];
melodies.forEach((events,a)=>events.forEach(([s,n,v,g])=>put(a,6,s,v,n,g)));
validateProject(p);writeFileSync(new URL('./Evening-Courtyard.loopfield.json',import.meta.url),JSON.stringify(p,null,2)+'\n');
console.log(JSON.stringify({patterns:p.patterns.length,bpm:p.bpm,seconds:3*32*60/p.bpm/4,events:p.patterns.map(ts=>ts.map(t=>t.steps.filter(s=>s.on).length))}));
