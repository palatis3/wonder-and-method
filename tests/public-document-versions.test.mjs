import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {versionPublicDocumentLinks} from '../scripts/version-public-documents.mjs';

test('corrected public downloads get new addresses while anchors and request links retain their meaning',async()=>{
 const output=await mkdtemp(join(tmpdir(),'wm-document-versions-'));
 try{
  await mkdir(join(output,'assets/buyer-packs'),{recursive:true});
  await writeFile(join(output,'assets/buyer-packs/improve.html'),'<h1>Improve</h1>');
  await writeFile(join(output,'assets/buyer-packs/improve.txt'),'Keyword research');
  const input='<a href="/assets/buyer-packs/improve#scope">Read</a><a href="improve.txt?download=1#terms">Download</a><a href="/contact/?offer=improve#inquiry">Request</a><link rel="canonical" href="https://wonderandmethod.com/assets/buyer-packs/improve">';
  const first=await versionPublicDocumentLinks(input,output,'/assets/buyer-packs/improve');
  assert.match(first,/href="\/assets\/buyer-packs\/improve\?v=[a-f0-9]{12}#scope"/);
  assert.match(first,/href="\/assets\/buyer-packs\/improve\.txt\?download=1&amp;v=[a-f0-9]{12}#terms"/);
  assert.ok(first.includes('href="/contact/?offer=improve#inquiry"'));
  assert.ok(first.includes('href="https://wonderandmethod.com/assets/buyer-packs/improve"'));
  assert.equal(await versionPublicDocumentLinks(first,output,'/assets/buyer-packs/improve'),first);
  await writeFile(join(output,'assets/buyer-packs/improve.txt'),'Updated keyword research wording');
  const changed=await versionPublicDocumentLinks(input,output,'/assets/buyer-packs/improve');
  assert.notEqual(changed,first);
  assert.equal(changed.match(/improve\?v=([^#]+)/)[1],first.match(/improve\?v=([^#]+)/)[1]);
 }finally{
  assert.ok(output.startsWith(join(tmpdir(),'wm-document-versions-')));
  await rm(output,{recursive:true,force:true});
 }
});
