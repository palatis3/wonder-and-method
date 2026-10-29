import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {publicWebsiteAddress,validateInquiry} from '../src/inquiry.mjs';
import {contentHash,nextPageDates} from '../scripts/page-dates.mjs';
import {pruneObsoleteBuildAssets} from '../scripts/build.mjs';
import {checkoutPages} from '../src/checkout-content.mjs';
import {intakeContent} from '../src/intake-content.mjs';
import offers from '../config/offers.json' with {type:'json'};
import config from '../config/site.json' with {type:'json'};

const inquiry={name:'Synthetic owner',email:'synthetic@example.test',message:'Please look at my current website.',request_kind:'checkout'};
test('existing-site requests accept public addresses without requesting the website',()=>{
 for(const site of ['example.com','https://example.com/broken-page','http://example.com:8080/','example.com:8080','https://bücher.de/','https://8.8.8.8/']){
  assert.ok(publicWebsiteAddress(site),site);
  for(const service of ['website_baseline','audit_fix_sprint','keep_running','improve','local_focus','grow'])
   assert.deepEqual(validateInquiry({...inquiry,service,website:site}).errors,{},service+': '+site);
 }
 for(const website of ['not yet','@social','ftp://example.com','https://user:secret@example.com','localhost','https://127.1/','http://2130706433/','http://0x7f000001/','http://192.168.2.1/','http://169.254.169.254/','https://internal.local/','a..com']){
  assert.equal(publicWebsiteAddress(website),null,website);
  assert.ok(validateInquiry({...inquiry,service:'website_baseline',website}).errors.website,website);
 }
});
test('general questions retain social notes while an actual paid review request requires a website',()=>{
 for(const website of ['', 'not yet','@mybusiness','Instagram: @mybusiness']){
  assert.deepEqual(validateInquiry({...inquiry,service:'launch_site',goal:'fix',website}).errors,{});
  assert.deepEqual(validateInquiry({...inquiry,service:'improve',request_kind:'question',website}).errors,{});
  assert.deepEqual(validateInquiry({...inquiry,service:'unsure',request_kind:'question',goal:'fix',website}).errors,{});
  assert.ok(validateInquiry({...inquiry,service:'website_baseline',goal:'fix',website}).errors.website);
 }
 for(const trap of ['_wm_note','_faxcheck','company_url'])
  assert.ok(validateInquiry({...inquiry,service:'launch_site',[trap]:'filled'}).errors.company_url);
});
test('editorial dates ignore layout and shared navigation but follow text, destination and image description changes',()=>{
 const original='<main class="old"><nav class="breadcrumb">Home</nav><p class="journal-byline">Oct 1</p><h1>Keep this guide</h1><p>A useful answer.</p><a href="/worksheet.csv?v=abcdef123456">Worksheet</a><img src="/old.webp" alt="Form steps"><section class="founder-strip">Old shared footer</section><p class="service-intro-action">Old prompt</p></main>';
 const styled=original.replace('class="old"','class="new"').replace('Oct 1','Oct 20').replace('>Home<','>New navigation<').replace('old.webp','new.webp').replace('Old shared footer','New shared footer').replace('Old prompt','New prompt').replace('?v=abcdef123456','?v=123456abcdef');
 assert.equal(contentHash(original),contentHash(styled));
 const old={'/guide/':{modifiedAt:'2026-10-01',sha256:contentHash(original),contentHashVersion:3}};
 assert.deepEqual(nextPageDates([{path:'/guide/',html:styled}],old,'2026-10-20'),old);
 for(const changed of [original.replace('useful answer','updated answer'),original.replace('/worksheet.csv','/other.csv'),original.replace('alt="Form steps"','alt="Different steps"')]){
  assert.notEqual(contentHash(original),contentHash(changed));
  assert.equal(nextPageDates([{path:'/guide/',html:changed}],old,'2026-10-20')['/guide/'].modifiedAt,'2026-10-20');
 }
});
test('generated media inventories do not keep obsolete images alive while linked archives survive',async()=>{
 const output=await mkdtemp(join(tmpdir(),'wm-rerun2-prune-'));
 try{
  await mkdir(join(output,'assets/guides'),{recursive:true});
  await writeFile(join(output,'assets/guides/old-card-240.webp'),'unused');
  await writeFile(join(output,'assets/guides/linked-card-240.webp'),'linked');
  await writeFile(join(output,'assets/media-sizes.json'),JSON.stringify({'/assets/guides/old-card-240.webp':[240,160]}));
  await writeFile(join(output,'assets/responsive-images.json'),JSON.stringify({'/assets/guides/old-card-240.webp':{width:240}}));
  await writeFile(join(output,'index.html'),'<img src="/assets/guides/linked-card-240.webp">');
  const result=await pruneObsoleteBuildAssets(output);
  assert.deepEqual(result.removed,[{file:'assets/guides/old-card-240.webp',bytes:6}]);
  assert.equal(await readFile(join(output,'assets/guides/linked-card-240.webp'),'utf8'),'linked');
 }finally{assert.ok(output.startsWith(join(tmpdir(),'wm-rerun2-prune-')));await rm(output,{recursive:true,force:true});}
});
test('monthly first-payment alternatives and website editing limits appear before the request form',()=>{
 const pages=checkoutPages(offers,intakeContent(config));
 for(const [slug,first,repeat]of [['keep-running','$375','$275'],['improve','$375','$1,250'],['local-focus','$375','$850'],['grow','$375','$1,750']]){
  const page=pages.find(p=>p.path===`/checkout/${slug}/`).body,header=page.slice(0,page.indexOf('<form'));
  assert.ok(header.includes(first));assert.ok(header.includes(repeat));assert.match(header,/usable prior handoff or paid review reduces duplicated work/);assert.match(header,/month-to-month/);
 }
 for(const slug of ['launch-site','focused-site','business-site','signature-site']){
  const page=pages.find(p=>p.path===`/checkout/${slug}/`).body;
  assert.match(page.slice(0,page.indexOf('<form')),/platform and editing workflow before booking/);
  assert.match(page,/name="request_kind" value="checkout"/);
 }
});
