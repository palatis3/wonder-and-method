import {routeIndexEligible} from './index-policy.mjs';
import {escapeHtml} from './shared.mjs';

// Reject bad public origins before writing any build output.
export function assertSiteOrigin(config){
  let url;
  try{url=new URL(config.origin);}catch{throw new Error('Site origin must be an absolute HTTP(S) origin.');}
  if(!['http:','https:'].includes(url.protocol)||url.origin!==config.origin||url.username||url.password)throw new Error('Site origin must contain only scheme and host, without a path, credentials, query or fragment.');
  if(config.mode==='production'){
    const domain=config.productionDomain;
    if(typeof domain!=='string'||!domain.includes('.')||!/^[a-z0-9.-]+$/.test(domain)||url.protocol!=='https:'||url.hostname!==domain||url.port||domain==='localhost'||/^(\d+\.){3}\d+$/.test(domain))throw new Error('Production origin must use HTTPS and exactly match productionDomain.');
  }
  return url.origin;
}
export const robotsDirective=(config,path)=>config.mode==='production'&&config.searchIndexing===true&&routeIndexEligible(path)?'index,follow':'noindex,nofollow,noarchive,noimageindex';
export function crawlFiles(config,pages){
  const origin=assertSiteOrigin(config),publicMode=config.mode==='production'&&config.searchIndexing===true;
  const publicPages=publicMode?pages.filter(page=>routeIndexEligible(page.path)):[];
  return {
    sitemap:`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicPages.map(page=>`<url><loc>${escapeHtml(origin+page.path)}</loc>${/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(page.modifiedAt||'')&&Number.isFinite(Date.parse(page.modifiedAt))?`<lastmod>${escapeHtml(page.modifiedAt)}</lastmod>`:''}</url>`).join('')}</urlset>`,
    robots:publicMode?`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`:config.mode==='production'?'User-agent: *\nAllow: /\n':'User-agent: *\nDisallow: /\n'
  };
}
