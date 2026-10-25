// Each guide owns a different reader decision, worked example and reusable record.
export const longtailGuideDetails = {
  'ai-search-visibility': {
    slug:'ai-search-visibility',path:'/guides/ai-search-visibility/',title:'AI search visibility for small businesses',category:'Search',
    description:'Check your small business website’s AI search eligibility, service facts and available evidence. Includes a worked example and a visibility record.',
    indexTitle:'AI search visibility',indexDescription:'Check eligibility, improve a useful answer and record what you can actually measure.',
    answer:'Start with a useful public page, accurate business facts and a dated record of what you can observe.',
    detail:'Generative engine optimization (GEO) describes work on visibility in AI search. It cannot guarantee that Google or ChatGPT will mention your business.',
    goal:'search',action:'Discuss your website’s search content',prompt:'Share the public page, the customer question it should answer and any dated observation you have.',
    download:'/assets/guides/ai-search-visibility-record.csv',downloadLabel:'Download the AI search visibility record',
    related:['seo-work-and-reporting','ai-website-content-review','website-not-showing-on-google'],
    steps:[['Check eligibility','Public intent, access and settings'],['Improve the answer','Useful facts and supported examples'],['Record the evidence','Source, date, limits and next action']]
  },
  'ai-website-content-review': {
    slug:'ai-website-content-review',path:'/guides/ai-website-content-review/',title:'Is AI content bad for SEO? Review your website draft',category:'Planning',
    description:'Fact-check an AI-written website draft with a claim-by-claim example. Review service promises, local claims, metadata and the customer’s next step.',
    indexTitle:'Review AI-written website content',indexDescription:'Check each claim against a real source before approving the draft for customers.',
    answer:'AI assistance alone does not settle whether a page is useful. Check the facts, original value and customer instructions before publishing.',
    detail:'A fluent draft can still invent services, locations or results. Use a claim record to approve, correct or hold each statement.',
    goal:'search',action:'Discuss your website content',prompt:'Share the draft, its intended customer and the business facts you can approve. Leave private customer information out.',
    download:'/assets/guides/ai-content-claim-review.csv',downloadLabel:'Download the content claim review',
    related:['website-content-template','ai-website-or-custom','ai-search-visibility'],
    steps:[['Find the claims','Services, coverage and promises'],['Verify and decide','Source, correction or hold'],['Check the page','Metadata, links and customer task']]
  },
  'local-seo-audit': {
    slug:'local-seo-audit',path:'/guides/local-seo-audit/',title:'A local SEO audit checklist for a small business',category:'Search',
    description:'Audit local visibility with evidence, priorities and a completed fictional example. Separate profile eligibility, website discovery and the inquiry route.',
    indexTitle:'Audit local search visibility',indexDescription:'Find the first supported problem, record unknowns and choose a correction you can retest.',
    answer:'For one service and its real coverage, check business facts, profile eligibility, whether Google can find the page, its service explanation and the inquiry route.',
    detail:'Record untested checks as “Not checked.” Missing access or an absent search result does not establish that a page has failed.',
    goal:'search',action:'Discuss a website search review',prompt:'Share the website, one service and real delivery area, plus the first problem recorded in your audit. I can assess supported website work; profile verification and account recovery are outside this offer.',
    download:'/assets/guides/local-seo-audit.csv',downloadLabel:'Download the local SEO audit worksheet',
    related:['local-seo-profile-eligibility','website-not-showing-on-google','seo-work-and-reporting'],
    steps:[['Set the scope','One service and actual coverage'],['Record the checks','Evidence, unknowns and access'],['Choose the correction','Owner, priority and retest']]
  },
  'slow-website-on-mobile': {
    slug:'slow-website-on-mobile',path:'/guides/slow-website-on-mobile/',title:'Why is your website slow on a phone?',category:'Websites',
    description:'Separate loading waits, delayed controls and moving layouts. Use PageSpeed Insights carefully and give your developer a repeatable mobile performance brief.',
    indexTitle:'A slow website on a phone',indexDescription:'Describe the delay, read speed reports and retest the customer task after a fix.',
    answer:'Large downloads, busy scripts or a weak connection can make a phone page slow; a shifting layout can also delay the task.',
    detail:'Record the page, phone, connection and exact delay before choosing a fix. Use the speed report to investigate, then repeat the customer task; a good score alone does not prove that an inquiry works.',
    goal:'fix',action:'Discuss the slow website task',prompt:'Share the public page, phone and browser, connection, task and where the delay occurs. Include a dated speed report if available.',
    download:'/assets/guides/mobile-performance-record.csv',downloadLabel:'Download the mobile performance record',
    related:['website-audit-checklist','website-repair-or-redesign','contact-form-not-working'],
    steps:[['Describe the wait','Page, phone, connection and task'],['Compare evidence','Real-user data and controlled tests'],['Retest the change','Same task, conditions and record']]
  }
};
export const longtailGuides=Object.values(longtailGuideDetails).map(item=>({path:item.path,title:item.title,description:item.description,category:item.category,image:item.slug+'-flow',diagram:true,imageHeight:560,alt:item.steps.map(([title,text])=>title+': '+text+'.').join(' '),fallback:item.goal==='fix'?'/services/website-audit/':'/services/seo/',datePublished:'2026-10-22',dateModified:'2026-10-22',vendorReviewed:'2026-10-22',vendorReviewDue:'2027-01-22'}));
