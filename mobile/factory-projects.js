import {makeEmptyProject,selectVoice,clone,validateProject} from '../model.js';
export const factoryProjects=[
 {id:'afterglow',name:'Afterglow',bpm:82,summary:'Warm keys · soft drums · A minor',zh:'温暖琴键 · 轻鼓点 · A 小调'},
 {id:'glass-orbit',name:'Glass Orbit',bpm:108,summary:'Bell + Pluck · syncopated groove · D minor',zh:'钟声与拨弦 · 切分节奏 · D 小调'},
 {id:'vowel-tide',name:'Vowel Tide',bpm:68,summary:'Vowel + Pad · spacious ambient · C minor',zh:'元音与铺底 · 氛围长音 · C 小调'}
];
export function makeFactoryProject(id){
 const info=factoryProjects.find(p=>p.id===id);if(!info)throw Error('Unknown factory project');
 const p=makeEmptyProject();p.name=info.name;p.bpm=info.bpm;p.swing=id==='afterglow'?18:6;p.master=.52;
 const roots=id==='afterglow'?[45,41,48,43]:id==='glass-orbit'?[50,46,53,48]:[48,44,51,46];
 p.patterns=roots.map((root,section)=>{
  const ts=clone(p.patterns[0]);
  const voices=[id==='afterglow'?'va':id==='glass-orbit'?'bell':'vowel','bass','pad',id==='glass-orbit'?'pluck':'pad','kick','snare','hat','pad'];
  ts.forEach((t,i)=>{selectVoice(t,voices[i]);t.name=['LEAD','SUB','ROOT','THIRD','KICK','SNARE','HAT','FIFTH'][i];t.volume=[.32,.42,.15,.13,.48,.24,.12,.10][i];t.pan=[-.12,0,-.35,.30,0,.08,.20,.12][i];});
  const put=(i,entries)=>entries.forEach(([step,note,velocity=.65,gate=0,ratchet=1])=>Object.assign(ts[i].steps[step],{on:true,note,velocity,gate,ratchet,probability:1}));
  const third=section===0?3:4;
  for(const [i,interval] of [[2,12],[3,12+third],[7,19]])put(i,[[0,root+interval,.55],[16,root+interval,.48]]);
  put(1,[[0,root-12,.78],[10,root-12,.55],[16,root-12,.72],[26,root-5,.53]]);
  put(4,[0,8,16,24].map(s=>[s,36,.8]));ts[4].decay=.22;ts[4].cutoff=1700;
  put(5,[4,12,20,28].map(s=>[s,48,.5]));ts[5].decay=.12;
  put(6,Array.from({length:16},(_,i)=>[i*2,72,i%2?.42:.6]));ts[6].decay=.04;
  if(id==='afterglow'){
   Object.assign(ts[0],{vaWave:2,vaDetune:5,vaEnvelope:1.3,cutoff:2200,decay:1.1,volume:.40});
   put(0,[[2,root+12],[6,root+12+third,.5],[11,root+19,.7],[18,root+22,.55],[23,root+19,.6],[30,root+12+third,.45]]);
  }else if(id==='glass-orbit'){
   put(0,[[0,root+24,.6],[7,root+19,.58],[14,root+12+third,.48],[19,root+24,.65],[27,root+19,.5,0,2]]);
   ts[3].steps.forEach(s=>s.on=false);ts[3].volume=.25;
   put(3,[[3,root+12+third,.55],[10,root+19,.6],[18,root+12+third,.55],[25,root+22,.45]]);
   ts[2].volume=.10;
  }else{
   Object.assign(ts[0],{vowel:section%4,attack:.45,decay:1.8,volume:.52,cutoff:6500});
   ts[0].mod.lfos[0]={...ts[0].mod.lfos[0],enabled:true,rate:.5,routes:[{target:'vowel',from:0,to:4}]};
   put(0,[[0,root+12,.7],[12,root+19,.55],[24,root+12+third,.6]]);
   ts[4].mute=true;ts[5].mute=true;ts[6].volume=.05;ts[1].volume=.22;
  }
  return ts;
 });
 p.trackFx[0].delay={enabled:true,mix:.18,time:60/p.bpm*.75,feedback:.26};
 p.trackFx[0].reverb={enabled:true,mix:id==='vowel-tide'?.34:.23,decay:id==='vowel-tide'?3:1.8};
 for(const i of [2,3,7])p.trackFx[i].reverb={enabled:true,mix:.24,decay:2.2};
 p.song=roots.map((_,pattern)=>({pattern,repeats:2}));p.playMode='song';
 return validateProject(p);
}
