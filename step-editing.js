// Pitch continuation is scoped to the editable track object, not saved music.
// Project replacement / undo naturally starts a fresh edit context.
export function createPitchContinuation(){
 const pitches=new WeakMap();
 return {
  remember(track,note){pitches.set(track,note);},
  next(track,fallback){return pitches.get(track)??fallback;},
  toggle(track,index,mode){
   const step=track.steps[index];
   if(!step.on&&mode==='note')step.note=pitches.get(track)??step.note;
   step.on=!step.on;
  }
 };
}
export const dragDistance=mode=>mode==='note'?11:14;
