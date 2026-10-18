import {calculateCost,money} from './shared.mjs';

export function bindCostCalculator(calculator,prices,doc=document){
 const field=name=>calculator.elements.namedItem(name);
 const total=doc.querySelector('#cost-total');
 const breakdown=doc.querySelector('#cost-breakdown');
 const errorBox=doc.querySelector('#calculator-error');
 const note=doc.querySelector('#external-note');
 const update=()=>{
  const existing=field('build').value==='existing';
  const noPlan=field('plan').value==='none';
  field('cycles').disabled=noPlan;
  field('billing').disabled=noPlan;
  field('cycles').readOnly=field('billing').value==='annual'&&!noPlan;
  field('baseline').disabled=!existing||field('sprint').checked;
  for(const name of ['cycles','hostingMonths','external','hostingMonthly'])field(name).removeAttribute('aria-invalid');
  const f=new FormData(calculator);
  try{
   const invalid=['hostingMonths',...(noPlan?[]:['cycles'])].filter(name=>f.get(name)===''||!Number.isInteger(Number(f.get(name)))||Number(f.get(name))<0||Number(f.get(name))>120);
   invalid.push(...['external','hostingMonthly'].filter(name=>f.get(name)!==''&&(!Number.isFinite(Number(f.get(name)))||Number(f.get(name))<0)));
   if(invalid.length){for(const name of invalid)field(name).setAttribute('aria-invalid','true');throw Error('Invalid cost inputs');}
   if(!noPlan&&Number(f.get('cycles'))>Number(f.get('hostingMonths'))){field('hostingMonths').setAttribute('aria-invalid','true');throw Error('Hosting period must include all monthly service months');}
   const v=calculateCost(prices,{build:f.get('build'),plan:f.get('plan'),baseline:f.has('baseline'),sprint:f.has('sprint'),cycles:noPlan?0:Number(f.get('cycles')),external:f.get('external')===''?null:Number(f.get('external')),hostingMonthly:f.get('hostingMonthly')===''?null:Number(f.get('hostingMonthly')),hostingMonths:Number(f.get('hostingMonths')),billing:noPlan?'monthly':f.get('billing')||'monthly'});
   total.textContent=money(v.total??v.serviceTotal)+(v.total===null?' studio subtotal':' estimated total');
   breakdown.textContent=`${money(v.once)} one-time${v.baselineFee?` (including ${money(v.baselineFee)} setup review)`:''}`+(noPlan?'.':v.billing==='annual'?` + ${money(v.annualUpfront)} paid upfront for 12 monthly cycles.`:` + ${v.cycles} monthly payments of ${money(v.monthly)}.`)+(v.grossHosting===null?'':` Direct hosting: ${money(v.grossHosting)}.`);
   note.textContent=v.total===null?'Hosting, domain and paid-tool costs are not included yet. Add confirmed provider quotes below for a complete estimate. Taxes and approved additions are extra.':'Includes studio work and the provider costs you entered. Taxes and approved additions are extra.';
   errorBox.textContent='';
  }catch(error){
   errorBox.textContent=error.message==='Hosting period must include all monthly service months'?'Provider months must cover all selected monthly service cycles.':error.message==='Annual billing requires one plan and twelve cycles'?'Annual prepayment covers exactly 12 monthly cycles.':'Enter whole month counts from 0 to 120 and provider costs of 0 or more.';
   total.textContent='Check the highlighted fields';breakdown.textContent='';note.textContent='The estimate will return when the inputs are valid.';
  }
 };
 calculator.addEventListener('input',update);
 calculator.addEventListener('change',event=>{
  if(event.target===field('build')&&field('billing').value!=='annual')field('cycles').value=field('build').value==='existing'?'12':'11';
  if(event.target===field('billing')&&field('billing').value==='annual'){
   field('cycles').value='12';
   if(Number(field('hostingMonths').value)<12)field('hostingMonths').value='12';
  }
  update();
 });
 calculator.addEventListener('submit',event=>event.preventDefault());
 update();
 return update;
}
const calculator=document.querySelector('#cost-calculator');
if(calculator)fetch('/assets/prices.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw Error();return response.json();}).then(prices=>bindCostCalculator(calculator,prices)).catch(()=>{document.querySelector('#calculator-error').textContent='Calculator unavailable. Use the visible prices or email support@wonderandmethod.com.';});
const packSelector=document.querySelector('#pack-selector');if(packSelector){document.querySelector('#pack-selector-control').hidden=false;const showPack=()=>{document.querySelectorAll('[data-pack]').forEach(item=>{item.hidden=item.dataset.pack!==packSelector.value;item.open=!item.hidden;});};packSelector.addEventListener('change',showPack);showPack();}
