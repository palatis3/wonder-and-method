import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFragment} from 'parse5';
import {conceptPreviewPicture} from '../src/concept-previews.mjs';
import {workGallery} from '../src/work-gallery.mjs';

function elements(html,name){const found=[];const visit=node=>{if(node.tagName===name)found.push(Object.fromEntries(node.attrs.map(a=>[a.name,a.value])));for(const child of node.childNodes||[])visit(child);};visit(parseFragment(html));return found;}
test('responsive preview reserves the selected phone proportions and provides a desktop fallback',()=>{
 const html=conceptPreviewPicture('fieldwork',{alt:'Fieldwork <design> "example"',sizes:'50vw',phoneSizes:'90vw'}),[source]=elements(html,'source'),[img]=elements(html,'img');
 assert.equal(source.media,'(max-width:767px)');assert.match(source.srcset,/fieldwork-showcase-phone-350\.webp 350w/);assert.match(source.srcset,/fieldwork-showcase-phone\.webp 700w/);assert.equal(source.sizes,'90vw');assert.ok(Number(source.height)>Number(source.width));
 assert.match(img.src,/showcase-desktop\.webp$/);assert.equal(img.sizes,'50vw');assert.equal(img.loading,'lazy');assert.equal(img.alt,'Fieldwork <design> "example"');assert.equal(elements(html,'design').length,0);assert.throws(()=>conceptPreviewPicture('missing'),/Missing concept capture/);
});
test('work gallery prioritizes the featured image and lazily loads every later concept',()=>{
 const images=elements(workGallery({}),'img'),high=images.filter(image=>image.fetchpriority==='high');assert.equal(high.length,1);assert.equal(high[0].src,'/assets/work/assetrounds/desktop.webp');
 const concepts=images.filter(image=>image.src.includes('/concepts/'));assert.equal(concepts.length,3);for(const image of concepts){assert.match(image.src,/-showcase-desktop\.webp$/);assert.equal(image.loading,'lazy');assert.equal(image.fetchpriority,undefined);}
 assert.equal(elements(workGallery({}),'source').filter(source=>source.media==='(max-width:767px)').length,3);
});
