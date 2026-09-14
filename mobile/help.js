export function installHelp({locale,shake,changeLanguage}){
 const button=document.querySelector('#shellHelp');
 const panel=document.createElement('dialog');panel.id='helpDialog';document.body.append(panel);
 const guides=[
 ['PLAY','播放','Start or stop the loop. Audio pauses when the app enters the background.','点按播放或停止。进入后台时自动暂停。'],
 ['SEQUENCE','音序','Tap a step to switch it on or off. Hold and drag up or down to edit the selected parameter. Each pattern has two pages of 16 steps.','点按格子开关音符，长按后上下拖动可调整当前参数。每个乐段共 32 步，分为两页。'],
 ['RANDOM','随机参数','Choose NOTE, VEL, CHANCE, RATCHET or GATE, then open TOOLS and tap RANDOM. It changes that parameter on the current track. Use UNDO to restore it.','先选 NOTE、VEL、CHANCE、RATCHET 或 GATE，再打开「工具」点随机按钮，只随机当前音轨的对应参数。点「撤销」可恢复。'],
 ['TRACKS','音轨','Numbers 1–8 select the track you edit. All unmuted tracks play together.','数字 1–8 切换编辑音轨。所有未静音的音轨一起播放。'],
 ['VALUES','参数切换','Tap a choice or use the left and right arrows. Hold a pitch arrow to move through notes.','点选选项或用左右箭头切换。长按音高箭头可连续调节。'],
 ['SONG','编排','Arrange patterns and repeats, then select SONG. Stop playback to edit the arrangement.','设置乐段顺序和重复次数，再选 SONG 播放。停止播放后可修改编排。'],
 ['SOUND / FX','音色 / 效果','Choose a voice and shape its sound. Apply effects to MASTER or an individual track.','选择音色并调整参数。效果可作用于总线或单独音轨。'],
 ['PROJECT','工程','Tap the project name above to save a copy, import or export. Your current edits save automatically.','点顶部工程名称可保存副本、导入或导出。当前编辑会自动保存。']
 ];
 let busy=false;
 function render(){
  const zh=locale.language==='zh';
  panel.innerHTML=`<div class="dialogHead"><span>${zh?'设置与帮助':'SETTINGS / GUIDE'}</span><button id="closeHelp" aria-label="${zh?'关闭帮助':'Close help'}">×</button></div>
   <div class="helpSettings" data-no-i18n><div class="helpLanguage"><span>${zh?'语言':'LANGUAGE'}</span><div class="choiceControl segmented" role="group" aria-label="Language / 语言"><button data-language="en" aria-pressed="${!zh}">ENGLISH</button><button data-language="zh" aria-pressed="${zh}">中文</button></div></div>
   <label class="shakeSetting"><span>${zh?'摇一摇切换配色':'SHAKE TO CHANGE PALETTE'}</span><input id="shakePalette" type="checkbox" ${shake.enabled?'checked':''}></label>
   <p class="shellNote">${zh?'摇动 iPhone 可依次切换五套配色，不影响播放。':'Shake your iPhone to cycle through five palettes without interrupting playback.'}</p><p id="languageMessage" role="status"></p></div><dl class="quickGuide" data-no-i18n>${guides.map(g=>`<dt>${g[zh?1:0]}</dt><dd>${g[zh?3:2]}</dd>`).join('')}</dl>`;
  panel.querySelector('#closeHelp').onclick=()=>panel.close();
  panel.querySelector('#shakePalette').onchange=e=>shake.setEnabled(e.target.checked);
  for(const choice of panel.querySelectorAll('[data-language]'))choice.onclick=async()=>{
   if(busy||choice.dataset.language===locale.language)return;
   busy=true;for(const b of panel.querySelectorAll('[data-language]'))b.disabled=true;
   try{await changeLanguage(choice.dataset.language);panel.querySelector(`[data-language="${locale.language}"]`).focus();}
   catch{panel.querySelector('#languageMessage').textContent=zh?'语言设置未保存，请重试。':'Could not save language. Please try again.';}
   finally{busy=false;for(const b of panel.querySelectorAll('[data-language]'))b.disabled=false;}
  };
  button.setAttribute('aria-label',zh?'设置与帮助':'Settings and guide');
 }
 window.addEventListener('loopfield-language-changed',render);render();
 button.removeAttribute('aria-pressed');button.setAttribute('aria-haspopup','dialog');button.onclick=()=>panel.showModal();
}
