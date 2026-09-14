// Keep the existing select elements as model adapters, with no native picker UI.
export function installChoiceControls(){
  const controls=new Map();
  const segmented=new Set(['playMode','exportMode','pitchScope','lfoSync','lfoSmooth','lfoRetrigger','arpStyle']);
  let scheduled=false;
  function refresh(){
    scheduled=false;
    for(const [select,control] of controls){if(!select.isConnected){control.box.remove();controls.delete(select);}}
    for(const select of document.querySelectorAll('select')){
      if(select.id==='mobileTrack'||select.closest('.midiPanel'))continue;
      let control=controls.get(select);
      if(!control){
        const box=document.createElement('span');box.className='choiceControl';box.dataset.for=select.id||'dynamic';box.setAttribute('role','group');
        select.after(box);select.hidden=true;select.tabIndex=-1;
        control={box,signature:''};controls.set(select,control);
      }
      const {box}=control,options=[...select.options],label=select.getAttribute('aria-label')||[...(select.closest('label')?.childNodes||[])].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ')||'Value';
      box.setAttribute('aria-label',label);
      const isSegmented=segmented.has(select.id);
      const signature=JSON.stringify([options.map(o=>[o.value,o.text,o.disabled]),select.disabled,isSegmented,document.documentElement.lang]);
      const choose=index=>{
        if(select.disabled||!options[index]||options[index].disabled)return;
        select.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
        select.selectedIndex=index;
        select.dispatchEvent(new Event('input',{bubbles:true}));
        select.dispatchEvent(new Event('change',{bubbles:true}));
        schedule();
      };
      if(control.signature!==signature){
        control.signature=signature;box.replaceChildren();box.classList.toggle('segmented',isSegmented);
        if(isSegmented){options.forEach((option,index)=>{const b=document.createElement('button');b.type='button';b.textContent=option.text;b.disabled=select.disabled||option.disabled;b.onclick=()=>choose(index);box.append(b);});}
        else {
          const prev=document.createElement('button'),value=document.createElement('span'),next=document.createElement('button');
          prev.type=next.type='button';prev.textContent='‹';next.textContent='›';value.className='choiceValue';value.setAttribute('aria-live','polite');
          const zh=document.documentElement.lang==='zh-CN';prev.setAttribute('aria-label',(zh?'上一项 ':'Previous ')+label);next.setAttribute('aria-label',(zh?'下一项 ':'Next ')+label);
          function move(direction){let i=select.selectedIndex;for(let n=0;n<options.length;n++){i+=direction;if(select.id==='note'&&(i<0||i>=options.length))return;i=(i+options.length)%options.length;if(!options[i].disabled){choose(i);return;}}}
          for(const [b,direction] of [[prev,-1],[next,1]]){
            b.disabled=select.disabled||options.length<2;b.onclick=()=>move(direction);
            // Repeat only pitch steps; all other values are deliberate single taps.
            if(select.id==='note'){
              let delay,repeat,repeated=false;
              const stop=()=>{clearTimeout(delay);clearInterval(repeat);};
              b.onpointerdown=e=>{if(e.button!==0)return;repeated=false;b.setPointerCapture(e.pointerId);delay=setTimeout(()=>{repeated=true;move(direction);repeat=setInterval(()=>move(direction),110);},400);};
              b.onpointerup=b.onpointercancel=b.onlostpointercapture=stop;
              b.onclick=()=>{stop();if(!repeated)move(direction);repeated=false;};
              window.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
            }
          }
          box.append(prev,value,next);
        }
        box.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();choose(e.key==='Home'?0:e.key==='End'?options.length-1:Math.max(0,Math.min(options.length-1,select.selectedIndex+(e.key==='ArrowRight'?1:-1))));};
      }
      if(isSegmented)[...box.children].forEach((b,i)=>{const state=String(i===select.selectedIndex);if(b.getAttribute('aria-pressed')!==state)b.setAttribute('aria-pressed',state);});
      else {const value=box.querySelector('.choiceValue'),text=options[select.selectedIndex]?.text||'—';if(value.textContent!==text)value.textContent=text;}
    }
  }
  function schedule(){if(!scheduled){scheduled=true;queueMicrotask(refresh);}}
  new MutationObserver(records=>{if(records.some(r=>r.target.matches?.('select,option,optgroup')||[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches('select')||n.querySelector('select')))))schedule();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','aria-label']});
  for(const event of ['input','change','click','pointerup'])document.addEventListener(event,schedule);
  for(const event of ['loopfield-editor-changed','loopfield-project-changed','loopfield-tab-changed','loopfield-language-changed'])window.addEventListener(event,schedule);
  refresh();
}
