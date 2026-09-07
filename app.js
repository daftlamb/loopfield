import {setupMobile} from './mobile.js';
import {startVisuals} from './visuals.js';
import {makeProject,makeEmptyProject,validateProject,noteName,clone,STEPS,toggleSolo,transformNotes,patternName,addPattern,songOrder} from './model.js';
import {Engine,renderWav} from './audio.js';
import {fxSpecs,fxValue} from './fx-model.js';
const $=s=>document.querySelector(s),key='loopfield-project-v1';
let project=makeProject(),track=0,selected=0,mode='note',history=[],toastTimer,saveTimer,transportBusy=false,stepPage=0;
try{const saved=localStorage.getItem(key);if(saved)project=validateProject(JSON.parse(saved));}catch{$('#saveState').textContent='存储不可用 / 可导出项目';}
const current=()=>project.patterns[project.pattern][track];
const engine=new Engine(()=>project,({step,hits,pattern,song,ended})=>{
  if(ended){stop();return;}
  if(project.pattern!==pattern){project.pattern=pattern;renderEditor();save();}
  $('#songStatus').textContent=song?`${patternName(pattern)} · ${song.row+1} / ${project.song.length} · ×${song.repeat+1}`:`PATTERN ${patternName(pattern)}`;
  document.querySelectorAll('.songRow').forEach((row,i)=>row.classList.toggle('playing',song?.row===i));
  $('#position').textContent=`${patternName(pattern)} ${String(step+1).padStart(2,'0')} / 32`;
  gridButtons.forEach((b,i)=>b.classList.toggle('current',i===step));
  trackButtons.forEach((b,i)=>b.classList.toggle('hit',hits.includes(i)));
});
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2600);}
function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem(key,JSON.stringify(project));$('#saveState').textContent='已保存到本机';}catch{$('#saveState').textContent='请导出项目保存';}},150);}
function checkpoint(){history.push(clone(project));if(history.length>30)history.shift();$('#undo').disabled=false;}
const gridButtons=Array.from({length:STEPS},(_,i)=>{const b=document.createElement('button');b.className='step';b.innerHTML=`<small>${String(i+1).padStart(2,'0')}</small><span class="value"></span><i class="glyph"></i>`;b.onclick=()=>{checkpoint();selected=i;const s=current().steps[i];s.on=!s.on;renderGrid();renderStep();save();};b.oncontextmenu=e=>{e.preventDefault();selected=i;renderGrid();renderStep();};$('#grid').append(b);return b;});
gridButtons.forEach((b,i)=>{
  b.title='滚轮向上增加、向下减少当前参数';
  b.addEventListener('wheel',e=>{
    if(e.ctrlKey||e.metaKey||e.deltaY===0)return;
    e.preventDefault();
    const s=current().steps[i],direction=e.deltaY<0?1:-1;
    const value=mode==='note'
      ?Math.max(24,Math.min(96,s.note+direction))
      :mode==='ratchet'?Math.max(1,Math.min(8,s.ratchet+direction)):Math.max(mode==='velocity'?0.05:0,Math.min(1,Math.round((s[mode]+direction*0.05)*100)/100));
    if(s.on&&s[mode]===value)return;
    checkpoint();selected=i;s[mode]=value;s.on=true;
    renderGrid();renderStep();save();
  },{passive:false});
});
const soloButtons=Array.from({length:8},(_,i)=>{const b=document.createElement('button');b.textContent='S';b.setAttribute('aria-label',`独奏音轨 ${i+1}`);b.onclick=()=>{checkpoint();toggleSolo(project.patterns[project.pattern],i);renderEditor();save();};$('#soloTracks').append(b);return b;});
const trackButtons=Array.from({length:8},(_,i)=>{const b=document.createElement('button');b.className='track';b.innerHTML=`<b>${i+1}</b><span></span>`;b.onclick=()=>{track=i;renderEditor();};$('#tracks').append(b);return b;});
function choosePattern(i){
  if(engine.playing){if(project.playMode==='song'){toast('Song 播放时跟随编排，停止后编辑乐段');return;}engine.queuePattern(i);toast(`下一段切换到 ${patternName(i)}`);return;}
  project.pattern=i;renderEditor();save();
}
function renderPatterns(){
  $('#patterns').replaceChildren();$('#patternSelect').replaceChildren();
  project.patterns.forEach((_,i)=>{const b=document.createElement('button');b.textContent=patternName(i);b.classList.toggle('active',i===project.pattern);b.setAttribute('aria-label',`乐段 ${patternName(i)}`);b.onclick=()=>choosePattern(i);$('#patterns').append(b);const o=new Option(patternName(i),i);$('#patternSelect').append(o);});
  $('#patternSelect').value=project.pattern;
  $('#newPattern').disabled=$('#copyPattern').disabled=engine.playing||project.patterns.length>=16;
}
$('#patternSelect').onchange=e=>{choosePattern(Number(e.target.value));e.target.value=project.pattern;};
for(const [id,copy] of [['newPattern',false],['copyPattern',true]])$('#'+id).onclick=()=>{checkpoint();addPattern(project,copy);renderProject();save();toast(`已${copy?'复制到':'新建'} ${patternName(project.pattern)}`);};
function renderSong(){
  $('#playMode').value=project.playMode;$('#songLoop').checked=project.songLoop;
  $('#songRows').replaceChildren();project.song.forEach((entry,index)=>{
    const row=document.createElement('div');row.className='songRow';
    const number=document.createElement('span');number.textContent=String(index+1).padStart(2,'0');row.append(number);
    const select=document.createElement('select');select.setAttribute('aria-label',`第 ${index+1} 段乐段`);project.patterns.forEach((_,i)=>select.add(new Option(patternName(i),i)));select.value=entry.pattern;
    select.onchange=()=>{checkpoint();entry.pattern=Number(select.value);save();};row.append(select);
    const repeat=document.createElement('select');repeat.setAttribute('aria-label',`第 ${index+1} 段重复次数`);for(let i=1;i<=8;i++)repeat.add(new Option('×'+i,i));repeat.value=entry.repeats;repeat.onchange=()=>{checkpoint();entry.repeats=Number(repeat.value);renderSong();save();};row.append(repeat);
    for(const [title,offset] of [['↑',-1],['↓',1],['×',0]]){const b=document.createElement('button');b.textContent=title;b.setAttribute('aria-label',`${offset===0?'删除':offset<0?'上移':'下移'}第 ${index+1} 段`);b.disabled=engine.playing||(offset===0?project.song.length===1:index+offset<0||index+offset>=project.song.length);b.onclick=()=>{checkpoint();if(offset===0)project.song.splice(index,1);else [project.song[index],project.song[index+offset]]=[project.song[index+offset],project.song[index]];renderSong();save();};row.append(b);}
    select.disabled=repeat.disabled=engine.playing;$('#songRows').append(row);
  });
  $('#addSongRow').disabled=engine.playing||project.song.length>=32;$('#songLoop').disabled=engine.playing;
  const seconds=songOrder(project).length*32*60/project.bpm/4;$('#songLength').textContent=`${songOrder(project).length*2} 小节 · ${Math.floor(seconds/60)}:${String(Math.round(seconds%60)).padStart(2,'0')}`;
}
$('#addSongRow').onclick=()=>{checkpoint();project.song.push({pattern:project.pattern,repeats:1});renderSong();save();};
$('#songLoop').onchange=e=>{checkpoint();project.songLoop=e.target.checked;save();};
$('#playMode').onchange=async e=>{const mode=e.target.value;await stop();checkpoint();project.playMode=mode;renderProject();save();};
$('#openTools').onclick=()=>$('#toolsDialog').showModal();$('#closeTools').onclick=()=>$('#toolsDialog').close();
function renderStepPage(){gridButtons.forEach((b,i)=>b.classList.toggle('otherPage',Math.floor(i/16)!==stepPage));document.querySelectorAll('[data-page]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.page)===stepPage)));}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{stepPage=Number(b.dataset.page);selected=stepPage*16;renderGrid();renderStep();});
for(let i=24;i<=96;i++){const option=document.createElement('option');option.value=i;option.textContent=noteName(i);$('#note').append(option);}
const specs=[['volume','LEVEL','音轨音量',0,1,0.01,v=>Math.round(v*100)],['attack','ATTACK','起音 / 秒',0.002,1,0.002,v=>v.toFixed(3)],['decay','DECAY','衰减 / 秒',0.03,2,0.01,v=>v.toFixed(2)],['pan','PAN','左右声像',-1,1,0.01,v=>v===0?'C':(v<0?'L':'R')+Math.round(Math.abs(v)*100)],['cutoff','FILTER','截止 / Hz',80,18000,10,v=>v>=1000?(v/1000).toFixed(1)+'k':v],['resonance','RES','共振',0.1,12,0.1,v=>v.toFixed(1)],['fm','FM DEPTH','调频深度',0,8,0.1,v=>v.toFixed(1)],['ratio','FM RATIO','调制频率比',0.5,8,0.5,v=>v.toFixed(1)]];
const paramControls=specs.map(([k,title,hint,min,max,step,fmt])=>{const label=document.createElement('label');label.className='param';label.innerHTML=`<div><span>${title}</span><output></output></div><input aria-label="${hint}" type="range" min="${min}" max="${max}" step="${step}"><div class="hint">${hint}</div>`;const input=label.querySelector('input');input.addEventListener('pointerdown',checkpoint);input.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow'))checkpoint();});input.oninput=()=>{current()[k]=Number(input.value);label.querySelector('output').textContent=fmt(current()[k]);save();};$('#parameters').append(label);return {label,input,k,fmt};});
function renderGrid(){renderStepPage();const t=current();gridButtons.forEach((b,i)=>{const s=t.steps[i];b.classList.toggle('off',!s.on);b.classList.toggle('selected',selected===i);b.setAttribute('aria-pressed',String(s.on));b.setAttribute('aria-label',`第 ${i+1} 步 ${s.on?noteName(s.note):'关闭'}`);b.querySelector('.value').textContent=s.on?(mode==='note'?noteName(s.note):mode==='ratchet'?'×'+s.ratchet:Math.round(s[mode]*100)+(mode==='probability'?'%':'')):'·';b.querySelector('.glyph').style.height=(mode==='note'?9:mode==='ratchet'?s.ratchet*3:Math.max(2,s[mode]*25))+'px';});}
function renderStep(){const s=current().steps[selected];$('#mobileStep').textContent='STEP '+String(selected+1).padStart(2,'0');$('#ratchet').value=s.ratchet;$('#ratchetValue').textContent='×'+s.ratchet;$('#stepLabel').textContent=`STEP ${String(selected+1).padStart(2,'0')}`;$('#note').value=s.note;$('#velocity').value=Math.round(s.velocity*100);$('#probability').value=Math.round(s.probability*100);$('#velocityValue').textContent=Math.round(s.velocity*100);$('#probabilityValue').textContent=Math.round(s.probability*100)+'%';}
function renderEditor(){renderPatterns();const t=current();$('#mobileTrack').value=track;soloButtons.forEach((b,i)=>{const on=project.patterns[project.pattern][i].solo;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});renderGrid();renderStep();trackButtons.forEach((b,i)=>{const tt=project.patterns[project.pattern][i];b.querySelector('span').textContent=tt.name;b.classList.toggle('active',i===track);b.classList.toggle('muted',tt.mute);b.classList.toggle('soloed',tt.solo);b.setAttribute('aria-label',`音轨 ${i+1} ${tt.name}`);b.setAttribute('aria-pressed',String(i===track));});[...$('#patterns').children].forEach((b,i)=>b.classList.toggle('active',i===project.pattern));$('#soundName').textContent=`0${track+1} · ${t.name}`;$('#kind').value=t.kind;for(const k of ['mute','solo']){$('#'+k).classList.toggle('active',t[k]);$('#'+k).setAttribute('aria-pressed',String(t[k]));}
  const drum=['kick','snare','hat','noise'].includes(t.kind);
  paramControls.forEach(({label,input,k,fmt})=>{input.value=t[k];label.querySelector('output').textContent=fmt(t[k]);input.disabled=(drum&&['attack','fm','ratio'].includes(k))||(['snare','hat'].includes(t.kind)&&k==='cutoff');label.classList.toggle('disabled',input.disabled);});
}
const editingFx=()=>$('#fxTarget').value==='master'?project.fx:project.trackFx[Number($('#fxTarget').value)];
$('#fxTarget').onchange=()=>renderFx();
const fxControls=fxSpecs.map(spec=>{
  const row=document.createElement('div');row.className='fxRow';
  const toggle=document.createElement('button');toggle.className='fxToggle';toggle.setAttribute('aria-label',spec.name+'效果');
  toggle.innerHTML=`<span class="fxLed">●</span><span>${spec.title}<small>${spec.name}</small></span>`;
  toggle.onclick=()=>{checkpoint();editingFx()[spec.id].enabled=!editingFx()[spec.id].enabled;renderFx();engine.setFx(project.fx);save();};row.append(toggle);
  const controls=spec.params.map(([id,label,min,max,step])=>{
    const field=document.createElement('label');field.className='fxParam';
    field.innerHTML=`<span>${label}<output></output></span><input type="range" min="${min}" max="${max}" step="${step}" aria-label="${spec.name} ${label}">`;
    const input=field.querySelector('input');input.onpointerdown=checkpoint;input.onkeydown=e=>{if(e.key.startsWith('Arrow'))checkpoint();};
    input.oninput=()=>{editingFx()[spec.id][id]=Number(input.value);field.querySelector('output').textContent=fxValue(id,Number(input.value));engine.setFx(project.fx);save();};
    row.append(field);return {id,input,output:field.querySelector('output')};
  });$('#fxControls').append(row);return {spec,row,toggle,controls};
});
function renderFx(){fxControls.forEach(({spec,row,toggle,controls})=>{const fx=editingFx()[spec.id];row.classList.toggle('enabled',fx.enabled);toggle.setAttribute('aria-pressed',String(fx.enabled));controls.forEach(({id,input,output})=>{input.value=fx[id];output.textContent=fxValue(id,fx[id]);});});$('#fxCount').textContent=Object.values(editingFx()).filter(f=>f.enabled).length+' / 5 ON';}
function renderProject(){ $('#projectName').value=project.name;$('#bpm').value=project.bpm;$('#swing').value=project.swing;$('#mobileSwing').value=project.swing;$('#mobileSwingValue').textContent=project.swing+'%';$('#swingValue').textContent=project.swing+'%';$('#master').value=Math.round(project.master*100);renderEditor();renderFx();renderSong();}
$('#modes').onclick=e=>{const m=e.target.dataset.mode;if(!m)return;mode=m;[...$('#modes').children].forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));renderGrid();};
for(const k of ['velocity','probability','note','ratchet']){const input=$('#'+k);input.addEventListener('pointerdown',checkpoint);input.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow'))checkpoint();});input.oninput=()=>{const s=current().steps[selected];s[k]=Number(input.value)/(['note','ratchet'].includes(k)?1:100);s.on=true;renderGrid();renderStep();save();};}
$('#kind').onchange=()=>{checkpoint();current().kind=$('#kind').value;renderEditor();save();};
for(const k of ['mute','solo'])$('#'+k).onclick=()=>{checkpoint();if(k==='solo')toggleSolo(project.patterns[project.pattern],track);else current().mute=!current().mute;renderEditor();save();};
$('#audition').onclick=async()=>{try{await engine.preview(current(),{...current().steps[selected],velocity:0.8});}catch{toast('音频启动失败，请重新点按试听');}};
async function stop(){await engine.stop();renderPatterns();renderSong();$('#songStatus').textContent='READY';$('#play').textContent='▶';$('#play').setAttribute('aria-label','播放');$('#play').classList.remove('playing');$('#transportState').textContent='READY TO PLAY';$('#position').textContent='— / 32';gridButtons.forEach(b=>b.classList.remove('current'));trackButtons.forEach(b=>b.classList.remove('hit'));}
$('#play').onclick=async()=>{if(transportBusy)return;transportBusy=true;try{if(engine.playing)await stop();else{await engine.start();renderPatterns();renderSong();$('#play').textContent='■';$('#play').setAttribute('aria-label','停止');$('#play').classList.add('playing');$('#transportState').textContent='LOOP IS RUNNING';}}catch{toast('音频无法启动，请再点一次播放');}finally{transportBusy=false;}};
$('#projectName').onchange=()=>{project.name=$('#projectName').value.trim()||'Untitled sketch';save();};
$('#bpm').onchange=()=>{project.bpm=Math.min(220,Math.max(40,Number($('#bpm').value)||96));$('#bpm').value=project.bpm;renderSong();save();};
$('#swing').oninput=()=>{project.swing=Number($('#swing').value);$('#swingValue').textContent=project.swing+'%';save();};
$('#master').oninput=()=>{project.master=Number($('#master').value)/100;engine.setMaster(project.master);save();};
$('#random').onclick=()=>{checkpoint();const scale=[0,3,5,7,10],base=track===1?36:60;current().steps.forEach(s=>{s.on=Math.random()<0.36;s.note=Math.min(96,base+scale[Math.floor(Math.random()*5)]+(Math.random()>0.7?12:0));s.velocity=0.5+Math.random()*0.4;});renderEditor();save();toast('已生成新音符 · 可撤销');};
$('#clear').onclick=()=>{checkpoint();current().steps.forEach(s=>s.on=false);renderEditor();save();};
$('#undo').onclick=async()=>{if(!history.length)return;await stop();project=history.pop();$('#undo').disabled=!history.length;renderProject();engine.setMaster(project.master);engine.setFx(project.fx);save();};
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
$('#save').onclick=()=>download(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),(project.name.replace(/[^\p{L}\p{N}_ -]/gu,'')||'loopfield')+'.json');
$('#load').onclick=()=>$('#file').click();
$('#file').onchange=async()=>{const file=$('#file').files[0];if(!file)return;try{if(file.size>2000000)throw Error('项目文件过大');const loaded=validateProject(JSON.parse(await file.text()));await stop();checkpoint();project=loaded;renderProject();save();toast('项目已打开');}catch(e){toast('无法打开：'+e.message);}finally{$('#file').value='';}};
$('#export').onclick=async()=>{const button=$('#export');button.disabled=true;button.textContent='正在渲染声音…';try{const wav=await renderWav(clone(project),$('#exportMode').value);download(wav,`loopfield-${$('#exportMode').value==='song'?'song':patternName(project.pattern)}.wav`);toast('已导出 WAV，包含 FX 尾音');}catch{toast('导出失败，请使用新版 Chrome 或 Edge');}finally{button.disabled=false;button.textContent='导出 WAV ↓';}};
document.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='Space'){e.preventDefault();$('#play').click();}else if(/^[1-8]$/.test(e.key)){track=Number(e.key)-1;renderEditor();}else if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();checkpoint();const s=current().steps[selected];s.note=Math.max(24,Math.min(96,s.note+(e.key==='ArrowUp'?1:-1)));renderStep();renderGrid();save();}});
renderProject();startVisuals(engine);
const mobileQuery=matchMedia('(max-width:760px)');function placeActions(){const parent=mobileQuery.matches?$('#mobileActions'):$('.gridtools');for(const id of ['random','clear','undo'])parent.append($('#'+id));}placeActions();mobileQuery.addEventListener('change',placeActions);

