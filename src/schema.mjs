// Schema.org accepts a Date or a DateTime. Keep the precision actually recorded.
export function articleDateSchema(article) {
  return Object.fromEntries(['datePublished', 'dateModified'].flatMap(key => {
    const value = article[key];
    const valid = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value) && Number.isFinite(Date.parse(value));
    const validDay = valid && new Date(value.slice(0, 10)).toISOString().slice(0, 10) === value.slice(0, 10);
    return validDay ? [[key, value]] : [];
  }));
}

export const serviceAreas = () => [
  {'@type': 'City', name: 'Buffalo, New York'},
  ...['Erie County, New York', 'Niagara County, New York', 'New York State'].map(name => ({'@type': 'AdministrativeArea', name}))
];

export function organizationSchema(config, logo) {
  const origin = config.origin;
  return {'@context': 'https://schema.org', '@type': 'Organization', '@id': origin + '/#studio', name: config.name, alternateName: 'Wonder & Method', url: origin + '/', logo: origin + logo, image: origin + '/assets/brand/social-card.png', legalName: config.businessIdentity, email: config.contactEmail, description: 'Independent Buffalo web studio offering fixed-scope websites, SEO, website care and audits, delivered online across New York.', founder: {'@id': origin + '/about/#terry'}, location: {'@type': 'Place', name: 'Buffalo, New York', address: {'@type': 'PostalAddress', addressLocality: 'Buffalo', addressRegion: 'NY', addressCountry: 'US'}}, areaServed: serviceAreas(), hasOfferCatalog: {'@id': origin + '/pricing/#offers'}, contactPoint: {'@type': 'ContactPoint', contactType: 'Project inquiries and support', email: config.contactEmail, availableLanguage: 'English'}};
}

export function commercialOffers(config, o) {
  const origin = config.origin;
  const rows = [
    ...['launch_site', 'focused_site', 'signature_site'].map(id => ({id, offer: o[id], price: o[id].public_price, route: '/services/web-design/'})),
    ...Object.entries(o.plans).map(([id, offer]) => ({id, offer, price: offer.monthly_price, monthly: true, route: '/services/website-care/'})),
    {id: 'website_baseline', offer: o.baseline, price: o.baseline.one_time_price, route: '/services/website-audit/'},
    {id: 'audit_fix_sprint', offer: o.audit_sprint, price: o.audit_sprint.one_time_price, route: '/services/website-audit/'}
  ];
  return rows.map(({id, offer, price, monthly, route}) => ({'@type': 'Offer', '@id': origin + '/pricing/#offer-' + id, name: id === 'website_baseline' ? 'Website Baseline' : offer.public_name, url: origin + '/pricing/#offer-' + id, priceCurrency: 'USD', price, ...(monthly ? {description: offer.buyer_summary.outcomes.join(' '),priceSpecification: {'@type': 'UnitPriceSpecification', price, priceCurrency: 'USD', unitCode: 'MON', unitText: 'month'}} : {}), seller: {'@id': origin + '/#studio'}, itemOffered: {'@id': origin + route + '#service'}}));
}

export function offerCatalogSchema(config, o) {
  return {'@context': 'https://schema.org', '@type': 'OfferCatalog', '@id': config.origin + '/pricing/#offers', name: 'Website and ongoing service options', itemListElement: commercialOffers(config, o)};
}

export function offersForService(config, o, path) {
  const routes = {'/services/website-redesign/': '/services/web-design/', '/services/contractor-websites/': '/services/web-design/', '/services/seo/': '/services/website-care/'};
  const primaryPath = routes[path] || path;
  return commercialOffers(config, o).filter(offer => offer.itemOffered['@id'] === config.origin + primaryPath + '#service' && (path !== '/services/seo/' || !offer['@id'].endsWith('keep_running')));
}
