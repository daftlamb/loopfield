const entries=[
 ['#grid','音序格','点按开关音符。长按格子约三分之一秒，再上下拖动，调整当前选中的 NOTE、VEL、CHANCE、RATCHET 或 GATE。长按选择不会开关音符。'],
 ['#modes','编辑模式','NOTE 音高；VEL 力度；CHANCE 触发概率；RATCHET 一格内的连击；GATE 持续时间。LFO 和 ARP 打开调制与琶音预设，点省略号可细调。'],
 ['.stepedit','当前步参数','这里修改选中步，修改时会开启该音符。GATE 的 100% 等于一格时长，AUTO 使用原音色包络。'],
 ['#tracks','八轨','点数字切换编辑音轨，所有未静音的轨道仍会一起播放。进入音色页可 MUTE 静音或 SOLO 独奏。'],
 ['.quickSound','快捷音色','LEVEL 音量、DECAY 衰减、FILTER 截止频率、RES 共振。参数作用于当前轨道；更多音色参数在音色页。'],
 ['.transport','播放','点播放启动音频，使用手机媒体音量。切到后台或遇到音频中断时自动停止，返回后手动播放。'],
 ['#patternSelect','乐段','选择当前 Pattern。播放中切换会等当前 32 步走完；SONG 模式按照编排播放。'],
 ['#openTools','音序工具','随机只改当前模式的参数；清空只清当前轨道。新建、复制乐段、八度、调式转换也在这里。'],
 ['#undo','撤销','撤回最近一次音序或音色编辑，也能恢复载入项目之前的编辑。退出 App 后撤销历史不保留。'],
 ['.stepPages','步进分页','每个 Pattern 共 32 步，这里切换前后两页。翻页只改变编辑区域，不改变播放顺序。'],
 ['.mobileNav','导航','音序、编排、音色、效果、画面。切页不打断播放；工程保存和导出在顶部项目名称中。'],
 ['#shellProject','工程','自动保存当前编辑；保存副本保留一个版本。JSON 可在网页与 App 间交换，WAV 导出声音。'],
 ['.fxPanel','效果','选择 MASTER 总线或单独音轨，再启用效果。效果可以叠加，开关与参数都随项目保存。'],
 ['.songPanel','编排','依次选择乐段与重复次数，切换为 SONG 后播放。播放中锁定编排，停止后可以修改。'],
 ['.soundPanel','音色','选择合成方式并调整参数。灰色参数不适用于当前音色。MUTE 静音，SOLO 支持多轨独奏。'],
 ['.visualPanel','画面','当前保留原场景素材与声音响应。绘制独立于音序器，离开画面页停止绘制，音乐继续。']
];
export function installHelp(){
 const button=document.querySelector('#shellHelp');let active=false;
 const panel=document.createElement('dialog');panel.id='helpDialog';panel.innerHTML='<div class="dialogHead"><span id="helpTitle"></span><button aria-label="关闭帮助">×</button></div><p id="helpText"></p>';
 document.body.append(panel);panel.querySelector('button').onclick=()=>panel.close();
 function toggle(){active=!active;document.body.classList.toggle('helpMode',active);button.setAttribute('aria-pressed',String(active));button.textContent=active?'×':'?';}
 button.onclick=toggle;
 for(const [selector] of entries)document.querySelector(selector)?.setAttribute('data-help','');
 function helpTarget(event){
  if(!active||event.target.closest('#shellHelp,dialog'))return false;
  return entries.find(([selector])=>event.target.closest(selector));
 }
 // Capture before long-press/pointer handlers so inspecting help cannot edit a rhythm.
 for(const type of ['pointerdown','touchstart','mousedown','keydown'])document.addEventListener(type,e=>{
  if(!helpTarget(e))return;if(type==='keydown'&&!['Enter',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
  if(type!=='pointerdown'&&type!=='touchstart')e.preventDefault();e.stopImmediatePropagation();
 },{capture:true,passive:false});
 document.addEventListener('click',e=>{const item=helpTarget(e);if(!item)return;e.preventDefault();e.stopImmediatePropagation();panel.querySelector('#helpTitle').textContent=item[1];panel.querySelector('#helpText').textContent=item[2];panel.showModal();},true);
}
