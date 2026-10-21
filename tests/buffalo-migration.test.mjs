import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';

test('Buffalo journey migration retains existing counts and inquiries while accepting the new project',async t=>{
 const folder=new URL('../deployment/migrations/',import.meta.url);
 const names=(await readdir(folder)).filter(name=>/^\d{4}.*\.sql$/.test(name)&&Number(name.slice(0,4))<=16).sort();
 const statements=await Promise.all(names.map(name=>readFile(new URL(name,folder),'utf8')));
 const candidate=statements.at(-1),previous=statements.at(-2);
 assert.match(names.at(-1),/^0016_/);
 const allowed=(sql,field)=>[...sql.match(new RegExp(field+" TEXT NOT NULL(?: DEFAULT '[^']+')? CHECK\\("+field+" IN \\(([^)]+)\\)\\)"))[1].matchAll(/'([^']+)'/g)].map(match=>match[1]);
 for(const field of ['event','service','source'])assert.deepEqual(allowed(candidate,field),allowed(previous,field));
 const oldPages=allowed(previous,'page'),newPages=allowed(candidate,'page');
 assert.deepEqual(newPages.filter(page=>!oldPages.includes(page)),['work_buffalo_civic']);
 assert.ok(oldPages.every(page=>newPages.includes(page)));
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());db.exec(statements.slice(0,-1).join('\n'));
 const insert=db.prepare('INSERT INTO journey_counts VALUES(?,?,?,?,?,?)');
 let index=0;
 for(const page of oldPages)for(const source of allowed(previous,'source'))insert.run('2026-10-20','page_view','unsure',page,source,index++%2?1000000:0);
 db.prepare("INSERT INTO inquiries(id,created_at,payload,dedupe_key,synthetic,delivery_status) VALUES(?,?,?,?,0,'accepted')").run('buffalo-fixture',1234,'{"preserve":"é & < >"}','buffalo-fixture');
 const counts=db.prepare('SELECT * FROM journey_counts ORDER BY page,source').all(),inquiries=db.prepare('SELECT * FROM inquiries').all();
 db.exec(candidate);
 assert.deepEqual(db.prepare('SELECT * FROM journey_counts ORDER BY page,source').all(),counts);
 assert.deepEqual(db.prepare('SELECT * FROM inquiries').all(),inquiries);
 insert.run('2026-10-21','page_view','unsure','work_buffalo_civic','direct',1);
 assert.equal(db.prepare("SELECT total FROM journey_counts WHERE page='work_buffalo_civic'").get().total,1);
 for(const [field,value]of [['page','unapproved'],['event','typed_value'],['source','full_referrer'],['service','arbitrary'],['total',-1],['total',1000001]]){
  const row={day:'2026-10-22',event:'page_view',service:'unsure',page:'home',source:'direct',total:1,[field]:value};
  assert.throws(()=>insert.run(...Object.values(row)));
 }
 assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
});
