import {escapeHtml as e} from './shared.mjs';
import {brandWordmark} from './brand.mjs';

const services=[['/services/','All services'],['/services/web-design/','Web design'],['/services/website-redesign/','Website redesign'],['/services/contractor-websites/','Contractor websites'],['/services/seo/','SEO'],['/services/website-care/','Website care'],['/services/website-audit/','Website reviews & fixes']];
const navLink=(path,url,label)=>`<a href="${url}"${path===url?' aria-current="page"':url!=='/'&&path.startsWith(url)?' aria-current="location"':''}>${e(label)}</a>`;

export function siteHeader(path,config={}){
 const formPage=path==='/contact/'||path.startsWith('/checkout/');
 return `<header class="site-header site-header--compact"><a href="/" class="wordmark brand-lockup" aria-label="Wonder &amp; Method home">${brandWordmark()}</a>${formPage?'':`<a class="header-contact" href="/contact/?request_kind=checkout#inquiry" aria-label="Start a project"><span class="header-project-full">Start a project</span><span class="header-project-short" aria-hidden="true">Start</span></a>`}<button class="menu-toggle" aria-expanded="false" aria-controls="main-nav">Menu</button><nav id="main-nav" aria-label="Primary">${navLink(path,'/work/','Work')}<details class="service-navigation${path.startsWith('/services/')?' is-current':''}"><summary>Services</summary><div class="service-links" role="group" aria-label="Services"><p class="mobile-services-label" aria-hidden="true">Services</p>${services.map(([url,label])=>navLink(path,url,label)).join('')}</div></details>${[['/pricing/','Pricing'],['/process/','Process'],['/guides/','Guides'],['/about/','About'],['/contact/','Contact']].map(([url,label])=>navLink(path,url,label)).join('')}</nav></header>`;
}

export function siteFooter(config={}){
 const groups=[['Studio',[['/work/','Work'],['/about/','About'],['/process/','Process'],['/contact/','Contact'],['/guides/','Guides']]],['Services & areas',[...services,['/pricing/','Pricing'],['/areas/','New York service areas'],['/areas/erie-county/','Erie County']]],['Information',[['/payments/','Payments & billing'],['/privacy/','Privacy'],['/terms/','Website terms'],['/accessibility/','Accessibility']]]];
 const email=config.contactEmail||'support@wonderandmethod.com';
 return `<footer class="site-footer--compact"><div class="footer-top"><p class="wordmark brand-lockup">${brandWordmark()}</p><p>Based in Buffalo. Serving New York online.<br><a href="mailto:${e(email)}">Email the studio</a></p></div><nav aria-label="Footer">${groups.map(([label,links])=>`<details class="footer-group"><summary>${label}</summary><div>${links.map(([url,text])=>`<a href="${url}">${text}</a>`).join('')}</div></details>`).join('')}</nav><div class="footer-bottom"><span>© ${new Date().getUTCFullYear()} ${e(config.businessIdentity||'Wonder and Method')}. All rights reserved.</span><span>Online service delivery.</span></div></footer>`;
}
