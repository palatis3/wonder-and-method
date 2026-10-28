import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {websiteRoiPage} from '../../src/website-roi.mjs';
import {inquiryForm} from '../../src/inquiry-form.mjs';
import {prefillInquiryHtml} from '../../src/inquiry-prefill.mjs';
import {costCalculator} from '../../src/audit-content.mjs';
import offers from '../../config/offers.json' with {type:'json'};
import {priceList,money} from '../../src/shared.mjs';

// Bundle only the controller under test into memory. Do not build or modify dist.
const bundle=async path=>(await build({entryPoints:[fileURLToPath(new URL(path,import.meta.url))],bundle:true,write:false,format:'iife',platform:'browser',logLevel:'silent'})).outputFiles[0].text;
const roiScript=await bundle('../../src/assets/website-roi.js'),formScript=await bundle('../../src/client.js'),costScript=await bundle('../../src/calculator.js');
const roiCss=await readFile(new URL('../../src/assets/website-roi.css',import.meta.url),'utf8');
const foundationCss=await readFile(new URL('../../src/assets/premium.css',import.meta.url),'utf8');
const sharedLayoutCss=await readFile(new URL('../../src/assets/site-refresh.css',import.meta.url),'utf8');
async function mount(page,html,script,{path='/contact/',css='',bodyClass=''}={}){
 const network=[];
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());network.push({path:url.pathname,method:route.request().method(),body:route.request().postData()});
  if(url.hostname!=='synthetic.test')return route.abort();
  if(url.pathname==='/assets/prices.json')return route.fulfill({contentType:'application/json',body:JSON.stringify(priceList(offers))});
  if(url.pathname==='/api/inquiries'){
   const input=route.request().postDataJSON();return route.fulfill({status:202,contentType:'application/json',body:JSON.stringify({...input,reference:'abcdef12-3456-4000-8000-000000000001',synthetic:true})});
  }
  return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial,sans-serif;margin:0;padding:20px;box-sizing:border-box}*{box-sizing:border-box}[hidden]{display:none!important}input,textarea,select{font:inherit}label{display:block}form{max-width:100%}'+css+'</style></head><body class="'+bodyClass+'">'+html+'</body></html>'});
 });
 await page.goto('http://synthetic.test'+path);if(script)await page.addScriptTag({content:script});return network;
}

test('ROI shows defaults, keeps stale results, debounces valid updates without focus jumps and resets accurately',async({page})=>{
 const network=await mount(page,websiteRoiPage(),roiScript,{path:'/tools/website-roi-calculator/',css:roiCss});
 await expect(page.locator('#roi-results')).toBeVisible();await expect(page.locator('#roi-output')).toContainText('3.1 extra serious inquiries');
 await expect(page.locator('#roi-results-title')).not.toBeFocused();
 const cost=page.locator('#roi-oneTime');await cost.fill('');await expect(page.locator('#roi-stale')).toBeVisible();await expect(page.locator('#roi-results')).toBeVisible();
 await cost.fill('2000');await expect(page.locator('#roi-stale')).toBeHidden();await expect(cost).toBeFocused();await expect(page.locator('#roi-output')).toContainText('$4,160');
 await cost.fill('2000.');await expect(page.locator('#roi-stale')).toBeVisible();
 await cost.fill('bad');await page.getByRole('button',{name:'Calculate scenario'}).click();await expect(cost).toBeFocused();await expect(cost).toHaveAttribute('aria-invalid','true');await expect(page.locator('#roi-results')).toBeVisible();
 await page.getByRole('button',{name:'Reset example'}).click();await expect(cost).toHaveValue('2350');await expect(page.locator('#roi-stale')).toBeHidden();await expect(page.locator('#roi-output')).toContainText('$4,510');
 await page.getByRole('button',{name:'Calculate scenario'}).click();await expect(page.locator('#roi-results-title')).toBeFocused();assertNoPersonalNetwork(network);
});

for(const width of [320,390,1440])test(`ROI fields and results fit ${width}px and 200% text`,async({page})=>{
 // The complete page includes shared responsive example tables. Use their
 // production foundation (including heading wrapping), stylesheet and namespace
 // as well as the calculator styles, in their production cascade order.
 await page.setViewportSize({width,height:1000});await mount(page,websiteRoiPage(),roiScript,{path:'/tools/website-roi-calculator/',css:foundationCss+sharedLayoutCss+roiCss,bodyClass:'studio-site'});
 for(const scale of [1,2]){
  await page.evaluate(scale=>document.documentElement.style.fontSize=16*scale+'px',scale);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const field=await page.locator('#roi-oneTime').boundingBox();expect(field.width).toBeGreaterThan(width===320?(scale===2?200:220):250);
 }
});

