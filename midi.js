import {gateDuration,ratchetOffsets} from './model.js';
import {arpEvents,modValue} from './modulation.js';

export function midiNotes(track,step,time,duration,bpm,origin=0){
  const notes=[],count=step.ratchet??1,spacing=duration/count;
  const arp=track.mod?.arp,enabled=arp?.enabled&&!['kick','snare','hat','noise'].includes(track.kind);
  const attack=count===1?track.attack:Math.min(track.attack,spacing*.15);
  const decay=count===1?track.decay:Math.min(track.decay,spacing*.65);
  for(const [i,offset] of ratchetOffsets(duration,count).entries()){
    const start=time+offset,gate=gateDuration({...step,gate:modValue(track.mod,'gate',step.gate??0,start-origin,start-origin,bpm)},spacing);
    const length=Math.max(.005,enabled?Math.min(gate??attack+decay,i<count-1?spacing:Infinity):gate??attack+decay);
    const events=enabled?arpEvents(arp,length,bpm,step.note):[{offset:0,note:0,duration:length}];
    for(const event of events)notes.push({time:start+event.offset,note:Math.max(0,Math.min(127,step.note+event.note)),duration:event.duration*(enabled&&arp.style!=='chip'?.8:1),velocity:Math.max(1,Math.min(127,Math.round(step.velocity*127))),arp:!!enabled});
  }
  return notes;
}

export class MidiOut{
  constructor(onError=()=>{},now=()=>performance.now()){
    this.onError=onError;this.now=now;this.port=null;this.channels=Array.from({length:8},(_,i)=>i+1);this.queue=[];this.active=new Map();this.used=new Set();this.serial=0;
  }
  async connect(port){this.panic();const previous=this.port;this.port=null;if(previous)await previous.close();if(port){await port.open();this.port=port;}}
  setChannel(track,channel){this.panic();this.channels[track]=channel;}
  schedule(track,notes,start){
    if(!this.port||!this.channels[track])return;
    this.queue=this.queue.filter(e=>!(e.track===track&&e.arp&&e.time>=start));
    this.queue.push({type:'cut',track,time:start});
    const channel=this.channels[track]-1;
    for(const note of notes){const token=++this.serial;this.queue.push({...note,type:'on',track,channel,token});this.queue.push({...note,type:'off',track,channel,token,time:note.time+note.duration});}
    this.queue.sort((a,b)=>a.time-b.time||({cut:0,off:1,on:2}[a.type]-{cut:0,off:1,on:2}[b.type]));
  }
  send(data,time){try{this.port?.send(data,time);}catch{this.queue=[];this.active.clear();this.port=null;this.onError('MIDI 输出已断开，请重新连接');}}
  flush(ctx){
    if(!this.port)return;
    const stamp=ctx.getOutputTimestamp?.(),offset=stamp?.performanceTime?stamp.performanceTime-stamp.contextTime*1000:this.now()-ctx.currentTime*1000;
    while(this.queue.length&&this.queue[0].time<=ctx.currentTime+.02){
      const e=this.queue.shift(),at=Math.max(this.now(),offset+e.time*1000);
      if(e.type==='cut'){
        for(const [key,voice] of this.active)if(voice.track===e.track&&voice.arp){this.send([0x80+voice.channel,voice.note,0],at);this.active.delete(key);}continue;
      }
      const key=e.channel*128+e.note;
      if(e.type==='on'){
        if(this.active.has(key))this.send([0x80+e.channel,e.note,0],at);
        this.send([0x90+e.channel,e.note,e.velocity],at);this.active.set(key,e);this.used.add(e.channel);
      }else if(this.active.get(key)?.token===e.token){this.send([0x80+e.channel,e.note,0],at);this.active.delete(key);}
    }
  }
  panic(){
    this.queue=[];
    if(this.port){
      try{this.port.clear();}catch{}
      for(const channel of this.used){this.send([0xb0+channel,64,0]);this.send([0xb0+channel,123,0]);this.send([0xb0+channel,120,0]);}
    }
    this.active.clear();this.used.clear();
  }
}
