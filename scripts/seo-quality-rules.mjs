import {parse} from 'parse5';
import {createHash} from 'node:crypto';
import {routeIndexEligible} from '../src/index-policy.mjs';
import {robotsDirective} from '../src/seo.mjs';

const attr=(node,name)=>node?.attrs?.find(a=>a.name===name)?.value;
const nodes=(node,predicate)=>{const found=[];function walk(n){if(predicate(n))found.push(n);for(const child of n.childNodes||[])walk(child);}walk(node);return found;};
const rawText=node=>node?.nodeName==='#text'?node.value:['script','style','template'].includes(node?.tagName)?'':(node?.childNodes||[]).map(rawText).join(' ');
const text=node=>rawText(node).replace(/\s+/gu,' ').trim();
const normalized=value=>value.replace(/\s+/gu,' ').trim();
const tokens=value=>(value||'').toLowerCase().split(/[\s,]+/u).filter(Boolean);
const words=value=>value.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)||[];
const sentenceSegmenter=new Intl.Segmenter('en',{granularity:'sentence'});
export const titleCharacterLimit=70;

// Parse emitted HTML, so entities and actual template output are measured.
export function inspectSeoPage({route,html,config}){
 const doc=parse(html),all=nodes(doc,n=>n.namespaceURI==='http://www.w3.org/1999/xhtml'),get=tag=>all.filter(n=>n.tagName===tag);
 const headNodes=nodes(get('head')[0]||{},n=>n.namespaceURI==='http://www.w3.org/1999/xhtml');
 const metas=headNodes.filter(n=>n.tagName==='meta'),meta=name=>metas.filter(n=>(attr(n,'name')||'').toLowerCase()===name);
 const titles=headNodes.filter(n=>n.tagName==='title'),descriptions=meta('description'),canonicals=headNodes.filter(n=>n.tagName==='link'&&tokens(attr(n,'rel')).includes('canonical'));
 const title=text(titles[0]),description=normalized(attr(descriptions[0],'content')||'');
 const eligible=routeIndexEligible(route),expectedRobots=tokens(robotsDirective(config,route));
 const indexable=expectedRobots.includes('index'),findings=[];
 const add=(severity,rule,detail)=>findings.push({severity,rule,detail});
 if(titles.length!==1||!title)add('error','title-required','Exactly one nonempty title is required.');
 const titleCharacters=[...title].length;
 if(eligible&&titleCharacters>titleCharacterLimit)add('error','title-length',`${titleCharacters} characters exceeds the studio limit of ${titleCharacterLimit}, including spaces and brand.`);
 if(descriptions.length!==1||!description)add('error','description-required','Exactly one nonempty meta description is required.');
 if(eligible&&description&&([...description].length<60||[...description].length>170))add('review','description-length','Review the summary for clarity; 60–170 characters is a review aid, not a Google limit.');
 const canonical=attr(canonicals[0],'href')||'';
 if(route==='/404/'?canonicals.length!==0:canonicals.length!==1||canonical!==config.origin+route)add('error','canonical','Use the exact absolute page URL once; the error page must have no canonical.');
 const robotTags=meta('robots');
 if(robotTags.length!==1||JSON.stringify(tokens(attr(robotTags[0],'content')).sort())!==JSON.stringify([...expectedRobots].sort()))add('error','robots-policy','Robots metadata must match the configured route policy.');
 for(const bot of [...meta('googlebot'),...meta('googlebot-news')])if(tokens(attr(bot,'content')).some(t=>['noindex','none','nofollow'].includes(t))&&indexable)add('error','crawler-conflict','Crawler-specific restrictions conflict with the public index/follow policy.');
 const headings=get('h1');
 if(headings.length!==1||!text(headings[0]))add('error','primary-heading','The studio requires one nonempty H1 per page.');
 const main=get('main')[0],mainText=text(main);
 if(!mainText)add('error','main-content','A nonempty main content region must be present in the HTML.');
 for(const img of get('img'))if(attr(img,'alt')===undefined)add('error','image-alt',`Missing alt attribute: ${attr(img,'src')||'(no source)'}. Empty alt is allowed for decorative images.`);
 const links=get('a').filter(n=>attr(n,'href')!==undefined).map(n=>({href:attr(n,'href'),nofollow:tokens(attr(n,'rel')).includes('nofollow'),label:text(n)||normalized(attr(n,'aria-label')||'')||nodes(n,x=>x.tagName==='img').map(x=>attr(x,'alt')||'').join(' ').trim()}));
 for(const link of links)if(!link.label)add('review','link-label',`Review the accessible/descriptive label for ${link.href}.`);
 const structured=get('script').filter(n=>(attr(n,'type')||'').toLowerCase()==='application/ld+json');
 for(const script of structured){try{const value=JSON.parse((script.childNodes||[]).map(n=>n.value||'').join(''));if(!value||typeof value!=='object'||(Array.isArray(value)&&!value.length))throw Error('Expected an object or nonempty array.');}catch{add('error','structured-data-json','JSON-LD must be valid JSON containing an object or nonempty array.');}}
 const paragraphs=nodes(main||{},n=>n.tagName==='p').map(text).filter(Boolean);
 const longParagraphs=paragraphs.filter(p=>words(p).length>100).length;
 const longSentences=paragraphs.flatMap(p=>[...sentenceSegmenter.segment(p)]).filter(s=>words(s.segment).length>35).length;
 if(longParagraphs)add('review','long-paragraph',`${longParagraphs} paragraphs exceed 100 words; review without removing useful detail.`);
 if(longSentences)add('review','long-sentence',`${longSentences} sentences exceed 35 words; review for clarity.`);
 return {route,eligible,indexable,title,titleCharacters,description,descriptionCharacters:[...description].length,canonical,robots:attr(robotTags[0],'content')||'',h1:headings.map(text),wordCount:words(mainText).length,longParagraphs,longSentences,structuredDataBlocks:structured.length,mainTextSha256:createHash('sha256').update(mainText).digest('hex'),links,incoming:[],findings};
}

