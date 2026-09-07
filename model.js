import {defaultFx,validateFx} from './fx-model.js';
export const STEPS=32;
export const labels=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
export const noteName=n=>labels[n%12]+(Math.floor(n/12)-1);
export const stepDuration=(bpm,swing,index)=>60/bpm/4*(1+(index%2?-1:1)*swing/100);
export const clone=x=>JSON.parse(JSON.stringify(x));
export const scales={major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10],dorian:[0,2,3,5,7,9,10],pentatonic:[0,2,4,7,9],harmonic:[0,2,3,5,7,8,11]};
export function toggleSolo(tracks,index){tracks[index].solo=!tracks[index].solo;if(tracks.every(t=>t.solo))tracks.forEach(t=>t.solo=false);}
export function transformNotes(tracks,{octave=0,root=0,scale=null}){
  for(const t of tracks){if(['kick','snare','hat','noise'].includes(t.kind))continue;for(const s of t.steps){
    if(octave)s.note=Math.max(24,Math.min(96,s.note+octave*12));
    if(scale){let closest=24,distance=Infinity;for(let n=24;n<=96;n++)if(scales[scale].includes((n-root+120)%12)&&Math.abs(n-s.note)<distance){closest=n;distance=Math.abs(n-s.note);}s.note=closest;}
  }}
}
export function makeProject(){
  const kinds=['fm','triangle','sine','square','kick','snare','hat','noise'];
  const names=['GLASS','LOW TIDE','SOFT KEYS','PULSE','KICK','SNARE','HI-HAT','DUST'];
  const tracks=kinds.map((kind,i)=>({name:names[i],kind,volume:i<4?0.48:0.65,attack:0.006,decay:i===2?0.6:0.2,cutoff:i===1?850:6500,resonance:0.7,fm:i===0?1.4:0,ratio:2,pan:i===0?-0.2:i===2?0.25:0,mute:false,solo:false,
    steps:Array.from({length:STEPS},()=>({on:false,note:i===1?36:60,velocity:0.75,probability:1,ratchet:1}))}));
  const set=(t,entries)=>entries.forEach(([step,note])=>{tracks[t].steps[step]={on:true,note,velocity:0.6+(step%3)*0.1,probability:1,ratchet:1};});
  set(0,[[0,69],[3,76],[6,72],[10,67],[14,71],[16,69],[19,76],[22,79],[26,76],[30,71]]);
  set(1,[[0,33],[6,33],[10,40],[16,36],[22,36],[28,43]]);
  set(2,[[2,60],[8,64],[18,67],[24,64]]);
  set(3,[[12,81],[28,79]]);tracks[3].volume=0.15;
  set(4,[0,8,16,24,30].map(x=>[x,36]));
  set(5,[4,12,20,28].map(x=>[x,48]));
  set(6,Array.from({length:16},(_,i)=>[i*2,72]));tracks[6].volume=0.25;tracks[6].decay=0.055;
  set(7,[[15,65],[31,65]]);tracks[7].volume=0.09;tracks[7].decay=0.08;
  return {version:1,name:'Riverside sketch',bpm:96,swing:12,master:0.58,fx:defaultFx(),trackFx:Array.from({length:8},defaultFx),patterns:[tracks,clone(tracks),clone(tracks),clone(tracks)],pattern:0,playMode:'pattern',song:[{pattern:0,repeats:1}],songLoop:true};
}
export function validateProject(p){
  const num=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
  if(!p||p.version!==1||typeof p.name!=='string'||p.name.length>80||!num(p.bpm,40,220)||!num(p.swing,0,60)||!num(p.master,0,1)||!Number.isInteger(p.pattern)||!Array.isArray(p.patterns)||p.patterns.length<1||p.patterns.length>16||!num(p.pattern,0,p.patterns.length-1))throw Error('项目格式不正确');
  for(const tracks of p.patterns){
    if(!Array.isArray(tracks)||tracks.length!==8)throw Error('项目需要 8 条轨道');
    for(const t of tracks){
      if(!t||typeof t.name!=='string'||t.name.length>40||!['fm','sine','triangle','square','sawtooth','kick','snare','hat','noise'].includes(t.kind)||typeof t.mute!=='boolean'||typeof t.solo!=='boolean')throw Error('音轨格式不正确');
      for(const [k,a,b] of [['volume',0,1],['attack',0.002,1],['decay',0.03,2],['cutoff',80,18000],['resonance',0.1,12],['fm',0,8],['ratio',0.5,8],['pan',-1,1]])if(!num(t[k],a,b))throw Error('音色参数超出范围');
      if(!Array.isArray(t.steps)||t.steps.length!==STEPS||t.steps.some(s=>!s||typeof s.on!=='boolean'||!Number.isInteger(s.note)||!num(s.note,24,96)||!num(s.velocity,0.05,1)||!num(s.probability,0,1)))throw Error('音符格式不正确');
    }
  }
  if(p.fx===undefined)p.fx=defaultFx();
  validateFx(p.fx);
  if(p.trackFx===undefined)p.trackFx=Array.from({length:8},defaultFx);
  if(!Array.isArray(p.trackFx)||p.trackFx.length!==8)throw Error('分轨 FX 格式不正确');
  p.trackFx.forEach(validateFx);
  for(const tracks of p.patterns)for(const t of tracks)for(const s of t.steps){if(s.ratchet===undefined)s.ratchet=1;if(!Number.isInteger(s.ratchet)||s.ratchet<1||s.ratchet>8)throw Error('连击次数必须为 1–8');}
  if(p.playMode===undefined)p.playMode='pattern';
  if(p.song===undefined)p.song=[{pattern:p.pattern,repeats:1}];
  if(p.songLoop===undefined)p.songLoop=true;
  if(!['pattern','song'].includes(p.playMode)||typeof p.songLoop!=='boolean'||!Array.isArray(p.song)||p.song.length<1||p.song.length>32||p.song.some(row=>!row||!Number.isInteger(row.pattern)||!num(row.pattern,0,p.patterns.length-1)||!Number.isInteger(row.repeats)||!num(row.repeats,1,8)))throw Error('Song 编排格式不正确');
  return p;
}

export const ratchetOffsets=(duration,count)=>Array.from({length:count},(_,i)=>duration*i/count);

export const patternName=i=>String.fromCharCode(65+i);
export function songOrder(p){return p.song.flatMap((row,index)=>Array.from({length:row.repeats},(_,repeat)=>({pattern:row.pattern,row:index,repeat})));}
export function nextSongPosition(p,position){const order=songOrder(p);return position+1<order.length?position+1:p.songLoop?0:null;}
export function addPattern(p,copy=false){if(p.patterns.length>=16)return false;const tracks=clone(p.patterns[p.pattern]);if(!copy)for(const t of tracks)for(const s of t.steps)s.on=false;p.patterns.push(tracks);p.pattern=p.patterns.length-1;return true;}
