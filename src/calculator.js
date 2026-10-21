import {normalizeAddonSelection} from './addons.mjs';
import {calculateCost,money} from './shared.mjs';
import {parseMoneyInput} from './assets/roi-math.mjs';

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
  const monthlyFields=calculator.querySelector?.('[data-monthly-cost-fields]');if(monthlyFields)monthlyFields.hidden=noPlan;
  field('billing').disabled=noPlan;
  field('cycles').readOnly=field('billing').value==='annual'&&!noPlan;
  field('baseline').disabled=!existing||field('sprint').checked;
  field('sprint').disabled=!existing;
  const projectFields=field('sprint').closest?.('fieldset');if(projectFields)projectFields.hidden=!existing;
  const baselineLabel=field('baseline').closest?.('label');
  if(baselineLabel)baselineLabel.hidden=!existing;
  const inputErrors={};
  const markError=(name,message)=>{inputErrors[name]=message;field(name).setAttribute('aria-invalid','true');const output=doc.querySelector('#cost-'+name+'-error');if(output)output.textContent=message;};
  for(const name of ['cycles','hostingMonths','external','hostingMonthly']){field(name).removeAttribute('aria-invalid');const output=doc.querySelector('#cost-'+name+'-error');if(output)output.textContent='';}
  const f=new FormData(calculator);
  try{
   const amounts={};
   for(const name of ['external','hostingMonthly']){
    const raw=f.get(name),parsed=parseMoneyInput(raw,{max:1000000});
    if(parsed.ok)amounts[name]=parsed.value;
    else if(parsed.reason==='empty')amounts[name]=null;
    else markError(name,parsed.reason==='precision'?'Use whole dollars or cents only.':parsed.reason==='range'?'Enter an amount from $0 to $1,000,000.':'Enter an amount like 2350 or $2,350.00, or leave it blank if unknown.');
   }
   const hasHosting=amounts.hostingMonthly!==null;
   for(const name of [...(hasHosting?['hostingMonths']:[]),...(noPlan?[]:['cycles'])])if(!/^\d+$/.test(f.get(name)?.trim()??'')||Number(f.get(name))>120)markError(name,'Enter a whole number of months from 0 to 120.');
   if(Object.keys(inputErrors).length)throw Error('Invalid cost inputs');
   if(hasHosting&&!noPlan&&Number(f.get('cycles'))>Number(f.get('hostingMonths'))){markError('hostingMonths','Hosting months must cover all selected months of monthly help.');throw Error('Hosting period must include all monthly service months');}
   const v=calculateCost(prices,{add_ons:normalizeAddonSelection(Object.fromEntries((prices.add_ons||[]).filter(item=>f.has('addon_'+item.id)).map(item=>['addon_'+item.id,f.get('addon_'+item.id)]))),build:f.get('build'),plan:f.get('plan'),baseline:f.has('baseline'),sprint:f.has('sprint'),cycles:noPlan?0:Number(f.get('cycles')),...amounts,hostingMonths:hasHosting?Number(f.get('hostingMonths')):12,billing:noPlan?'monthly':f.get('billing')||'monthly'});
   const summary=calculator.querySelector?.('[data-addon-summary]');if(summary){summary.hidden=!v.addonLines.length;summary.querySelector('[data-addon-names]').textContent=v.addonLines.map(item=>item.public_name).join('; ');summary.querySelector('[data-addon-total]').textContent=money(v.addonTotal);}
   const missing=[...(amounts.hostingMonthly===null?['hosting']:[]),...(amounts.external===null?['domain, email and other paid tools']:[])];
   const knownTotal=v.knownSubtotal;
   total.textContent=missing.length?`Your estimate so far: ${money(knownTotal)} (${missing.join('; ')} not added yet)`:`Estimated total: ${money(knownTotal)}`;
   const onceDetails=[...(v.addonTotal?['selected additions: '+money(v.addonTotal)]:[]),...(v.baselineFee&&v.baselineFee!==v.once?['website review: '+money(v.baselineFee)]:[])];
   breakdown.textContent=`${money(v.once)} one-time${onceDetails.length?' (including '+onceDetails.join('; ')+')':''}`+(noPlan?'.':v.billing==='annual'?` + ${money(v.annualUpfront)} paid upfront for 12 months. The same 12 months billed monthly cost ${money(prices[f.get('plan')]*12)}; annual savings ${money(prices[f.get('plan')]*12-v.annualUpfront)}. Subject to written approval.`:` + ${v.cycles} monthly payments of ${money(v.monthly)}.`)+(v.grossHosting===null?'':` Direct hosting: ${money(v.grossHosting)}.`)+(amounts.external===null?'':` Domain, email and tools: ${money(amounts.external)}.`);
   note.textContent=missing.length?`Includes my fees and any provider costs entered. Still to add: ${missing.join('; ')}. Selected additions are included once. Tax and unselected or out-of-scope work are extra.`:'Includes my fees and the provider costs you entered. Selected additions are included once. Tax and unselected or out-of-scope work are extra.';
   errorBox.textContent='';
  }catch(error){
   for(const input of calculator.querySelectorAll('[aria-invalid="true"]')){let disclosure=input.closest('details');while(disclosure){disclosure.open=true;disclosure=disclosure.parentElement?.closest('details');}}
   errorBox.textContent=Object.keys(inputErrors).length?'Check the highlighted fields. '+Object.entries(inputErrors).map(([name,message])=>({cycles:'Months of monthly help',hostingMonths:'Months of hosting',hostingMonthly:'Monthly hosting price',external:'Domain, email and tools'}[name])+': '+message).join(' '):error.message==='Annual billing requires one plan and twelve cycles'?'Annual prepayment covers exactly 12 monthly cycles.':'The estimate could not be calculated. Check your choices and try again.';
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
const calculator=typeof document==='undefined'?null:document.querySelector('form#cost-calculator');
if(calculator)fetch('/assets/prices.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw Error();return response.json();}).then(prices=>bindCostCalculator(calculator,prices)).catch(()=>{document.querySelector('#calculator-error').textContent='Calculator unavailable. Use the visible prices or email support@wonderandmethod.com.';});
const packSelector=typeof document==='undefined'?null:document.querySelector('#pack-selector');if(packSelector){document.querySelector('#pack-selector-control').hidden=false;const showPack=()=>{document.querySelectorAll('[data-pack]').forEach(item=>{item.hidden=item.dataset.pack!==packSelector.value;item.open=!item.hidden;});};packSelector.addEventListener('change',showPack);showPack();}
