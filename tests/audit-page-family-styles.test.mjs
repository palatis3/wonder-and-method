import test from 'node:test';
import assert from 'node:assert/strict';
import {pageStyleFamily,pageFamilyStyles} from '../scripts/page-family-styles.mjs';

test('family styles only omit provably absent literal components and preserve cascade',()=>{
 const css='p{color:black}.home-proof{color:red}.checkout-card,.home-proof{padding:2rem}.checkout-card{color:blue}.checkout-card{color:green}:not(.home-proof){display:block}.journal-card:is(:hover,:focus){color:red}.inquiry-confirmation{display:grid}@media(max-width:500px){.home-proof{color:white}.checkout-card{color:orange}}@keyframes home-breathe{0%{opacity:0}100%{opacity:1}}';
 const result=pageFamilyStyles(css,'<div class="checkout-card"></div>',"element.className='inquiry-confirmation'");
 assert.doesNotMatch(result.css,/(?:^|})\.home-proof\{/);
 assert.match(result.css,/\.checkout-card\{color:blue\}\.checkout-card\{color:green\}/);
 assert.match(result.css,/:not\(\.home-proof\)/);assert.match(result.css,/journal-card:is/);
 assert.match(result.css,/inquiry-confirmation\{display:grid\}/);
 assert.match(result.css,/@media\(max-width:500px\)\{\.checkout-card\{color:orange\}\}/);
 assert.match(result.css,/@keyframes home-breathe/);
});

test('routes share predictable CSS families without changing content or index policy',()=>{
 for(const path of ['/areas/','/areas/erie-county/','/areas/ohio/erie-county/'])assert.equal(pageStyleFamily(path),'areas');
 assert.equal(pageStyleFamily('/checkout/grow/'),'services');
 assert.equal(pageStyleFamily('/guides/website-project-cost/'),'guides');
 assert.equal(pageStyleFamily('/work/hearthside/request/'),'work');
 assert.equal(pageStyleFamily('/privacy/'),'information');
 assert.equal(pageStyleFamily('/'),'home');
});
