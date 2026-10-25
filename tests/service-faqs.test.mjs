import test from 'node:test';
import assert from 'node:assert/strict';
import {parse} from 'parse5';
import {renderPages} from '../src/pages.mjs';
import faqs from '../src/service-faqs.json' with {type:'json'};
import config from '../config/site.json' with {type:'json'};
import offers from '../config/offers.json' with {type:'json'};
import map from '../authority/v5/site-map.json' with {type:'json'};
import geography from '../authority/v5/geography.json' with {type:'json'};

const attr=(node,name)=>node.attrs?.find(item=>item.name===name)?.value;
const descendants=node=>[node,...(node.childNodes||[]).flatMap(descendants)];
const text=node=>node.nodeName==='#text'?node.value:(node.childNodes||[]).map(text).join('');

test('approved project answers are reachable once on the intended page, before its contact step',()=>{
 const pages=renderPages({config,offers,map,geography});
 const byPath=new Map(pages.map(page=>[page.path,page]));
 const questions=new Set(),answers=new Set();
 for(const [path,items] of Object.entries(faqs)){
  assert.ok(byPath.has(path),'FAQ route must exist: '+path);
  assert.ok(path.startsWith('/areas/')||path.startsWith('/services/'),path);
  assert.ok(items.length>0&&items.length<=3,path+' has a selective set of answers');
  for(const item of items){
   const q=item.question.trim().toLowerCase(),a=item.answer.trim().toLowerCase();
   assert.ok(!questions.has(q),path+' duplicate question');questions.add(q);
   assert.ok(!answers.has(a),path+' duplicate answer');answers.add(a);
   for(const link of item.links||[]){
    assert.ok(link.label.trim(),path+' descriptive link');
    assert.ok(link.path.startsWith('/')&&!link.path.startsWith('//'),path+' internal link');
    const target=new URL(link.path,config.origin),destination=byPath.get(target.pathname);
    assert.ok(destination,path+' links to '+link.path);
    if(target.hash)assert.ok(descendants(parse(destination.html)).some(node=>attr(node,'id')===decodeURIComponent(target.hash.slice(1))),path+' resolves '+link.path);
   }
  }
 }
 for(const page of pages){
  const nodes=descendants(parse(page.html));
  const sections=nodes.filter(node=>attr(node,'id')==='service-questions');
  const items=faqs[page.path]||[];
  assert.equal(sections.length,items.length?1:0,page.path+' section count');
  if(!items.length)continue;
  const section=sections[0],details=descendants(section).filter(node=>node.tagName==='details');
  assert.equal(details.length,items.length===1?0:items.length,page.path+' answer count');
  assert.equal(text(descendants(section).find(node=>node.tagName==='h2')),items.length===1?items[0].question:'Questions about your website project.');
  for(const [index,item] of items.entries()){
   if(items.length===1){
    assert.equal(text(descendants(section).find(node=>node.tagName==='p')),item.answer,page.path+' complete visible answer');
    assert.deepEqual(descendants(section).filter(node=>node.tagName==='a').map(node=>({path:attr(node,'href'),label:text(node)})),item.links||[],page.path+' answer links');
    continue;
   }
   const children=details[index].childNodes.filter(node=>node.tagName);
   assert.equal(children[0].tagName,'summary',page.path+' native disclosure');
   assert.equal(text(children[0]),item.question,page.path+' question');
   assert.equal(text(children[1]),item.answer,page.path+' full answer');
   assert.equal(attr(details[index],'open'),undefined,page.path+' initially closed');
   assert.deepEqual(descendants(details[index]).filter(node=>node.tagName==='a').map(node=>({path:attr(node,'href'),label:text(node)})),item.links||[],page.path+' answer links');
  }
  const contact=page.path.startsWith('/areas/')?nodes.find(node=>attr(node,'id')==='your-brief'):nodes.find(node=>(attr(node,'class')||'').split(' ').includes('studio-closing'));
  assert.ok(contact,page.path+' contact step exists');
  assert.ok(nodes.indexOf(section)<nodes.indexOf(contact),page.path+' answers precede contact');
 }
});
