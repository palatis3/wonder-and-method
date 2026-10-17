import {escapeHtml as e, inquiryChoices, inquiryContextSummary} from './shared.mjs';
import config from '../config/site.json' with {type:'json'};

export function inquiryConfirmationHtml(data, {heading='h2'}={}) {
  const synthetic=data.synthetic===true;
  const question=data.request_kind==='question';
  const title=synthetic?'Test inquiry recorded.':question?'Thanks. We have your question.':'Thanks. We have your request.';
  const service=inquiryChoices.find(([id])=>id===data.service)?.[1];
  const summary=inquiryContextSummary(data);
  const tag=heading==='h1'?'h1':'h2', nextHeading=heading==='h1'?'h2':'h3';
  return `<p class="confirmation-label"><span aria-hidden="true">✓</span> ${synthetic?'Test complete':question?'Question received':'Request received'}</p><${tag} id="inquiry-confirmation-heading">${title}</${tag}><p class="confirmation-intro">${synthetic?'This was a synthetic test. No email was sent and no reply is expected.':e(config.responseWindow)}</p>${service?`<p><strong>Selected service:</strong> ${e(service)}</p>`:''}<p class="inquiry-reference"><strong>Your reference</strong><code>${e(data.reference)}</code><span>Keep this reference if you need to follow up.</span></p>${synthetic?'':`<div class="response-next"><${nextHeading}>What happens next</${nextHeading}><p>${question?'Terry will review your question and reply by email.':'Terry will review your details and email you about fit, scope and available dates.'} You do not need to submit again.</p><p>No payment has been taken and no project is booked.</p></div>`}${summary.length?`<details><summary>Your selected details</summary><ul>${summary.map(line=>`<li>${e(line)}</li>`).join('')}</ul></details>`:''}<p class="confirmation-actions"><a class="button" href="/work/">Explore the studio’s work ↗</a><a href="/">Back to home</a></p><p class="confirmation-help">Need help? Email <a href="mailto:${e(config.contactEmail)}">${e(config.contactEmail)}</a> and include your reference.</p>`;
}
