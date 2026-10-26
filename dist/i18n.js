// UI-only translation: project data, user text and engineering source drawings stay intact.
import {EN} from './locales/en.js';
export let language='zh';
try{language=localStorage.getItem('snowflake-language')==='en'?'en':'zh';}catch{}
const cache=new Map();
export const localizedName=text=>language==='en'?(EN[text]||text):text;
const pairs=Object.entries(EN).sort((a,b)=>b[0].length-a[0].length);
export function t(text){
 if(language!=='en')return String(text);
 const value=String(text),trimmed=value.trim();
 if(!/[\u3400-\u9fff]/.test(value))return value;
 if(cache.has(value))return cache.get(value);
 if(EN[trimmed])return value.replace(trimmed,EN[trimmed]);
 // Compose dynamic counters, statuses and effect-layer labels from translated phrases.
 let out=value.replace(/J2 第 (\d+) 脚/g,'J2 Pin $1');for(const [zh,en]of pairs)if(out.includes(zh))out=out.split(zh).join(en);
 if(cache.size>1500)cache.clear();cache.set(value,out);return out;
}
const originals=new WeakMap(),attributes=new WeakMap();
const skip=el=>!el||!!el.closest('script,style,svg,.user-message,.result-message,[data-i18n-skip]');
function textNode(node){if(skip(node.parentElement))return;let saved=originals.get(node);if(!saved||node.data!==saved.rendered)saved={source:node.data};const next=t(saved.source);if(node.data!==next)node.data=next;saved.rendered=next;originals.set(node,saved);}
function element(el){if(skip(el))return;let saved=attributes.get(el)||{};for(const key of ['title','placeholder','aria-label','alt']){const value=el.getAttribute(key);if(value===null)continue;let entry=saved[key];if(!entry||value!==entry.rendered)entry={source:value};const next=t(entry.source);if(value!==next)el.setAttribute(key,next);entry.rendered=next;saved[key]=entry;}attributes.set(el,saved);}
function translate(root){if(root.nodeType===Node.TEXT_NODE){textNode(root);return;}if(root.nodeType!==Node.ELEMENT_NODE)return;if(skip(root))return;element(root);const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);while(walker.nextNode()){const n=walker.currentNode;n.nodeType===Node.TEXT_NODE?textNode(n):element(n);}}
const config={subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label','alt']};
const observer=new MutationObserver(records=>{observer.disconnect();for(const record of records){if(record.type==='childList')record.addedNodes.forEach(translate);else if(record.type==='characterData')textNode(record.target);else element(record.target);}observer.observe(document.documentElement,config);});
export function setLanguage(value){language=value==='en'?'en':'zh';try{localStorage.setItem('snowflake-language',language);}catch{}observer.disconnect();document.documentElement.lang=language==='en'?'en':'zh-CN';translate(document.documentElement);document.querySelectorAll('.language-select').forEach(el=>el.value=language);observer.observe(document.documentElement,config);window.dispatchEvent(new CustomEvent('languagechange',{detail:language}));}
document.querySelectorAll('.language-select').forEach(el=>el.addEventListener('change',()=>setLanguage(el.value)));
setLanguage(language);
