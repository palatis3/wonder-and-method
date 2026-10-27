import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'../..');
const plan=JSON.parse(await readFile(resolve(import.meta.dirname,'keyword-plan.json'),'utf8'));
const interpretations={
 'website maintenance cost': ['Informational','Cost explainers from providers and publishers, plus a discussion result.','Keep the existing first-year budget and separate provider bills from studio care. Explain what a check establishes and when repair needs a separate scope.'],
 'website copywriting': ['Informational','A mix of instructional articles, individual copywriter service/home pages and a discussion result.','Use the existing owner-notes-to-approved-copy example. Explain facts, approvals and page prompts without expanding into copywriter careers or unsupported conversion claims.'],
 'how to write website copy': ['Informational','Instructional articles dominate the listed results, with a discussion and a university style guide.','Keep the reusable worksheet and worked rewrite together in the content template guide; no second page for the same drafting task.'],
 'website refresh vs redesign': ['Commercial','The listed results compare refreshes and redesigns, mostly in provider articles.','Use the repair-or-redesign guide for keep, focused change and rebuild choices, with one shared decision record and concrete triggers.'],
 'website maintenance vs redesign': ['Commercial','Provider articles compare ongoing maintenance with a larger redesign or rebuild.','Use the same repair-or-redesign guide and link to the care scope. Preserve the distinction between routine checks and separately scoped repairs.'],
 'web redesign process': ['Informational','Process and strategy guides appear alongside a university redesign-process page and a discussion.','Keep the timeline guide focused on dependencies, owner review windows, migration and handoff, rather than adding a second generic process guide.'],
 'how to improve ai search visibility': ['Informational','Marketing and optimization articles, a discussion and a video appear; one listed grants-search result is poorly aligned.','Use the existing AI visibility guide. Separate public access, approved answers, observed citations and measured impressions. The mixed result set warrants caution about demand quality.'],
 'how to adjust seo budget for ai search optimization': ['Informational','Budget and optimization articles appear with an official Google guide and a discussion.','Keep the fictional, bounded budget allocation in the AI visibility guide. Protect essential fixes and retesting before funding a scoped experiment; do not claim a universal allocation or guaranteed citation.'],
 'seo service cost': ['Informational','Cost explainers dominate, with pricing pages, a calculator and a discussion also listed.','Keep actual studio prices, finite deliverables and renewal terms on the SEO service page. The informational result mix limits its fit as a broad pricing target; use the existing care-versus-SEO guide for the comparison.'],
 'location page seo services': ['Informational','Mixed result set: location-page explainers and local SEO service pages.','Use the service-area guide for existing-page-first criteria and the SEO page for purchasable work. Tracking regional terms does not establish a need for more county pages.']
};
const observations=[];
for(const opportunity of plan.opportunities){
 const slug=opportunity.keyword.replaceAll(' ','-');
 const relative=`evidence/human-quality-20261027/semrush/details/${slug}.ax.txt`;
 const raw=await readFile(resolve(root,relative),'utf8');
 if(!raw.includes(`heading Keyword Overview: ${opportunity.keyword}`)||!raw.includes('heading SERP Analysis'))throw Error('Incomplete detail report: '+slug);
 const summary=raw.slice(raw.indexOf('region Keyword summary'),raw.indexOf('region Keyword ideas'));
 const lines=summary.split('\n').map(line=>line.trim());
 const following=label=>{const i=lines.findIndex(line=>line.endsWith(`text ${label}`));return lines.slice(i+1).find(line=>/\btext /.test(line))?.replace(/^.*?\btext /,'')||null;};
 const volumeText=following('Volume'),difficultyText=following('Keyword Difficulty'),cpcText=following('CPC');
 const number=value=>value===null?null:Number(value.replace(/[,$%]/g,'').replace(/K$/,'e3'));
 const resultUrls=[...new Set([...raw.matchAll(/link Go to (https?:\S+) Value: (https?:\S+)/g)].map(m=>m[2]))];
 if(!resultUrls.length)throw Error('SERP rows not loaded: '+slug);
 const featureSection=raw.slice(raw.indexOf('heading SERP Analysis'));
 const featureLines=featureSection.split('\n').map(line=>line.trim());
 const featureIndex=featureLines.findIndex(line=>line.endsWith('text SERP Features'));
 const features=featureLines.slice(featureIndex+1).find(line=>/\btext /.test(line))?.replace(/^.*?\btext /,'')||null;
 const [intent,resultMix,decision]=interpretations[opportunity.keyword];
 observations.push({keyword:opportunity.keyword,database:'us',device:'Desktop',observedDate:'2026-10-27',monthlySearchVolume:number(volumeText),keywordDifficulty:number(difficultyText),cpcUsd:number(cpcText),reportedIntent:intent,serpFeatures:features,resultUrls,listedResultCount:resultUrls.length,resultMix,decision,targetUrl:opportunity.targetUrl,evidenceFile:relative,sha256:createHash('sha256').update(raw).digest('hex')});
}
const report={recordedAt:new Date().toISOString(),status:'ten-priority-topics-inspected',method:'Each authenticated browser report was opened and its lazy-loaded SERP rows inspected. Result mix describes listed URLs and report labels; it is not a claim to have read each competing article. Result URLs are deduplicated and may include links inside SERP features, so list order is not an organic rank assignment. No API units or purchases were used.',capacity:{addedKeywords:1493,campaignKeywords:1494,accountKeywords:1500,accountLimit:1500,verifiedUsageEvidence:'evidence/human-quality-20261027/semrush/tracking-usage-after.json',rankingCollection:'Not yet verified for the added keywords'},interpretationLimits:['Semrush metrics are estimates, not business outcomes or ranking guarantees.','A SERP feature is not evidence that this site appears in it.','Low difficulty does not override intent, business fit or independent page usefulness.','Closely related queries share an existing destination; no new keyword-variant pages are recommended.'],observations};
await writeFile(resolve(import.meta.dirname,'keyword-detail-findings.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({topics:observations.length,resultRows:observations.reduce((n,o)=>n+o.listedResultCount,0),destinations:new Set(observations.map(o=>o.targetUrl)).size}));
