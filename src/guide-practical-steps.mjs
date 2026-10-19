import {money} from './shared.mjs';

const section = (id, title, body) => ({id, title, body});
const link = (url, label) => `<a href="${url}">${label}</a>`;
const list = items => `<ol>${items.map(item => `<li>${item}</li>`).join('')}</ol>`;
const table = (caption, headings, rows) => `<div class="journal-table-wrap" role="region" tabindex="0" aria-label="${caption}"><table><caption>${caption}</caption><thead><tr>${headings.map(heading => `<th scope="col">${heading}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((cell, i) => i ? `<td>${cell}</td>` : `<th scope="row">${cell}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`;

export function practicalGuideSections(path, sections, o) {
  const additions = [];
  const replace = (id, replacement) => { const index = sections.findIndex(item => item.id === id); if (index >= 0) sections[index] = replacement; else additions.push(replacement); };
  if (path === '/guides/website-project-cost/') {
    replace('start-with-scope', section('start-with-scope', 'Website prices you can compare', `<p>Wonder and Method’s fixed website fees run from ${money(o.launch_site.public_price)} to ${money(o.signature_site.public_price)}, before provider bills and applicable tax. A local provider also advertises lower upfront fees tied to a two-year commitment. Compare the whole commitment and included work, not just the first payment.</p><p>The examples below were checked October 18, 2026. They are selected published offers, not a Buffalo market average or equivalent scopes.</p>`));
    replace('dated-price-example', section('dated-price-example', 'Five published Buffalo website offers', table('Selected published website prices · checked October 18, 2026', ['Offer', 'Published payment', 'Cost and scope distinction'], [
      ...['launch_site', 'focused_site', 'signature_site'].map(id => [link('/pricing/#offer-' + id, 'Wonder and Method ' + o[id].public_name), money(o[id].public_price) + ' fixed fee', `Up to ${o[id].marketing_page_cap} marketing pages. Provider bills are separate; monthly care is optional.`]),
      [link('https://www.buffaloweb.com/smartstart/', 'Buffalo Web SmartStart Essential'), '$299.99 upfront + $99/month for 24 months', '$2,675.99 across the stated commitment. Up to 20 pages and two years of hosting included.'],
      [link('https://www.buffaloweb.com/smartstart/', 'Buffalo Web SmartStart Enhanced'), '$599.99 upfront + $139/month for 24 months', '$3,935.99 across the stated commitment. Up to 20 pages, two years of hosting and two listed enhancements.']
    ]) + '<p>The commitment totals are arithmetic from the advertised fees, before any applicable tax or additions. Confirm current terms, editing access, ownership and exit costs with each provider. A hosting-inclusive two-year plan and an independently hosted fixed-fee build have different responsibilities.</p><p>A DIY reference is ' + link('https://webflow.com/pricing', 'Webflow Basic at $15/month billed yearly') + ': $180/year before tax, for a site without a CMS. Writing, design, checking the result, a domain and other tools can add cost. Your own time belongs in that budget.</p>'));
    replace('annual-choice', section('annual-choice', 'Check the payment schedule', `<p>Website payments are 50% at booking, 30% at written design acceptance and 20% at written staging acceptance. For Launch, that is ${money(o.launch_site.public_price*.5)}, ${money(o.launch_site.public_price*.3)} and ${money(o.launch_site.public_price*.2)}. Domain, hosting and paid tools are separate. See ${link('/pricing/#payments','payment and cancellation terms')}.</p>`));
  }
  if (path === '/guides/website-maintenance-cost/') {
    replace('platform-cost', section('platform-cost', 'Published platform costs are separate from maintenance', table('Platform price examples · checked October 18, 2026', ['Platform', 'Published charge', 'What to check'], [
      [link('https://developers.cloudflare.com/workers/platform/pricing/', 'Cloudflare Workers'), 'Free within free-plan limits; paid account starts at $5/month, plus usage', 'Usage limits, application services and separate domain/email bills.'],
      [link('https://webflow.com/pricing', 'Webflow Basic'), '$15/month billed yearly ($180/year)', 'For a site without a CMS; other products and tax can add cost.'],
      [link('https://webflow.com/pricing', 'Webflow Premium'), '$25/month billed yearly ($300/year)', 'Check the included CMS and plan limits against the actual site.']
    ]) + `<p>Those are platform charges. Wonder and Method’s optional maintenance and improvement work is ${money(o.plans.keep_running.monthly_price)}–${money(o.plans.grow.monthly_price)} per month, plus a ${money(o.baseline.one_time_price)} setup review for an existing site without a usable baseline. A working site you maintain yourself may need no monthly studio service.</p>`));
  }
  if (path === '/guides/website-not-showing-on-google/') {
    additions.push(section('inspection-steps', 'Run your first Search Console check', list([
      'Open the property for the correct domain in Search Console. Paste the complete public page URL into the inspection bar and press Enter.',
      'Read the indexing result and the last crawl information. Open the explanation if Google says the URL is not indexed; note the reason before changing the page.',
      'Choose Test live URL to check the current version. Compare it with the indexed result: a recent correction may not be reflected in the older crawl.',
      'If the public page is eligible and the problem has been fixed, use Request indexing. Check the sitemap and useful internal links too; repeated requests do not guarantee a place in search.'
    ]) + '<p>See ' + link('https://support.google.com/webmasters/answer/9012289', 'Google’s URL Inspection instructions') + '. A quick <code>site:yourdomain.com</code> search can provide clues, but it is not a complete index report.</p>'));
  }
  if (path === '/guides/contact-form-not-working/') {
    additions.push(section('platform-settings', 'Check the notification destination in your platform', `<p><strong>Squarespace:</strong> open the form block’s Storage settings and inspect the connected email address. A later change to the account’s email does not automatically change an existing form’s recipient. Save the intended destination and repeat one controlled test. ${link('https://support.squarespace.com/hc/en-us/articles/205814638-Set-up-form-and-newsletter-storage', 'Squarespace form storage instructions')}.</p><p><strong>Wix:</strong> check the form’s notification automation and its configured recipients. The owner normally receives submission notifications; a collaborator’s ability to receive and handle them depends on permissions. Confirm the actual recipient instead of assuming every administrator receives a copy. ${link('https://support.wix.com/en/article/wix-forms-choosing-who-gets-notified-about-form-submissions', 'Wix notification instructions')}.</p><p><strong>WordPress:</strong> identify the form plugin first, then inspect that form’s notification recipient and any mail-service log. Plugin settings differ. Give support the plugin name and the failed stage; do not install a second mail plugin without checking the current setup.</p>`));
  }
  if (path === '/guides/website-migration-checklist/') {
    additions.push(section('redirect-example', 'A URL map you can hand to your developer', table('Illustrative migration map', ['Old URL', 'New URL', 'Action'], [
      ['/lawn-care', '/services/lawn-care/', 'Permanent redirect to the matching service page.'],
      ['/about/', '/about/', 'Keep the address; no redirect needed.'],
      ['/spring-2023-offer/', 'No replacement', 'Remove obsolete internal links and return 404 or 410 if no equivalent page exists.']
    ]) + `<p>Have the developer check that each redirect reaches the final page in one step. Google recommends keeping redirects for as long as possible, generally at least a year. For a move to a different domain or subdomain, review Search Console’s Change of Address procedure as well. A same-domain path change is a different case. ${link('https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes', 'Google’s site-move guidance')}.</p>`));
  }
  if (path === '/guides/local-seo-profile-eligibility/') {
    additions.push(section('local-profile-actions', 'Local search steps for a trade business', list([
      'Start with actual coverage: list the towns and jobs the team serves, what requires a site visit, and how an estimate is arranged.',
      'If the business qualifies for a Google Business Profile, use its real business name and the fewest specific categories that describe its core work. A business that visits customers and does not receive them at its address should hide that address.',
      'Keep the business name, controlled phone number, website link and customer-facing hours consistent across the website and the profiles you maintain.',
      'After real work, invite customers to leave an honest review through the profile’s review link. Offer no reward or discount for a review, and reply without revealing customer details.',
      'Build one useful page per distinct service. Add approved project photos, the job types accepted, real coverage and a working estimate request before making more town pages.'
    ]) + `<p>Check ${link('https://support.google.com/business/answer/3038177', 'Google’s business representation rules')} and ${link('https://support.google.com/business/answer/3474122', 'review guidance')}. These steps help people assess and contact the business; they do not promise a ranking.</p>`));
  }
  if (path === '/guides/website-launch-checklist/') {
    additions.push(section('launch-check-tools', 'Record a few repeatable technical checks', list([
      'Open the home, service and contact pages at a narrow phone width and at desktop width. Tab through the menu and form; check visible focus, error labels and the final confirmation.',
      'Run Lighthouse on the main page and the contact page. Keep the report date and conditions; investigate its findings alongside the manual checks.',
      'Test an old URL, a missing URL and the preferred domain. Confirm the expected redirect or HTTP status with the maintainer.',
      'Validate structured data against the visible business facts. Check sitemap URLs, canonical URLs, page titles and indexing settings after the public switch.',
      'Record who can recover the previous version, who receives form messages, and when the next check is due.'
    ])));
  }
  if (path === '/guides/ai-website-or-custom/') {
    replace('trial', section('trial', 'Test the generated draft before buying more work', `<p>Try a short, factual brief: “Create a draft website for a Buffalo garden-care business. Use these approved services and coverage details. Leave missing prices, credentials and project examples blank. Make the main action a request for an estimate.” Supply only information you have permission to use.</p>${list(['Check whether the tool invented a review, qualification, address or completed project. Remove each unsupported claim.', 'Replace a service paragraph and one image. Check the phone layout and whether you can undo the change.', 'Test the full form with a controlled address, then inspect where the message arrived and whether you can reply.', 'Ask what can be exported, how backups work and which features stop when the subscription ends.'])}<p>Use ${link('/assets/downloads/audit-website-approach.csv', 'the approach comparison worksheet')} to record the results. If the design structure itself is the question, use ${link('/guides/custom-website-or-template/', 'the separate custom-versus-template guide')}.</p>`));
  }
  let result=[...sections,...additions];
  if(path==='/guides/website-not-showing-on-google/'){
   const first=result.find(x=>x.id==='inspection-steps');
   first.body='<span id="index"></span>'+first.body;
   result=[first,...result.filter(x=>!['inspection-steps','index'].includes(x.id))];
  }
  if(path==='/guides/contact-form-not-working/'){
   const quick=section('five-minute-check','Start with a five-minute owner check',list(['Open the public form on your phone and send one clearly labeled test using an email address you control. Note the time and confirmation.','Search the receiving inbox, spam and quarantine for that test. Confirm that someone checks this mailbox.','Open the form settings and check the notification recipient. An old employee or former provider may still be listed.','If your platform keeps submissions, look for the same test there. Some WordPress plugins and custom forms do not save a separate copy.','Reply to the test from the business mailbox. If any step fails, give your web person the page, time and observed result; keep passwords and customer records private.']));
   quick.body='<span id="trace"></span><span id="inbox"></span>'+quick.body;
   const platform=result.find(x=>x.id==='platform-settings');
   result=[quick,platform,...result.filter(x=>!['platform-settings','trace','inbox'].includes(x.id))];
   result=result.map(x=>['specific-form-checks','notification','receipt'].includes(x.id)?{...x,title:x.id==='specific-form-checks'?'For your web person: technical checks':x.title,body:`<details><summary>Show ${x.id==='receipt'?'receiving-system':x.id==='notification'?'email-delivery':'technical'} checks</summary>${x.body}</details>`}:x);
   result.push(section('review-options','Choose a review or a supported small fix',`<p>The ${money(o.baseline.one_time_price)} Website Baseline reviews the site and sets priorities. The ${money(o.audit_sprint.one_time_price)} Audit &amp; Fix Sprint adds up to two agreed small fixes. We confirm platform, access and fit first; these are not promises to repair every WordPress, Wix or Squarespace setup. ${link('/contact/?offer=audit_fix_sprint&amp;goal=fix#inquiry','Ask about a form fix')}.</p>`));
  }
  if(path==='/guides/website-launch-checklist/'){result=result.filter(x=>x.id!=='launch-check-tools');result[0].body='<span id="launch-check-tools"></span>'+result[0].body;}
  if(path==='/guides/website-migration-checklist/'){
   const example=result.find(x=>x.id==='redirect-example');
   result=[...result.filter(x=>x.id!=='redirect-example')];
   const position=result.findIndex(x=>x.id==='before');result.splice(position<0?1:position,0,example);
  }
  return result.map(x=>({...x,body:x.body.replace(/(<a[^>]+href="[^"]+\.(csv|txt)"[^>]*>)([^<]*)(<\/a>)/gi,(_m,open,ext,label,close)=>open+label+(label.toUpperCase().includes(ext.toUpperCase())?'':' ('+ext.toUpperCase()+')')+close)}));
}
