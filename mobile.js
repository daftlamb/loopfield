export function draggedValue(mode,start,steps){
  if(mode==='note')return Math.max(24,Math.min(96,start+steps));
  if(mode==='ratchet')return Math.max(1,Math.min(8,start+steps));
  return Math.max(mode==='velocity'?0.05:0,Math.min(1,Math.round((start+steps*.05)*100)/100));
}
export function setupMobile({buttons,selectTrack,selectStep,read,checkpoint,change}){
  const nav=document.querySelector('.mobileNav');document.body.dataset.mobileTab='sequence';
  nav.onclick=e=>{const button=e.target.closest('[data-tab]');if(!button)return;document.body.dataset.mobileTab=button.dataset.tab;nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));window.scrollTo({top:0,behavior:'instant'});};
  document.querySelector('#mobileTrack').onchange=e=>selectTrack(Number(e.target.value));
  buttons.forEach((button,i)=>{
    let timer,gesture=null,suppressClick=false;
    button.addEventListener('touchstart',e=>{
      clearTimeout(timer);suppressClick=false;if(e.touches.length!==1){gesture=null;return;}
      const touch=e.touches[0];gesture={x:touch.clientX,y:touch.clientY,active:false,changed:false,last:0,...read(i)};
      timer=setTimeout(()=>{if(!gesture)return;gesture.active=true;suppressClick=true;selectStep(i);button.classList.add('touchEditing');},320);
    },{passive:true});
    button.addEventListener('touchmove',e=>{
      if(!gesture)return;
      if(e.touches.length!==1){clearTimeout(timer);button.classList.remove('touchEditing');gesture=null;return;}
      const touch=e.touches[0];
      if(!gesture.active){if(Math.hypot(touch.clientX-gesture.x,touch.clientY-gesture.y)>8){clearTimeout(timer);gesture=null;}return;}
      if(e.cancelable)e.preventDefault();
      const steps=Math.round((gesture.y-touch.clientY)/14);if(steps===gesture.last)return;
      const value=draggedValue(gesture.mode,gesture.value,steps);gesture.last=steps;
      if(!gesture.changed){checkpoint();gesture.changed=true;}
      change(i,gesture.mode,value);
    },{passive:false});
    const end=()=>{clearTimeout(timer);gesture=null;button.classList.remove('touchEditing');};
    button.addEventListener('touchend',end);button.addEventListener('touchcancel',end);
    button.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}},true);
  });
}
