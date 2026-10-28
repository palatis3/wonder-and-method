import {operatingGuidePaths} from './operating-guide-paths.mjs';
import {floridaGuidePaths} from './florida-guide-paths.mjs';
import {semrushGuidePaths} from './semrush-guide-paths.mjs';
const categories = {'/work/assetrounds/':'work', '/': 'home', '/pricing/': 'pricing', '/guides/': 'guide_index', '/areas/': 'areas', '/services/web-design/': 'service_new', '/services/website-redesign/': 'service_redesign', '/services/seo/': 'service_seo', '/services/website-care/': 'service_care', '/services/website-audit/': 'service_audit', '/services/contractor-websites/': 'service_contractors', '/work/lead-workbench/': 'work_demo', '/contact/': 'contact'};

export function journeyPageKey(path) {
  return categories[path] || (operatingGuidePaths.has(path)||floridaGuidePaths.has(path)||semrushGuidePaths.has(path)?'guide':path.replace(/^\/|\/$/g, '').replaceAll('/', '_').replaceAll('-', '_'));
}
