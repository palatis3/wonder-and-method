import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectSeoPage,auditSeoCorpus} from './seo-quality-rules.mjs';

export async function checkSeo(root=resolve(import.meta.dirname,'..')){
 const read=path=>readFile(resolve(root,path),'utf8');
 const [build,config,sitemap]=await Promise.all([read('evidence/build.json').then(JSON.parse),read('config/site.json').then(JSON.parse),read('dist/sitemap.xml')]);
 const pages=[];
 for(const route of build.routes)pages.push(inspectSeoPage({route,config,html:await read('dist/.'+route+'index.html')}));
 const report=auditSeoCorpus({pages,sitemap,config}),out=resolve(root,'output/seo');
 await mkdir(out,{recursive:true});
 await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 const columns=['route','indexable','title','titleCharacters','description','descriptionCharacters','canonical','wordCount','longParagraphs','longSentences','errors','reviewNotes'];
 const csv=value=>'"'+String(value??'').replaceAll('"','""')+'"';
 const rows=report.pages.map(p=>({...p,errors:p.findings.filter(f=>f.severity==='error').map(f=>f.rule+': '+f.detail).join(' | '),reviewNotes:p.findings.filter(f=>f.severity==='review').map(f=>f.rule+': '+f.detail).join(' | ')}));
 await writeFile(resolve(out,'pages.csv'),[columns.join(','),...rows.map(p=>columns.map(c=>csv(p[c])).join(','))].join('\n')+'\n');
 console.log(`SEO: ${report.routeCount} pages, ${report.indexableCount} indexable; ${report.errorCount} errors, ${report.reviewCount} editorial review notes. Report: output/seo/report.json`);
 if(report.errorCount)throw Error('SEO publishing checks failed; inspect output/seo/report.json.');
 return {routeCount:report.routeCount,indexableCount:report.indexableCount,errorCount:report.errorCount,reviewCount:report.reviewCount,report:'output/seo/report.json'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await checkSeo();
