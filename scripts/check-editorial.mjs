import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {inspectSeoPage,auditSeoCorpus} from './seo-quality-rules.mjs';
import {verifyEditorialDecisions} from './editorial-rules.mjs';
import {readJson,saveJson} from './ci-contract.mjs';

export async function checkEditorial(root=resolve(import.meta.dirname,'..')){
 const report=await readJson(resolve(root,'output/seo/report.json'));
 const config=await readJson(resolve(root,'config/site.json')),build=await readJson(resolve(root,'evidence/build.json'));
 // Recompute findings from emitted bytes so a saved report cannot hide a new
 // paragraph, changed sentence or newly broken metadata. No second build.
 const pages=[];for(const route of build.routes)pages.push(inspectSeoPage({route,config,html:await readFile(resolve(root,'dist/.'+route+'index.html'),'utf8')}));
 const current=auditSeoCorpus({pages,config,sitemap:await readFile(resolve(root,'dist/sitemap.xml'),'utf8')});
 const {checkedAt:oldTime,...saved}=report;const {checkedAt:newTime,...fresh}=current;
 assert.deepEqual(saved,fresh,'SEO report is stale; run static verification against the current build');
 const result=verifyEditorialDecisions(current,await readJson(resolve(root,'operations/editorial-review.json')));
 await saveJson(resolve(root,'output/seo/editorial.json'),{schemaVersion:1,checkedAt:new Date().toISOString(),...result,paragraphThresholdWords:100,sentenceThresholdWords:35,limits:'Length thresholds trigger review; they do not establish good writing or search rankings.'});
 console.log(`Editorial: ${result.reviewed} exact findings reviewed; no unreviewed or stale decisions.`);return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await checkEditorial();
