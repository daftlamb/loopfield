// Pointer gestures share tap history so tapping another track breaks a double tap.
export function installTrackGestures(buttons,{select,toggle,context,now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout}){
 let press=null,lastTap=null;
 function end(){if(press)cancel(press.timer);press=null;}
 buttons.forEach((button,index)=>{
  let suppressClick=false;
  button.addEventListener('pointerdown',event=>{
   if(event.button!==0||event.isPrimary===false)return;
   end();suppressClick=false;
   const current=context();
   const state={index,id:event.pointerId,x:event.clientX,y:event.clientY,current,held:false,cancelled:false};
   press=state;
   state.timer=schedule(()=>{
    if(press!==state||context()!==current)return;
    state.held=true;lastTap=null;suppressClick=true;toggle(index,'solo');
   },450);
   button.setPointerCapture?.(event.pointerId);
  });
  button.addEventListener('pointermove',event=>{
   if(press?.id!==event.pointerId)return;
   if(Math.hypot(event.clientX-press.x,event.clientY-press.y)>10){
    cancel(press.timer);press.cancelled=true;suppressClick=true;lastTap=null;
   }
  });
  button.addEventListener('pointerup',event=>{
   if(press?.id!==event.pointerId||press.index!==index)return;
   const state=press;end();
   if(state.held||state.cancelled||context()!==state.current){suppressClick=true;lastTap=null;return;}
   const time=now();
   if(lastTap?.index===index&&lastTap.current===state.current&&time-lastTap.time<=300){
    lastTap=null;toggle(index,'mute');
   }else lastTap={index,current:state.current,time};
  });
  const abort=()=>{if(press?.index===index){end();suppressClick=true;lastTap=null;}};
  button.addEventListener('pointercancel',abort);
  button.addEventListener('lostpointercapture',abort);
  button.addEventListener('contextmenu',event=>event.preventDefault());
  button.addEventListener('click',event=>{
   if(suppressClick){suppressClick=false;event.preventDefault();return;}
   select(index);
  });
 });
}
