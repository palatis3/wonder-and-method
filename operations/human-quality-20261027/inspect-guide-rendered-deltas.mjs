import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parse,parseFragment} from 'parse5';
import {journal,journalArticle} from '../../src/journal.mjs';
import {renderPages} from '../../src/pages.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=s=>createHash('sha256').update(s).digest('hex');
const offers=read('config/offers.json'),pages=new Map(renderPages({config:read('config/site.json'),offers,map:read('authority/v5/site-map.json'),geography:read('authority/v5/geography.json')}).map(p=>[p.path,p]));
const walk=n=>[n,...(n.childNodes||[]).flatMap(walk)],plain=n=>n.nodeName==='#text'?n.value:['script','style','noscript'].includes(n.tagName)?'':(n.childNodes||[]).map(plain).join(' '),clean=s=>s.replace(/\s+/g,' ').trim(),e=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const rows=[];
for(const item of journal){const p=pages.get(item.path),m=walk(parse(p.html)).find(n=>n.tagName==='main');m.childNodes=m.childNodes.filter(c=>!(c.tagName==='nav'&&c.attrs?.some(a=>a.name==='class'&&a.value==='breadcrumb')));const html=journalArticle(item,offers,journal),emitted=clean(plain(m)),source=clean(plain(parseFragment(html))),lede=html.match(/<p class="lede">([^]*?)<\/p>/)?.[1],adjusted=html.replace(/(<header class="journal-header">[^]*?<p class="lede">)[^]*?(<\/p>)/,(_m,a,b)=>a+e(p.description)+b),adjustedText=clean(plain(parseFragment(adjusted)));if(emitted===source)continue;let i=0;while(i<source.length&&source[i]===emitted[i])i++;rows.push({route:item.path,sourceArticleSha256:sha(html),emittedTextSha256:sha(emitted),onlyDescription:adjustedText===emitted,reviewedIntroduction:clean(plain(parseFragment(lede))),renderedIntroduction:p.description,firstOtherDifference:adjustedText===emitted?null:{source:source.slice(Math.max(0,i-60),i+220),emitted:emitted.slice(Math.max(0,i-60),i+220)}});}
fs.writeFileSync('output/human-quality-20261027/release-content/guide-rendered-deltas.json',JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows,null,2));
