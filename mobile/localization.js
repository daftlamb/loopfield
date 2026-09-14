import {english} from './english.js';
export const LANGUAGE_KEY='loopfield-language-v1';
export const normalizeLanguage=value=>value==='zh'?'zh':'en';

// Translate UI text at its DOM boundary. Model values, editable fields and user
// project / track names never pass through the copy catalog.
export function installLocalization(initialLanguage){
 let language=normalizeLanguage(initialLanguage);
 const textSources=new WeakMap(),attributeSources=new WeakMap();
 const excluded='script,style,textarea,[data-no-i18n],#shellProject,#quickName,#soundName,#modTrack,#modTitle,.libraryRow>span';
 const attributes=['aria-label','title','placeholder'];
 function value(source){return language==='en'?english(source):source;}
 function text(node){
  if(!node.parentElement||node.parentElement.closest(excluded))return;
  const current=node.data,previous=textSources.get(node);
  const source=previous&&current===previous.rendered?previous.source:current;
  const rendered=value(source);textSources.set(node,{source,rendered});
  if(current!==rendered)node.data=rendered;
 }
 function attribute(element,name){
  if(element.closest('script,style,textarea,[data-no-i18n]'))return;
  const current=element.getAttribute(name);if(current===null)return;
  let sources=attributeSources.get(element);if(!sources){sources={};attributeSources.set(element,sources);}
  const previous=sources[name],source=previous&&current===previous.rendered?previous.source:current;
  const rendered=value(source);sources[name]={source,rendered};
  if(current!==rendered)element.setAttribute(name,rendered);
 }
 function subtree(root){
  if(root.nodeType===Node.TEXT_NODE){text(root);return;}
  if(root.nodeType!==Node.ELEMENT_NODE||root.closest('script,style,textarea,[data-no-i18n]'))return;
  for(const name of attributes)attribute(root,name);
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
  let node;while((node=walker.nextNode())){
   if(node.nodeType===Node.TEXT_NODE)text(node);else for(const name of attributes)attribute(node,name);
  }
 }
 const observer=new MutationObserver(records=>{
  for(const record of records){
   if(record.type==='characterData')text(record.target);
   else if(record.type==='attributes')attribute(record.target,record.attributeName);
   else for(const node of record.addedNodes)subtree(node);
  }
 });
 observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});
 function apply(next){language=normalizeLanguage(next);document.documentElement.lang=language==='zh'?'zh-CN':'en';subtree(document.body);window.dispatchEvent(new Event('loopfield-language-changed'));}
 apply(language);
 return {get language(){return language;},setLanguage:apply};
}
