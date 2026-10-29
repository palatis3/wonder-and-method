import assert from 'node:assert/strict';
import {normalizeOfferCatalog,currentOfferIds,offerRecord,buildOfferIds,monthlyOfferIds,publicOfferProjection} from '../src/offer-catalog.mjs';
import {renderPages} from '../src/pages.mjs';
import {buyerPacks,assertUniquePackSentences} from '../src/buyer-packs.mjs';
import {v3ServicePath} from '../src/v3-offer-content.mjs';
import {commercialOffers,addonOffers} from '../src/schema.mjs';
import {escapeHtml as e,money,priceList,calculateCost} from '../src/shared.mjs';

// Probe all current offers with unequal names/prices. Old accepted snapshots
// have their own validation and must never be changed by this sales-copy gate.
export function assertV3OfferBindings({config,offers,map,geography}){
 const raw=structuredClone(offers),ids=currentOfferIds(raw);assert.equal(ids.length,15);
 for(const [index,id] of ids.entries()){
  const p=offerRecord(raw,id);p.public_name=`Probe ${index+1} & <${id}>`;
  const key=monthlyOfferIds.includes(id)?'monthly_price':Object.hasOwn(p,'public_price')?'public_price':'one_time_price';
  p[key]=2000+index*113+0.17;
 }
 raw.service_menu=ids.map(id=>({id,name:offerRecord(raw,id).public_name}));
 for(const [index,p] of raw.add_ons.entries()){p.public_name=`Addition ${index+1} & <${p.id}>`;p.public_price=311+index*37+0.19;}
 raw.business_site.marketing_page_cap=17;raw.business_site.forms=4;raw.business_site.form_field_limit=11;
 const probe=normalizeOfferCatalog(raw),pages=renderPages({config,offers:probe,map,geography}),routes=new Map(pages.map(p=>[p.path,p])),packs=buyerPacks(probe);let assertions=0;
 const has=(path,text)=>{assert.ok(routes.get(path)?.html.includes(text),`V3 catalog binding missing on ${path}: ${text}`);assertions++;};
 assertUniquePackSentences(packs);assert.equal(packs.length,15);assertions+=2;
 for(const id of ids){const p=offerRecord(probe,id),price=p.public_price??p.monthly_price??p.one_time_price;
  for(const path of ['/pricing/',v3ServicePath(probe,id),`/checkout/${id.replaceAll('_','-')}/`]){has(path,e(p.public_name));has(path,money(price));}
  const pack=packs.find(x=>x.id===id);assert.equal(pack.name,p.public_name);assert.equal(pack.price,price);assertions+=2;
  has('/contact/',`value="${id}"`);
  if(!monthlyOfferIds.includes(id)){assert.equal(Math.round(p.payment_schedule.reduce((sum,m)=>sum+m.amount,0)*100),Math.round(price*100));assertions++;}
 }
 for(const p of probe.add_ons){has('/pricing/',e(p.public_name));has('/services/website-addons/',e(p.public_name));has('/services/website-addons/',money(p.public_price));}
 for(const p of probe.quoted_add_ons){has('/services/website-addons/',e(p.public_name));assert.equal(p.public_price,null);assertions++;}
 for(const path of ['/pricing/','/services/web-design/']){has(path,'Up to 17');has(path,'4, up to 11 fields each');}
 const schema=commercialOffers(config,probe);assert.equal(schema.length,15);assertions++;
 for(const row of schema){const id=row['@id'].split('#offer-')[1],p=offerRecord(probe,id);assert.equal(row.name,p.public_name);assert.equal(row.price,p.public_price??p.monthly_price??p.one_time_price);assertions+=2;}
 const quoted=addonOffers(config,probe).find(p=>p.name===probe.quoted_add_ons[0].public_name);assert.ok(quoted&&!Object.hasOwn(quoted,'price'));assertions++;
 const projected=publicOfferProjection(probe),json=JSON.stringify(projected);assert.ok(!/v3_policies|internal_planning|delivery_hours|base_hours|v3_plan_id/.test(json));assert.equal(projected.service_menu.length,15);assertions+=2;
 const prices=priceList(offers);assert.equal(calculateCost(prices,{build:'business',plan:'local_focus',cycles:3}).serviceTotal,offers.business_site.public_price+offers.plans.local_focus.monthly_price*3);assertions++;
 for(const id of buildOfferIds)assert.deepEqual(probe[id].payment_schedule.map(m=>m.percent),[40,30,30]);assertions+=buildOfferIds.length;
 return {status:'pass',generation:3,offers:ids.length,modules:new Set([...probe.add_ons,...probe.quoted_add_ons].map(p=>p.module_id.replace('-bundle',''))).size,routes:pages.length,assertions};
}
