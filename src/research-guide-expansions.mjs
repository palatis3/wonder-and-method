const p=text=>`<p>${text}</p>`;
const a=(path,label)=>`<a href="${path}">${label}</a>`;
const section=(id,title,body)=>({id,title,body});
export const researchGuideExpansions={
 '/guides/website-migration-checklist/':[

 ],
 '/guides/website-redesign-brief/':[
  section('rfp','Send the same brief to each designer',p('Send the same brief to every designer you are considering. Ask each to list what is included, what is excluded, outside costs, timing, payment terms and how they handle changes. The download includes these questions so you can compare the replies.'))
 ],
 '/guides/seo-work-and-reporting/':[
  section('provider-questions','Questions to ask before you choose help','<span id="take-away"></span>'+p('Ask which page the provider would improve first and why, whether writing and publishing are included, and what you will receive at the end of the month. The '+a('/assets/audit-implementation/seo-work-and-reporting-checklist.txt','SEO work and reporting checklist')+' includes the questions to use when comparing proposals.')+'<span id="worthwhile"></span>'+p('SEO is more useful when you have a service people search for, capacity to take the work and a working way to contact you. Use the '+a('/tools/website-roi-calculator/','website ROI calculator')+' to test your own costs, inquiry assumptions and profit per job after materials and labor.'))
 ],
 '/guides/contractor-website-checklist/':[
  section('annotated-examples','Two contractor website examples, with the decisions explained',p('<strong>Original illustrative page plans, not client sites or reported results.</strong> A bathroom-remodeling service needs to explain whether it accepts full renovations, partial work or both. Its page can show a project with permission and an accurate caption, describe how the first conversation works and ask for location, project type and a short description. An estimate request should not look like a confirmed appointment.')+p('An exterior-repair service has a different question: which materials and conditions can it assess? Its page can explain accepted work, exclusions and whether photographs help the first conversation. Only promise emergency availability if that service is offered. The useful difference between these pages is the work and customer decision.')+p(`Explore the fictional ${a('/work/northline/','Northline contractor concept')} for a visual example. Use ${a('/guides/website-content-template/','the content template')} to replace its illustrative details with facts about your business.`))

 ],
 '/guides/website-maintenance-checklist/':[

 ],
 '/guides/website-project-cost/':[

 ]
};
