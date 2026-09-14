import {Capacitor} from '@capacitor/core';
import {App} from '@capacitor/app';
import {Preferences} from '@capacitor/preferences';
import {Filesystem,Directory} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
import {PROJECT_KEY,RECOVERY_KEY,LIBRARY_KEY,parseProject,restoreLatest,readLibrary,createWriter,exportBudget,safeFilename,MAX_FILE_BYTES} from './storage.js';
import {installHelp} from './help.js';
import {installLocalization,LANGUAGE_KEY,normalizeLanguage} from './localization.js';
import {installShakePalette} from './shake-palette.js';
import {installChoiceControls} from './choice-controls.js';

const $=s=>document.querySelector(s),native=Capacitor.isNativePlatform();
const localGet=key=>{try{return localStorage.getItem(key);}catch{return null;}};
const localSet=(key,value)=>{try{localStorage.setItem(key,value);return true;}catch{return false;}};
const notify=text=>{$('#saveState').textContent=text;};
const write=createWriter(value=>Preferences.set(value),()=>notify('保存失败，请导出项目备份'));
async function start(){
  if(native)document.documentElement.classList.add('native-app');
  const languagePreference=await Preferences.get({key:LANGUAGE_KEY}).catch(()=>({value:localGet(LANGUAGE_KEY)}));
  const locale=installLocalization(languagePreference.value);
  const saved=await Preferences.get({key:PROJECT_KEY}).catch(()=>({value:null}));
  const recovered=restoreLatest([saved.value,localGet(RECOVERY_KEY),localGet(PROJECT_KEY)]);
  if(recovered)localSet(PROJECT_KEY,JSON.stringify(recovered.project));
  const app=await import('../app.js');
  // Restore through the host API too: localStorage can be unavailable on a damaged WebView store.
  if(recovered)await app.openProject(recovered.project);
  let lastStamp=recovered?.savedAt??0,saveTimer;
  function snapshot(){
    const value=JSON.stringify({savedAt:lastStamp=Math.max(Date.now(),lastStamp+1),project:app.getProject()});
    if(!localSet(RECOVERY_KEY,value))notify('本机副本不可用，正在保存到 App');
    return value;
  }
  const persist=()=>{clearTimeout(saveTimer);return write(PROJECT_KEY,snapshot()).then(()=>notify('已保存到本机')).catch(()=>{});};
  window.addEventListener('loopfield-project-changed',()=>{
    const value=snapshot();clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>write(PROJECT_KEY,value).then(()=>notify('已保存到本机')).catch(()=>{}),180);
    $('#shellProject').textContent=app.getProject().name;
    updateQuick();
  });
  
  const pause=()=>{app.pauseForBackground().catch(()=>{});persist();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  window.addEventListener('pagehide',pause);
  window.addEventListener('loopfield-interruption',pause);
  if(native)await App.addListener('appStateChange',({isActive})=>{if(!isActive)pause();});

  $('header').innerHTML='<span class="shellWordmark">LOOPFIELD</span><button id="shellProject" aria-label="打开工程" aria-haspopup="dialog"></button><button id="shellHelp" aria-label="就地帮助" aria-pressed="false">?</button>';
  $('#shellProject').textContent=app.getProject().name;
  const projectDialog=document.createElement('dialog');projectDialog.id='projectDialog';
  projectDialog.innerHTML='<div class="dialogHead"><span>工程 / LOCAL</span><button id="closeProjects" aria-label="关闭工程">×</button></div><p class="shellNote">当前编辑自动保存。保存副本可留下不同版本。</p><div id="projectContent"></div><div class="libraryHeading">已保存副本</div><div id="projectList"></div><p id="projectMessage" role="status"></p>';
  document.body.append(projectDialog);
  for(const el of document.querySelectorAll('[data-mobile-panel="project"]')){$('#projectContent').append(el);el.removeAttribute('data-mobile-panel');}
  const saveCopy=document.createElement('button');saveCopy.id='saveCopy';saveCopy.textContent='保存副本';$('.projectbar').insertBefore(saveCopy,$('#save'));
  $('#save').textContent='导出项目';$('#load').textContent='导入项目';
  const openProjects=()=>{if(!projectDialog.open){projectDialog.showModal();renderLibrary();}};
  $('#shellProject').onclick=openProjects;$('#closeProjects').onclick=()=>projectDialog.close();
  $('.mobileNav [data-tab="project"]').remove();
  for(const button of document.querySelectorAll('.mobileNav [data-tab]')){
    button.setAttribute('aria-label',({sequence:'音序',song:'编排',sound:'音色',fx:'效果',visual:'画面'})[button.dataset.tab]);
    const icon=button.querySelector('span');icon.setAttribute('aria-hidden','true');
    button.replaceChildren(icon);
  }
  $('.mobileNav').onclick=e=>{const b=e.target.closest('[data-tab]');if(b)app.setMobileTab(b.dataset.tab);};
  $('.mobileTrackBar').append($('#tracks'));$('.mobileTrackBar label').hidden=true;$('#mobileStep').hidden=true;
  $('#tracks').setAttribute('aria-label','选择音轨');
  const source=document.createElement('div');source.className='quickSound';
  source.innerHTML='<div class="quickTitle"><span id="quickName"></span><button id="editSound">音色 →</button></div><div id="quickParameters"></div>';
  $('.sequencePanel').append(source);
  $('#editSound').onclick=()=>app.setMobileTab('sound');
  const quickSpecs=[['volume','LEVEL',0,1,.01,v=>Math.round(v*100)],['decay','DECAY',.03,2,.01,v=>v.toFixed(2)],['cutoff','FILTER',80,18000,10,v=>v>=1000?(v/1000).toFixed(1)+'k':Math.round(v)],['resonance','RES',.1,12,.1,v=>v.toFixed(1)]];
  const quick=quickSpecs.map(([key,label,min,max,step,format])=>{
    const field=document.createElement('label');field.innerHTML=`<span>${label}<output></output></span><input type="range" min="${min}" max="${max}" step="${step}" aria-label="快捷 ${label}">`;
    const input=field.querySelector('input');input.onpointerdown=()=>app.beginEdit();input.onkeydown=e=>{if(e.key.startsWith('Arrow'))app.beginEdit();};
    input.oninput=()=>app.editTrackParameter(key,+input.value);$('#quickParameters').append(field);
    return {key,input,output:field.querySelector('output'),format};
  });
  function updateQuick(){const t=app.getTrack();$('#quickName').textContent=String(t.index+1).padStart(2,'0')+' / '+t.name;for(const q of quick){q.input.value=t[q.key];q.output.textContent=q.format(t[q.key]);q.input.disabled=q.key==='cutoff'&&['hat','snare'].includes(t.kind);}}
  window.addEventListener('loopfield-editor-changed',updateQuick);updateQuick();
  const stepLabels=[...$('.stepedit').querySelectorAll('label')];
  function showStepControl(){
    const mode=$('#modes .active')?.dataset.mode;
    for(const label of stepLabels)label.hidden=!label.querySelector('#'+(mode||'note'));
  }
  $('#modes').addEventListener('click',showStepControl);showStepControl();
  // iPad keeps the same app navigation; move infrequent actions regardless of viewport width.
  for(const id of ['random','clear','newPattern','copyPattern'])$('#mobileActions').append($('#'+id));
  $('.patternBar').append($('#undo'));$('#openTools').textContent='工具';
  $('.stepPages span').textContent='长按上下调值';
  $('.midiPanel').hidden=true;
  $('.fieldNote').remove();$('.visualFooter').remove();
  $('.visualPanel .sectionhead>span').textContent='画面 / FIELD';
  document.addEventListener('contextmenu',e=>{if(!e.target.closest('input,textarea'))e.preventDefault();},true);
  const closeMod=document.createElement('button');closeMod.textContent='×';closeMod.setAttribute('aria-label','Close modulation');closeMod.onclick=()=>$('#modDialog').close();$('#modDialog .dialogHead').append(closeMod);
  const shake=installShakePalette();
  installHelp({locale,shake,async changeLanguage(language){
    const next=normalizeLanguage(language);
    await Preferences.set({key:LANGUAGE_KEY,value:next});
    localSet(LANGUAGE_KEY,next);locale.setLanguage(next);
  }});
  installChoiceControls();

  let library=[],libraryUnavailable=false;
  window.addEventListener('loopfield-language-changed',()=>{if(projectDialog.open)renderLibrary();});
  try{const stored=await Preferences.get({key:LIBRARY_KEY});library=readLibrary(stored.value??localGet(LIBRARY_KEY));}
  catch{try{const backup=localGet(LIBRARY_KEY);if(!backup)throw Error('No valid library backup');library=readLibrary(backup);}catch{libraryUnavailable=true;$('#projectMessage').textContent='工程副本列表无法读取；当前编辑仍可导出。';}}
  function renderLibrary(){
    $('#projectList').replaceChildren();
    if(!library.length){const p=document.createElement('p');p.className='shellNote';p.textContent='还没有保存副本';$('#projectList').append(p);}
    for(const item of [...library].reverse()){
      const row=document.createElement('div');row.className='libraryRow';
      const title=document.createElement('span');title.textContent=item.name;
      const time=document.createElement('small');time.textContent=new Date(item.savedAt).toLocaleString(locale.language==='zh'?'zh-CN':'en-GB',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
      title.append(time);const b=document.createElement('button');b.textContent='载入';b.setAttribute('aria-label','载入 '+item.name);
      b.onclick=async()=>{b.disabled=true;try{await app.openProject(item.project);await persist();projectDialog.close();app.toast('已载入副本 · 可用撤销恢复');}catch{app.toast('副本无法载入');}finally{b.disabled=false;}};
      row.append(title,b);$('#projectList').append(row);
    }
  }
  saveCopy.onclick=async()=>{
    if(libraryUnavailable){app.toast('请先导出当前项目，工程列表需要恢复');return;}
    if(library.length>=50){app.toast('已保存 50 个副本，请导出项目备份');return;}
    const project=app.getProject(),next=[...library,{id:crypto.randomUUID(),name:project.name,savedAt:Date.now(),project}];
    saveCopy.disabled=true;
    try{await write(LIBRARY_KEY,JSON.stringify(next));localSet(LIBRARY_KEY,JSON.stringify(next));library=next;renderLibrary();app.toast('副本已保存');}catch{app.toast('保存副本失败，请导出项目');}finally{saveCopy.disabled=false;}
  };
  async function shareFile(blob,name){
    if(!native){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);return;}
    await app.pauseForBackground();
    const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(blob);});
    const file=await Filesystem.writeFile({directory:Directory.Cache,path:'exports/'+name,data,recursive:true});
    try{await Share.share({title:name,files:[file.uri],dialogTitle:'保存或分享 Loopfield 文件'});}
    finally{await Filesystem.deleteFile({directory:Directory.Cache,path:'exports/'+name}).catch(()=>{});}
  }
  $('#save').onclick=async()=>{
    $('#save').disabled=true;try{const p=app.getProject();await shareFile(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}),safeFilename(p.name,'json'));}catch{app.toast('项目导出未完成，可重试');}finally{$('#save').disabled=false;}
  };
  $('#file').onchange=async()=>{
    const file=$('#file').files[0];if(!file)return;
    try{if(file.size>MAX_FILE_BYTES)throw Error('项目文件不能超过 2 MB');const project=parseProject(await file.text());await app.openProject(project);await persist();app.toast('项目已导入 · 可撤销恢复');}
    catch(error){app.toast('无法导入：'+error.message);}finally{$('#file').value='';}
  };
  $('#export').onclick=async()=>{
    const project=app.getProject(),mode=$('#exportMode').value,budget=exportBudget(project,mode);
    if(!budget.allowed){app.toast('第一版支持含尾音 3 分钟以内的 WAV，请缩短编排或导出 Pattern');return;}
    const b=$('#export');b.disabled=true;b.textContent='正在渲染…';
    try{await app.pauseForBackground();await persist();const wav=await app.renderWav(project,mode);await shareFile(wav,safeFilename(project.name+'-'+mode,'wav'));}
    catch{app.toast('WAV 导出未完成，可重试或缩短编排');}finally{b.disabled=false;b.textContent='导出 WAV';}
  };
  await persist();
}
start().catch(error=>{console.error(error);document.body.innerHTML='<main class="startupError"><h1>Loopfield 暂时无法打开</h1><p>请关闭后重新打开 App。已有工程仍保留在本机。</p></main>';});