function convertNotes(options){checkpoint();const tracks=$('#pitchScope').value==='track'?[current()]:project.patterns[project.pattern];transformNotes(tracks,options);renderEditor();save();toast('已转换音符 · 鼓轨保持原样 · 可撤销');}
$('#octDown').onclick=()=>convertNotes({octave:-1});
$('#octUp').onclick=()=>convertNotes({octave:1});
$('#applyScale').onclick=()=>convertNotes({root:Number($('#rootNote').value),scale:$('#scaleMode').value});

setupMobile({
  buttons:gridButtons,
  selectTrack:i=>{track=i;renderEditor();},
  selectStep:i=>{selected=i;renderGrid();renderStep();},
  read:i=>({mode,value:current().steps[i][mode]}),
  checkpoint,
  change:(i,key,value)=>{selected=i;current().steps[i][key]=value;current().steps[i].on=true;renderGrid();renderStep();save();}
});

$('#mobileSwing').oninput=()=>{project.swing=Number($('#mobileSwing').value);$('#swing').value=project.swing;$('#swingValue').textContent=project.swing+'%';$('#mobileSwingValue').textContent=project.swing+'%';save();};

$('#allReset').onclick=()=>$('#resetDialog').showModal();
$('#cancelReset').onclick=()=>$('#resetDialog').close();
$('#confirmReset').onclick=async()=>{
  const button=$('#confirmReset');button.disabled=true;
  try{await stop();checkpoint();project=makeEmptyProject();track=0;selected=0;stepPage=0;$('#fxTarget').value='master';renderProject();save();$('#resetDialog').close();toast('已全部清空 · 可在工具中撤销');}
  finally{button.disabled=false;}
};
