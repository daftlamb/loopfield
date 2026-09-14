export const SHAKE_PALETTE_KEY='loopfield-shake-palette-v1';
export function nextPalette(values,current){const index=values.indexOf(current);return values[(index+1)%values.length]??current;}
export function installShakePalette(){
 let enabled=true,lastShake=-Infinity;
 try{enabled=localStorage.getItem(SHAKE_PALETTE_KEY)!=='off';}catch{}
 const select=document.querySelector('#palette');
 function appearance(){window.webkit?.messageHandlers?.loopfieldAppearance?.postMessage(select.value);}
 select.addEventListener('change',appearance);appearance();
 window.addEventListener('loopfield-shake',()=>{
  if(!enabled||document.hidden||document.activeElement?.matches('input:not([type=range]):not([type=checkbox]),textarea'))return;
  const now=performance.now();if(now-lastShake<1200)return;lastShake=now;
  select.value=nextPalette([...select.options].map(option=>option.value),select.value);
  select.dispatchEvent(new Event('change',{bubbles:true}));
 });
 return {get enabled(){return enabled;},setEnabled(value){enabled=!!value;try{localStorage.setItem(SHAKE_PALETTE_KEY,enabled?'on':'off');}catch{}}};
}
