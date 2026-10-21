// Keep planning help beside the service decision it supports.
const choices={
 '/services/web-design/':[['/guides/how-to-choose-a-web-designer/','How to compare web designer quotes'],['/guides/website-content-template/','Prepare your website content'],['/guides/one-page-website-seo/','Choose one page or several']],
 '/services/website-redesign/':[['/guides/website-redesign-timeline/','Plan your redesign timeline'],['/guides/website-handover-checklist/','Check website accounts and files']],
 '/services/website-audit/':[['/guides/website-not-generating-leads/','Find why inquiries are missing'],['/guides/contact-form-not-working/','Check your contact form']],
 '/services/website-care/':[['/guides/website-maintenance-checklist/#monthly-record','Use the monthly website checklist'],['/guides/website-handover-checklist/','Check website accounts and files']],
 '/services/contractor-websites/':[['/guides/contractor-website-checklist/#annotated-examples','Explore contractor page examples'],['/guides/website-content-template/','Prepare your service facts']]
};
export function researchServiceLinks(path){const links=choices[path];return links?`<p class="service-preparation"><strong>Before you get in touch:</strong> ${links.map(([url,label])=>`<a href="${url}">${label}</a>`).join(' <span aria-hidden="true">·</span> ')}</p>`:'';}
