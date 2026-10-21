import {escapeHtml as e} from './shared.mjs';
import {brandWordmark} from './brand.mjs';
import {serviceCoverage} from './service-area.mjs';

const services=[['/services/','All services'],['/services/web-design/','New website'],['/services/website-redesign/','Website redesign'],['/services/seo/','Monthly SEO'],['/services/website-care/','Website care'],['/services/website-audit/','Website reviews & fixes']];
const navLink=(path,url,label)=>`<a href="${url==='/contact/'?'/contact/#inquiry':url}"${path===url?' aria-current="page"':!url.startsWith('/services/')&&url!=='/'&&path.startsWith(url)?' aria-current="location"':''}>${e(label)}</a>`;

export function siteHeader(path,config={}){
 const formPage=path==='/contact/'||path.startsWith('/checkout/');
 return `<header class="site-header site-header--compact"><a href="/" class="wordmark brand-lockup" aria-label="Wonder and Method home">${brandWordmark()}</a>${formPage?'':`<a class="header-contact" href="/contact/#inquiry" aria-label="Contact"><span class="header-project-full">Contact</span><span class="header-project-short" aria-hidden="true">Contact</span></a>`}<button class="menu-toggle" aria-expanded="false" aria-controls="main-nav">Menu</button><nav id="main-nav" aria-label="Primary">${navLink(path,'/work/','Work')}<details class="service-navigation${path.startsWith('/services/')?' is-current':''}"><summary>Services</summary><div class="service-links" role="group" aria-label="Services"><p class="mobile-services-label" aria-hidden="true">Services</p>${services.map(([url,label])=>navLink(path,url,label)).join('')}</div></details>${[['/pricing/','Pricing'],['/process/','Process'],['/guides/','Guides'],['/about/','About'],['/contact/','Contact']].map(([url,label])=>navLink(path,url,label)).join('')}</nav></header>`;
}

export function siteFooter(config={}){
 const groups=[['Studio',[['/work/','Work'],['/about/','About'],['/process/','Process'],['/contact/','Contact'],['/guides/','Guides']]],['Services',[...services,['/services/website-addons/','Add-ons'],['/services/contractor-websites/','Contractor websites'],['/pricing/','Pricing']]],['Areas',[['/areas/','Service areas'],['/areas/new-york/','New York'],['/areas/pennsylvania/','Pennsylvania'],['/areas/ohio/','Ohio']]],['Information',[['/payments/','Payments & cancellation'],['/privacy/','Privacy'],['/terms/','Website terms'],['/accessibility/','Accessibility']]]];
 const email=config.contactEmail||'support@wonderandmethod.com';
 return `<footer class="site-footer--compact"><div class="footer-top"><p class="wordmark brand-lockup">${brandWordmark()}</p><p>Based in ${e(serviceCoverage(config).base)}. Serving ${e(serviceCoverage(config).region)} online.<br><a href="mailto:${e(email)}">Email the studio</a></p></div><nav aria-label="Footer">${groups.map(([label,links])=>`<section class="footer-group${label==='Information'?' footer-information':''}" aria-labelledby="footer-${label.toLowerCase()}-heading"><p id="footer-${label.toLowerCase()}-heading" class="footer-heading">${label}</p><div>${links.map(([url,text])=>`<a href="${url}">${e(text)}</a>`).join('')}</div></section>`).join('')}</nav><div class="footer-bottom"><span>© ${new Date().getUTCFullYear()} ${e(config.businessIdentity||'Wonder and Method')}. All rights reserved.</span><a href="#page-top">Back to top</a></div></footer>`;
}
