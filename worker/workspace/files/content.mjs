import {unzipSync} from 'fflate';
import {FILE_TYPES,MAX_FILE_BYTES,WorkspaceError} from '../../../src/workspace/domain/contracts.mjs';
const fail=message=>{throw new WorkspaceError('invalid_file',message,400);};
export async function readBounded(stream,max=MAX_FILE_BYTES){
  if(!stream)fail('The file is empty.');const reader=stream.getReader(),chunks=[];let total=0;
  for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>max){await reader.cancel();fail('The file exceeds the allowed size.');}chunks.push(value);}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
export async function sha256(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
const starts=(bytes,signature)=>signature.every((x,i)=>bytes[i]===x);
const ascii=(bytes,start,end)=>new TextDecoder().decode(bytes.subarray(start,end));
export function verifyContent(bytes,{name,media_type,bytes:declaredBytes}){
  if(bytes.length!==Number(declaredBytes)||bytes.length<1||bytes.length>MAX_FILE_BYTES)fail('The file size does not match the upload.');
  const ext=name.split('.').at(-1).toLowerCase();if(FILE_TYPES[ext]!==media_type)fail('The filename and type do not match.');
  if(/[/\\\x00-\x1f]/.test(name))fail('Choose a simple filename.');
  if(ext==='png'&&!starts(bytes,[137,80,78,71,13,10,26,10]))fail('This is not a PNG file.');
  if(['jpg','jpeg'].includes(ext)&&!starts(bytes,[255,216,255]))fail('This is not a JPEG file.');
  if(ext==='webp'&&(ascii(bytes,0,4)!=='RIFF'||ascii(bytes,8,12)!=='WEBP'))fail('This is not a WebP file.');
  if(ext==='pdf'&&ascii(bytes,0,5)!=='%PDF-')fail('This is not a PDF file.');
  if(['txt','csv'].includes(ext)){
    let value;try{value=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{fail('Text and CSV files must use UTF-8 encoding.');}
    if(/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)||/^\s*(?:<!doctype html|<html|<script|<svg|#!)/i.test(value))fail('This file contains an unsupported content type.');
  }
  if(['docx','xlsx'].includes(ext)){
    if(!starts(bytes,[80,75,3,4]))fail('This is not a supported Office document.');
    let count=0,total=0,names=[],entries;
    try{entries=unzipSync(bytes,{filter:file=>{
      count++;total+=file.originalSize;names.push(file.name);
      if(count>1000||total>50*1024*1024||file.originalSize>20*1024*1024||file.originalSize>Math.max(1,file.size)*200||file.name.includes('..')||file.name.startsWith('/')||file.name.includes('\\')||/vbaProject|\.exe$|\.js$|\.html?$|\.bin$/i.test(file.name))throw new Error('Unsupported archive');
      const needed=['[Content_Types].xml','word/document.xml','xl/workbook.xml'].includes(file.name);
      if(needed&&file.originalSize>2*1024*1024)throw new Error('Metadata too large');return needed;
    }});}catch{fail('This Office file is invalid, encrypted, or exceeds safe document limits.');}
    if(!entries['[Content_Types].xml']||!entries[ext==='docx'?'word/document.xml':'xl/workbook.xml'])fail('This is not the declared Office document type.');
    const xml=Object.values(entries).map(x=>new TextDecoder().decode(x)).join('\n');
    if(/<!ENTITY|<!DOCTYPE|macroEnabled|vbaProject/i.test(xml))fail('Macros and external XML entities are not accepted.');
  }
  return media_type;
}
export const SCAN_POLICY='cloudmersive-advanced-strict-v1';
export function cleanScanResult(result){
  const flags=['ContainsExecutable','ContainsInvalidFile','ContainsScript','ContainsPasswordProtectedFile','ContainsRestrictedFileFormat','ContainsMacros','ContainsXmlExternalEntities','ContainsInsecureDeserialization','ContainsHtml','ContainsUnsafeArchive'];
  // A partial/malformed provider response is not a clean scan.
  if(typeof result?.CleanResult!=='boolean'||flags.some(k=>typeof result[k]!=='boolean'))return {complete:false,clean:false};
  return {complete:true,clean:result.CleanResult===true&&flags.every(k=>result[k]===false)&&(!result.FoundViruses||Array.isArray(result.FoundViruses)&&result.FoundViruses.length===0)};
}
