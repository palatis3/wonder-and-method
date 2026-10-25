import {escapeHtml} from './shared.mjs';

const sentences=new Intl.Segmenter('en',{granularity:'sentence'});
const countWords=text=>(text.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)||[]).length;

// Group complete sentences for easier scanning. The words, order and factual
// qualifications stay intact; a long sentence is never cut in the middle.
export function readableParagraphs(text,{maxWords=70}={}){
 const value=String(text||'').trim();
 if(!value)return '';
 const paragraphs=[];let current='',words=0;
 for(const {segment} of sentences.segment(value)){
  const sentence=segment.trim(),nextWords=countWords(sentence);
  if(current&&words+nextWords>maxWords){paragraphs.push(current);current='';words=0;}
  current+=(current?' ':'')+sentence;words+=nextWords;
 }
 if(current)paragraphs.push(current);
 return paragraphs.map(paragraph=>'<p>'+escapeHtml(paragraph)+'</p>').join('');
}
