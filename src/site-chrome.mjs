import {pageDisplayNames,serviceNavigationPaths} from './display-names.mjs';
import {escapeHtml as e} from './shared.mjs';
import {brandWordmark} from './brand.mjs';
import {serviceCoverage} from './service-area.mjs';

const services=serviceNavigationPaths.map(path=>[path,pageDisplayNames[path]]);
const serviceFamilies=[
 ['New or redesigned website',['/services/web-design/','/services/website-redesign/','/services/contractor-websites/']],
 ['Monthly help',['/services/seo/','/services/website-care/']],
 ['Reviews and fixes',['/services/website-audit/']],
 ['Extra pages and tools',['/services/website-addons/']]
];
const navLink=(path,url,label)=>`<a href="${url==='/contact/'?'/contact/#inquiry':url}"${path===url?' aria-current="page"':!url.startsWith('/services/')&&url!=='/'&&path.startsWith(url)?' aria-current="location"':''}>${e(label)}</a>`;

export function siteHeader(path,config={}){
 const formPage=path==='/contact/'||path.startsWith('/checkout/');
 return `<header class="site-header site-header--compact"><a href="/" class="wordmark brand-lockup" aria-label="Wonder and Method home">${brandWordmark()}</a>${formPage?'':`<a class="header-contact" href="/contact/#inquiry" aria-label="Contact"><span class="header-project-full">Contact</span><span class="header-project-short" aria-hidden="true">Contact</span></a>`}<button class="menu-toggle" aria-expanded="false" aria-controls="main-nav">Menu</button><nav id="main-nav" aria-label="Primary">${navLink(path,'/work/','Work')}<details class="service-navigation${path.startsWith('/services/')?' is-current':''}"><summary>Services</summary><div class="service-links" role="group" aria-label="Services"><p class="mobile-services-label" aria-hidden="true">Services</p>${navLink(path,'/services/',pageDisplayNames['/services/'])}${serviceFamilies.map(([label,paths])=>`<div class="service-link-group" role="group" aria-label="${e(label)}">${paths.map(url=>navLink(path,url,pageDisplayNames[url])).join('')}</div>`).join('')}</div></details>${[['/pricing/','Pricing'],['/process/','Process'],['/guides/','Guides'],['/about/','About'],['/contact/','Contact']].map(([url,label])=>navLink(path,url,label)).join('')}</nav></header>`;
}

export function siteFooter(config={}){
 const groups=[['Studio',[['/work/','Work'],['/about/','About'],['/process/','Process'],['/contact/','Contact'],['/guides/','Guides'],['/areas/','Service areas']]],['Services',[...services,['/pricing/','Pricing']]],['Information',[['/payments/',pageDisplayNames['/payments/']],['/privacy/','Privacy'],['/terms/','Website terms'],['/accessibility/','Accessibility']]]];
 return `<footer class="site-footer--compact"><div class="footer-top"><p class="wordmark brand-lockup">${brandWordmark()}</p><p class="footer-location">Based in ${e(serviceCoverage(config).base)}.</p></div><nav aria-label="Footer">${groups.map(([label,links])=>`<section class="footer-group footer-group--${label.toLowerCase()}" aria-labelledby="footer-${label.toLowerCase()}-heading"><h2 id="footer-${label.toLowerCase()}-heading">${label}</h2><div>${links.map(([url,text])=>`<a href="${url}">${e(text)}</a>`).join('')}</div></section>`).join('')}</nav><div class="footer-bottom"><span>© ${new Date().getUTCFullYear()} ${e(config.businessIdentity||'Wonder and Method')}. All rights reserved.</span></div></footer>`;
}
