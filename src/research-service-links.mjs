// Keep planning help beside the service decision it supports.
const choices={
 '/services/web-design/':[['/guides/how-to-choose-a-web-designer/','Compare web designers'],['/guides/website-content-template/','Prepare your content'],['/guides/one-page-website-seo/','Choose one page or several']],
 '/services/website-redesign/':[['/guides/website-redesign-timeline/','Plan a rebuild timeline'],['/guides/website-migration-checklist/','Check the SEO migration'],['/guides/website-handover-checklist/','Plan the handover']],
 '/services/website-audit/':[['/guides/website-not-generating-leads/','Diagnose missing inquiries'],['/guides/contact-form-not-working/','Trace a form problem']],
 '/services/website-care/':[['/guides/website-maintenance-checklist/#monthly-record','Use the monthly care checklist'],['/guides/website-handover-checklist/','Verify accounts and handoff']],
 '/services/contractor-websites/':[['/guides/contractor-website-checklist/#annotated-examples','Explore contractor page examples'],['/guides/website-content-template/','Prepare your service facts']],
 '/pricing/':[['/guides/website-project-cost/#redesign-budget','Budget for a website redesign'],['/tools/website-roi-calculator/','Try the website ROI calculator'],['/guides/how-to-choose-a-web-designer/','Compare the same scope']],
 '/process/':[['/guides/website-redesign-timeline/','Plan inputs and review dates'],['/guides/website-content-template/','Gather your content'],['/guides/website-handover-checklist/','Check the finished handover']]
};
export function researchServiceLinks(path){const links=choices[path];return links?`<section class="studio-section"><h2>Prepare your next decision.</h2><ul class="link-row">${links.map(([url,label])=>`<li><a href="${url}">${label}</a></li>`).join('')}</ul></section>`:'';}
