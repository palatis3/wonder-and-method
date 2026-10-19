export const guideArt = {
  'website-project-cost': [['Build fee', 'Pages, writing, design and launch'], ['Provider bills', 'Hosting, domain and selected tools'], ['Optional care', 'Checks, updates and agreed improvements']],
  'website-redesign-brief': [['Customer task', 'What should the visitor be able to do?'], ['Business facts', 'Services, coverage, proof and content'], ['Ready to build', 'Pages, owner, review dates and handoff']],
  'local-seo-profile-eligibility': [['Real business', 'How and where customers are served'], ['Eligible profile', 'Check the rules for the actual operation'], ['Useful website', 'Service details and a clear contact step']],
  'seo-work-and-reporting': [['Find an opportunity', 'Relevant searches, competition and business fit'], ['Write and publish', 'Complete the selected page and its checks'], ['Review and continue', 'Record the work, observations and next decision']],
  'website-migration-checklist': [['Inventory', 'Find the useful old pages and accounts'], ['Map', 'Give each old URL an appropriate destination'], ['Verify', 'Check redirects, inquiries and recovery']],
  'custom-website-or-template': [['Use the same content', 'Service, proof and contact information'], ['Try the same task', 'Find the service and make an inquiry'], ['Compare the handoff', 'Editing, portability and ongoing costs']],
  'website-maintenance-cost': [['Platform', 'Renewals and usage keep tools available'], ['Care', 'Checks and small supplied updates'], ['SEO and growth', 'Research, completed improvements and a plan']],
  'website-launch-checklist': [['Approve', 'Check the facts, scope and release version'], ['Test', 'Complete the visitor and owner tasks'], ['Release and recover', 'Verify the public site and retain a rollback']],
  'ai-website-or-custom': [['Draft', 'Start from a factual brief'], ['Check', 'Remove invented claims and test the form'], ['Own the result', 'Confirm editing, exports and provider terms']]
};

export const guideSlug = item => item.path.split('/').filter(Boolean).at(-1);
export const guideIllustration = item => '/assets/guides/' + guideSlug(item) + '-illustration';
export const guideIllustrationAlt = item => guideArt[guideSlug(item)]?.map(([title, text]) => `${title}: ${text}${/[.!?]$/.test(text)?'':'.'}`).join(' ') || item.alt;
