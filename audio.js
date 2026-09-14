import {midiNotes} from './midi.js';
import {automate,modValue,routeFor,arpEvents} from './modulation.js';
import {STEPS,stepDuration,ratchetOffsets,songOrder,nextSongPosition,gateDuration} from './model.js';
import {createFx} from './fx.js';
import {defaultFx,fxTail} from './fx-model.js';
const noiseBuffers=new WeakMap();
export function createBus(ctx,master=0.58,settings=defaultFx(),trackSettings=[]){
  const input=ctx.createGain(),gain=ctx.createGain(),limiter=ctx.createDynamicsCompressor(),analyser=ctx.createAnalyser();
  gain.gain.value=master*0.65;limiter.threshold.value=-8;limiter.knee.value=6;limiter.ratio.value=12;limiter.attack.value=0.003;limiter.release.value=0.15;
  analyser.fftSize=1024;analyser.smoothingTimeConstant=0.72;
  const fx=createFx(ctx,settings);
  input.connect(fx.input);fx.output.connect(gain);gain.connect(limiter);limiter.connect(analyser);analyser.connect(ctx.destination);
  const tracks=trackSettings.map(settings=>{const chain=createFx(ctx,settings);chain.output.connect(input);return {input:chain.input,fx:chain};});
  return {input,gain,analyser,fx,tracks};
}
export function playNote(ctx,bus,t,s,time,gate=null,{bpm=96,origin=0,chip=null,trigger=time}={}){
  t={...t,attack:modValue(t.mod,'attack',t.attack,time-origin,trigger-origin,bpm),decay:modValue(t.mod,'decay',t.decay,time-origin,trigger-origin,bpm)};
  const f=440*2**((s.note-69)/12),env=ctx.createGain(),filter=ctx.createBiquadFilter(),pan=ctx.createStereoPanner(),volume=ctx.createGain();
  const drum=['kick','snare','hat','noise'].includes(t.kind),attack=gate===null?(drum?0.002:t.attack):Math.min(drum?0.002:t.attack,gate*.25),end=time+(gate===null?attack+t.decay:gate+Math.min(t.decay,.08));
  env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(Math.max(0.0001,s.velocity*0.32),time+attack);if(gate!==null)env.gain.setValueAtTime(Math.max(0.0001,s.velocity*0.32),time+gate);env.gain.exponentialRampToValueAtTime(0.0001,end);env.gain.linearRampToValueAtTime(0,end+0.01);
  filter.type=t.kind==='hat'?'highpass':t.kind==='snare'?'bandpass':'lowpass';filter.frequency.value=t.kind==='hat'?6500:t.kind==='snare'?2200:t.cutoff;filter.Q.value=t.resonance;pan.pan.value=t.pan;
  env.connect(volume);volume.connect(filter);filter.connect(pan);pan.connect(bus.input);
  const motion=(param,target,base,convert)=>automate(param,t.mod,target,base,time,end,trigger,bpm,convert,origin);
  motion(volume.gain,'volume',t.volume);motion(pan.pan,'pan',t.pan);motion(filter.Q,'resonance',t.resonance);
  if(!['hat','snare'].includes(t.kind))motion(filter.frequency,'cutoff',t.cutoff);
  const pitch=param=>{
    if(chip){for(let i=0;i<chip.length;i++){const event=chip[i],from=time+event.offset,to=i+1<chip.length?time+chip[i+1].offset:end;automate(param,t.mod,'pitch',0,from,to,trigger,bpm,v=>(event.note+v)*100,origin);}}
    else motion(param,'pitch',0,v=>v*100);
  };
  const sources=[],nodes=[env,volume,filter,pan];
  const osc=(type,freq)=>{const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(freq,time);o.connect(env);sources.push(o);pitch(o.detune);return o;};
  if(t.kind==='kick'){const o=osc('sine',f*3);o.frequency.exponentialRampToValueAtTime(f*0.65,time+0.09);}
  else if(['snare','hat','noise'].includes(t.kind)){
    if(!noiseBuffers.has(ctx)){const b=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),d=b.getChannelData(0);let seed=42;for(let i=0;i<d.length;i++){seed=(1664525*seed+1013904223)>>>0;d[i]=seed/2147483648-1;}noiseBuffers.set(ctx,b);}
    const src=ctx.createBufferSource();src.buffer=noiseBuffers.get(ctx);src.loop=true;src.playbackRate.value=2**((s.note-60)/12);src.connect(env);sources.push(src);pitch(src.detune);
    if(t.kind==='snare')osc('triangle',180);
  }else{
    const carrier=osc(t.kind==='fm'?'sine':t.kind,f);
    if(t.fm>0||routeFor(t.mod,'fm')){const mod=ctx.createOscillator(),depth=ctx.createGain();mod.frequency.value=f*t.ratio;if(!routeFor(t.mod,'fm')){depth.gain.setValueAtTime(f*t.fm,time);depth.gain.exponentialRampToValueAtTime(Math.max(0.01,f*t.fm*0.12),end);}mod.connect(depth);depth.connect(carrier.frequency);if(routeFor(t.mod,'fm'))motion(depth.gain,'fm',t.fm,v=>f*v);motion(mod.frequency,'ratio',t.ratio,v=>f*v);pitch(mod.detune);sources.push(mod);nodes.push(depth);}
  }
  let ended=0;
  sources.forEach(src=>{src.onended=()=>{src.disconnect();if(++ended===sources.length)nodes.forEach(n=>n.disconnect());};src.start(time);src.stop(end+0.02);});
  return {end,stop(at){if(at>=end+.02)return;if(volume.gain.cancelAndHoldAtTime)volume.gain.cancelAndHoldAtTime(at);else{volume.gain.cancelScheduledValues(at);volume.gain.setValueAtTime(modValue(t.mod,'volume',t.volume,at-origin,trigger-origin,bpm),at);}volume.gain.linearRampToValueAtTime(0,at+.003);sources.forEach(src=>src.stop(at+.004));}};
}
export function playStep(ctx,bus,t,s,time,duration,bpm=96){
  bus.arpVoices?.forEach(voice=>voice.stop(time));bus.arpVoices=[];bus.noteStart=time;
  const count=s.ratchet??1,spacing=duration/count,origin=bus.origin??0,arp=t.mod?.arp,enabled=arp?.enabled&&!['kick','snare','hat','noise'].includes(t.kind);
  bus.triggers=ratchetOffsets(duration,count).map(offset=>time+offset);
  const voice=count===1?t:{...t,attack:Math.min(t.attack,spacing*.15),decay:Math.min(t.decay,spacing*.65)};
  for(const [index,offset] of ratchetOffsets(duration,count).entries()){
    const start=time+offset,gate=gateDuration({...s,gate:modValue(t.mod,'gate',s.gate??0,start-origin,start-origin,bpm)},spacing);
    if(!enabled){playNote(ctx,bus,voice,s,start,gate,{bpm,origin});continue;}
    const length=Math.max(.005,Math.min(gate??voice.attack+voice.decay,index<count-1?spacing:Infinity)),events=arpEvents(arp,length,bpm,s.note);
    if(arp.style==='chip')bus.arpVoices.push(playNote(ctx,bus,voice,s,start,length,{bpm,origin,chip:events,trigger:start}));
    else for(const event of events)bus.arpVoices.push(playNote(ctx,bus,voice,{...s,note:Math.max(0,Math.min(127,s.note+event.note))},start+event.offset,event.duration*.8,{bpm,origin,trigger:start}));
  }
}
export function modulateStep(bus,t,fx,time,duration,bpm){
  const end=time+duration,times=[time,...(bus.triggers??[]).filter(v=>v>time&&v<end)];
  times.forEach((from,i)=>{if(bus.triggers?.includes(from))bus.noteStart=from;bus.fx.modulate(t.mod,fx,from,times[i+1]??end,bus.noteStart??bus.origin,bpm,bus.origin??0);});
}
export function projectTail(p){
  const trackTails=(p.trackFx??[]).map((fx,i)=>{const peak=structuredClone(fx);for(const tracks of p.patterns)for(const l of tracks[i].mod?.lfos??[])if(l.enabled)for(const r of l.routes){const [id,key]=r.target.split('.');if(peak[id]&&['mix','time','feedback'].includes(key))peak[id][key]=Math.max(peak[id][key],r.from,r.to);}return fxTail(peak)-3;});
  return fxTail(p.fx??defaultFx())+Math.max(0,...trackTails);
}
export function audible(tracks,t){return !t.mute&&(!tracks.some(x=>x.solo)||t.solo);}
export class Engine{
  constructor(getProject,onStep){this.getProject=getProject;this.onStep=onStep;this.playing=false;this.queue=[];this.nextStep=0;}
  async init(){
    if(navigator.audioSession)navigator.audioSession.type='playback';
    if(!this.ctx)this.ctx=new AudioContext({latencyHint:'interactive'});
    // Resume in the tap handler before constructing the effects graph on iPhone.
    const context=this.ctx;await context.resume();
    if(this.ctx!==context)throw new DOMException('Audio start cancelled','AbortError');
    if(this.ctx.state!=='running')throw new Error('Audio context is not running');
    if(!this.bus)this.bus=createBus(this.ctx,this.getProject().master,this.getProject().fx,this.getProject().trackFx);
  }
  async start(){const generation=this.generation??0;await this.init();if(generation!==(this.generation??0))throw new DOMException('Audio start cancelled','AbortError');if(this.playing)return;this.playing=true;this.nextTime=this.ctx.currentTime+0.015;this.nextStep=0;this.queue=[];this.songPosition=0;this.bus.tracks.forEach(bus=>bus.origin=this.nextTime);this.activePattern=this.getProject().pattern;this.pendingPattern=null;this.ended=false;
    this.worker=new Worker(new URL('./clock.js',import.meta.url));this.worker.onmessage=()=>this.schedule();this.schedule();}
  schedule(){if(this.ctx)this.midi?.flush(this.ctx);if(!this.playing||this.ended)return;const p=this.getProject();if(this.nextTime<this.ctx.currentTime-0.1)this.nextTime=this.ctx.currentTime+0.03;
    while(this.nextTime<this.ctx.currentTime+0.12){
      if(this.nextStep===0&&this.pendingPattern!==null){this.activePattern=this.pendingPattern;this.pendingPattern=null;}
      const song=p.playMode==='song'?songOrder(p)[this.songPosition]:null,pattern=song?song.pattern:this.activePattern,tracks=p.patterns[pattern],step=this.nextStep;let hits=[];
      tracks.forEach((t,i)=>{const s=t.steps[step];if(audible(tracks,t)&&s.on&&Math.random()<s.probability){playStep(this.ctx,this.bus.tracks[i]??this.bus,t,s,this.nextTime,stepDuration(p.bpm,p.swing,step),p.bpm);this.midi?.schedule(i,midiNotes(t,s,this.nextTime,stepDuration(p.bpm,p.swing,step),p.bpm,this.bus.tracks[i].origin),this.nextTime);hits.push(i);}const bus=this.bus?.tracks[i];if(bus)modulateStep(bus,t,p.trackFx[i],this.nextTime,stepDuration(p.bpm,p.swing,step),p.bpm);});
      this.queue.push({time:this.nextTime,step,hits,pattern,song});this.nextTime+=stepDuration(p.bpm,p.swing,step);this.nextStep=(step+1)%STEPS;
      if(this.nextStep===0&&p.playMode==='song'){const next=nextSongPosition(p,this.songPosition);if(next===null){this.ended=true;this.queue.push({time:this.nextTime+projectTail(p),ended:true});break;}this.songPosition=next;}
    }
    this.midi?.flush(this.ctx);
  }
  syncProject(){
    const p=this.getProject();
    this.activePattern=Math.min(this.activePattern??p.pattern,p.patterns.length-1);
    if(this.pendingPattern!==null&&this.pendingPattern>=p.patterns.length)this.pendingPattern=null;
    this.songPosition=Math.min(this.songPosition??0,songOrder(p).length-1);
    this.queue=this.queue.filter(event=>event.ended||(event.pattern<p.patterns.length&&(!event.song||event.song.row<p.song.length)));
  }
  queuePattern(index){this.pendingPattern=index;}
  tick(){if(!this.ctx)return;this.midi?.flush(this.ctx);let last;while(this.queue.length&&this.queue[0].time<=this.ctx.currentTime)last=this.queue.shift();if(last)this.onStep(last);}
  async stop(){this.generation=(this.generation??0)+1;this.previewToken=(this.previewToken??0)+1;this.midi?.panic();this.previewVoice=null;this.playing=false;this.worker?.terminate();this.queue=[];if(this.ctx){const closing=this.ctx;this.ctx=null;this.bus=null;await closing.close();}}
  async preview(t,s){await this.init();const p=this.getProject(),i=p.patterns[p.pattern].indexOf(t),bus=this.bus.tracks[i]??this.bus,start=this.ctx.currentTime+.01,duration=60/p.bpm/4;playStep(this.ctx,bus,t,s,start,duration,p.bpm);modulateStep(bus,t,p.trackFx[i],start,Math.max(duration*4,t.attack+t.decay),p.bpm);}
  async previewNote(track,step){
    const token=this.previewToken=(this.previewToken??0)+1,p=this.getProject(),i=p.patterns[p.pattern].indexOf(track);
    const t=structuredClone(track),s={...step};await this.init();if(token!==this.previewToken)return;
    const start=this.ctx.currentTime+.01,bus=this.bus.tracks[i],length=Math.min(.45,Math.max(.08,t.attack+t.decay));
    this.previewVoice?.stop(start);
    this.previewVoice=playNote(this.ctx,bus,t,s,start,length,{bpm:p.bpm,origin:bus.origin??start});
    this.midi?.schedule(i,[{time:start,note:s.note,velocity:Math.max(1,Math.round(s.velocity*127)),duration:length,arp:false}],start);
  }
  setMaster(v){if(this.ctx)this.bus.gain.gain.setTargetAtTime(v*0.65,this.ctx.currentTime,0.02);}
  setFx(fx){this.bus?.fx.update(fx);this.bus?.tracks.forEach((bus,i)=>bus.fx.update(this.getProject().trackFx[i]));}
}
export async function renderWav(p,mode='pattern'){
  const order=mode==='song'?songOrder(p):[{pattern:p.pattern}];
  const settings=p.fx??defaultFx(),trackSettings=p.trackFx??[],tail=projectTail(p),duration=order.length*STEPS*60/p.bpm/4,ctx=new OfflineAudioContext(2,Math.ceil((duration+tail)*44100),44100),bus=createBus(ctx,p.master,settings,trackSettings);let time=0.02;bus.tracks.forEach(track=>track.origin=time);
  for(const {pattern} of order)for(let i=0;i<STEPS;i++){const tracks=p.patterns[pattern];tracks.forEach((t,index)=>{const s=t.steps[i];if(audible(tracks,t)&&s.on&&Math.random()<s.probability)playStep(ctx,bus.tracks[index]??bus,t,s,time,stepDuration(p.bpm,p.swing,i),p.bpm);const track=bus.tracks[index];if(track)modulateStep(track,t,p.trackFx[index],time,stepDuration(p.bpm,p.swing,i),p.bpm);});time+=stepDuration(p.bpm,p.swing,i);}
  const buffer=await ctx.startRendering(),bytes=new ArrayBuffer(44+buffer.length*4),view=new DataView(bytes),str=(o,s)=>[...s].forEach((c,i)=>view.setUint8(o+i,c.charCodeAt(0)));
  str(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,44100,true);view.setUint32(28,176400,true);view.setUint16(32,4,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,buffer.length*4,true);
  const channels=[buffer.getChannelData(0),buffer.getChannelData(1)];for(let i=0;i<buffer.length;i++)for(let c=0;c<2;c++){const x=Math.max(-1,Math.min(1,channels[c][i]));view.setInt16(44+(i*2+c)*2,x*(x<0?32768:32767),true);}
  return new Blob([bytes],{type:'audio/wav'});
}
