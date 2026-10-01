import {icon} from '../icons.js';
export function installHelp({locale,shake,changeLanguage,typography,projects,loadFactory}){
 const button=document.querySelector('#shellHelp');
 const panel=document.createElement('dialog');panel.id='helpDialog';panel.setAttribute('data-no-i18n','');document.body.append(panel);
 const guides=[
 ['PLAY','播放','Start or stop the loop. Audio pauses when the app enters the background.','点按播放或停止。进入后台时自动暂停。'],
 ['SEQUENCE','音序','Tap a step to switch it on or off. Hold and drag up or down to edit the selected parameter. Each pattern has two pages of 16 steps.','点按格子开关音符，长按后上下拖动可调整当前参数。每个乐段共 32 步，分为两页。'],
 ['RANDOM','随机参数','Choose NOTE, VEL, CHANCE, RATCH or GATE, then open TOOLS and tap RANDOM. It changes that parameter on the current track. Use UNDO to restore it.','先选择音高、力度、概率、连击或门限，再打开工具点随机按钮；仅影响当前音轨。点撤销可恢复。'],
 ['NOTES','音名','Accidentals use flats: Db, Eb, Gb, Ab and Bb. Pitch and playback stay unchanged.','变化音使用降号记法，例如降 D、降 E；音高与播放保持不变。'],
 ['TRACKS','音轨','Numbers 1–8 select the track you edit. All unmuted tracks play together.','数字 1–8 切换编辑音轨。所有未静音的音轨一起播放。'],
 ['VALUES','参数切换','Tap a choice or use the left and right arrows. Hold a pitch arrow to move through notes.','点选选项或用左右箭头切换。长按音高箭头可连续调节。'],
 ['SONG','编排','Arrange patterns and repeats, then select SONG. Stop playback to edit the arrangement.','设置乐段顺序和重复次数，再选歌曲模式播放。停止播放后可修改编排。'],
 ['SOUND / FX','音色 / 效果','Choose a voice and shape its sound. Apply effects to MASTER or an individual track.','选择音色并调整参数。效果可作用于总线或单独音轨。'],
 ['PROJECT','工程','Tap the project name above to save a copy, import or export. Your current edits save automatically.','点顶部工程名称可保存副本、导入或导出。当前编辑会自动保存。']
 ];
 let busy=false;
 function render(){
  const zh=locale.language==='zh';
  panel.innerHTML=`<div class="dialogHead"><span>SETTINGS / GUIDE</span><button id="closeHelp" aria-label="Close help">${icon('close')}</button></div>
   <div class="helpSettings" data-no-i18n><div class="helpLanguage"><span>HELP LANGUAGE</span><div class="choiceControl segmented" role="group" aria-label="Help language"><button data-language="en" aria-pressed="${!zh}">EN</button><button data-language="zh" aria-pressed="${zh}">ZH</button></div></div>
   <div class="helpLanguage"><span>THEME</span><div class="choiceControl segmented" role="group" aria-label="Theme"><button data-typeface="pixel" aria-pressed="${typography.value==='pixel'}">PIXEL</button><button data-typeface="dots" aria-pressed="${typography.value==='dots'}">DOTO</button></div></div>
   <label class="shakeSetting"><span>SHAKE PALETTE</span><input id="shakePalette" type="checkbox" ${shake.enabled?'checked':''}></label>
   <p class="shellNote helpCopy" lang="${zh?'zh-CN':'en'}">${zh?'摇动手机可依次切换五套配色，不影响播放。':'Shake your iPhone to cycle through five palettes without interrupting playback.'}</p><p id="languageMessage" role="status"></p></div><section class="factoryProjects" data-no-i18n><h2>PROJECTS TO PLAY</h2><p class="shellNote helpCopy" lang="${zh?'zh-CN':'en'}">${zh?'载入前自动保存当前工程副本；载入后点播放试听。':'Your current project is saved as a copy before loading. Tap Play to listen.'}</p>${projects.map(p=>`<div class="factoryRow"><div><strong>${p.name}</strong><small>${p.bpm} BPM · ${p.summary}</small></div><button data-factory="${p.id}" aria-label="Load ${p.name}">LOAD</button></div>`).join('')}<p id="factoryMessage" role="status"></p></section><dl class="quickGuide helpCopy" lang="${zh?'zh-CN':'en'}" data-no-i18n>${guides.map(g=>`<dt>${g[zh?1:0]}</dt><dd>${g[zh?3:2]}</dd>`).join('')}</dl>`;
  panel.querySelector('#closeHelp').onclick=()=>panel.close();
  for(const b of panel.querySelectorAll('[data-typeface]'))b.onclick=()=>{typography.set(b.dataset.typeface);for(const choice of panel.querySelectorAll('[data-typeface]'))choice.setAttribute('aria-pressed',String(choice.dataset.typeface===typography.value));};
  for(const b of panel.querySelectorAll('[data-factory]'))b.onclick=async()=>{
   if(busy)return;busy=true;for(const choice of panel.querySelectorAll('button'))choice.disabled=true;
   try{await loadFactory(b.dataset.factory);panel.close();}
   catch(error){panel.querySelector('#factoryMessage').textContent=error.message;}
   finally{busy=false;for(const choice of panel.querySelectorAll('button'))choice.disabled=false;}
  };
  panel.querySelector('#shakePalette').onchange=e=>shake.setEnabled(e.target.checked);
  for(const choice of panel.querySelectorAll('[data-language]'))choice.onclick=async()=>{
   if(busy||choice.dataset.language===locale.language)return;
   busy=true;for(const b of panel.querySelectorAll('[data-language]'))b.disabled=true;
   try{await changeLanguage(choice.dataset.language);panel.querySelector(`[data-language="${locale.language}"]`).focus();}
   catch{panel.querySelector('#languageMessage').textContent=zh?'语言设置未保存，请重试。':'Could not save language. Please try again.';}
   finally{busy=false;for(const b of panel.querySelectorAll('[data-language]'))b.disabled=false;}
  };
  button.setAttribute('aria-label','Settings and guide');
 }
 window.addEventListener('loopfield-help-language-changed',render);render();
 button.removeAttribute('aria-pressed');button.setAttribute('aria-haspopup','dialog');button.onclick=()=>panel.showModal();
}
