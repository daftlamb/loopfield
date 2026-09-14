export function installHelp(){
 const button=document.querySelector('#shellHelp');
 const panel=document.createElement('dialog');panel.id='helpDialog';
 panel.innerHTML=`<div class="dialogHead"><span>QUICK GUIDE</span><button aria-label="Close help">×</button></div>
 <dl class="quickGuide">
 <dt>PLAY</dt><dd>Start or stop the loop. Audio pauses when the app enters the background.</dd>
 <dt>SEQUENCE</dt><dd>Tap a step to switch it on or off. Hold and drag up or down to edit the selected parameter. Each pattern has two pages of 16 steps.</dd>
 <dt>TRACKS</dt><dd>Numbers 1–8 select the track you edit. All unmuted tracks play together.</dd>
 <dt>VALUES</dt><dd>Tap a choice or use the left and right arrows. Hold a pitch arrow to move through notes.</dd>
 <dt>SONG</dt><dd>Arrange patterns and repeats, then select SONG. Stop playback to edit the arrangement.</dd>
 <dt>SOUND / FX</dt><dd>Choose a voice and shape its sound. Apply effects to MASTER or an individual track.</dd>
 <dt>PROJECT</dt><dd>Tap the project name above to save a copy, import or export. Your current edits save automatically.</dd>
 </dl>`;
 document.body.append(panel);panel.querySelector('button').onclick=()=>panel.close();
 button.setAttribute('aria-label','Quick guide');button.removeAttribute('aria-pressed');button.setAttribute('aria-haspopup','dialog');
 button.onclick=()=>panel.showModal();
}
