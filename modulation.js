export const targets={
  vowel:['元音 / A–U',0,4,.01],
  pitch:['音高 / 半音',-24,24,.1],volume:['音量',0,1,.01],pan:['声像',-1,1,.01],cutoff:['滤波 / Hz',80,18000,10],resonance:['共振',.1,12,.1],fm:['FM 深度',0,8,.1],ratio:['FM 比率',.5,8,.1],attack:['起音 / 秒',.002,1,.002],decay:['衰减 / 秒',.03,2,.01],gate:['Gate / %',5,400,5],
  'delay.mix':['延迟 MIX',0,1,.01],'delay.time':['延迟时间 / 秒',.05,.8,.01],'delay.feedback':['延迟反馈',0,.7,.01],
  'reverb.mix':['混响 MIX',0,1,.01],'chorus.mix':['合唱 MIX',0,1,.01],'chorus.rate':['合唱速度 / Hz',.1,5,.1],'chorus.depth':['合唱深度 / ms',0,8,.1],
  'compressor.threshold':['压缩阈值 / dB',-60,0,1],'compressor.ratio':['压缩比率',1,20,.1],'compressor.makeup':['压缩增益 / dB',0,18,.1],
  'crusher.mix':['降比特 MIX',0,1,.01],'crusher.drive':['降比特 DRIVE',1,12,.1]
};
export const chords={major:[0,4,7],minor:[0,3,7],seventh:[0,4,7,10],minor7:[0,3,7,10],octave:[0,12],fifth:[0,7,12]};
export const shapes=['sine','triangle','square','up','down','random','custom'];
export function presetPoints(shape){return Array.from({length:16},(_,i)=>{const p=i/16;return shape==='sine'?.5-.5*Math.cos(p*Math.PI*2):shape==='triangle'?1-Math.abs(p*2-1):shape==='square'?(p<.5?0:1):shape==='up'?p:shape==='down'?1-p:Math.random();});}
export function defaultMod(){return {lfos:Array.from({length:2},()=>({enabled:false,shape:'sine',points:presetPoints('sine'),smooth:true,sync:true,rate:4,hz:1,retrigger:false,routes:[]})),arp:{enabled:false,chord:'major',custom:[0,4,7],order:'up',rate:32,triplet:false,octaves:1,style:'normal'}};}
export function validateMod(m){
  const n=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
  if(!m||!Array.isArray(m.lfos)||m.lfos.length!==2)throw Error('LFO 格式不正确');
  for(const l of m.lfos){
    if(!l||!shapes.includes(l.shape)||!['enabled','smooth','sync','retrigger'].every(k=>typeof l[k]==='boolean')||!n(l.rate,.25,16)||!n(l.hz,.05,20)||!Array.isArray(l.points)||l.points.length!==16||l.points.some(v=>!n(v,0,1))||!Array.isArray(l.routes)||l.routes.length>6)throw Error('LFO 参数不正确');
    for(const r of l.routes){const spec=targets[r?.target];if(!spec||!n(r.from,spec[1],spec[2])||!n(r.to,spec[1],spec[2]))throw Error('LFO 映射超出范围');}
  }
  const a=m.arp;if(!a||typeof a.enabled!=='boolean'||typeof a.triplet!=='boolean'||!['normal','chip'].includes(a.style)||!['up','down','bounce','random'].includes(a.order)||!Object.hasOwn(chords,a.chord)&&a.chord!=='custom'||![8,16,32,64].includes(a.rate)||![1,2,3].includes(a.octaves)||!Array.isArray(a.custom)||a.custom.length<1||a.custom.length>16||a.custom.some(v=>!Number.isInteger(v)||!n(v,-24,36)))throw Error('琶音参数不正确');
}
export function lfoValue(l,time,start,bpm){
  const cycles=(l.retrigger?Math.max(0,time-start):time)*(l.sync?bpm/60/l.rate:l.hz),x=((cycles%1)+1)%1*16,index=Math.floor(x),a=l.points[index],b=l.points[(index+1)%16];return l.smooth?a+(b-a)*(x-index):a;
}
export function routeFor(mod,target){let found;for(const l of mod?.lfos??[])if(l.enabled)for(const r of l.routes)if(r.target===target)found={l,r};return found;}
export function modValue(mod,target,base,time,start,bpm){const route=routeFor(mod,target);if(!route)return base;const {l,r}=route;return r.from+(r.to-r.from)*lfoValue(l,time,start,bpm);}
export function automate(param,mod,target,base,from,to,start,bpm,convert=x=>x,origin=0){
  const route=routeFor(mod,target);if(!route){param.setValueAtTime(convert(base),from);return;}
  const count=Math.max(1,Math.ceil((to-from)*120));
  for(let i=0;i<=count;i++){const time=from+(to-from)*i/count,value=convert(modValue(mod,target,base,time-origin,start-origin,bpm));if(i===0||!route.l.smooth)param.setValueAtTime(value,time);else param.linearRampToValueAtTime(value,time);}
}
export function arpOffsets(arp){const base=arp.chord==='custom'?arp.custom:chords[arp.chord],notes=Array.from({length:arp.octaves},(_,oct)=>base.map(v=>v+oct*12)).flat();if(arp.order==='down')notes.reverse();if(arp.order==='bounce'&&notes.length>2)notes.push(...notes.slice(1,-1).reverse());return notes;}
export function arpEvents(arp,length,bpm,seed=0){
  const interval=60/bpm*4/arp.rate*(arp.triplet?2/3:1),notes=arpOffsets(arp),events=[];
  for(let i=0;i*interval<length-.00001;i++){const index=arp.order==='random'?Math.floor((Math.sin((i+seed+1)*127.1)*43758.5453%1+1)%1*notes.length):i%notes.length;events.push({offset:i*interval,note:notes[index],duration:Math.min(interval,length-i*interval)});}return events;
}
