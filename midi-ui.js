import {MidiOut} from './midi.js';
import {icon} from './icons.js';
import {BrowserMidiPort} from './browser-midi.js';

export function setupMidi(engine){
  const $=s=>document.querySelector(s),midi=new MidiOut(message=>$('#midiStatus').textContent=message);
  engine.midi=midi;let access=null;
  const browserPort=typeof BroadcastChannel==='function'?new BrowserMidiPort(message=>$('#midiStatus').textContent=message):null;
  try{const saved=JSON.parse(localStorage.getItem('loopfield-midi-v1'));if(Array.isArray(saved)&&saved.length===8&&saved.every(n=>Number.isInteger(n)&&n>=0&&n<=16))midi.channels=saved;}catch{}
  $('#midiConnect').innerHTML=icon('power')+'连接 MIDI';$('#midiPanic').innerHTML=icon('stop')+'关音';
  for(let i=0;i<8;i++){
    const label=document.createElement('label');label.textContent=`轨 ${i+1}`;
    const select=document.createElement('select');select.setAttribute('aria-label',`音轨 ${i+1} MIDI 通道`);select.add(new Option('OFF','0'));
    for(let n=1;n<=16;n++)select.add(new Option(`CH ${n}`,String(n)));select.value=midi.channels[i];
    select.onchange=()=>{midi.setChannel(i,Number(select.value));try{localStorage.setItem('loopfield-midi-v1',JSON.stringify(midi.channels));}catch{}};
    label.append(select);$('#midiChannels').append(label);
  }
  function ports(){
    const select=$('#midiDevice'),selected=midi.port?.id??'';select.replaceChildren(new Option('未连接',''));
    if(browserPort)select.add(new Option(browserPort.name,browserPort.id));
    for(const port of access?.outputs.values()??[])if(port.state==='connected')select.add(new Option(port.name||port.manufacturer||'MIDI 输出',port.id));
    select.value=selected;select.disabled=select.options.length===1;
    $('#midiStatus').textContent=selected===browserPort?.id?'浏览器直连已开启，请在泛音页启用接收':selected?'已连接 · 音符 / 力度输出':select.options.length>1?'请选择输出设备；浏览器直连无需 MIDI 设备权限':'未发现输出设备，请连接硬件或创建 DAW 虚拟 MIDI 端口';
  }
  $('#midiConnect').onclick=async()=>{
    const button=$('#midiConnect');button.disabled=true;
    try{access=await navigator.requestMIDIAccess({sysex:false});access.onstatechange=()=>{if(midi.port?.state==='disconnected'){midi.panic();midi.port=null;}ports();};ports();}
    catch{$('#midiStatus').textContent='MIDI 权限未获准，请允许访问后重试';}finally{button.disabled=false;}
  };
  $('#midiDevice').onchange=async e=>{
    const select=e.target;select.disabled=true;
    try{await midi.connect(select.value===browserPort?.id?browserPort:access?.outputs.get(select.value));ports();}catch{$('#midiStatus').textContent='无法打开输出设备，请检查设备是否被占用';}finally{select.disabled=false;}
  };
  $('#midiPanic').onclick=()=>midi.panic();
  window.addEventListener('pagehide',()=>midi.panic());
  ports();
  if(!navigator.requestMIDIAccess){$('#midiConnect').disabled=true;$('#midiStatus').textContent='硬件 MIDI 不可用；仍可选择「泛音 · 浏览器直连」';}
}
