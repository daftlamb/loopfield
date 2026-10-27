export class BrowserMidiPort {
  constructor(onStatus=()=>{}){
    this.id='pan-garden-browser';this.name='泛音 · 浏览器直连';this.state='connected';
    this.onStatus=onStatus;this.source=crypto.randomUUID();this.channel=null;this.lastReady=0;
  }
  async open(){
    this.channel=new BroadcastChannel('loopfield-pan-midi-v1');
    this.channel.onmessage=({data})=>{if(data?.type==='ready'&&data.source===this.source){this.lastReady=Date.now();this.onStatus('泛音已就绪 · 音符 / 力度输出');}};
    const ping=()=>{this.channel.postMessage({type:'hello',source:this.source});if(Date.now()-this.lastReady>3500)this.onStatus('等待泛音：打开接收页，点击「接收 Loopfield」');};
    ping();this.heartbeat=setInterval(ping,1000);
  }
  send(data,time=performance.now()){this.channel?.postMessage({type:'midi',source:this.source,data:Array.from(data),at:performance.timeOrigin+time});}
  clear(){this.channel?.postMessage({type:'clear',source:this.source});}
  async close(){clearInterval(this.heartbeat);this.channel?.postMessage({type:'disconnect',source:this.source});this.channel?.close();this.channel=null;}
}
