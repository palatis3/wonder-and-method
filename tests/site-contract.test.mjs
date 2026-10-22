import test from 'node:test';
import assert from 'node:assert/strict';
import {compareSiteContract} from '../scripts/site-contract.mjs';
const baseline={schemaVersion:1,pages:{'index.html':{htmlSha256:'markup',title:'Home',textSha256:'text',headings:[['h1','Home']],links:['/contact/'],media:['photo'],styles:['site.css']}},downloads:{'scope.txt':{sha256:'scope'}},assets:{'site.css':{sha256:'stylesheet'},'brand.woff2':{sha256:'font'}}};
test('content contract detects removed content, routes, links, media, styles and downloads',()=>{
 assert.deepEqual(compareSiteContract(baseline,structuredClone(baseline)),[]);
 const extended=structuredClone(baseline);extended.pages['index.html'].robots='index,follow';assert.match(compareSiteContract(baseline,extended)[0],/robots/);
 for(const [field,value] of [['htmlSha256','lost class or script'],['title',''],['textSha256','lost'],['headings',[]],['links',[]],['media',[]],['styles',[]]]){
  const changed=structuredClone(baseline);changed.pages['index.html'][field]=value;
  assert.equal(compareSiteContract(baseline,changed).length,1);assert.match(compareSiteContract(baseline,changed)[0],new RegExp(field));
 }
 const removed=structuredClone(baseline);delete removed.pages['index.html'];delete removed.downloads['scope.txt'];
 assert.deepEqual(compareSiteContract(baseline,removed),['Removed pages: index.html','Removed downloads: scope.txt']);
 const changed=structuredClone(baseline);changed.downloads['scope.txt'].sha256='different';assert.match(compareSiteContract(baseline,changed)[0],/Changed download/);
 const style=structuredClone(baseline);style.assets['site.css'].sha256='missing rules';delete style.assets['brand.woff2'];
 assert.deepEqual(compareSiteContract(baseline,style),['Removed assets: brand.woff2','Changed asset: site.css']);
});
