import {DatabaseSync} from 'node:sqlite';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),runtime=resolve(root,'.runtime');
const [command,arg]=process.argv.slice(2);
if(!['status','export','delete','purge-synthetic'].includes(command))throw new Error('Use status, export, delete <reference>, or purge-synthetic <YYYY-MM-DD>. No record contents are printed.');
const db=new DatabaseSync(resolve(runtime,'inquiries.sqlite'));
try{
 if(command==='status'){console.log(JSON.stringify(db.prepare('SELECT status,count(*) AS records FROM inquiries GROUP BY status').all()));}
 if(command==='export'){
  const folder=resolve(runtime,'exports');await mkdir(folder,{recursive:true});
  const file=resolve(folder,`inquiries-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
  await writeFile(file,JSON.stringify(db.prepare('SELECT * FROM inquiries ORDER BY created_at').all(),null,2),{flag:'wx',mode:0o600});
  console.log(`Export saved privately: ${file}. Apply the agreed retention/deletion policy to this copy too.`);
 }
 if(command==='delete'){if(!/^[a-f0-9-]{36}$/.test(arg||''))throw new Error('Provide an exact reference ID.');const result=db.prepare('DELETE FROM inquiries WHERE id=?').run(arg);console.log(`Deleted ${result.changes} matching record(s). Existing exported copies require separate deletion.`);}
 if(command==='purge-synthetic'){if(!/^\d{4}-\d{2}-\d{2}$/.test(arg||'')||new Date(arg).toISOString().slice(0,10)!==arg)throw new Error('Provide a valid ISO cutoff date.');const result=db.prepare("DELETE FROM inquiries WHERE status='synthetic_saved_not_emailed' AND created_at<?").run(arg+'T00:00:00Z');console.log(`Purged ${result.changes} synthetic record(s) older than cutoff.`);}
}finally{db.close();}
