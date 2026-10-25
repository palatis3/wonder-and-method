import defaultOffers from '../config/offers.json' with {type:'json'};
import offerCopy from './service-faq-offer-copy.json' with {type:'json'};
import {resolveOfferCopy} from './offer-catalog.mjs';
import questionsByPath from './service-faqs.json' with {type:'json'};
import {escapeHtml as e} from './shared.mjs';

export function validateOfferFaqBindings(source=questionsByPath,bindings=offerCopy){
 for(const [path,items] of Object.entries(bindings)){
  const seen=new Set();
  for(const binding of items){
   const matches=source[path]?.filter(row=>row.question===binding.question)||[];
   if(seen.has(binding.question)||matches.length!==1||matches[0].answer!==binding.sourceAnswer)
    throw Error('Review changed FAQ offer binding: '+path+' '+binding.question);
   seen.add(binding.question);
  }
 }
}

export function serviceFaqSection(path,offers=defaultOffers){
 validateOfferFaqBindings();
 const questions=questionsByPath[path]?.map(row=>{
  const binding=offerCopy[path]?.find(item=>item.question===row.question);
  if(!binding)return row;
  const template=binding.singleBatchTemplate&&offers.plans.improve.small_change_batches===1&&offers.plans.grow.small_change_batches===1?binding.singleBatchTemplate:binding.template;
  return {...row,answer:resolveOfferCopy(template,offers)};
 });
 if(!questions?.length)return '';
 const county=path.startsWith('/areas/');
 if(questions.length===1){
  const {question,answer,links=[]}=questions[0];
  return `<section class="${county?'section county-section':'studio-section'} service-faq service-faq-single" id="service-questions"><h2>${e(question)}</h2><div class="${county?'county-faq':'service-faq-answers'}"><p>${e(answer)}</p>${links.length?`<p>${links.map(link=>`<a href="${e(link.path)}">${e(link.label)}</a>`).join(' · ')}</p>`:''}</div></section>`;
 }
 const answers=questions.map(({question,answer,links=[]})=>`<details><summary>${e(question)}</summary><p>${e(answer)}</p>${links.length?`<p>${links.map(link=>`<a href="${e(link.path)}">${e(link.label)}</a>`).join(' · ')}</p>`:''}</details>`).join('');
 return `<section class="${county?'section county-section':'studio-section'} service-faq" id="service-questions">${county?'<div class="section-heading"><p class="eyebrow">Before you book</p>':''}<h2>Questions about your website project.</h2>${county?'</div>':''}<div class="${county?'county-faq':'service-faq-answers'}">${answers}</div></section>`;
}
