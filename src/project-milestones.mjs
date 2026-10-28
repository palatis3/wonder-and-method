import {escapeHtml as e,money} from './shared.mjs';
import defaultOffers from '../config/offers.json' with {type:'json'};

const milestones=[
 {title:'Agree and book',you:'Approve the written proposal and have your facts, photos and account access ready.',studio:'Confirm the pages, features, costs and dates before starting work.',payment:'To book, after written proposal approval'},
 {title:'Review the design',you:'Check the facts, send one combined list of changes and approve the design in writing.',studio:'Write and design the website, then make the agreed refinements.',payment:'After written design approval'},
 {title:'Approve and launch',you:'Review the working website, send one combined list of changes and approve the final version and launch in writing.',studio:'Build and test the agreed pages and forms; launch after approval and final payment.',payment:'After written working-site approval, before launch'}
];

export function projectMilestones(offers=defaultOffers,{offerId=null,compact=false,stageAnchors=false,headingLevel=3,preview=false,artifact=null}={}){
 if(offerId&&!['launch_site','focused_site','signature_site'].includes(offerId))throw Error('Website milestones only apply to website builds');
 if(![2,3].includes(headingLevel))throw Error('Unsupported milestone heading level');
 const schedule=offers[offerId||'launch_site'].payment_schedule;
 if(preview)return `<ol class="process-summary">${milestones.map((step,index)=>`<li><span class="process-step" aria-hidden="true">0${index+1}</span><h3>${step.title}</h3><p>${e(step.you)}</p><p><strong>${schedule[index].percent}%</strong> — ${e(step.payment)}.</p></li>`).join('')}</ol><p>Build time begins when your agreed facts, photos and access are ready. Add two customer review windows of up to five business days each; silence is never approval.</p>`;
 return `<ol class="project-milestones${compact?' project-milestones--compact':''}">${milestones.map((step,index)=>`<li${stageAnchors?` id="process-stage-${index+2}"`:''}><h${headingLevel}><span class="milestone-number" aria-hidden="true">${index+1}.</span> ${step.title}</h${headingLevel}><dl><dt>You</dt><dd>${e(step.you)}</dd><dt>I</dt><dd>${e(step.studio)}</dd><dt>Payment</dt><dd><strong>${offerId?money(schedule[index].amount)+' · ':''}${schedule[index].percent}%</strong> — ${e(step.payment)}.</dd></dl>${artifact?artifact(index):''}</li>`).join('')}</ol>`;
}