export function auditSeoCorpus({pages,sitemap,config}){
 const findings=[],byRoute=new Map(pages.map(p=>[p.route,p]));
 const add=(rule,detail)=>findings.push({severity:'error',rule,detail});
 const sitemapDoc=parse(sitemap),locs=nodes(sitemapDoc,n=>n.tagName==='loc').map(text);
 const expected=new Set(pages.filter(p=>p.indexable).map(p=>config.origin+p.route));
 if(locs.length>50000||Buffer.byteLength(sitemap)>50*1024*1024)add('sitemap-size','Split the sitemap before exceeding 50,000 URLs or 50 MiB uncompressed.');
 if(new Set(locs).size!==locs.length)add('sitemap-duplicates','Sitemap URLs must be unique.');
 for(const url of locs)if(!expected.has(url))add('sitemap-unexpected',url);
 const listed=new Set(locs);
 for(const url of expected)if(!listed.has(url))add('sitemap-missing',url);
 for(const page of pages){
  for(const link of page.links){
   if(link.nofollow||tokens(page.robots).some(t=>['nofollow','none'].includes(t)))continue;
   let url;try{url=new URL(link.href,config.origin+page.route);}catch{continue;}
   const target=url.origin===config.origin?byRoute.get(url.pathname):undefined;
   if(target&&target!==page&&!target.incoming.includes(page.route))target.incoming.push(page.route);
  }
 }
 for(const field of ['title','description']){
  const groups=new Map();
  for(const p of pages.filter(p=>p.eligible&&p[field])){const key=p[field].toLocaleLowerCase('en');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}
  for(const group of groups.values())if(group.length>1)for(const p of group)p.findings.push({severity:'error',rule:`duplicate-${field}`,detail:`Shared with ${group.filter(other=>other!==p).map(other=>other.route).join(', ')}.`});
 }
 for(const p of pages)if(p.indexable&&p.route!=='/'&&p.incoming.length<2)p.findings.push({severity:'review',rule:'incoming-links',detail:`${p.incoming.length} other pages link here through crawlable follow links; review discovery in context.`});
 const allFindings=[...findings,...pages.flatMap(p=>p.findings.map(f=>({route:p.route,...f})))];
 return {schemaVersion:1,checkedAt:new Date().toISOString(),titleCharacterLimit,routeCount:pages.length,indexableCount:pages.filter(p=>p.indexable).length,sitemapUrlCount:locs.length,errorCount:allFindings.filter(f=>f.severity==='error').length,reviewCount:allFindings.filter(f=>f.severity==='review').length,findings:allFindings,pages:pages.map(({links,...p})=>p),limits:'Automated studio publishing standards, not a Google ranking or indexing guarantee. JSON-LD syntax is checked, not rich-result eligibility or factual accuracy. Readability and description thresholds are review aids. HTTP status, headers, robots.txt, assets, browser behavior and performance have separate release checks.'};
}
