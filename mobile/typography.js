const key='loopfield-typeface-v1';
export function installTypography(){
 let value='pixel';try{if(localStorage.getItem(key)==='dots')value='dots';}catch{}
 const apply=()=>document.documentElement.dataset.typeface=value;apply();
 return {get value(){return value;},set(next){value=next==='dots'?'dots':'pixel';try{localStorage.setItem(key,value);}catch{}apply();}};
}
