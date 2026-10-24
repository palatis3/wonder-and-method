import questionsByPath from './service-faqs.json' with {type:'json'};
import {escapeHtml as e} from './shared.mjs';

export function serviceFaqSection(path){
 const questions=questionsByPath[path];
 if(!questions?.length)return '';
 const county=path.startsWith('/areas/');
 const answers=questions.map(({question,answer,links=[]})=>`<details><summary>${e(question)}</summary><p>${e(answer)}</p>${links.length?`<p>${links.map(link=>`<a href="${e(link.path)}">${e(link.label)}</a>`).join(' · ')}</p>`:''}</details>`).join('');
 return `<section class="${county?'section county-section':'studio-section'} service-faq" id="service-questions">${county?'<div class="section-heading"><p class="eyebrow">Before you book</p>':''}<h2>Questions about your website project.</h2>${county?'</div>':''}<div class="${county?'county-faq':'service-faq-answers'}">${answers}</div></section>`;
}
