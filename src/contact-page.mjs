import {escapeHtml as e} from './shared.mjs';
import {inquiryForm} from './inquiry-form.mjs';
import {studioIcon} from './studio-motifs.mjs';

export function contactPage(intake,offers,config){
 return `<header class="page-intro contact-intro contact-intro--studio">
  <div class="contact-opening"><p class="eyebrow">Contact Terry</p><h1>Let’s talk about<br>your website.</h1><p class="lede">Tell me what you do and what you want to change. We start by email; no call is required.</p></div>
  <div class="contact-studio-note"><span class="contact-note-mark">${studioIcon('spark')}</span><p class="eyebrow">A note to the studio</p><p class="contact-signature">Hello, I’m Terry.</p><p>You’ll work directly with me on the design, writing and build.</p><p class="contact-note-location">Buffalo · Working online</p></div>
 </header>
 <div class="contact-layout contact-page-layout">
  <div class="contact-form-column"><div class="contact-form-heading"><p class="eyebrow">Start the conversation</p><h2>Your project, in a few words.</h2></div>${intake.live?'':`<div class="note">${e(intake.notice)}</div>`}${inquiryForm(intake,{offers})}</div>
  <section class="contact-expectations" aria-labelledby="before-contact"><span class="contact-aside-mark">${studioIcon('studio')}</span><p class="eyebrow">Clear from the start</p><h2 id="before-contact">Before we begin</h2><p>Nothing is booked or charged when you send this form. I confirm the work, price, outside costs and dates with you in writing before payment.</p><p class="contact-response-note">${e(config.responseWindow)}</p><ul class="link-row"><li><a href="/pricing/">Compare prices and included work</a></li><li><a href="/process/">See how projects work</a></li></ul></section>
 </div>`;
}
