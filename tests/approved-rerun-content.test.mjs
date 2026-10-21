import test from 'node:test';
import assert from 'node:assert/strict';
import {contentHash,contentHashV2,legacyContentHash,nextPageDates} from '../scripts/page-dates.mjs';
const original='<title>Original guide</title><meta name="description" content="Useful summary"><main><h1>Guide</h1><p>Useful text</p></main>';
test('hash migrations preserve supported dates and cannot conceal simultaneous editorial changes',()=>{
 for(const [version,hash] of [[1,legacyContentHash],[2,contentHashV2]]){
  const previous={'/guide/':{modifiedAt:'2026-10-01',sha256:hash(original),contentHashVersion:version}},options={previousPages:{'/guide/':original}};
  assert.equal(nextPageDates([{path:'/guide/',html:original}],previous,'2026-10-21',options)['/guide/'].modifiedAt,'2026-10-01');
  for(const html of [original.replace('Useful text','Changed text'),original.replace('Original guide','Changed title'),original.replace('Useful summary','Changed summary')])assert.equal(nextPageDates([{path:'/guide/',html}],previous,'2026-10-21',options)['/guide/'].modifiedAt,'2026-10-21');
  assert.throws(()=>nextPageDates([{path:'/guide/',html:original}],previous,'2026-10-21'),/requires verified previous content or explicit review/);
  assert.equal(nextPageDates([{path:'/guide/',html:original}],previous,'2026-10-21',{reviewedPaths:['/guide/']})['/guide/'].modifiedAt,'2026-10-21');
 }
});
test('article date metadata alone does not refresh content but attribution does',()=>{
 const page=original+'<script type="application/ld+json">'+JSON.stringify({'@type':'Article',headline:'Guide',author:{name:'Studio'},dateModified:'2026-10-01'})+'</script>';
 assert.equal(contentHash(page),contentHash(page.replace('2026-10-01','2026-10-21')));
 assert.notEqual(contentHash(page),contentHash(page.replace('Studio','Verified author')));
});

test('metadata object order preserves dates through current and historical hashes while array order remains content',()=>{
 const article={'@type':'Article',headline:'Guide',author:{'@type':'Organization',name:'Studio'},keywords:['first','second']};
 const reordered={keywords:['first','second'],author:{name:'Studio','@type':'Organization'},headline:'Guide','@type':'Article'};
 const withArticle=data=>original+'<script type="application/ld+json">'+JSON.stringify(data)+'</script>';
 const oldHtml=withArticle(article),html=withArticle(reordered);
 assert.equal(contentHash(oldHtml),contentHash(html));
 for(const [version,hash] of [[1,legacyContentHash],[2,contentHashV2],[3,contentHash]]){
  const previous={'/guide/':{modifiedAt:'2026-10-01',sha256:hash(oldHtml),contentHashVersion:version}};
  assert.equal(nextPageDates([{path:'/guide/',html}],previous,'2026-10-21',{previousPages:{'/guide/':oldHtml}})['/guide/'].modifiedAt,'2026-10-01');
 }
 assert.notEqual(contentHash(oldHtml),contentHash(withArticle({...article,keywords:['second','first']})));
});
