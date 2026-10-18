import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {appendFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..'),directory=resolve(root,'.runtime/operations');
const record={checked_at:new Date().toISOString(),reviewer:'Codex-assisted aggregate check',kind:'production inquiry health',mailbox_chat_and_reply_review:'not recorded',incident_reference:null};
try{
 const {stdout}=await promisify(execFile)(process.execPath,[resolve(root,'deployment/production-operator.mjs'),'status'],{cwd:root,maxBuffer:1024*1024});
 const data=JSON.parse(stdout);
 if(typeof data.health?.ok!=='boolean'||data.containsInquiryText!==false)throw Error('Unexpected aggregate result');
 record.ok=data.health.ok;record.reasons=data.health.reasons;record.attention=data.attention;record.total=data.total;record.delivery=data.delivery;record.provider_checked_at=data.checked_at;record.recovery=data.health.recovery;
}catch{record.ok=false;record.reasons=['aggregate check failed; inspect operator access and provider status'];}
await mkdir(directory,{recursive:true});
await appendFile(resolve(directory,'inquiry-checks.jsonl'),JSON.stringify(record)+'\n',{encoding:'utf8',mode:0o600});
console.log(JSON.stringify(record,null,2));
if(!record.ok)process.exitCode=1;
