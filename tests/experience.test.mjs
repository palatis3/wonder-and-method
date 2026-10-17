import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from '../scripts/server.mjs';

test('alternate preview root serves its own files while inquiries remain isolated and synthetic',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'wm-experience-'));
 const site=join(dir,'site'),runtime=join(dir,'private');
 await mkdir(join(site,'404'),{recursive:true});
 await writeFile(join(site,'index.html'),'<h1>Experience fixture</h1>');
 await writeFile(join(site,'404','index.html'),'<h1>Fixture not found</h1>');
 const {server,db,url}=await createServer({siteDir:site,runtime,port:0});
 try{
  const home=await fetch(url);assert.equal(home.status,200);assert.match(await home.text(),/Experience fixture/);assert.match(home.headers.get('x-robots-tag'),/noindex/);
  assert.equal((await fetch(url+'/private/inquiries.sqlite')).status,404);
  assert.equal((await fetch(url+'/%2e%2e%5cprivate%5cinquiries.sqlite')).status,400);
  const response=await fetch(url+'/api/inquiries',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Origin:url},body:JSON.stringify({name:'Synthetic Preview',email:'preview@example.test',business:'Synthetic Business',website:'',service:'focused_site',message:'Synthetic experience project kit verification.',company_url:''})});
  assert.equal(response.status,201);const receipt=await response.json();assert.match(receipt.message,/No email was sent/);
  assert.equal(db.prepare('SELECT status FROM inquiries WHERE id=?').get(receipt.reference).status,'synthetic_saved_not_emailed');
 }finally{await new Promise(done=>server.close(done));await rm(dir,{recursive:true,force:true});}
});
