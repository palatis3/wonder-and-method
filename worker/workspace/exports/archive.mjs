import {zipSync,unzipSync,strToU8} from 'fflate';
import {WorkspaceError} from '../../../src/workspace/domain/contracts.mjs';
import {sha256} from '../files/content.mjs';
export const EXPORT_LIMITS=Object.freeze({rows:2000,files:100,records:2097152,fileBytes:20971520,archive:33554432});
const fail=(code,message='Customer export verification failed.')=>{throw new WorkspaceError(code,message,409);};
export const safeJson=value=>JSON.stringify(value,null,2).replace(/[<>&\u2028\u2029]/g,c=>`\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}`)+'\n';
export function csvCell(value){let s=String(value??'');if(/^[\s\x00-\x1f]*[=+@-]|^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
const pathOK=s=>typeof s==='string'&&s.length<=240&&/^[a-zA-Z0-9_./-]+$/.test(s)&&!s.startsWith('/')&&!s.split('/').some(x=>!x||x==='.'||x==='..');
const html=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function filePath(f){
 if(!/^[a-f0-9-]{36}$/.test(f.id)||! /^[a-f0-9]{64}$/.test(f.checksum)||!['workspace','inbound'].includes(f.kind)||f.kind==='inbound'&&!/^[a-f0-9-]{36}$/.test(f.email_id))fail('source_integrity');
 return `files/${f.kind}/${f.kind==='inbound'?f.email_id+'/':''}${f.id}/${f.checksum}.bin`;
}
export async function buildArchive(job,loadSource){
 const s=job.snapshot;if(s?.profile!=='customer-engagement-v1'||s.incomplete||!Array.isArray(s.records)||s.records.length>EXPORT_LIMITS.rows||!Array.isArray(s.files)||s.files.length>EXPORT_LIMITS.files)fail('build_limit');
 const records=strToU8(safeJson({profile:s.profile,organization:s.organization,engagement_id:s.engagement_id,records:s.records}));if(records.length>EXPORT_LIMITS.records)fail('build_limit');
 const entries=Object.create(null),files=[];entries['data/records.json']=records;
 entries['data/records.csv']=strToU8('section,record_id,record_json\r\n'+s.records.map(r=>[r.section,r.data.id||'',safeJson(r.data).trim()].map(csvCell).join(',')).join('\r\n')+'\r\n');
 let total=0;
 for(const f of s.files){
  const count=Number(f.bytes);if(!Number.isSafeInteger(count)||count<1||(total+=count)>EXPORT_LIMITS.fileBytes)fail('build_limit');
  const path=filePath(f);if(entries[path])fail('source_integrity');
  const bytes=await loadSource(f);if(!(bytes instanceof Uint8Array)||bytes.length!==count||await sha256(bytes)!==f.checksum)fail('source_integrity');entries[path]=bytes;
  files.push({path,id:f.id,kind:f.kind,name:f.name,bytes:String(bytes.length),sha256:f.checksum,malware_status:f.state==='ready'?'scanned':'unscanned'});
 }
 entries['data/files.json']=strToU8(safeJson(files));
 entries['README.html']=strToU8(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; form-action 'none'"><title>Customer service export</title><h1>Customer service export</h1><p>Business: ${html(s.organization.name)}. Captured ${html(job.captured_at)}. Business timezone: ${html(s.organization.timezone)}.</p><p>This is a customer engagement export for the named requesting member, not a database backup. It contains the declared customer-engagement-v1 record fields and the files that member could access at capture. Financial fields require the customer administrator role. It is not evidence of current provider state or a grant of authority.</p><p><a href="data/records.json">Records JSON</a> contains decimal numbers as strings, UTC/offset timestamps, currency codes and stable record identifiers. JSON is data, never executable HTML. Null means absent or unavailable, not zero. <a href="data/records.csv">Records CSV</a> includes a JSON record in each row; formula-leading cells are prefixed with an apostrophe. Original file bytes are unchanged.</p><p><strong>Files marked unscanned have not been checked for malware. Open attachments cautiously. The .bin filenames avoid executing misleading original names; consult <a href="data/files.json">the file index</a> before choosing an appropriate application.</strong></p><p>Operator notes, security/legal evidence, raw email headers/HTML, authentication, credentials, unpublished reports, other tenants and inaccessible files are excluded by policy; no counts or names of excluded material are disclosed. This profile exports revision summaries/digests and specifically allowed customer content, not internal deployment or provider manifests. Earlier corrected reports remain historical and must not be added to current totals.</p><p>manifest.json lists SHA-256 for every content entry; SHA256SUMS also covers the manifest. The workspace separately records the whole archive hash. Compare that trusted hash before use: hashes inside the ZIP alone cannot prove authenticity if someone replaced the archive.</p><ul>${files.map(f=>`<li><a href="${f.path}">${html(f.name)}</a> (${html(f.bytes)} bytes; ${f.malware_status})</li>`).join('')}</ul></html>`);
 const manifest={format:'wm-customer-export/1',profile:s.profile,export_id:job.id,engagement_id:s.engagement_id,captured_at:job.captured_at,coverage:'complete_for_declared_customer_profile',entries:[]};
 for(const name of Object.keys(entries).sort()){if(!pathOK(name))fail('archive_integrity');manifest.entries.push({path:name,bytes:String(entries[name].length),sha256:await sha256(entries[name])});}
 entries['manifest.json']=strToU8(safeJson(manifest));const manifestHash=await sha256(entries['manifest.json']);
 entries['SHA256SUMS']=strToU8([...manifest.entries.map(e=>`${e.sha256}  ${e.path}`),`${manifestHash}  manifest.json`].join('\n')+'\n');
 if(Object.values(entries).reduce((n,b)=>n+b.length,0)>EXPORT_LIMITS.archive-131072)fail('build_limit');
 const zipEntries=Object.fromEntries(Object.entries(entries).map(([k,v])=>[k,[v,{level:0,mtime:new Date(1980,0,1)}]]));
 const bytes=zipSync(zipEntries,{level:0});if(bytes.length>EXPORT_LIMITS.archive)fail('build_limit');
 await verifyArchive(bytes,manifestHash);return {bytes,hash:await sha256(bytes),manifestHash};
}
// Accept only our bounded store-only ZIP dialect. Inspect central+local headers
// before unzipSync; reject duplicates, symlinks, encryption, ZIP64 and expansion.
export async function verifyArchive(bytes,expectedManifest){
 if(!(bytes instanceof Uint8Array)||bytes.length<22||bytes.length>EXPORT_LIMITS.archive)fail('archive_integrity');
 const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),u16=n=>d.getUint16(n,true),u32=n=>d.getUint32(n,true),end=bytes.length-22;
 if(u32(end)!==0x06054b50||u16(end+4)||u16(end+6)||u16(end+20)||u16(end+8)!==u16(end+10))fail('archive_integrity');
 const count=u16(end+10),start=u32(end+16),size=u32(end+12);if(count>EXPORT_LIMITS.files+6||start+size!==end)fail('archive_integrity');
 let at=start,localEnd=0,total=0;const names=new Set(),decoder=new TextDecoder('utf-8',{fatal:true});
 for(let i=0;i<count;i++){
  if(at+46>end||u32(at)!==0x02014b50)fail('archive_integrity');
  const flags=u16(at+8),method=u16(at+10),compressed=u32(at+20),expanded=u32(at+24),n=u16(at+28),extra=u16(at+30),comment=u16(at+32),offset=u32(at+42);
  if(flags&~0x800||method!==0||compressed!==expanded||extra||comment||u16(at+34)||((u32(at+38)>>>16)&0xf000)===0xa000||at+46+n>end)fail('archive_integrity');
  const name=decoder.decode(bytes.subarray(at+46,at+46+n));if(!pathOK(name)||names.has(name.toLowerCase()))fail('archive_integrity');names.add(name.toLowerCase());
  if(offset!==localEnd||offset+30+n>start||u32(offset)!==0x04034b50||u16(offset+6)!==flags||u16(offset+8)!==0||u32(offset+14)!==u32(at+16)||u32(offset+18)!==compressed||u32(offset+22)!==expanded||u16(offset+26)!==n||u16(offset+28)!==0||decoder.decode(bytes.subarray(offset+30,offset+30+n))!==name)fail('archive_integrity');
  localEnd=offset+30+n+compressed;if(localEnd>start||(total+=expanded)>EXPORT_LIMITS.archive)fail('archive_integrity');at+=46+n;
 }
 if(at!==end||localEnd!==start)fail('archive_integrity');
 let entries;try{entries=unzipSync(bytes);}catch{fail('archive_integrity');}
 if(!entries['manifest.json']||await sha256(entries['manifest.json'])!==expectedManifest)fail('archive_integrity');
 let manifest;try{manifest=JSON.parse(decoder.decode(entries['manifest.json']));}catch{fail('archive_integrity');}
 if(manifest.format!=='wm-customer-export/1'||!Array.isArray(manifest.entries)||manifest.entries.length+2!==count)fail('archive_integrity');
 const seen=new Set();for(const e of manifest.entries){if(!pathOK(e.path)||seen.has(e.path)||!entries[e.path]||String(entries[e.path].length)!==e.bytes||await sha256(entries[e.path])!==e.sha256)fail('archive_integrity');seen.add(e.path);}
 const sums=[...manifest.entries.map(e=>`${e.sha256}  ${e.path}`),`${expectedManifest}  manifest.json`].join('\n')+'\n';if(!entries.SHA256SUMS||decoder.decode(entries.SHA256SUMS)!==sums)fail('archive_integrity');return manifest;
}
