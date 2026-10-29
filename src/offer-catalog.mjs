// Current offers only. Never pass an accepted commercial snapshot through here.
const normalized = new WeakSet();
export const buildOfferIds = ['launch_site', 'focused_site', 'business_site', 'signature_site'];
export const monthlyOfferIds = ['keep_running', 'improve', 'local_focus', 'grow'];
export const specialistOfferIds = ['brand_message','storefront','local_presence','workflow','systems'];
export const offerRecord = (o,id) => o.plans?.[id] || (id==='website_baseline'?o.baseline:id==='audit_fix_sprint'?o.audit_sprint:o[id]);
export const currentOfferIds = o => [...buildOfferIds.filter(id=>o[id]),...monthlyOfferIds.filter(id=>o.plans?.[id]),'website_baseline','audit_fix_sprint',...specialistOfferIds.filter(id=>o[id])];
const fail = message => { throw new Error('Offer catalog: ' + message); };
const requireValue = (value, message) => { if (!value) fail(message); };
export function catalogCents(value) {
 requireValue(Number.isFinite(value) && value > 0 && Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, 'prices must be positive whole-cent amounts');
 return Math.round(value * 100);
}
export const countWords = value => ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'][value] ?? String(value);
export const titleCount = value => { const text=countWords(value); return text[0].toUpperCase()+text.slice(1); };
export function publicOfferProjection(input) {
 const o=normalizeOfferCatalog(input),fields=(p,keys)=>Object.fromEntries(keys.map(key=>[key,p[key]]));
 return {catalog_format:o.catalog_format,catalog_revision:o.catalog_revision,service_menu:o.service_menu,build_ids:buildOfferIds.filter(id=>o[id]),monthly_ids:monthlyOfferIds.filter(id=>o.plans?.[id]),specialist_ids:specialistOfferIds.filter(id=>o[id]),...Object.fromEntries([...buildOfferIds,...specialistOfferIds].filter(id=>o[id]).map(id=>[id,fields(o[id],['public_name','public_price'])])),plans:Object.fromEntries(monthlyOfferIds.filter(id=>o.plans?.[id]).map(id=>[id,fields(o.plans[id],['public_name','monthly_price','priorities',...(o.catalog_revision===4?['variants']:[])])])),baseline:fields(o.baseline,['public_name','one_time_price']),audit_sprint:fields(o.audit_sprint,['public_name','one_time_price']),care_variants:o.care_variants,add_ons:o.add_ons.map(p=>fields(p,['id','public_name','public_price'])),annual_enrollment_gate:{verified:o.annual_enrollment_gate?.verified===true}};
}
const safePath = path => typeof path === 'string' && path.split('.').every(part => /^[a-zA-Z0-9_]+$/.test(part) && !['__proto__','prototype','constructor'].includes(part));
export function catalogValue(object, path) {
 requireValue(safePath(path), 'invalid field path');
 return path.split('.').reduce((value,key) => value && Object.hasOwn(value,key) ? value[key] : undefined, object);
}
export function setCatalogValue(object, path, value) {
 requireValue(safePath(path), 'invalid field path');
 const keys=path.split('.'),key=keys.pop(),parent=keys.length?catalogValue(object,keys.join('.')):object;
 requireValue(parent && Object.hasOwn(parent,key), 'unknown field '+path);
 parent[key]=value;
}
export function resolveOfferCopy(template,o) {
 requireValue(typeof template==='string','copy template must be a string');
 const value=template.replace(/\{\{([\w.]+)(?:\|(words|title|money|sets|improvements|forms|topics|graphics|excerpts|guides|outputs|article|topicPhrase))?\}\}/g,(_match,reference,format)=>{
  const v=catalogValue(o,reference);requireValue(['string','number'].includes(typeof v),'unknown template reference '+reference);
  if(format==='words')return countWords(v);if(format==='title')return titleCount(v);
  if(format==='article')return v===1?'an':countWords(v);
  if(format==='topicPhrase')return v===1?'service or topic':'services or topics';
  if(['sets','improvements','forms','topics','graphics','excerpts','guides','outputs'].includes(format))return v===1?format.slice(0,-1):format;
  if(format==='money')return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:Number.isInteger(v)?0:2}).format(v);
  return String(v);
 });
 requireValue(!value.includes('{{'),'unresolved copy template');return value;
}
function freeze(value) { if(value && typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value; }
export function derivePaymentSchedule(price, schedule) {
 const total=catalogCents(price);
 requireValue(Array.isArray(schedule)&&schedule.length>0, 'payment schedule required');
 requireValue(schedule.every(stage=>typeof stage.event==='string'&&stage.event.trim()&&Number.isFinite(stage.percent)&&stage.percent>0&&stage.percent<=100&&Number.isInteger(stage.percent*100)), 'invalid payment stage');
 requireValue(Math.abs(schedule.reduce((sum,stage)=>sum+stage.percent,0)-100)<0.000001, 'payment percentages must total 100');
 let remaining=total;
 return schedule.map((stage,index)=>{const amount=index===schedule.length-1?remaining:Math.round(total*stage.percent/100);remaining-=amount;requireValue(amount>0,'price too small for payment schedule');return {...stage,amount:amount/100};});
}
export function normalizeOfferCatalog(input) {
 if(normalized.has(input))return input;
 requireValue(input && typeof input==='object' && typeof input.version==='string' && input.version.trim(), 'version required');
 const o=structuredClone(input);
 const name=p=>requireValue(typeof p?.public_name==='string'&&p.public_name.trim().length>0&&!/[\u0000-\u001f]/.test(p.public_name),'public name required');
 const integer=(value,path,min=0)=>requireValue(Number.isSafeInteger(value)&&value>=min, path+' must be an integer >= '+min);
 for(const id of buildOfferIds.filter(id=>o[id])){
  const p=o[id];name(p);catalogCents(p.public_price);
  // Earlier saved catalogs expressed these values only in prose. Their legacy
  // limits remain available when rendering archived, unaccepted examples.
  p.form_field_limit??=6;
  if(id==='signature_site')p.search_research.planning_days??=90;
  p.payment_schedule=derivePaymentSchedule(p.public_price,p.payment_schedule);
  requireValue(JSON.stringify(p.payment_schedule.map(s=>s.percent))===(o.catalog_format===3?'[40,30,30]':'[50,30,20]'),'build schedule must match its catalog generation');
  for(const key of ['marketing_page_cap','forms','form_field_limit','external_connection_limit','training_minutes'])integer(p[key],id+'.'+key,key==='marketing_page_cap'?1:0);
  integer(p.launch_content.articles,id+'.launch_content.articles');
  requireValue(p.launch_content.articles<=p.marketing_page_cap,'included guides exceed the page cap');
  for(const key of ['launch','promotional','supplied_photo_edits'])integer(p.graphic_counts[key],id+'.graphic_counts.'+key);
  p.graphic_counts.total=p.graphic_counts.launch+p.graphic_counts.promotional;
  for(const key of ['competitor_limit','content_idea_limit'])integer(p.search_research[key],id+'.search_research.'+key);
  if(id==='signature_site')integer(p.search_research.planning_days,id+'.search_research.planning_days',1);
 }
 for(const id of monthlyOfferIds.filter(id=>o.plans?.[id])){
  const p=o.plans?.[id];name(p);const monthly=catalogCents(p.monthly_price);
  for(const key of ['priorities','small_change_batches'])integer(p[key],'plans.'+id+'.'+key);
  if(p.review_minutes!==undefined)integer(p.review_minutes,'review_minutes');
  if(p.search_scope)for(const key of ['active_topics','candidate_limit','competitor_limit'])if(p.search_scope[key]!==null)integer(p.search_scope[key],'search_scope.'+key);
  if(p.growth_plan)integer(p.growth_plan.days,'growth_plan.days',1);
  if(p.promotion_reuse)for(const key of ['quantity','graphic_sizes','newsletter_max_words'])integer(p.promotion_reuse[key],'promotion_reuse.'+key,o.catalog_format===3?0:1);
  const a=p.annual;
  requireValue(a && a.cycles===12,'annual billing requires twelve cycles');
  requireValue(Number.isFinite(a.discount_percent)&&a.discount_percent>=0&&a.discount_percent<100,'invalid annual discount');
  const full=monthly*a.cycles,upfront=Math.round(full*(100-a.discount_percent)/100);
  requireValue(Number.isSafeInteger(full)&&upfront>0,'invalid annual price');
  requireValue(o.annual_enrollment_gate?.verified!==true||upfront%a.cycles===0,'active annual prices must divide into whole-cent service cycles for the settlement tool');
  Object.assign(a,{upfront_price:upfront/100,monthly_equivalent:upfront/100/a.cycles,saving_vs_12_monthly:(full-upfront)/100});
 }
 for(const key of ['baseline','audit_sprint']){const p=o[key];name(p);integer(p.page_cap,key+'.page_cap',1);p.payment_schedule=derivePaymentSchedule(p.one_time_price,p.payment_schedule);}
 for(const id of specialistOfferIds.filter(id=>o[id])){const p=o[id];name(p);catalogCents(p.public_price);p.payment_schedule=derivePaymentSchedule(p.public_price,p.payment_schedule);}
 if(o.catalog_format===3){
  o.care_variants.brochure.price=o.plans.keep_running.monthly_price;
  if(o.catalog_revision===4){
   for(const id of monthlyOfferIds){const p=o.plans[id];
    p.variants.brochure.price=p.monthly_price;
    p.variants.commerce.price=id==='keep_running'?o.care_variants.commerce.price:p.monthly_price+o.care_variants.improvement_commerce_supplement;
    if(p.variants.production)p.variants.production.price=p.monthly_price-100;
    for(const v of Object.values(p.variants))catalogCents(v.price);
   }
  }
  requireValue(currentOfferIds(o).length===15,'V3 requires all fifteen plans');
  requireValue(o.build_ids?.join(',')===buildOfferIds.join(','),'V3 website order must include all four tiers');
  requireValue(o.annual_enrollment_gate?.verified!==true,'V3 does not offer new annual enrollment');
  for(const id of currentOfferIds(o))requireValue(offerRecord(o,id)?.v3?.includes?.length&&offerRecord(o,id)?.v3?.acceptance?.length,'V3 scope and acceptance required: '+id);
 }
 const addonIds=new Set();
 for(const p of o.add_ons||[]){name(p);catalogCents(p.public_price);requireValue(typeof p.id==='string'&&!addonIds.has(p.id),'duplicate or missing add-on id');addonIds.add(p.id);}
 // Templates bind repeated prose to structured limits; resolved strings remain
 // available in the saved JSON for existing tools and human-readable reviews.
 for(const [path,template] of Object.entries(o.copy_templates||{})){
  requireValue(typeof catalogValue(o,path)==='string'&&typeof template==='string','invalid copy template '+path);
  setCatalogValue(o,path,resolveOfferCopy(template,o));
 }
 if(o.catalog_revision===4)for(const id of currentOfferIds(o)){
  const p=offerRecord(o,id);p.acceptance=[...p.v3.acceptance];p.exclusions=[...p.v3.excludes];
  if(monthlyOfferIds.includes(id))p.deliverables=[...p.v3.includes];else p.scope=p.v3.includes.join(' ');
  if(buildOfferIds.includes(id)){p.copy=p.v3.includes[1];p.launch_content.scope=p.copy;p.included_pages=p.marketing_page_cap;}
 }
 normalized.add(o);return freeze(o);
}
