// Editorial dates have day precision. Emit optional Google Article datetimes
// only when an exact time and timezone have actually been recorded.
export function articleDateSchema(article){
 return Object.fromEntries(['datePublished','dateModified'].flatMap(key=>{
  const value=article[key];
  return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value))?[[key,value]]:[];
 }));
}

export function organizationSchema(config,logo){
 const origin=config.origin;
 return {'@context':'https://schema.org','@type':'Organization','@id':origin+'/#studio',name:config.name,alternateName:'Wonder & Method',url:origin,logo:origin+logo,image:origin+'/assets/brand/social-card.png',legalName:config.businessIdentity,email:config.contactEmail,description:'Independent Buffalo web studio offering fixed-scope websites, SEO, website care and audits, delivered online across New York.',founder:{'@id':origin+'/about/#terry'},location:{'@type':'Place',name:'Buffalo, New York',address:{'@type':'PostalAddress',addressLocality:'Buffalo',addressRegion:'NY',addressCountry:'US'}},areaServed:{'@type':'AdministrativeArea',name:'New York, United States'},contactPoint:{'@type':'ContactPoint',contactType:'Project inquiries and support',email:config.contactEmail,availableLanguage:'English'}};
}

export function offerCatalogSchema(config,o){
 const origin=config.origin;
 return {'@context':'https://schema.org','@type':'OfferCatalog','@id':origin+'/pricing/#offers',name:'Website and ongoing service options',itemListElement:[...['launch_site','focused_site','signature_site'].map(id=>({id,offer:o[id],price:o[id].public_price,route:'/services/web-design/'})),...Object.entries(o.plans).map(([id,offer])=>({id,offer,price:offer.monthly_price,monthly:true,route:'/services/website-care/'})),{id:'website_baseline',offer:o.baseline,price:o.baseline.one_time_price,route:'/services/website-audit/'},{id:'audit_fix_sprint',offer:o.audit_sprint,price:o.audit_sprint.one_time_price,route:'/services/website-audit/'}].map(({id,offer,price,monthly,route})=>({'@type':'Offer','@id':origin+'/pricing/#offer-'+id,name:id==='website_baseline'?'Website Baseline':offer.public_name,url:origin+'/checkout/'+id.replaceAll('_','-')+'/',priceCurrency:'USD',price,...(monthly?{priceSpecification:{'@type':'UnitPriceSpecification',price,priceCurrency:'USD',unitText:'MONTH'}}:{}),seller:{'@id':origin+'/#studio'},itemOffered:{'@type':'Service','@id':origin+route+'#'+id,name:id==='website_baseline'?'Website Baseline':offer.public_name,provider:{'@id':origin+'/#studio'},areaServed:{'@type':'AdministrativeArea',name:'New York, United States'}}}))};
}
