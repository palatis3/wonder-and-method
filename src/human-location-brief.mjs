import briefs from './human-location-briefs.json' with {type:'json'};
import {escapeHtml as e} from './shared.mjs';

// Authored from each page's complete source-backed brief, then reviewed against
// its frozen input. The import script checks identity before changing this file.
const byPath=new Map(briefs.map(brief=>[brief.route,brief]));
export const humanLocationBrief=path=>byPath.get(path)||null;
export function humanLocationPlan(brief){
 return `<div id="local-planning" class="human-location-plan"><div class="local-customer-question"><p class="eyebrow">The customer’s question</p><p>${e(brief.customerQuestion)}</p></div><ol class="local-decision-steps" aria-label="Three website decisions">${brief.decisions.map((decision,index)=>`<li><span class="local-decision-number" aria-hidden="true">0${index+1}</span><div><h3>${e(decision.label)}</h3><p>${e(decision.body)}</p></div></li>`).join('')}</ol><div class="local-example-reason"><h3>The public example behind the idea</h3><p>${e(brief.sourceBridge)}</p></div><p class="local-example-boundary">${e(brief.limits)}</p></div>`;
}
