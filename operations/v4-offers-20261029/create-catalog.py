"""Reproduce the approved V4 current catalog; never mutate accepted snapshots."""
import copy, hashlib, json, re, subprocess
from pathlib import Path
R=Path(__file__).resolve().parents[2]; H=Path(__file__).parent
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
old=read(R/'operations/historical/offers-2026-10-29-v3.json')
a=read(H/'approved-catalog.json'); o=copy.deepcopy(old)
amend=read(H/'approved-content-amendment.json')
assert hashlib.sha256((H/'approved-catalog.json').read_bytes()).hexdigest()==amend['baseCatalogSHA256']
assert amend['replacesPlan']=='local-search' and amend['monthlyArticles']==5
a['plans']=[copy.deepcopy(amend['plan']) if p['id']=='local-search' else p for p in a['plans']]
P={p['id']:p for p in a['plans']}; M={m['id']:m for m in a['modules']}
mapping={'launch_site':'focused','focused_site':'essential','business_site':'business','signature_site':'signature','baseline':'roadmap','audit_sprint':'repair','brand_message':'message','storefront':'store','local_presence':'local-setup','workflow':'workflow','systems':'systems'}
monthly={'keep_running':'care','improve':'partnership','local_focus':'local-focus','grow':'local-search'}
o.update(version='2026-10-29-v4-offers',document_version='2026-10-29-v4-offers',catalog_revision=4,status='Current introductory offers for new written proposals; accepted agreements retain their saved terms.',copy_templates={})
o['previous_versions']=list(dict.fromkeys(old['previous_versions']+[old['version']]))
o['v4_source']={'approved_catalog_sha256':hashlib.sha256((H/'approved-catalog.json').read_bytes()).hexdigest(),'source':'operations/v4-offers-20261029/approved-catalog.json'}
o['v4_source']['amendment']={'source':'operations/v4-offers-20261029/approved-content-amendment.json','sha256':hashlib.sha256((H/'approved-content-amendment.json').read_bytes()).hexdigest()}
o['pricing_change_note']='These introductory prices and scopes apply to new proposals. Existing accepted agreements keep their saved deliverables, fees, payment stages and support terms.'
o['historical_authority']='Historical catalogs and accepted snapshots preserve existing agreements. config/offers.json is the current authority for new proposals.'
o['delivery_conditions']='Delivery begins at your ready, booked start: approved scope, initial payment, access and business facts in place. The next available start is confirmed separately. Normal review time is included; allow two business days for consolidated feedback at each gate. The shortest targets need prompt approvals. Missing inputs or approved changes can move dates. Written communication is standard; calls are optional.'
o['introductory_terms']='Your accepted fixed project keeps its written price and scope. One month is billed in advance. Cancel before the next billing date to stop the next cycle. Monthly clients keep the quoted fee for their first three paid cycles. After that, the same fee continues until a written change has at least 30 days notice. There is no automatic price increase or annual lock-in. Availability is confirmed against actual delivery capacity before booking.'
o['hosting_offset_terms']='Brochure Care, standalone or bundled, offsets your documented eligible supported hosting bill by up to $25/month. You own and pay the hosting account; the offset reduces the W&M invoice. With $20 hosting, a $299 bundle means $279 to W&M plus $20 to the host. With $50 hosting it means $274 plus $50, or $324 total. No hosting bill means no offset. Commerce and production-only plans receive no hosting offset. Domains, platform licenses, apps, taxes and other vendor charges remain separate.'
o['monthly_onboarding_terms']='Care onboarding is $195 for Brochure or $395 for Commerce. It is waived immediately after a W&M build with the same complete handoff, and for the first three approved introductory monthly production clients who select Care. Standalone Care retains its onboarding fee. The full compatibility, access, monitoring and recovery checks still apply. Production-only plans have no Care onboarding charge; a pre-start fit and access review is included. Any remediation is agreed separately before acceptance. Eligibility and the exact first invoice are confirmed before payment.'
o['first_cycle_measurement']='The first paid production cycle includes missing supported native GA4 and Search Console setup plus one inquiry-success event, using client-approved consent settings. Working measurement is reused. There is no separate fee for this basic setup; advanced tagging or dashboards need an incremental quote. If native setup is unavailable, agree an equivalent or revised scope before payment. The cycle still includes all promised production outputs.'
o['v3_policies'].update(definitions=a['policies']['definitions'],delivery_policies=[x for x in a['policies']['delivery'] if x[0]!='Daily communication allocation'],shared_launch_standards=a['policies']['launchChecks'],platform_care=a['policies']['platformCare'],money_and_ownership=a['policies']['payments'],google_profile_rules=a['policies']['googleProfileRules'])
quality=dict(a['policies']['launchChecks']); delivery=dict(a['policies']['delivery'])
o['build_foundations']=[quality[k] for k in ['Content and scope','Layouts and accessibility checks','Browser and journey checks','Performance','Search foundations','Measurement','Ownership and handoff']]
o['build_foundation_acceptance']=[quality['Completion record'],delivery['Launch control'],delivery['Post-launch']]
def update(q,p,is_monthly=False):
 v=q['v3']; v.update({k:copy.deepcopy(p[k]) for k in ['fit','result','includes','excludes','inputs','acceptance','note','support','timeline']})
 v['note']=re.sub(r' Its phase budget remains 16 base / 20 reserved hours\.| Commerce reserves 5\.3125 complete hours/month\.','',v['note']).replace('V3’s','the agreed').replace('The V3 profile-only output alternative is replaced by a page-led plan plus bounded profile upkeep.','This page-led plan includes bounded profile upkeep.')
 if p['id']=='store':
  v['note']='This full storefront scope is outside the introductory program; its written fixed fee and scope apply.'
  v['timeline']='6–8 weeks'
 v['stages']=[['Agree the work','Confirm the useful outcome, access, facts, acceptance checks and booked start.'],['Create and review','Share the work for the agreed consolidated review rounds; include normal feedback time.'],['Check and hand over','Complete acceptance checks, obtain approval and deliver the account/file inventory and instructions.']]
 if is_monthly:v['stages']=[['Choose the priority','Agree the output, facts and acceptance checks at the start of the paid cycle.'],['Produce and review',p['timeline']+'.'],['Complete the cycle','Implement approved work, check it and report delivered outputs, observations and the next priority within the paid cycle.']]
 q.update(public_name=p['name'],exclusions=p['excludes'],acceptance=p['acceptance'],refinement=p['support'],buyer_summary={'outcomes':[p['fit'],p['result']],'fit':p['fit']},delivery_average=v['timeline'])
 if is_monthly:q.update(monthly_price=p['price'],fit=p['fit'],tagline=p['result'],deliverables=p['includes'],edit_minutes=60)
 else:
  q.update(scope=' '.join(p['includes']))
  q['public_price' if 'public_price' in q else 'one_time_price']=p['price']
  total=round(p['price']*100); left=total
  for i,s in enumerate(q['payment_schedule']):
   cents=left if i==len(q['payment_schedule'])-1 else round(total*s['percent']/100);left-=cents;s['amount']=cents/100
