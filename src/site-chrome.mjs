import {pageDisplayNames,serviceNavigationPaths} from './display-names.mjs';
import {escapeHtml as e} from './shared.mjs';
import {supportChatConfig} from './support-chat.mjs';
import {brandWordmark} from './brand.mjs';
import {serviceCoverage} from './service-area.mjs';
import {serviceStateInfo} from './assets/service-state-info.js';

const services=serviceNavigationPaths.map(path=>[path,pageDisplayNames[path]]);
const navLink=(path,url,label)=>`<a href="${url==='/contact/'?'/contact/#inquiry':url}"${path===url?' aria-current="page"':!url.startsWith('/services/')&&url!=='/'&&path.startsWith(url)?' aria-current="location"':''}>${e(label)}</a>`;

export function siteHeader(path,config={}){
 const formPage=path==='/contact/'||path.startsWith('/checkout/');
 return `<header class="site-header site-header--compact"><a href="/" class="wordmark brand-lockup" aria-label="Wonder and Method home">${brandWordmark()}</a>${formPage?'':`<a class="header-contact" href="/contact/#inquiry" aria-label="Contact"><span class="header-project-full">Contact</span><span class="header-project-short" aria-hidden="true">Contact</span></a>`}<button class="menu-toggle" aria-expanded="false" aria-controls="main-nav">Menu</button><nav id="main-nav" aria-label="Primary">${navLink(path,'/work/','Work')}<details class="service-navigation${path.startsWith('/services/')?' is-current':''}"><summary>Services</summary><div class="service-links" role="group" aria-label="Services"><p class="mobile-services-label" aria-hidden="true">Services</p>${services.map(([url,label])=>navLink(path,url,label)).join('')}</div></details>${[['/pricing/','Pricing'],['/process/','Process'],['/guides/','Guides'],['/about/','About'],['/contact/','Contact']].map(([url,label])=>navLink(path,url,label)).join('')}</nav></header>`;
}

export function siteFooter(config={}){
 const groups=[['Studio',[['/work/','Work'],['/about/','About'],['/process/','Process'],['/contact/','Contact'],['/guides/','Guides']]],['Services',[...services,['/pricing/','Pricing']]],['Areas',[['/areas/','Service areas'],...serviceStateInfo.map(state=>[state.path,state.name])]],['Information',[['/payments/',pageDisplayNames['/payments/']],['/privacy/','Privacy'],['/terms/','Website terms'],['/accessibility/','Accessibility']]]];
 const email=config.contactEmail||'support@wonderandmethod.com';
 return `<footer class="site-footer--compact"><div class="footer-top"><p class="wordmark brand-lockup">${brandWordmark()}</p><p>Based in ${e(serviceCoverage(config).base)}. Working online across ${e(serviceCoverage(config).shortRegion)}.<br><a href="mailto:${e(email)}">Email Terry</a>${supportChatConfig(config)?'<span class="footer-chat-help"> · <button type="button" class="text-link" data-chat-open aria-describedby="support-chat-description" hidden>Chat with Terry</button></span>':''}</p></div><nav aria-label="Footer">${groups.map(([label,links])=>`<section class="footer-group${label==='Information'?' footer-information':''}" aria-labelledby="footer-${label.toLowerCase()}-heading"><p id="footer-${label.toLowerCase()}-heading" class="footer-heading">${label}</p><div>${links.map(([url,text])=>`<a href="${url}">${e(text)}</a>`).join('')}</div></section>`).join('')}</nav><div class="footer-bottom"><span>© ${new Date().getUTCFullYear()} ${e(config.businessIdentity||'Wonder and Method')}. All rights reserved.</span><a href="#page-top">Back to top</a></div></footer>`;
}
