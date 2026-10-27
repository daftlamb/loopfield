import {readFileSync,writeFileSync} from 'node:fs';
import {Sitar} from '../../../sitar-study/synth.js';
import {Drum} from '../../../tabla-study/synth.js';
import {midiNotes} from '../../midi.js';
import {modValue} from '../../modulation.js';
const p=JSON.parse(readFileSync(new URL('./Evening-Courtyard.loopfield.json',import.meta.url))),sr=48000,step=60/p.bpm/4,events=[];
for(let a=0;a<3;a++)for(let n=0;n<32;n++)for(let tr=0;tr<7;tr++){const t=p.patterns[a][tr],s=t.steps[n];if(!s.on)continue;for(const e of midiNotes(t,s,(a*32+n)*step,step,p.bpm)){events.push({...e,tr,type:'on'});if(tr===6)events.push({...e,tr,type:'off',time:e.time+e.duration});}}
events.sort((a,b)=>a.time-b.time||(a.type==='off'?-1:1));
const s=new Sitar(sr),drums=[new Drum(sr,true),new Drum(sr)];s.params({assist:true,scale:'yaman',root:48,autoMeend:.8,ornament:.18,drone:.12,chikari:.25,tarafLevel:.5,tarafDecay:5,jawari:.42,damp:.22,volume:.5});
const routes=[['ge',0],['ke',0],['tun',1],['tin',1],['na',1],['ta',1]],duration=96*step,size=Math.ceil((duration+2)*sr),audio=new Float32Array(size*2);let cursor=0,last=-1,geTime=0,peak=0;
for(let i=0;i<size;i++){
 const time=i/sr;
 while(cursor<events.length&&events[cursor].time<=time){const e=events[cursor++];if(e.tr===6){if(e.type==='on'){s.pluck(e.note,e.velocity/127);last=e.note;}else if(last===e.note)s.release();}else{const [bol,c]=routes[e.tr];drums[c].hit(.5,e.velocity/127,false,bol);if(e.tr===0)geTime=e.time;}}
 if(i%480===0){const a=Math.min(2,Math.floor(time/(32*step)));drums[0].target=time<duration?modValue(p.patterns[a][0].mod,'midi.pressureLeft',0,time,geTime,p.bpm)/100:0;}
 if(i===Math.ceil(duration*sr)){s.damp();}
 const v=s.sample(),lo=drums[0].sample(),hi=drums[1].sample();const l=(v+lo*.58+hi*.42)*.8,r=(v+lo*.42+hi*.58)*.8;audio[i*2]=l;audio[i*2+1]=r;peak=Math.max(peak,Math.abs(l),Math.abs(r));
}
const wav=Buffer.alloc(44+audio.length*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(sr,24);wav.writeUInt32LE(sr*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(audio.length*2,40);for(let i=0;i<audio.length;i++){if(!Number.isFinite(audio[i]))throw Error('invalid audio');wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,audio[i]))*32767),44+i*2);}writeFileSync(new URL('./Evening-Courtyard-preview.wav',import.meta.url),wav);console.log({seconds:size/sr,peak});
