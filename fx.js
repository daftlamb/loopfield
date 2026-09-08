import {automate,routeFor} from './modulation.js';
import {defaultFx} from './fx-model.js';
export function createFx(ctx,settings=defaultFx()){
  const input=ctx.createGain(),output=ctx.createGain(),stages={};
  let previous=input;
  for(const id of ['crusher','chorus','delay','reverb','compressor']){
    const source=ctx.createGain(),dry=ctx.createGain(),wet=ctx.createGain(),sum=ctx.createGain();
    previous.connect(source);source.connect(dry);dry.connect(sum);wet.connect(sum);stages[id]={source,dry,wet,sum};previous=sum;
  }
  previous.connect(output);
  const crusher=stages.crusher;crusher.drive=ctx.createGain();crusher.shape=ctx.createWaveShaper();crusher.source.connect(crusher.drive);crusher.drive.connect(crusher.shape);crusher.shape.connect(crusher.wet);
  const chorus=stages.chorus;chorus.lfo=ctx.createOscillator();chorus.depths=[];
  for(const side of [-1,1]){const delay=ctx.createDelay(0.05),pan=ctx.createStereoPanner(),depth=ctx.createGain();delay.delayTime.value=0.016;pan.pan.value=side;chorus.source.connect(delay);delay.connect(pan);pan.connect(chorus.wet);chorus.lfo.connect(depth);depth.connect(delay.delayTime);chorus.depths.push({depth,side});}
  chorus.lfo.start();
  const delay=stages.delay;delay.node=ctx.createDelay(1);delay.feedback=ctx.createGain();delay.source.connect(delay.node);delay.node.connect(delay.feedback);delay.feedback.connect(delay.node);delay.node.connect(delay.wet);
  const reverb=stages.reverb;reverb.node=ctx.createConvolver();reverb.source.connect(reverb.node);reverb.node.connect(reverb.wet);
  const comp=stages.compressor;comp.node=ctx.createDynamicsCompressor();comp.makeup=ctx.createGain();comp.node.knee.value=12;comp.node.attack.value=0.01;comp.node.release.value=0.18;comp.source.connect(comp.node);comp.node.connect(comp.makeup);comp.makeup.connect(comp.wet);
  let oldDecay,oldBits,first=true;
  function update(fx){
    const set=(param,value)=>{if(first)param.setValueAtTime(value,ctx.currentTime);else param.setTargetAtTime(value,ctx.currentTime,0.015);};
    for(const [id,s] of Object.entries(stages)){const f=fx[id],mix=f.enabled?(id==='compressor'?1:f.mix):0;set(s.dry.gain,1-mix);set(s.wet.gain,mix*(id==='chorus'?0.5:1));}
    set(crusher.drive.gain,fx.crusher.drive);
    if(oldBits!==fx.crusher.bits){const curve=new Float32Array(65537),levels=2**(fx.crusher.bits-1);for(let i=0;i<curve.length;i++)curve[i]=Math.round((i/(curve.length-1)*2-1)*levels)/levels;crusher.shape.curve=curve;oldBits=fx.crusher.bits;}
    set(chorus.lfo.frequency,fx.chorus.rate);chorus.depths.forEach(({depth,side})=>set(depth.gain,side*fx.chorus.depth/1000));
    set(delay.node.delayTime,fx.delay.time);set(delay.feedback.gain,fx.delay.feedback);
    if(oldDecay!==fx.reverb.decay){const length=Math.ceil(ctx.sampleRate*fx.reverb.decay),buffer=ctx.createBuffer(2,length,ctx.sampleRate);let seed=1234;for(let c=0;c<2;c++){const d=buffer.getChannelData(c);for(let i=0;i<length;i++){seed=(1664525*seed+1013904223)>>>0;d[i]=(seed/2147483648-1)*Math.exp(-7*i/length)*(1-i/length);}}reverb.node.buffer=buffer;oldDecay=fx.reverb.decay;}
    set(comp.node.threshold,fx.compressor.threshold);set(comp.node.ratio,fx.compressor.ratio);set(comp.makeup.gain,10**(fx.compressor.makeup/20));first=false;
  }
  const bindings=[];
  for(const id of ['crusher','chorus','delay','reverb']){const stage=stages[id];bindings.push([id+'.mix',stage.dry.gain,v=>1-v],[id+'.mix',stage.wet.gain,v=>v*(id==='chorus'?.5:1)]);}
  bindings.push(['crusher.drive',crusher.drive.gain],['delay.time',delay.node.delayTime],['delay.feedback',delay.feedback.gain],['chorus.rate',chorus.lfo.frequency],['compressor.threshold',comp.node.threshold],['compressor.ratio',comp.node.ratio],['compressor.makeup',comp.makeup.gain,v=>10**(v/20)]);
  for(const {depth,side} of chorus.depths)bindings.push(['chorus.depth',depth.gain,v=>side*v/1000]);
  const modulated=new Set();
  function modulate(mod,fx,from,to,start,bpm,origin=0){
    for(const [target,param,convert] of bindings){
      const [id,key]=target.split('.'),active=fx[id].enabled&&routeFor(mod,target);
      if(!active&&!modulated.has(target))continue;
      const base=key==='mix'&&!fx[id].enabled?0:fx[id][key];
      automate(param,active?mod:null,target,base,from,to,start,bpm,convert,origin);
      if(active)modulated.add(target);
    }
  }
  update(settings);return {input,output,update,modulate};
}
