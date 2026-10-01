// Display-only spelling: enharmonic notes keep their original MIDI values.
export function displayCopy(text){
 return text.replace(/([CDFGA])♯/g,(_,n)=>({C:'Db',D:'Eb',F:'Gb',G:'Ab',A:'Bb'})[n])
  .replace(/(\d+(?:\.\d+)?) beats\b/g,'$1b').replaceAll('♯','#').replaceAll('−','-').replaceAll('—','-').replaceAll('–','-')
  .replaceAll('→','>').replaceAll('←','<').replaceAll('×','x').replaceAll('∞','INF');
}
