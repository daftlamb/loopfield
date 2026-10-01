import {hasInstruments,nativeNoteEvents} from '../auv3-model.js';
import {icon} from '../icons.js';
export function createAUHost({bridge=globalThis.webkit?.messageHandlers?.loopfieldAU,onError=()=>{}}={}){
 let applied='',ready=false,busy=Promise.resolve(),token=0,latestMix='';
 const call=(action,data={})=>bridge?bridge.postMessage({action,...data}):Promise.reject(Error('AUv3 instruments require the iOS app.'));
 const signature=p=>JSON.stringify(p.instruments??Array(8).fill(null));
 const host={
  available:!!bridge,
  assigned:(p,i)=>!!p.instruments?.[i],
  async prepare(p){
   if(!hasInstruments(p)&&!applied)return;
   const key=signature(p);if(key===applied&&ready)return;
   const requested=token;
   busy=busy.catch(()=>{}).then(async()=>{
    if(requested!==token)throw new DOMException('Cancelled','AbortError');
    const result=await call('configure',{slots:p.instruments??Array(8).fill(null)});
    if(requested!==token)throw new DOMException('Cancelled','AbortError');
    applied=key;ready=!result.errors?.length;
    if(result.errors?.length)throw Error(result.errors.join('\n'));
   });return busy;
  },
  async start(p){const generation=token;await host.prepare(p);if(generation!==token)throw new DOMException('Cancelled','AbortError');if(hasInstruments(p)){await call('start');if(generation!==token)throw new DOMException('Cancelled','AbortError');latestMix='';host.mix(p,p.patterns[p.pattern]);}},
  schedule(i,notes,ctx,p){if(!p.instruments?.[i])return;call('notes',{track:i,events:nativeNoteEvents(notes,ctx)}).catch(onError);},
  mix(p,tracks){if(!hasInstruments(p)||!ready)return;const data={master:p.master,tracks:tracks.map(t=>({volume:t.volume,pan:t.pan,mute:t.mute||tracks.some(x=>x.solo)&&!t.solo}))},key=JSON.stringify(data);if(key===latestMix)return;latestMix=key;call('mix',data).catch(error=>{latestMix='';onError(error);});},
  async stop(){token++;if(bridge)await call('stop').catch(onError);},
  async states(p){if(!ready||signature(p)!==applied)return null;const result=await call('states');return result.slots;},
  accept(p){applied=signature(p);},
  list:()=>call('list'),
  async show(i){await call('show',{track:i});},
  invalidate(){applied='';ready=false;}
 };
 return host;
}
export async function installAUv3(app){
 const host=createAUHost({onError:error=>app.toast(error.message??String(error))});
 app.attachInstrumentHost(host);
 window.addEventListener('loopfield-au-reset',()=>host.invalidate());
 const row=document.createElement('div');row.className='auInstrument';row.setAttribute('data-no-i18n','');
 row.innerHTML='<div class="auHeading"><span>INSTRUMENT</span><button id="auChoose">BUILT-IN</button><button id="auEditor">OPEN</button></div><p id="auStatus" role="status"></p>';
 document.querySelector('.soundhead').before(row);
 const panel=document.createElement('dialog');panel.id='auDialog';panel.setAttribute('data-no-i18n','');
 panel.innerHTML=`<div class="dialogHead"><span>AUv3 INSTRUMENTS</span><button aria-label="Close instruments">${icon('close')}</button></div><div class="auList"></div><p class="shellNote" role="status"></p>`;document.body.append(panel);
 panel.querySelector('.dialogHead button').onclick=()=>panel.close();
 let busy=false;
 function render(){
  const p=app.getProject(),i=app.getTrack().index,slot=p.instruments?.[i];
  row.querySelector('#auChoose').textContent=slot?.name??'BUILT-IN';
  row.querySelector('#auEditor').hidden=!slot;row.querySelector('#auEditor').disabled=busy||!host.available;
  row.querySelector('#auChoose').disabled=busy;
  row.querySelector('#auStatus').textContent=slot?'AUv3 · LEVEL / PAN / MUTE / SOLO apply. Loopfield FX, sound LFOs and WAV export are unavailable.':host.available?'Use a built-in voice or an installed AUv3 instrument.':'AUv3 instruments are available in the iOS app.';
  document.querySelector('.soundPanel').classList.toggle('externalInstrument',!!slot);
 }
 async function perform(fn){if(busy)return;busy=true;render();try{await fn();}catch(e){app.toast(e.message);}finally{busy=false;render();}}
 row.querySelector('#auChoose').onclick=()=>perform(async()=>{
  panel.showModal();const list=panel.querySelector('.auList'),status=panel.querySelector('.shellNote');list.replaceChildren();status.textContent='Loading instruments…';
  const index=app.getTrack().index;
  const add=(name,slot)=>{const b=document.createElement('button');b.textContent=name;b.onclick=()=>perform(async()=>{status.textContent='Loading…';await app.setInstrument(index,slot);panel.close();});list.append(b);};
  add('BUILT-IN',null);
  if(!host.available){status.textContent='Open Loopfield on iPhone or iPad to load AUv3 instruments.';return;}
  const result=await host.list();for(const item of result.instruments)add(item.name,{id:item.id,name:item.name});
  status.textContent=result.instruments.length?'One instrument per track, shared by all patterns. Plugin apps must remain installed.':'No AUv3 instruments found. Install and open an AUv3 instrument app, then reopen this list.';
 });
 row.querySelector('#auEditor').onclick=()=>perform(async()=>{await host.prepare(app.getProject());await host.show(app.getTrack().index);await app.captureInstrumentState();});
 window.addEventListener('loopfield-editor-changed',render);
 window.addEventListener('loopfield-au-state',()=>app.captureInstrumentState().catch(e=>app.toast(e.message)));
 // Parameter edits in an open plugin view are periodically included in autosave.
 let lastStateError='';setInterval(()=>{if(!document.hidden)app.captureInstrumentState().then(()=>{lastStateError='';}).catch(e=>{if(e.message!==lastStateError){lastStateError=e.message;app.toast(e.message);}});},3000);
 render();
}
