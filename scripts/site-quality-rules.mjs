import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

// These checks detect concrete publishing regressions. They do not score prose,
// establish source accuracy, or certify compliance with a search engine's rules.
export function textContent(html){
 return String(html).replace(/<!--[^]*?-->/g,'').replace(/<(script|style)\b[^>]*>[^]*?<\/\1>/gi,'').replace(/<[^>]*>/g,' ')
  .replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n)))
  .replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,name)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[name]).replace(/\s+/g,' ').trim();
}

const marker=/^(?:undefined|NaN)$|\[object Object\]|\{\{[^{}]+\}\}|\$\{[^{}]+\}/;
const hash=value=>createHash('sha256').update(value).digest('hex');
const markupTokens=html=>html.match(/<(?:(?:"[^"]*"|'[^']*'|[^'">])*)>|[^<]+/g)||[];
function attributes(tag){
 const result=new Map(),body=tag.replace(/^<[\w:-]+/,'').replace(/\/?\s*>$/,'');
 for(const match of body.matchAll(/\s+([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))result.set(match[1].toLowerCase(),match[2]??match[3]??match[4]??'');
 return result;
}
function ids(html){return markupTokens(html).filter(token=>/^<[a-z]/i.test(token)).map(token=>attributes(token).get('id')).filter(id=>id!==undefined);}
export const pageIds=html=>new Set(ids(activeMarkup(html)));

function activeMarkup(html){
 // The generator emits balanced, escaped markup. Ignore inert templates and
 // initially hidden UI regions; browser journeys verify those after activation.
 const input=html.replace(/<!--[^]*?-->/g,'').replace(/<(script|style|template)\b[^>]*>[^]*?<\/\1>/gi,'');
 const stack=[],out=[],voidTags=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
 for(const token of markupTokens(input)){
  const hidden=stack.some(item=>item.hidden),close=token.match(/^<\/([a-z][\w-]*)\b/i),open=token.match(/^<([a-z][\w-]*)\b/i);
  if(close){
   if(!hidden)out.push(token);
   const index=stack.findLastIndex(item=>item.tag===close[1].toLowerCase());if(index>=0)stack.splice(index);
  }else if(open){
   // aria-hidden changes accessibility exposure; it does not hide visible copy.
   const attrs=attributes(token),ownHidden=attrs.has('hidden')||/(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(attrs.get('style')||'');
   if(!hidden&&!ownHidden)out.push(token);
   const tag=open[1].toLowerCase();if(!voidTags.has(tag)&&!token.endsWith('/>'))stack.push({tag,hidden:ownHidden});
  }else if(!hidden)out.push(token);
 }
 return out.join('');
}

export function markupFindings(path,html){
 const findings=[],add=(rule,detail)=>findings.push({path,rule,detail});
 const markup=activeMarkup(html);
 // "A percentage is undefined at zero cost" is valid prose. A text node
 // containing only "undefined" is the missing-description rendering failure.
 for(const node of markup.split(/<[^>]*>/))if(marker.test(textContent(node))){add('unresolved-copy','Visible text contains an unresolved JavaScript/template value: '+textContent(node).match(marker)[0]);break;}
 const title=html.match(/<title\b[^>]*>([^]*?)<\/title>/i)?.[1];
 if(!title||!textContent(title))add('title','The document title is empty or missing.');
 for(const tag of html.matchAll(/<meta\b[^>]*>/gi)){
  if(!/\b(?:name|property)=["'](?:description|og:title|og:description|twitter:title|twitter:description)["']/i.test(tag[0]))continue;
  const content=tag[0].match(/\bcontent=(["'])([^]*?)\1/i)?.[2];
  if(!content||!textContent(content)||marker.test(textContent(content)))add('metadata','A search/social metadata value is empty or unresolved.');
 }
 if(!/<meta\b[^>]*\bname=["']description["']/i.test(html))add('metadata','The description is missing.');
 for(const heading of markup.matchAll(/<(h[1-6])\b[^>]*>([^]*?)<\/\1>/gi))if(!textContent(heading[2]))add('empty-heading',heading[1]+' has no text.');
 const counts=new Map();
 for(const id of ids(html.replace(/<!--[^]*?-->/g,'').replace(/<(script|style|template)\b[^>]*>[^]*?<\/\1>/gi,'')))counts.set(id,(counts.get(id)||0)+1);
 for(const [id,count] of counts)if(count>1)add('duplicate-id',`#${id} appears ${count} times.`);
 return findings;
}

const tradeWork=/\b(?:engineering|manufacturability|CAD design|structural (?:design|review)|certification|installation|electrical work|medical advice|clinical assessment|legal advice|permitting)\b/i;
const separateOffer=/\b(?:needs?|requires?|require|are|is)\b[^.!?]{0,130}\b(?:separate|their own|its own)\b[^.!?]{0,35}\b(?:scope|assessment|quote|work)\b/i;
const assignedResponsibility=/\b(?:outside (?:the |this |our )?(?:website|web|studio)|not (?:part of|included in|provided by|a service)|remain[s]? (?:with|the responsibility|your|[\w’'-]+ responsibilities)|(?:business|operator|owner|manufacturer|supplier|installer|qualified|specialist|professional)[^.!?]{0,100}(?:responsib|handle|decid|perform|confirm|approve|review|carry out)|belong[s]? to)\b/i;
const namedSoftware=/\b(?:engineering (?:tools|approval systems)|installation[- ](?:scheduling(?: systems)?|tracking|management tools)|certification records)\b/gi;

export function locationCopyFindings(entry){
 const findings=[],add=(rule,detail)=>findings.push({path:entry.path,rule,detail});
 for(const field of ['title','description','lead','decisionTitle','decision','coverageNote','scopeTrigger']){
  if(typeof entry[field]!=='string'||!entry[field].trim())add('required-copy',`${field} is empty or missing.`);
  else if(marker.test(entry[field]))add('unresolved-copy',`${field} contains an unresolved value.`);
 }
 const scope=entry.scopeTrigger||'';
 // Professional work in one sentence must not taint a separate sentence about
 // website software. Named scheduling/record tools are not physical services.
 if((scope.match(/[^.!?;]+[.!?;]?/g)||[]).some(sentence=>tradeWork.test(sentence.replace(namedSoftware,''))&&separateOffer.test(sentence)&&!assignedResponsibility.test(sentence)))add('scope-responsibility','scopeTrigger combines specialist/trade work with a separate studio scope without assigning responsibility. Clarify the business/specialist work and assess website functions separately.');
 if(!Array.isArray(entry.sources)||entry.sources.length===0)add('source-record','No public source record.');
 for(const source of entry.sources||[]){
  if(!source.label?.trim()||!source.observation?.trim())add('source-record','A source label or observation is empty.');
  try{if(!['http:','https:'].includes(new URL(source.url).protocol))throw Error();}catch{add('source-record','A source URL is not a valid HTTP(S) address.');}
  if(/first-party web capture|comparison authority|review corpus|retrieval evidence/i.test(source.observation||''))add('research-jargon','A public source note contains internal research-process wording.');
 }
 return findings;
}

// Changing a page's purpose must reconsider its contextual links. Unrelated
// global template/price edits do not invalidate this narrowly scoped review.
export function locationPurposeFingerprint(entry){
 return hash(JSON.stringify({lead:entry.lead,decisionTitle:entry.decisionTitle,decision:entry.decision,scopes:entry.scopes||[],planningTable:entry.planningTable||null}));
}

export function guidePurposeFingerprint(html){
 const article=html.match(/<article class="journal-article">([^]*?)<\/article>/)?.[1];
 if(!article)throw Error('Related guide has no journal article content.');
 return hash(textContent(article));
}

export function relatedGuideFindings(entries,review,guideHtml){
 const findings=[],seen=new Set(),byPair=new Map();
 for(const row of review||[]){const key=row.from+' -> '+row.to;if(byPair.has(key))findings.push({path:row.from,rule:'related-guide-review',detail:'Duplicate review: '+key});byPair.set(key,row);}
 for(const entry of entries)for(const link of entry.relatedGuides||[]){
  const key=entry.path+' -> '+link.path,row=byPair.get(key);seen.add(key);
  const add=detail=>findings.push({path:entry.path,rule:'related-guide-review',detail});
  if(!row){add('Review the relevance of '+link.path+' and record its page-purpose and guide-content fingerprints.');continue;}
  if(!row.reason?.trim()||!row.reviewedAt?.match(/^\d{4}-\d{2}-\d{2}$/))add('Missing relevance explanation or review date for '+link.path);
  if(row.label!==link.label)add('The contextual link label changed: '+link.path);
  if(row.locationPurposeSha256!==locationPurposeFingerprint(entry))add('The location brief changed; recheck its relevance to '+link.path);
  const html=guideHtml.get(link.path);
  if(!html)add('The related guide is absent: '+link.path);
  else if(row.guidePurposeSha256!==guidePurposeFingerprint(html))add('The guide content changed; recheck this connection: '+link.path);
 }
 for(const key of byPair.keys())if(!seen.has(key))findings.push({path:byPair.get(key).from,rule:'related-guide-review',detail:'Remove obsolete contextual-link review: '+key});
 return findings;
}

export function historicalFragmentFindings(destinations,htmlByPath){
 const findings=[];
 for(const {from,to,fragments} of destinations){
  const html=htmlByPath.get(to);
  if(!html){findings.push({path:from,rule:'historic-destination',detail:'Historical destination is absent: '+to});continue;}
  const ids=pageIds(html);
  for(const fragment of fragments)if(!ids.has(fragment))findings.push({path:from,rule:'historic-fragment',detail:`${to}#${fragment} has no target.`});
 }
 return findings;
}

export function assertHistoricalDestination(actual,expected,query){
 assert.equal(actual.origin,expected.origin);
 assert.equal(actual.pathname,expected.pathname,'Wrong historical destination');
 assert.equal(actual.search,query,'Final query changed');
 assert.equal(actual.hash,expected.hash,'Unexpected destination fragment');
}

export async function assertHistoricalHtml(response,{method,headHtml,expected,areaName,state}){
 assert.match(response.headers.get('Content-Type')||'',/^text\/html\b/i,'Historical page destination must return HTML');
 const html=method==='HEAD'?headHtml:await response.text();
 assert.ok(typeof html==='string'&&html.trim(),'Historical HTML destination must have a nonempty body');
 assert.ok(html.includes(`rel="canonical" href="${expected.origin}${expected.pathname}"`),'Final HTML canonical differs from destination');
 if(expected.hash)assert.ok(pageIds(html).has(decodeURIComponent(expected.hash.slice(1))),'Destination fragment has no active target');
 if(areaName){
  assert.ok(html.includes('name="robots" content="index,follow"'),'Geographic destination must be indexable');
  assert.ok(!/noindex/i.test(response.headers.get('X-Robots-Tag')||''),'Geographic destination has a noindex header');
  const script=html.match(/<script type="application\/ld\+json">([^]*?)<\/script>/);
  assert.ok(script,'Geographic destination must include structured data');
  const schema=JSON.parse(script[1]);
  const served=schema.filter(node=>node['@type']==='Service').flatMap(node=>[node.areaServed].flat()).map(area=>area.name.toLowerCase());
  assert.ok(served.includes(`${areaName}, ${state}`.toLowerCase()),'Service schema omits the exact intended area and state');
 }
}