test('cost horizon follows service months until edited and zero monthly cycles errors',async({page})=>{
 await mount(page,costCalculator(offers),null,{path:'/payments/'});
 const initial=await page.locator('#cost-total,#cost-breakdown,#external-note').allTextContents();
 await page.addScriptTag({content:costScript});await expect(page.locator('[name=cycles]')).toBeDisabled();
 expect(await page.locator('#cost-total,#cost-breakdown,#external-note').allTextContents()).toEqual(initial);
 await page.getByText('Add outside costs (optional)',{exact:true}).click();
 await page.locator('[name=plan]').selectOption('improve');await page.locator('[name=cycles]').fill('24');await expect(page.locator('[name=hostingMonths]')).toHaveValue('24');
 await page.locator('[name=hostingMonthly]').fill('20');await page.locator('[name=external]').fill('0');
 await expect(page.locator('#cost-breakdown')).toContainText('24 monthly payments');await expect(page.locator('#cost-breakdown')).toContainText('Direct hosting (24 months): $480');
 await page.locator('[name=hostingMonths]').fill('12');await expect(page.locator('#cost-hostingMonths-error')).toContainText('cover all selected months');
 await page.locator('[name=hostingMonths]').fill('36');await expect(page.locator('#external-note')).toContainText('different periods');
 await page.locator('[name=cycles]').fill('0');await expect(page.locator('#cost-cycles-error')).toContainText('1 to 120');
 await page.locator('[name=cycles]').fill('1');await expect(page.locator('#cost-breakdown')).toContainText('1 monthly payment of');
 await page.locator('[name=plan]').selectOption('none');await expect(page.locator('#calculator-error')).toBeEmpty();
 await page.locator('[data-addon-picker] summary').click();await page.locator('[name=addon_standard_page]').check();await page.locator('[data-addon-picker] summary').click();await expect(page.locator('[data-addon-remove=standard_page]')).toBeVisible();await page.locator('[data-addon-remove=standard_page]').click();await expect(page.locator('[name=addon_standard_page]')).not.toBeChecked();
});

test('enhanced form preserves county provenance, optional URL, selected extras and drafted message',async({page})=>{
 const path='/contact/?offer=unsure&request_kind=question&goal=fix&county=pennsylvania%2Ferie-county&addons=standard_page';
 const html=prefillInquiryHtml(inquiryForm({live:false}),new URL('http://synthetic.test'+path));
 const network=await mount(page,html,formScript,{path});
 await expect(page.locator('#request-summary')).toContainText('From service-area page: Erie County, PA');await expect(page.locator('#message-help')).toContainText('when you tested it');
 await expect(page.locator('#website')).not.toHaveAttribute('required');
 await expect(page.locator('[data-addon-picker]')).toBeVisible();await expect(page.locator('[data-addon-picker]')).not.toHaveAttribute('open');
 await expect(page.locator('[data-addon-remove=standard_page]')).toBeVisible();await expect(page.locator('#business')).toBeHidden();await page.getByText('Website and business details (optional)',{exact:true}).click();await expect(page.locator('#business')).toBeVisible();
 await page.locator('#name').fill('Synthetic Person');await page.locator('#email').fill('synthetic@example.test');await page.locator('#business_location').fill('Fictional town');await page.locator('#message').fill('Synthetic drafted diagnostic details.');
 await page.locator('#package-choice summary').click();await page.locator('#service').selectOption('keep_running');await expect(page.locator('#message')).toHaveValue('Synthetic drafted diagnostic details.');await expect(page.locator('#county')).toHaveValue('pennsylvania/erie-county');
 await page.getByRole('button',{name:'Send message',exact:true}).click();await expect(page.locator('#inquiry-confirmation')).toContainText('No email was sent');
 const sent=JSON.parse(network.find(row=>row.path==='/api/inquiries').body);expect(sent.county).toBe('pennsylvania/erie-county');expect(sent.business_location).toBe('Fictional town');expect(sent.goal).toBe('fix');expect(sent.add_ons).toEqual(['standard_page']);expect(sent.website).toBe('');
});

