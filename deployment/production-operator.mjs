import {mkdir,writeFile,readFile,realpath} from 'node:fs/promises';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readProductionCredentials} from './production-credentials.mjs';

const root=resolve(import.meta.dirname,'..');
const origin='https://wonderandmethod.com';
const referencePattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

export async function productionOperator(args,{workspace=root,fetchImpl=fetch,credentials=readProductionCredentials,now=()=>new Date()}={}){
 const [action,label,confirmation,...extra]=args;
 if((action==='followup'?extra.length!==1:extra.length)||!['status','export','retry','delete','measurement','retention-preview','followup'].includes(action))throw Error('Use status; export LABEL; measurement [DAYS]; retention-preview; followup REFERENCE CONFIRM_REFERENCE FILE; or retry|delete REFERENCE CONFIRM_REFERENCE.');
 if(['status','retention-preview'].includes(action)&&(label||confirmation))throw Error('Status takes no additional arguments.');
 if(action==='export'&&(!/^[a-z0-9][a-z0-9-]{0,60}$/.test(label||'')||confirmation))throw Error('Export needs a lowercase filename label, not a path.');
 if(['retry','delete','followup'].includes(action)&&(!referencePattern.test(label||'')||confirmation!==label))throw Error('Supply the exact inquiry reference twice. Retry may send a notification; delete removes the active record.');
 if(action==='measurement'&&(confirmation||!Number.isInteger(Number(label||7))||Number(label||7)<1||Number(label||7)>90))throw Error('Measurement days must be an integer from 1 to 90.');
 const {OPERATOR_TOKEN}=credentials();
 const headers={Accept:'application/json',Authorization:`Bearer ${OPERATOR_TOKEN}`};
 const request=async(path,options={})=>{
  const response=await fetchImpl(origin+path,{...options,headers:{...headers,...options.headers},redirect:'error',signal:AbortSignal.timeout(20_000)});
  if(!response.ok)throw Error(`Production operator request failed (${response.status}); no private response body printed.`);
  try{return await response.json();}catch{throw Error('Production returned an unreadable response; no private body printed.');}
 };
 if(action==='measurement')return request('/api/operator/journey-summary?days='+Number(label||7));
 if(action==='retention-preview')return request('/api/operator/inquiries/retention-preview');
 if(action==='status')return {origin,...await request('/api/operator/inquiries/status')};
 if(action==='followup'){
  const file=await realpath(resolve(workspace,extra[0]));
  const privateRoot=await realpath(resolve(workspace,'.runtime'));
  const inside=relative(privateRoot,file);
  if(!inside||inside.startsWith('..'+sep)||inside==='..'||isAbsolute(inside))throw Error('Follow-up fields must come from a private .runtime JSON file.');
  const bytes=await readFile(file);if(bytes.length>4096)throw Error('Follow-up file is too large.');
  let data;try{data=JSON.parse(bytes);}catch{throw Error('Follow-up file must contain JSON.');}
  const result=await request('/api/operator/inquiries/'+label+'/followup',{method:'POST',headers:{'X-Confirm-Followup':label,'Content-Type':'application/json'},body:JSON.stringify(data)});
  return {action,reference:label,message:result.message};
 }
 if(action==='export'){
  const records=[],seenCursors=new Set();let cursor='';
  do{
   const data=await request('/api/operator/inquiries?after='+encodeURIComponent(cursor));
   if(!Array.isArray(data.records))throw Error('Unexpected export format.');
   records.push(...data.records);cursor=data.next_cursor;
   if(cursor&&(!referencePattern.test(cursor)||seenCursors.has(cursor)))throw Error('Invalid or repeated export cursor; export refused.');
   if(cursor)seenCursors.add(cursor);
  }while(cursor);
  const folder=resolve(workspace,'.runtime/exports');await mkdir(folder,{recursive:true});
  const actual=await realpath(folder),expectedRoot=await realpath(workspace),inside=relative(expectedRoot,actual);
  if(inside.startsWith('..'+sep)||inside==='..'||isAbsolute(inside)||inside!==['.runtime','exports'].join(sep))throw Error('Export folder must be the private .runtime/exports directory, without a redirected path.');
  const file=resolve(folder,label+'.json');
  await writeFile(file,JSON.stringify({exported_at:now().toISOString(),origin,records},null,2)+'\n',{flag:'wx',mode:0o600});
  return {exported:records.length,file,private:true,warning:'Contains private inquiry data. Keep local and apply the inquiry retention policy.'};
 }
 const isRetry=action==='retry';
 const result=await request('/api/operator/inquiries/'+label+(isRetry?'/retry':''),{method:isRetry?'POST':'DELETE',headers:{[isRetry?'X-Confirm-Retry':'X-Confirm-Delete']:label}});
 return {action,reference:label,status:result.status||null,message:result.message||null};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 productionOperator(process.argv.slice(2)).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
