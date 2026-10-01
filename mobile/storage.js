import {validateProject,clone,songOrder} from '../model.js';
import {projectTail} from '../audio.js';
export const PROJECT_KEY='loopfield-project-v1';
export const RECOVERY_KEY='loopfield-ios-recovery-v1';
export const LIBRARY_KEY='loopfield-ios-library-v1';
export const MAX_FILE_BYTES=16_000_000;
export function parseProject(text){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_FILE_BYTES)throw Error('项目文件过大');
  return validateProject(JSON.parse(text));
}
export function restoreLatest(values){
  const valid=[];
  for(const text of values){try{
    if(!text)continue;const data=JSON.parse(text);
    const wrapped=data.project&&Number.isFinite(data.savedAt);
    valid.push({savedAt:wrapped?data.savedAt:0,project:validateProject(clone(wrapped?data.project:data))});
  }catch{}}
  valid.sort((a,b)=>b.savedAt-a.savedAt);
  return valid[0]??null;
}
export function readLibrary(text){
  if(!text)return [];const data=JSON.parse(text);
  if(!Array.isArray(data)||data.length>50)throw Error('工程列表格式不正确');
  return data.map(item=>{
    if(!item||typeof item.id!=='string'||typeof item.name!=='string'||item.name.length>80||!Number.isFinite(item.savedAt))throw Error('工程副本格式不正确');
    return {...item,project:validateProject(clone(item.project))};
  });
}
// Linear writes prevent a slow native write from replacing a newer edit.
export function createWriter(write,onError=()=>{}){
  let pending=Promise.resolve();
  return (key,value)=>{
    const result=pending.then(()=>write({key,value}));
    pending=result.catch(onError);
    return result;
  };
}
export function exportBudget(project,mode){
  const bars=(mode==='song'?songOrder(project).length:1)*2;
  const seconds=bars*4*60/project.bpm+projectTail(project);
  // Float32 stereo render + PCM16 output. Native transfer/FX need additional headroom.
  const minimumBytes=Math.ceil(seconds*44100)*12;
  return {seconds,minimumBytes,allowed:seconds<=180};
}
export function safeFilename(name,extension){
  return (name.replace(/[^\p{L}\p{N}_ -]/gu,'').trim().slice(0,60)||'loopfield')+'.'+extension;
}