for key,pid in mapping.items():
 q=o[key]; p=P[pid]; update(q,p)
 if key in o['build_ids']:
  q.update(marketing_page_cap=p['pageLimit'],included_pages=p['pageLimit'],copy=p['includes'][1],creative=p['includes'][2],correction=p['support'],delivery_target=p['timeline'],followup_summary=delivery['Post-launch'],measurement_included=True,measurement_scope=next(x for x in p['includes'] if x.startswith('Basic inquiry measurement:')),launch_foundations=o['build_foundations'],launch_acceptance=p['acceptance'],defect_days={'focused':30,'essential':60,'business':60,'signature':90}[pid])
  q['launch_content']['scope']=p['includes'][1]
  q['internal_planning']={'source':'Approved V4 budget; internal estimates never limit completion of accepted deliverables.'}
for key,pid in monthly.items():
 q=o['plans'][key];p=P[pid];update(q,p,True)
 if key=='grow':q['priorities']=amend['monthlyArticles']
 names=['brochure','commerce'] if key=='keep_running' else ['production','brochure','commerce']
 q['variants']={name:{'name':v['name'],'price':v['price'],'care':name!='production','hosting_offset_cap':v['hostingAllowance']} for name,v in zip(names,p['variants'])}
 q['annual'].update(upfront_price=p['price']*12,monthly_equivalent=p['price'],saving_vs_12_monthly=0)
 q['v3']['example']={'keep_running':'A monthly log shows the maintenance completed, journeys checked, supplied edits made and the next recovery-test date.','improve':'For example: turn an unclear service page into a persuasive, fully implemented page with useful FAQs and a tested next step.','local_focus':'For example: research and publish a useful service page, correct up to three approved profile facts, and publish one factual Google profile update.','grow':'For example: research, write and publish five articles answering distinct customer questions, update the profile and priority listings, and improve one existing call-to-action section.'}[key]
