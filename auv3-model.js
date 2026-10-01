export const hasInstruments=p=>p.instruments?.some(Boolean)??false;
export function validateInstruments(p){
 if(p.instruments===undefined)return;
 if(!Array.isArray(p.instruments)||p.instruments.length!==8)throw Error('Invalid AUv3 track assignments');
 let size=0;
 for(const slot of p.instruments){
  if(slot===null)continue;
  if(!slot||typeof slot.name!=='string'||slot.name.length>256||typeof slot.id!=='string'||!/^\d+:\d+:\d+$/.test(slot.id))throw Error('Invalid AUv3 instrument');
  if(slot.state!==undefined&&(typeof slot.state!=='string'||slot.state.length>2_000_000||!/^[A-Za-z0-9+/]*={0,2}$/.test(slot.state)))throw Error('Invalid AUv3 state');
  size+=slot.state?.length??0;
 }
 if(size>12_000_000)throw Error('AUv3 states exceed the project limit');
}
// Map the Web Audio output clock onto the host's wall clock, including device latency.
export function nativeNoteEvents(notes,ctx,wall=Date.now(),perf=performance.now()){
 const stamp=ctx.getOutputTimestamp?.();
 const offset=stamp?.performanceTime>0?wall-perf+stamp.performanceTime-stamp.contextTime*1000:wall-ctx.currentTime*1000;
 return notes.map(n=>({note:n.note,velocity:n.velocity,at:offset+n.time*1000,duration:n.duration}));
}
