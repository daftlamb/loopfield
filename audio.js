import {STEPS,stepDuration,ratchetOffsets} from './model.js';
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
export function playNote(ctx,bus,t,s,time){
  const f=440*2**((s.note-69)/12),env=ctx.createGain(),filter=ctx.createBiquadFilter(),pan=ctx.createStereoPanner();
  const drum=['kick','snare','hat','noise'].includes(t.kind),attack=drum?0.002:t.attack,end=time+attack+t.decay;
  env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(Math.max(0.0001,t.volume*s.velocity*0.32),time+attack);env.gain.exponentialRampToValueAtTime(0.0001,end);env.gain.linearRampToValueAtTime(0,end+0.01);
  filter.type=t.kind==='hat'?'highpass':t.kind==='snare'?'bandpass':'lowpass';filter.frequency.value=t.kind==='hat'?6500:t.kind==='snare'?2200:t.cutoff;filter.Q.value=t.resonance;pan.pan.value=t.pan;
  env.connect(filter);filter.connect(pan);pan.connect(bus.input);
  const sources=[],nodes=[env,filter,pan];
  const osc=(type,freq)=>{const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(freq,time);o.connect(env);sources.push(o);return o;};
  if(t.kind==='kick'){const o=osc('sine',f*3);o.frequency.exponentialRampToValueAtTime(f*0.65,time+0.09);}
  else if(['snare','hat','noise'].includes(t.kind)){
    if(!noiseBuffers.has(ctx)){const b=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),d=b.getChannelData(0);let seed=42;for(let i=0;i<d.length;i++){seed=(1664525*seed+1013904223)>>>0;d[i]=seed/2147483648-1;}noiseBuffers.set(ctx,b);}
    const src=ctx.createBufferSource();src.buffer=noiseBuffers.get(ctx);src.loop=true;src.playbackRate.value=2**((s.note-60)/12);src.connect(env);sources.push(src);
    if(t.kind==='snare')osc('triangle',180);
  }else{
    const carrier=osc(t.kind==='fm'?'sine':t.kind,f);
    if(t.fm>0){const mod=ctx.createOscillator(),depth=ctx.createGain();mod.frequency.value=f*t.ratio;depth.gain.setValueAtTime(f*t.fm,time);depth.gain.exponentialRampToValueAtTime(Math.max(0.01,f*t.fm*0.12),end);mod.connect(depth);depth.connect(carrier.frequency);sources.push(mod);nodes.push(depth);}
  }
  let ended=0;
  sources.forEach(src=>{src.onended=()=>{src.disconnect();if(++ended===sources.length)nodes.forEach(n=>n.disconnect());};src.start(time);src.stop(end+0.02);});
}
export function playStep(ctx,bus,t,s,time,duration){
  const count=s.ratchet??1,spacing=duration/count;
  const voice=count===1?t:{...t,attack:Math.min(t.attack,spacing*.15),decay:Math.min(t.decay,spacing*.65)};
  for(const offset of ratchetOffsets(duration,count))playNote(ctx,bus,voice,s,time+offset);
}
export function audible(tracks,t){return !t.mute&&(!tracks.some(x=>x.solo)||t.solo);}
export class Engine{
  constructor(getProject,onStep){this.getProject=getProject;this.onStep=onStep;this.playing=false;this.queue=[];this.nextStep=0;}
  async init(){
    if(navigator.audioSession)navigator.audioSession.type='playback';
    if(!this.ctx)this.ctx=new AudioContext({latencyHint:'interactive'});
    // Resume in the tap handler before constructing the effects graph on iPhone.
    await this.ctx.resume();
    if(this.ctx.state!=='running')throw new Error('Audio context is not running');
    if(!this.bus)this.bus=createBus(this.ctx,this.getProject().master,this.getProject().fx,this.getProject().trackFx);
  }
  async start(){await this.init();if(this.playing)return;this.playing=true;this.nextTime=this.ctx.currentTime+0.07;this.nextStep=0;this.queue=[];
    this.worker=new Worker(new URL('./clock.js',import.meta.url));this.worker.onmessage=()=>this.schedule();this.schedule();}
  schedule(){if(!this.playing)return;const p=this.getProject();if(this.nextTime<this.ctx.currentTime-0.1)this.nextTime=this.ctx.currentTime+0.03;
    while(this.nextTime<this.ctx.currentTime+0.12){const tracks=p.patterns[p.pattern],step=this.nextStep;let hits=[];
      tracks.forEach((t,i)=>{const s=t.steps[step];if(audible(tracks,t)&&s.on&&Math.random()<s.probability){playStep(this.ctx,this.bus.tracks[i]??this.bus,t,s,this.nextTime,stepDuration(p.bpm,p.swing,step));hits.push(i);}});
      this.queue.push({time:this.nextTime,step,hits});this.nextTime+=stepDuration(p.bpm,p.swing,step);this.nextStep=(step+1)%STEPS;
    }
  }
  tick(){if(!this.ctx)return;let last;while(this.queue.length&&this.queue[0].time<=this.ctx.currentTime)last=this.queue.shift();if(last)this.onStep(last);}
  async stop(){this.playing=false;this.worker?.terminate();this.queue=[];if(this.ctx){await this.ctx.close();this.ctx=null;this.bus=null;}}
  async preview(t,s){await this.init();const p=this.getProject(),i=p.patterns[p.pattern].indexOf(t);playNote(this.ctx,this.bus.tracks[i]??this.bus,t,s,this.ctx.currentTime+0.01);}
  setMaster(v){if(this.ctx)this.bus.gain.gain.setTargetAtTime(v*0.65,this.ctx.currentTime,0.02);}
  setFx(fx){this.bus?.fx.update(fx);this.bus?.tracks.forEach((bus,i)=>bus.fx.update(this.getProject().trackFx[i]));}
}
export async function renderWav(p){
  const settings=p.fx??defaultFx(),trackSettings=p.trackFx??[],tail=fxTail(settings)+Math.max(0,...trackSettings.map(f=>fxTail(f)-3)),duration=STEPS*60/p.bpm/4,ctx=new OfflineAudioContext(2,Math.ceil((duration+tail)*44100),44100),bus=createBus(ctx,p.master,settings,trackSettings),tracks=p.patterns[p.pattern];let time=0.02;
  for(let i=0;i<STEPS;i++){tracks.forEach((t,index)=>{const s=t.steps[i];if(audible(tracks,t)&&s.on&&Math.random()<s.probability)playStep(ctx,bus.tracks[index]??bus,t,s,time,stepDuration(p.bpm,p.swing,i));});time+=stepDuration(p.bpm,p.swing,i);}
  const buffer=await ctx.startRendering(),bytes=new ArrayBuffer(44+buffer.length*4),view=new DataView(bytes),str=(o,s)=>[...s].forEach((c,i)=>view.setUint8(o+i,c.charCodeAt(0)));
  str(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,44100,true);view.setUint32(28,176400,true);view.setUint16(32,4,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,buffer.length*4,true);
  const channels=[buffer.getChannelData(0),buffer.getChannelData(1)];for(let i=0;i<buffer.length;i++)for(let c=0;c<2;c++){const x=Math.max(-1,Math.min(1,channels[c][i]));view.setInt16(44+(i*2+c)*2,x*(x<0?32768:32767),true);}
  return new Blob([bytes],{type:'audio/wav'});
}
