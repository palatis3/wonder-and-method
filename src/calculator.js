import {calculateCost,money} from './shared.mjs';

export function bindCostCalculator(calculator,prices,doc=document){
 const field=name=>calculator.elements.namedItem(name);
 const total=doc.querySelector('#cost-total');
 const breakdown=doc.querySelector('#cost-breakdown');
 const errorBox=doc.querySelector('#calculator-error');
 const note=doc.querySelector('#external-note');
 let monthlyCycles=field('cycles').value;
 let cyclesEdited=false;
 const annualOption=[...(field('billing').options||[])].find(option=>option.value==='annual');
 if(annualOption){annualOption.disabled=prices.annual_available!==true;annualOption.hidden=prices.annual_available!==true;}
 if(prices.annual_available!==true&&field('billing').value==='annual')field('billing').value='monthly';
 const update=()=>{
  const existing=field('build').value==='existing';
  const noPlan=field('plan').value==='none';
  field('cycles').disabled=noPlan;
  field('billing').disabled=noPlan;
  field('cycles').readOnly=field('billing').value==='annual'&&!noPlan;
  field('baseline').disabled=!existing||field('sprint').checked;
  field('sprint').disabled=!existing;
  const projectFields=field('sprint').closest?.('fieldset');if(projectFields)projectFields.hidden=!existing;
  const baselineLabel=field('baseline').closest?.('label');
  if(baselineLabel)baselineLabel.hidden=!existing;
  for(const name of ['cycles','hostingMonths','external','hostingMonthly'])field(name).removeAttribute('aria-invalid');
  const f=new FormData(calculator);
  try{
   const hasHosting=f.get('hostingMonthly')!=='';
   const invalid=[...(hasHosting?['hostingMonths']:[]),...(noPlan?[]:['cycles'])].filter(name=>f.get(name)===''||!Number.isInteger(Number(f.get(name)))||Number(f.get(name))<0||Number(f.get(name))>120);
   invalid.push(...['external','hostingMonthly'].filter(name=>f.get(name)!==''&&(!Number.isFinite(Number(f.get(name)))||Number(f.get(name))<0||Number(f.get(name))>1000000)));
   if(invalid.length){for(const name of invalid)field(name).setAttribute('aria-invalid','true');throw Error('Invalid cost inputs');}
   if(hasHosting&&!noPlan&&Number(f.get('cycles'))>Number(f.get('hostingMonths'))){field('hostingMonths').setAttribute('aria-invalid','true');throw Error('Hosting period must include all monthly service months');}
   const v=calculateCost(prices,{build:f.get('build'),plan:f.get('plan'),baseline:f.has('baseline'),sprint:f.has('sprint'),cycles:noPlan?0:Number(f.get('cycles')),external:f.get('external')===''?null:Number(f.get('external')),hostingMonthly:f.get('hostingMonthly')===''?null:Number(f.get('hostingMonthly')),hostingMonths:hasHosting?Number(f.get('hostingMonths')):12,billing:noPlan?'monthly':f.get('billing')||'monthly'});
   const missing=[...(f.get('hostingMonthly')===''?['hosting']:[]),...(f.get('external')===''?['domain, email and other paid tools']:[])];
   const knownTotal=v.knownSubtotal;
   total.textContent=knownTotal===0?'Choose a website or service to see an estimate.':money(knownTotal)+(missing.length?' known costs':' estimated total');
   breakdown.textContent=`${money(v.once)} one-time${v.baselineFee?` (including ${money(v.baselineFee)} Website Baseline)`:''}`+(noPlan?'.':v.billing==='annual'?` + ${money(v.annualUpfront)} paid upfront for 12 months. The same 12 months billed monthly cost ${money(prices[f.get('plan')]*12)}; annual savings ${money(prices[f.get('plan')]*12-v.annualUpfront)}. Subject to written approval.`:` + ${v.cycles} monthly payments of ${money(v.monthly)}.`)+(v.grossHosting===null?'':` Direct hosting: ${money(v.grossHosting)}.`);
   note.textContent=missing.length?`Includes our fees and any provider costs entered. Still to add: ${missing.join('; ')}. Taxes and approved additions are extra.`:'Includes our fees and the provider costs you entered. Taxes and approved additions are extra.';
   if(knownTotal===0){breakdown.textContent='';note.textContent='Choose a website or plan, or add known outside costs.';}
   errorBox.textContent='';
  }catch(error){
   for(const input of calculator.querySelectorAll('[aria-invalid="true"]')){let disclosure=input.closest('details');while(disclosure){disclosure.open=true;disclosure=disclosure.parentElement?.closest('details');}}
   errorBox.textContent=error.message==='Hosting period must include all monthly service months'?'Hosting months must cover all selected months of monthly help.':error.message==='Annual billing requires one plan and twelve cycles'?'Annual prepayment covers exactly 12 monthly cycles.':'Enter whole month counts from 0 to 120 and outside costs from $0 to $1,000,000.';
   total.textContent='Check the highlighted fields';breakdown.textContent='';note.textContent='The estimate will return when the inputs are valid.';
  }
 };
 calculator.addEventListener('input',event=>{if(event.target===field('cycles')&&field('billing').value!=='annual'){cyclesEdited=true;monthlyCycles=field('cycles').value;}update();});
 calculator.addEventListener('change',event=>{
  if(event.target===field('build')&&!cyclesEdited){monthlyCycles='12';if(field('billing').value!=='annual')field('cycles').value=monthlyCycles;}
  if(event.target===field('billing')){
   if(field('billing').value==='annual'&&prices.annual_available===true){
    monthlyCycles=field('cycles').value;field('cycles').value='12';
    if(Number(field('hostingMonths').value)<12)field('hostingMonths').value='12';
   }else{field('billing').value='monthly';field('cycles').value=monthlyCycles;}
  }
  update();
 });
 calculator.addEventListener('submit',event=>event.preventDefault());
 update();
 return update;
}
const calculator=typeof document==='undefined'?null:document.querySelector('#cost-calculator');
if(calculator)fetch('/assets/prices.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw Error();return response.json();}).then(prices=>bindCostCalculator(calculator,prices)).catch(()=>{document.querySelector('#calculator-error').textContent='Calculator unavailable. Use the visible prices or email support@wonderandmethod.com.';});
const packSelector=typeof document==='undefined'?null:document.querySelector('#pack-selector');if(packSelector){document.querySelector('#pack-selector-control').hidden=false;const showPack=()=>{document.querySelectorAll('[data-pack]').forEach(item=>{item.hidden=item.dataset.pack!==packSelector.value;item.open=!item.hidden;});};packSelector.addEventListener('change',showPack);showPack();}
