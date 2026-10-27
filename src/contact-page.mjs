import {escapeHtml as e} from './shared.mjs';
import {inquiryForm} from './inquiry-form.mjs';
import {studioIcon} from './studio-motifs.mjs';

export function contactPage(intake,offers,config){
 return `<header class="page-intro contact-intro contact-intro--studio">
  <div class="contact-opening"><h1>Let’s talk about your website.</h1><p class="lede">Tell me what you need help with. You do not need to choose a package. We start by email.</p></div>
 </header>
 <div class="contact-layout contact-page-layout">
  <div class="contact-form-column">${intake.live?'':`<div class="note">${e(intake.notice)}</div>`}${inquiryForm(intake,{offers})}</div>
  <section class="contact-expectations" aria-labelledby="before-contact"><span class="contact-aside-mark">${studioIcon('studio')}</span><h2 id="before-contact">Hello, I’m Terry.</h2><p>You’ll work directly with me on the design, writing and build, online from Buffalo.</p><p>Outside costs are listed separately in your proposal.</p><ul class="link-row"><li><a href="/pricing/">Compare prices and included work</a></li><li><a href="/process/">See how projects work</a></li></ul></section>
 </div>`;
}
