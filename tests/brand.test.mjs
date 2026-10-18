import {socialCardPath} from '../src/social-cards.mjs';
import {guideIllustration} from '../src/guide-art.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderPages} from '../src/pages.mjs';
import {journal,journalImage} from '../src/journal.mjs';
const read=path=>readFile(new URL('../'+path,import.meta.url));
const json=async path=>JSON.parse(await read(path));
const [config,offers,map,geography]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json'].map(json));

test('every current page has an accessible full-name identity and real icon fallbacks',()=>{
 for(const {html,path} of renderPages({config,offers,map,geography})){
  assert.match(html,/<a href="\/" class="wordmark brand-lockup" aria-label="Wonder &amp; Method home"><img[^>]+alt="" aria-hidden="true"><span class="brand-name">Wonder &amp; Method<\/span><\/a>/,path);
  assert.match(html,/<p class="wordmark brand-lockup"><img[^>]+alt="" aria-hidden="true"><span class="brand-name">Wonder &amp; Method<\/span><\/p>/,path);
  assert.match(html,/href="\/favicon.ico" sizes="16x16 32x32 48x48"/);
  assert.match(html,/href="\/assets\/brand\/favicon-96.png" sizes="96x96"/);
  assert.match(html,/rel="apple-touch-icon"[^>]+sizes="180x180"/);
  assert.doesNotMatch(html,/rel="manifest"/);
 }
});
test('brand default sharing metadata is dimensioned while editorial sharing retains each article image',()=>{
 for(const {html,path} of renderPages({config,offers,map,geography})){
  const article=journal.find(item=>item.path===path),image=config.origin+(socialCardPath(path)||'/assets/brand/social-card.png');
  assert.ok(html.includes(`property="og:image" content="${image}"`));
  assert.ok(html.includes(`name="twitter:image" content="${image}"`));
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(schema[0].logo,config.origin+'/assets/brand/logo-square.png');
  if(!article){assert.match(html,/property="og:image:width" content="1200"/);assert.match(html,/property="og:image:height" content="630"/);}
  else assert.deepEqual(schema.find(item=>item['@type']==='Article').image,article.diagram?[image]:['square','4x3','16x9'].map(ratio=>config.origin+guideIllustration(article)+'-'+ratio+'.png'));
 }
});
test('exported icons have actual sizes and opaque PNG pixels; SVG masters contain only vector art',async()=>{
 const dimensions=buffer=>{assert.equal(buffer.subarray(1,4).toString(),'PNG');return [buffer.readUInt32BE(16),buffer.readUInt32BE(20),buffer[25]];};
 for(const [name,width,height] of [['favicon-96',96,96],['apple-touch-icon',180,180],['logo-square',512,512],['social-card',1200,630]])assert.deepEqual(dimensions(await read(`src/assets/brand/${name}.png`)),[width,height,2]);
 const ico=await read('src/assets/brand/favicon.ico');assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);
 for(const [i,size] of [16,32,48].entries()){const pos=6+i*16,length=ico.readUInt32LE(pos+8),offset=ico.readUInt32LE(pos+12);assert.deepEqual([ico[pos],ico[pos+1]],[size,size]);assert.ok(offset+length<=ico.length);assert.deepEqual(dimensions(ico.subarray(offset,offset+length)),[size,size,2]);}
 for(const name of ['emblem','emblem-reverse','wordmark-light','wordmark-reverse','social-card']){const svg=(await read(`src/assets/brand/${name}.svg`)).toString();assert.match(svg,/<path /);assert.doesNotMatch(svg,/<image|data:image|<text|<script|<foreignObject/);}
});
