import {escapeHtml as e,money} from './shared.mjs';
import {journal,journalArticle} from './journal.mjs';
const guides=journal;
export const conditionalDrafts=guides;
export function approvedConditionalPages(config,o,{previewDrafts=false}={}){
 if(previewDrafts && config.mode==='production')throw new Error('Conditional draft review cannot render in production.');
 const approvals=config.guideApprovals||[];
 for(const approval of approvals){if(!approval||!guides.some(g=>g.path===approval.path)||!approval.evidenceReference||!approval.reviewedBy||!/^\d{4}-\d{2}-\d{2}$/.test(approval.reviewedAt||''))throw new Error('Guide publication requires a known route and dated reviewer/evidence reference.');}
 const available=guides.filter(g=>previewDrafts||approvals.some(a=>a.path===g.path));
 const ready=available.map(g=>({...g,body:(previewDrafts?'<aside class="note"><strong>Editorial draft — approval pending.</strong> '+e(g.needed)+'</aside>':'')+journalArticle(g,o,available)}));
 if(previewDrafts && !config.careReady){
  const pending='Not yet confirmed — review draft';
  const draft=approvedConditionalPages({...config,careReady:true,care:{staffedHours:pending,timezone:pending,closures:pending,contact:pending,alertRecipient:pending,escalation:pending,formReceiptEvidence:pending,recoveryEvidence:pending,reviewedBy:pending,reviewedAt:pending}},o).find(p=>p.path==='/services/website-care/');
  ready.push({...draft,body:'<aside class="note"><strong>Service draft — not available for enrollment.</strong> Coverage, recipient, escalation, actual form receipt and recovery evidence must be confirmed.</aside>'+draft.body});
 }
 if(config.careReady){const care=config.care||{};for(const key of ['staffedHours','timezone','closures','contact','alertRecipient','escalation','formReceiptEvidence','recoveryEvidence','reviewedBy','reviewedAt'])if(!care[key])throw new Error(`Care publication needs actual ${key}.`);ready.push({path:'/services/website-care/',title:'Website Care',description:'Bounded checks and minor edits for approved websites, CMS and defined workflows.',body:`<p>For approved static sites, supported managed CMS and defined workflows. ${money(o.plans.keep_running.monthly_price)} per month, optional and prepaid with no minimum term.</p><ul>${o.plans.keep_running.deliverables.map(x=>`<li>${e(x)}</li>`).join('')}</ul><h2>Actual coverage</h2><p>${e(care.staffedHours)} · ${e(care.timezone)}. Closures: ${e(care.closures)}. Contact: ${e(care.contact)}.</p><p>${e(o.monthly_terms.response)} ${e(o.monthly_terms.queue)}</p><p>Actual reply and work windows are written in the quote after coverage is confirmed. After-hours alerts enter the next agreed staffed window.</p><h2>Scope and exit</h2><p>The monthly minor-edit allowance does not roll over. New features or business logic, unsupported systems and unlimited repairs are separate. Provider fees are approved in advance and paid directly by the client.</p><p>${e(o.ownership_and_billing.subscription)} ${e(o.ownership_and_billing.cancellation_route)} ${e(o.ownership_and_billing.handoff)}</p><p><a href="/pricing/">Read all costs and terms</a> or <a href="/contact/">check Care fit</a>.</p>`});}
 return ready;
}
