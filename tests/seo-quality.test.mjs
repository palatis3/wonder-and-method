import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectSeoPage,auditSeoCorpus} from '../scripts/seo-quality-rules.mjs';
import {robotsDirective} from '../src/seo.mjs';
const config={origin:'https://example.com',mode:'production',searchIndexing:true};
function page({route='/',title='A clear page title',description='A useful, specific summary describing this page and the practical information it contains.',body='<h1>Page heading</h1><p>Useful page content.</p>',head='',canonical=route==='/404/'?'':`<link rel="canonical" href="${config.origin}${route}">`,robots=robotsDirective(config,route),site=config}={}){
 return inspectSeoPage({route,config:site,html:`<!doctype html><html><head><title>${title}</title><meta name="description" content="${description}"><meta name="robots" content="${robots}">${canonical}${head}</head><body><main>${body}</main></body></html>`});
}
const errors=p=>p.findings.filter(f=>f.severity==='error').map(f=>f.rule);
const sitemap=routes=>`<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(r=>`<url><loc>${config.origin}${r}</loc></url>`).join('')}</urlset>`;

test('incoming-link review binds destination and accessible label even when parent count is unchanged',()=>{
 const evidence=anchor=>auditSeoCorpus({pages:[page({body:`<h1>Home</h1>${anchor}`}),page({route:'/other/',title:'Other',description:'Different summary.'})],sitemap:sitemap(['/','/other/']),config}).findings.find(item=>item.route==='/other/'&&item.rule==='incoming-links').evidenceSha256;
 const first=evidence('<a href="/other/">Explore the other project</a>');
 assert.notEqual(first,evidence('<a href="/other/">here</a>'));
 assert.notEqual(first,evidence('<a href="/other/#details">Explore the other project</a>'));
 assert.notEqual(first,evidence('<a href="/other/" aria-label="here">Explore the other project</a>'));
 assert.notEqual(first,evidence('<span id="label">here</span><a href="/other/" aria-labelledby="label">Explore the other project</a>'));
 assert.equal(first,evidence('<a href="https://example.com/other/">Explore the other project</a>'));
});
test('title limit measures decoded Unicode characters including brand and spaces',()=>{
 const atLimit=page({title:'x'.repeat(66)+' &amp; 😀'});
 assert.equal(atLimit.titleCharacters,70);
 assert.deepEqual(errors(atLimit),[]);
 assert.ok(errors(page({title:'x'.repeat(67)+' &amp; 😀'})).includes('title-length'));
});
test('title gate remains active during a global indexing hold but exempts intentional utility pages',()=>{
 assert.ok(errors(page({title:'x'.repeat(71),robots:'noindex,nofollow,noarchive,noimageindex',site:{...config,searchIndexing:false}})).includes('title-length'));
 assert.ok(!errors(page({route:'/checkout/',title:'x'.repeat(71)})).includes('title-length'));
});
test('accessible SVG titles neither count as nor substitute for document metadata',()=>{
 const body='<h1>Page</h1><svg role="img"><title>Helpful illustration</title></svg>';
 assert.deepEqual(errors(page({body})),[]);
 const missing=inspectSeoPage({route:'/',config,html:`<!doctype html><html><head></head><body><main>${body}</main></body></html>`});
 assert.ok(errors(missing).includes('title-required'));
});
test('missing and duplicate metadata, conflicting robots and wrong canonical block publication',()=>{
 const p=page({title:' ',description:' ',canonical:'<link rel="canonical" href="https://elsewhere.example/">',head:'<meta name="description" content="Another description"><meta name="googlebot" content="noindex">',robots:'index,follow,noindex',body:'<h1></h1><p>Text</p>'});
 for(const rule of ['title-required','description-required','canonical','robots-policy','crawler-conflict','primary-heading'])assert.ok(errors(p).includes(rule),rule);
 assert.deepEqual(errors(page({route:'/404/'})),[]);
 assert.ok(errors(page({head:'<title>Second title</title>'})).includes('title-required'));
});
test('missing image alt fails while deliberate decorative alt is allowed',()=>{
 assert.ok(errors(page({body:'<h1>Heading</h1><img src="/image.png">'})).includes('image-alt'));
 assert.ok(!errors(page({body:'<h1>Heading</h1><img src="/image.png" alt="">'})).includes('image-alt'));
});
test('JSON-LD is parsed locally, rejects broken JSON and scalar values, and does not fetch contexts',()=>{
 for(const value of ['{broken','null','"text"','[]'])assert.ok(errors(page({head:`<script type="application/ld+json">${value}</script>`})).includes('structured-data-json'));
 assert.deepEqual(errors(page({head:'<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}</script>'})),[]);
});
test('sitemap must contain exactly the configured indexable canonicals with no duplicates',()=>{
 const pages=[page(),page({route:'/checkout/',title:'Checkout',description:'A separate checkout summary.'})];
 const report=auditSeoCorpus({pages,sitemap:sitemap(['/checkout/','/checkout/']),config});
 for(const rule of ['sitemap-missing','sitemap-unexpected','sitemap-duplicates'])assert.ok(report.findings.some(f=>f.rule===rule),rule);
 assert.equal(auditSeoCorpus({pages:[page()],sitemap:sitemap(['/']),config}).errorCount,0);
});
test('duplicate indexable metadata is rejected, including case and decoded-entity differences',()=>{
 const report=auditSeoCorpus({pages:[page({title:'A &amp; B'}),page({route:'/other/',title:'a & B'})],sitemap:sitemap(['/','/other/']),config});
 assert.equal(report.findings.filter(f=>f.rule==='duplicate-title').length,2);
 assert.equal(report.findings.filter(f=>f.rule==='duplicate-description').length,2);
});
test('discovery counts follow links and descriptive image anchors; readability remains advisory',()=>{
 const long='word '.repeat(105)+'.';
 const home=page({body:`<h1>Home</h1><a href="/other/"><img src="/image.png" alt="Other page"></a><a rel="nofollow" href="/isolated/">Isolated</a><p>${long}</p>`});
 const other=page({route:'/other/',title:'Other title',description:'Distinct other summary.'});
 const isolated=page({route:'/isolated/',title:'Isolated title',description:'Distinct isolated summary.'});
 const report=auditSeoCorpus({pages:[home,other,isolated],sitemap:sitemap(['/','/other/','/isolated/']),config});
 assert.deepEqual(other.incoming,['/']);assert.deepEqual(isolated.incoming,[]);
 assert.ok(!home.findings.some(f=>f.rule==='link-label'));
 assert.ok(home.findings.some(f=>f.rule==='long-paragraph'&&f.severity==='review'));
 assert.equal(report.errorCount,0);
});
