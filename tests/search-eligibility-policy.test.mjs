import test from 'node:test';
import assert from 'node:assert/strict';
import excluded from './fixtures/search-excluded-public-paths.json' with {type:'json'};
import config from '../config/site.json' with {type:'json'};
import offers from '../config/offers.json' with {type:'json'};
import map from '../authority/v5/site-map.json' with {type:'json'};
import geography from '../authority/v5/geography.json' with {type:'json'};
import dates from '../config/page-dates.json' with {type:'json'};
import {renderPages} from '../src/pages.mjs';
import {routeIndexEligible,privateRoute} from '../src/index-policy.mjs';
import {crawlFiles,robotsDirective} from '../src/seo.mjs';
import {assertPageDates} from '../scripts/page-dates.mjs';
import {socialCardPath} from '../src/social-cards.mjs';
import {publicRouteRedirect} from '../deployment/public-route-canonical.mjs';
import worker from '../deployment/worker.mjs';
const pages=renderPages({config,offers,map,geography}),byPath=new Map(pages.map(p=>[p.path,p])),crawl=crawlFiles(config,pages);

test('only eight public request forms and three fictional detail pages leave the search listings',()=>{
 assert.equal(excluded.length,11);assert.equal(pages.length,1476);
 assert.deepEqual(pages.filter(p=>p.path!=='/404/'&&!routeIndexEligible(p.path)).map(p=>p.path).sort(),excluded);
 assert.equal((crawl.sitemap.match(/<loc>/g)||[]).length,1464);assert.equal(crawl.robots,`User-agent: *\nAllow: /\nSitemap: ${config.origin}/sitemap.xml\n`);
 for(const path of excluded){const page=byPath.get(path);assert(page,path);assert.match(page.html,/<meta name="robots" content="noindex,follow">/);assert(!crawl.sitemap.includes(`<loc>${config.origin+path}</loc>`));assert(!crawl.llms.includes(`](${config.origin+path})`));assert.equal(privateRoute(path),false);assert(page.html.includes(config.origin+socialCardPath(path)),'accurate sharing retained');assert(page.html.includes('rel="canonical" href="'+config.origin+path+'"'));}
 for(const path of ['/work/','/work/fieldwork/','/work/northline/','/work/hearthside/','/work/source-handoff/','/work/lead-workbench/','/contact/','/privacy/','/payments/']){assert.equal(routeIndexEligible(path),true,path);assert(crawl.sitemap.includes(`<loc>${config.origin+path}</loc>`));assert.match(byPath.get(path).html,/<meta name="robots" content="index,follow">/);}
 assertPageDates(pages,dates);
});

test('actual edge response agrees with metadata and permits following useful links',async()=>{
 const env={ENVIRONMENT:'production',RELEASE_APPROVED:'true',SEARCH_INDEXING:'true',ASSETS:{fetch:async request=>new Response(byPath.get(new URL(request.url).pathname)?.html||'fixture',{headers:{'Content-Type':'text/html'}})}};
 for(const path of excluded)for(const method of ['GET','HEAD']){const response=await worker.fetch(new Request(config.origin+path+'?offer=unsure&request_kind=question',{method}),env,{});assert.equal(response.status,200,path);assert.equal(response.headers.get('X-Robots-Tag'),'noindex, follow',path);if(method==='GET')assert.match(await response.text(),/name="robots" content="noindex,follow"/);}
 for(const path of excluded)for(const variant of [path.slice(0,-1),path+'index.html',path.toUpperCase()])assert.equal(routeIndexEligible(variant),false,variant);
 for(const path of excluded){assert.equal(robotsDirective({...config,searchIndexing:false},path),'noindex,nofollow,noarchive,noimageindex');assert.equal(robotsDirective({...config,mode:'staging'},path),'noindex,nofollow,noarchive,noimageindex');}
});

test('every known public page uses the same one-hop canonical pathname registry',()=>{
 const query='?x=%2f&x=two+words&Case=KEEP%20ME';let checked=0;
 for(const {path} of pages.filter(p=>p.path!=='/404/'))for(const method of ['GET','HEAD'])for(const variant of [path,path.slice(0,-1)||'/',path+'index.html',path.toUpperCase().replaceAll('/','//')]){
  const input=new URL('http://www.wonderandmethod.com'+variant+query),target=publicRouteRedirect(input,method,config.origin);assert.equal(target,config.origin+path+query,path);assert.equal(publicRouteRedirect(new URL(target),method,config.origin),null,path);checked++;
 }
 assert.equal(checked,1475*8);
});
