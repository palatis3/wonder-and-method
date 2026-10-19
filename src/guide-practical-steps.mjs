import {money} from './shared.mjs';

const section = (id, title, body) => ({id, title, body});
const link = (url, label) => `<a href="${url}">${label}</a>`;
const list = items => `<ol>${items.map(item => `<li>${item}</li>`).join('')}</ol>`;
const table = (caption, headings, rows) => `<div class="journal-table-wrap" role="region" tabindex="0" aria-label="${caption}"><table><caption>${caption}</caption><thead><tr>${headings.map(heading => `<th scope="col">${heading}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((cell, i) => i ? `<td>${cell}</td>` : `<th scope="row">${cell}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`;

export function practicalGuideSections(path, sections, o) {
  const additions = [];
  const replace = (id, replacement) => { const index = sections.findIndex(item => item.id === id); if (index >= 0) sections[index] = replacement; else additions.push(replacement); };
  if (path === '/guides/website-project-cost/') {
    replace('start-with-scope', section('start-with-scope', 'Website prices you can compare', `<p>Wonder and Method’s fixed website fees run from ${money(o.launch_site.public_price)} to ${money(o.signature_site.public_price)}, before provider bills and applicable tax. These are our published scopes, not a Buffalo market average. Compare the pages, features, writing, ownership and continuing costs in each proposal.</p>`));
    replace('dated-price-example', section('dated-price-example', 'Three fixed website scopes', table('Current studio website prices', ['Offer', 'Fixed build fee', 'Marketing-page allowance'], ['launch_site', 'focused_site', 'signature_site'].map(id => [link('/pricing/#offer-' + id, o[id].public_name), money(o[id].public_price), `Up to ${o[id].marketing_page_cap} pages; provider bills separate.`])) + '<p>For a DIY comparison, enter the actual subscription, domain, paid tools and time required to write, build and check the site. Confirm the current plan at the provider before choosing. A subscription price alone is not a finished website budget.</p>'));
    replace('annual-choice', section('annual-choice', 'Check the payment schedule', `<p>Website payments are 50% at booking, 30% at written design acceptance and 20% at written staging acceptance. For Launch, that is ${money(o.launch_site.public_price*.5)}, ${money(o.launch_site.public_price*.3)} and ${money(o.launch_site.public_price*.2)}. Domain, hosting and paid tools are separate. See ${link('/pricing/#payments','payment and cancellation terms')}.</p>`));
  }
  if (path === '/guides/website-maintenance-cost/') {
    replace('platform-cost', section('platform-cost', 'Add provider bills to the work you need', `<p>Hosting, a domain, mailboxes and paid form or booking tools are separate from maintenance work. Check the actual plan, billing term and renewal price with each provider. Free tiers have limits; a published subscription price does not include someone checking or updating your site.</p><p>Optional studio work is Keep Running ${money(o.plans.keep_running.monthly_price)}, Improve ${money(o.plans.improve.monthly_price)} or Grow ${money(o.plans.grow.monthly_price)} per month. An existing site needs a setup review first if no usable baseline exists. A site you can maintain yourself may need no monthly studio service.</p>`));
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
    additions.push(section('platform-settings', 'Check the notification destination in your platform', `<p><strong>Squarespace:</strong> open the form block’s Storage settings and inspect the connected email address. A later change to the account’s email does not automatically change an existing form’s recipient. Save the intended destination and repeat one controlled test. ${link('https://support.squarespace.com/hc/en-us/articles/205814638-Set-up-form-and-newsletter-storage', 'Squarespace form storage instructions')}.</p><p><strong>Wix:</strong> check the form’s notification automation and its configured recipients. In Automations, open the relevant form automation, choose More Actions → Edit, then Send an email → Show additional settings → Recipients → Edit. Confirm the intended recipient and save. The owner normally receives notifications; collaborators need the appropriate Wix Inbox permissions. Then find your labeled test in the form’s submissions table and repeat the test after the change. A saved submission and an email notification are separate results. ${link('https://support.wix.com/en/article/wix-forms-choosing-who-gets-notified-about-form-submissions', 'Wix notification instructions')}.</p><p><strong>WordPress:</strong> identify the form plugin first, then inspect that form’s notification recipient and any mail-service log. Plugin settings differ. Give support the plugin name and the failed stage; do not install a second mail plugin without checking the current setup.</p>`));
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
  if (path === '/guides/website-maintenance-checklist/') {
    replace('recovery', section('recovery','Arrange backups and recovery separately','<p>Our care plans exclude backups, restores and emergency fixes. Agree those responsibilities separately with your host or a qualified developer. Before a major change, that person should identify the previous working version and explain how it can be restored. Ask what has actually been tested; an export file alone does not prove recovery works.</p>'));
    replace('forms', section('forms','Test the contact route','<p>Follow a service page to the contact form or booking tool on your phone. Send one labeled test, check where it arrives and reply from the business mailbox. A success message alone does not prove delivery. Use the <a href="/guides/contact-form-not-working/">full form troubleshooting guide</a> if a step fails.</p>'));
    replace('receipt', section('receipt','Keep a simple maintenance log','<p>Record the date, page or tool, what happened, the change made and who will handle anything left to do. Use the <a href="/assets/guides/website-maintenance-log.csv">maintenance log (CSV)</a> and compare <a href="/services/website-care/">care plan coverage</a> if you want help with regular checks.</p>'));
  }
  if (path === '/guides/website-migration-checklist/') {
    replace('before',section('before','Before launch: checks for you and your developer','<h3>Your checks</h3>'+list(['Approve the new service details, photos, contact information and page list.','Open the main pages on a phone; check navigation, downloads and booking links.','Use the <a href="/guides/contact-form-not-working/">form test</a> to confirm a request reaches the business.'])+'<details><summary>Developer checks before switching the live site</summary>'+list(['Check permanent redirects, page titles, canonical URLs, sitemap and indexing settings. Keep private previews out of search.','Record the approved release, destination and way to restore the previous version.','Name the exact DNS changes. Preserve unrelated email records and confirm the mailbox still works.','Test keyboard access, narrow layouts and connected services.'])+'</details>'));
    replace('launch',section('launch','Recheck the live website','<p>After the switch, open the public home, service and contact pages, a useful old link, a download and a missing address. Ask the developer to confirm redirects and missing-page responses. Repeat the contact-form test on the live site and record anything not yet verified.</p>'));
    additions.push(section('redesign-help','Plan the move with the redesign','<p>Use the URL map when discussing a <a href="/services/website-redesign/">website redesign</a>. The proposal should name retained pages, redirects, account access, email responsibilities and the launch checks.</p>'));
  }
  if (path === '/guides/website-launch-checklist/') {
    replace('customer-journey',section('customer-journey','Check forms and connected tools','<p>Follow the <a href="/guides/contact-form-not-working/">contact-form test</a> from submission to reply. Open booking and other connected tools on a phone. Confirm the right person receives requests and knows what to do next.</p>'));
  }
  if (path === '/guides/website-launch-checklist/') {
    replace('accounts-search',section('accounts-search','Your accounts and the developer’s launch checks','<p>Confirm that you can access the domain, hosting and included tools, and that recovery contacts are current. Keep control of these accounts throughout the project.</p><details><summary>Checks for your developer</summary><p>Verify HTTPS, preferred domain, titles, descriptions, canonical URLs, sitemap, indexing instructions, redirects and the missing-page response. Keep private previews out of search. Preserve unrelated email DNS settings. Record Search Console access and inspect the intended public URLs after launch; a live test does not guarantee indexing.</p></details>'));
    replace('live-check',section('live-check','Recheck the live site','<p>Open the public website outside the preview session. Check the main pages, a useful old URL, a download and a missing URL. Repeat the <a href="/guides/contact-form-not-working/">form test</a>. Record the result and who will handle any remaining issue. For a replacement website, keep the <a href="/guides/website-migration-checklist/">migration checklist</a> with your launch notes.</p>'));
  }
  if (path === '/guides/website-care-versus-seo/') {
    replace('before-buying',section('before-buying','Ask what will be completed','<p>Ask which site and tasks are covered, what you need to supply, how changes are approved and how completion is checked. Provider fees are separate. A finite review can help when the cause of a problem is still unclear; monthly service is optional.</p>'));
  }
  if (path === '/guides/website-audit-checklist/') {
    replace('checklist',section('checklist','Check the tasks a customer relies on',list(['Can you tell what the business offers and whether your job fits?','Can you read the important pages and use the menu on a phone and with a keyboard?','Do prices, contact details, service areas and links agree across the site?','Can you send an inquiry and receive a reply? Use the <a href="/guides/contact-form-not-working/">form test</a> for the full procedure.','Ask your developer to check indexing, page titles, speed, accessibility findings and a way to recover the site. Record unavailable access instead of guessing a pass.'])));
  }
  let result=[...sections,...additions];
  if(path==='/guides/website-project-cost/'){const comparison=result.find(x=>x.id==='dated-price-example');result=result.filter(x=>x.id!=='dated-price-example');result.splice(1,0,comparison);}
  if(path==='/guides/website-not-showing-on-google/'){
   const first=result.find(x=>x.id==='inspection-steps');
   first.body='<span id="index"></span><p>First open the public page and search for your business name. A <code>site:yourdomain.com</code> search can provide a clue, but missing results do not prove the page is unindexed. Confirm the page is meant to be public. If you lack Search Console access, ask the domain owner or web person to add you or send the URL Inspection result.</p>'+first.body;
   result=[first,...result.filter(x=>!['inspection-steps','index'].includes(x.id))];
   result.push(section('plain-search-terms','A few search terms in plain language','<p><strong>Indexing:</strong> Google has stored a page that may appear in results. <strong>Ranking:</strong> where a result appears for a particular search. <strong>Canonical:</strong> the preferred address when similar pages exist. <strong>Noindex:</strong> an instruction asking search engines not to include a page. Ask your developer before removing it from a private or unfinished page.</p>'));
  }
  if(path==='/guides/contact-form-not-working/'){
   const quick=section('five-minute-check','Start with a five-minute owner check',list(['Open the public form on your phone and send one clearly labeled test using an email address you control. Note the time and confirmation.','Search the receiving inbox, spam and quarantine for that test. Confirm that someone checks this mailbox.','Open the form settings and check the notification recipient. An old employee or former provider may still be listed.','If your platform keeps submissions, look for the same test there. Some WordPress plugins and custom forms do not save a separate copy.','Reply to the test from the business mailbox. If any step fails, give your web person the page, time and observed result; keep passwords and customer records private.']));
   quick.body='<span id="trace"></span><span id="inbox"></span>'+quick.body+'<p><a href="/assets/guides/contact-form-flow-worksheet.txt">Download the contact-form test checklist (TXT)</a>.</p>';
   const platform=result.find(x=>x.id==='platform-settings');
   result=[quick,platform,...result.filter(x=>!['platform-settings','trace','inbox'].includes(x.id))];
   result=result.map(x=>['specific-form-checks','notification','receipt'].includes(x.id)?{...x,title:x.id==='specific-form-checks'?'For your web person: technical checks':x.title,body:`<details><summary>Show ${x.id==='receipt'?'receiving-system':x.id==='notification'?'email-delivery':'technical'} checks</summary>${x.body}</details>`}:x);
   result.push(section('review-options','Choose a review or a supported small fix',`<p>The ${money(o.baseline.one_time_price)} Website Baseline reviews the site, sets priorities and includes one safe small first fix when access and scope allow. The ${money(o.audit_sprint.one_time_price)} Audit &amp; Fix Sprint covers the baseline and up to two agreed small fixes in total. Both cover a supported site with up to 12 marketing pages. We confirm platform, access and fit first. ${link('/services/website-audit/','Compare the reviews and fixes')} or ${link('/contact/?offer=audit_fix_sprint&amp;goal=fix&amp;request_kind=question#inquiry','ask about your form')}.</p>`));
  }
  if(path==='/guides/website-launch-checklist/'){result=result.filter(x=>x.id!=='launch-check-tools');result[0].body='<span id="launch-check-tools"></span>'+result[0].body;}
  if(path==='/guides/website-migration-checklist/'){
   const example=result.find(x=>x.id==='redirect-example');
   result=[...result.filter(x=>x.id!=='redirect-example')];
   const position=result.findIndex(x=>x.id==='before');result.splice(position<0?1:position,0,example);
  }
  return result.map(x=>({...x,body:x.body.replace(/(<a[^>]+href="[^"]+\.(csv|txt)"[^>]*>)([^<]*)(<\/a>)/gi,(_m,open,ext,label,close)=>open+label+(label.toUpperCase().includes(ext.toUpperCase())?'':' ('+ext.toUpperCase()+')')+close)}));
}

// Use the shared normalizer for the guide and contractor rendering paths.
export {responsiveTables as accessibleGuideTables} from './responsive-tables.mjs';