o['workflow']['workflow_variants']={'simple':{'name':P['workflow']['variants'][0]['name'],'timeline':P['workflow']['variants'][0]['timeline'],'includes':P['workflow']['includes'],'acceptance':P['workflow']['acceptance']},'complex':{k:P['workflow']['variants'][1][k] for k in ['name','timeline','scope','acceptance']}}
o['care_variants']={'brochure':{'price':149,'page_cap':30,'journeys':3,'edit_minutes':60,'onboarding':195,'hosting_offset_cap':25},'commerce':{'price':295,'product_cap':100,'journeys':3,'checkouts':1,'edit_minutes':60,'onboarding':395,'hosting_offset_cap':0},'improvement_commerce_supplement':146}
o['monthly_terms'].update(care=P['care']['includes'],small_batch='One monthly batch of supplied text/image edits, up to 60 minutes, for either Brochure or Commerce Care. New page design and original copywriting belong to a production plan or separate scope.',onboarding=o['monthly_onboarding_terms'],hosting=o['hosting_offset_terms'],renewal=o['introductory_terms'],no_double_billing='Choose one production plan per site. Production-only is available for a healthy supported site with maintenance handled elsewhere. Brochure Care adds $100/month; Commerce replaces it for another $146/month. Never bill both Care variants or a second standalone Care fee.')
o['annual_enrollment_gate']['reason']='Current offers are month-to-month. No new annual enrollment; accepted historical agreements retain their saved terms.'
for q in o['add_ons']+o['quoted_add_ons']:
 if q['module_id']=='M3-bundle':
  q.update(public_price=525,timeline='3–5 business days'); continue
 m=M[q['module_id']]; gate=re.sub(r'Commerce plan allows 5 base hours\. |; plan 8 base hours total','',m['gate'])
 q.update(public_name=m['name'],public_price=m['price'],summary=m['when'],scope=m['scope'],exclusions=[m['excludes']],acceptance=[gate],timeline=m['timeline'])
 if q['module_id']=='M1':q['scope']='One domain, one GA4 property, one Search Console property and one Tag Manager container as needed. Includes up to five agreed events, including up to two key conversion events, and one compatible consent tool configured from client-approved settings. One dashboard uses two existing sources and eight metrics. I check events, debugging and consent behavior, then provide a written/recorded handoff with an optional 45-minute appointment.'
o['add_on_terms']['version']=o['version']
# Keep dynamic bindings for mutability tests and all downstream copy, without stale V3 text.
for key,t in old['copy_templates'].items():
 if key.startswith('plans.'):continue
 parts=key.split('.'); current=o
 for part in parts:current=current[int(part)] if isinstance(current,list) else current[part]
 # Retain existing numeric bindings in the new approved sentence where possible.
 refs=re.findall(r'\{\{([^{}]+)\}\}',t)
 for ref in refs:
  path,_,fmt=ref.partition('|'); val=o
  for part in path.split('.'):val=val[part]
  words=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve']
  rendered=words[val] if fmt=='words' and isinstance(val,int) and val<len(words) else str(val)
  if fmt=='title':rendered=(words[val] if val<len(words) else str(val)).capitalize()
  if fmt in ['forms','guides']:rendered=fmt[:-1] if val==1 else fmt
  current=re.sub(r'(?<![\w{.])'+re.escape(rendered)+r'(?![\w}|])',lambda m:'{{'+ref+'}}',current,count=1)
 o['copy_templates'][key]=current