test('build picker stays collapsed with selected summary and remove controls preserve other additions',async({page})=>{
 const path='/checkout/launch-site/?addons=standard_page,contact_form';
 const html=prefillInquiryHtml(inquiryForm({live:false},{checkout:true,service:'launch_site'}),new URL('http://synthetic.test'+path));
 await mount(page,html,formScript,{path});
 await expect(page.locator('[data-addon-picker]')).not.toHaveAttribute('open');expect(await page.locator('input[name^="addon_"]').count()).toBe(12);
 const contactFormPrice=offers.add_ons.find(item=>item.id==='contact_form').public_price,standardPagePrice=offers.add_ons.find(item=>item.id==='standard_page').public_price;
 await expect(page.locator('[data-addon-summary]')).toBeVisible();await expect(page.locator('[data-addon-project-total]')).toContainText(money(offers.launch_site.public_price+contactFormPrice+standardPagePrice));
 await page.locator('[data-addon-remove=standard_page]').click();await expect(page.locator('[name=addon_standard_page]')).not.toBeChecked();await expect(page.locator('[name=addon_contact_form]')).toBeChecked();await expect(page.locator('[data-addon-project-total]')).toContainText(money(offers.launch_site.public_price+contactFormPrice));
});

function assertNoPersonalNetwork(network){expect(network.filter(row=>row.method==='POST')).toHaveLength(0);}

test('changing service clears an obsolete website requirement without exposing untouched errors',async({page})=>{
 const path='/contact/?offer=website_baseline&request_kind=checkout';
 const html=prefillInquiryHtml(inquiryForm({live:false}),new URL('http://synthetic.test'+path));
 const network=await mount(page,html,formScript,{path});
 await expect(page.locator('#website')).toHaveAttribute('required','');
 await page.locator('#package-choice summary').click();await page.locator('#website').focus();await page.locator('#service').focus();
 await expect(page.locator('#website-error')).not.toBeEmpty();
 await page.locator('#service').selectOption('launch_site');
 await expect(page.locator('#website')).not.toHaveAttribute('required');
 await expect(page.locator('#website-error')).toBeEmpty();
 await expect(page.locator('#website')).toHaveAttribute('aria-invalid','false');
 await expect(page.locator('#name-error')).toBeEmpty();await expect(page.locator('#email-error')).toBeEmpty();
 await expect(page.locator('#form-status')).toBeEmpty();assertNoPersonalNetwork(network);
});

test('inquiry field errors clear during correction and update the summary without a POST',async({page})=>{
 const network=await mount(page,inquiryForm({live:false}),formScript);
 await page.locator('#name').fill('Synthetic Person');
 await page.locator('#email').fill('not-an-email');
 await page.locator('#message').fill('short');
 await page.locator('[type=submit]').click();
 await expect(page.locator('#email')).toBeFocused();
 await expect(page.locator('#form-status')).toContainText('2 highlighted fields');
 await page.locator('#email').fill('synthetic@example.test');
 await expect(page.locator('#email-error')).toBeEmpty();
 await expect(page.locator('#email')).toHaveAttribute('aria-invalid','false');
 await expect(page.locator('#form-status')).toContainText('the highlighted field');
 await page.locator('#message').fill('Please review this fictional website.');
 await expect(page.locator('#message-error')).toBeEmpty();
 await expect(page.locator('#form-status')).toBeEmpty();
 assertNoPersonalNetwork(network);
});

test('inquiry blur validation catches whitespace and malformed email without interrupting first entry',async({page})=>{
 const network=await mount(page,inquiryForm({live:false}),formScript);
 await page.locator('[data-project-details]>summary').click();
 await page.locator('#name').fill('   ');
 await expect(page.locator('#name-error')).toBeEmpty();
 await page.locator('#website').focus();
 await expect(page.locator('#name-error')).toContainText('name');
 await page.locator('#name').fill('Synthetic Person');
 await expect(page.locator('#name-error')).toBeEmpty();
 await page.locator('#email').fill('two..dots@example.test');
 await expect(page.locator('#email-error')).toBeEmpty();
 await page.locator('#message').focus();
 await expect(page.locator('#email-error')).toContainText('full email');
 await page.locator('#message').fill('Please review this fictional website.');
 await page.locator('#email').fill('synthetic@example.test');
 await expect(page.locator('#form-status')).toBeEmpty();
 assertNoPersonalNetwork(network);
});