# Binding full plan prices and capacities here prevents a new quote from inheriting old embedded numbers.
for key in o['monthly_ids']:
 q=o['plans'][key]
 for i,text in enumerate(q['v3']['includes']):
  for variant,v in q['variants'].items():text=text.replace('$'+format(v['price'],','),'{{plans.'+key+'.variants.'+variant+'.price|money}}')
  o['copy_templates']['plans.'+key+'.v3.includes.'+str(i)]=text
o['copy_templates'].update({
 'business_site.v3.includes.1':'Up to {{business_site.marketing_page_cap}} marketing pages with original writing. The allowance includes up to {{business_site.launch_content.articles|words}} researched practical {{business_site.launch_content.articles|guides}}, each answering one agreed buyer question; one can be a proof/case-study page from supplied evidence. These count inside the {{business_site.marketing_page_cap}}-page total. Content length follows topic, reader and search intent, without a word cap.',
 'signature_site.v3.includes.1':'Up to {{signature_site.marketing_page_cap}} marketing pages, including up to {{signature_site.launch_content.articles|words}} researched practical {{signature_site.launch_content.articles|guides}} answering agreed buyer questions and up to two proof pages from supplied evidence. Guides and proof pages count inside the {{signature_site.marketing_page_cap}}-page total. Writing follows the topic, reader and search intent without a word cap.',
 'plans.improve.v3.includes.1':'A written monthly priority exchange (or optional {{plans.improve.review_minutes}}-minute appointment), a rolling 90-day backlog and {{plans.improve.priorities|words}} agreed main {{plans.improve.priorities|improvements}}.',
 'plans.improve.v3.includes.2':'Select {{plans.improve.priorities|words}} monthly {{plans.improve.priorities|outputs}}: for each output, choose one new standard page for one agreed purpose using the established design; rewrite/implement up to two existing pages for their existing purposes; improve one ordinary form/journey; or add one bounded section/component to improve an existing buying path.',
 'plans.grow.v3.includes.1':'An initial {{plans.grow.growth_plan.days}}-day topic and local-presence plan; monthly Search Console/GA4/profile review where data are available. Track up to 10 agreed non-branded query themes, without presenting unstable ranking checks as guaranteed results.',
 'plans.grow.v3.includes.2':'{{plans.grow.priorities|title}} new researched articles or useful service pages each month, using the existing supported design and publishing setup. Each answers one agreed buyer question or service purpose. Content length follows the topic, reader and search intent, without a fixed word quota. Each complete article counts once; research, publishing and checks are not separate deliverables.',
 'plans.grow.v3.includes.6':'A written monthly strategy review (or optional {{plans.grow.review_minutes}}-minute appointment) and report on completed work, available impressions/clicks/inquiries, attribution limits and next priorities.',
 'plans.grow.v3.acceptance.0':'{{plans.grow.priorities|title}} distinct, complete articles or service pages are approved, published and checked. A report lists their URLs, the question each answers and completed checks; one page cannot be counted twice. An existing-page refresh or technical repair replaces an article only with explicit written agreement.'
})
(R/'config/offers.json').write_text(json.dumps(o,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
subprocess.run(['node','--input-type=module','-e',"import {readFileSync,writeFileSync} from 'node:fs';import {normalizeOfferCatalog} from './src/offer-catalog.mjs';const p='config/offers.json';writeFileSync(p,JSON.stringify(normalizeOfferCatalog(JSON.parse(readFileSync(p,'utf8'))),null,2)+'\\n');"],cwd=R,check=True)
print(json.dumps({'version':o['version'],'plans':len(o['service_menu']),'websites':[(k,o[k]['public_price'],o[k]['marketing_page_cap']) for k in o['build_ids']]}))
