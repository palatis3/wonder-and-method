import {normalizeAddonSelection} from './addons.mjs';
import {calculateCost,costEstimateCopy,money} from './shared.mjs';
import {parseMoneyInput} from './assets/roi-math.mjs';

export function bindCostCalculator(calculator,prices,doc=document){
 const field=name=>calculator.elements.namedItem(name);
 const total=doc.querySelector('#cost-total');
 const breakdown=doc.querySelector('#cost-breakdown');
 const errorBox=doc.querySelector('#calculator-error');
 const note=doc.querySelector('#external-note');
 let monthlyCycles=field('cycles').value;
 let cyclesEdited=false;
 let hostingEdited=false;
 const annualOption=[...(field('billing').options||[])].find(option=>option.value==='annual');
 // Public examples are an allowlist of transparent assumptions, never a quote.
 const presetName=new URLSearchParams(doc.defaultView?.location?.search||'').get('estimate');
 const presets={'launch-none':['launch','none'],'focused-keep_running':['focused','keep_running'],'existing-improve':['existing','improve']};
 if(Object.hasOwn(presets,presetName)){
  const [build,plan]=presets[presetName];field('build').value=build;field('plan').value=plan;
  field('cycles').value='12';monthlyCycles='12';field('hostingMonths').value='12';
  field('hostingMonthly').value='20';field('external').value='120';field('baseline').checked=true;field('sprint').checked=false;
  const providers=calculator.querySelector('.provider-estimate');if(providers)providers.open=true;
  const notice=doc.createElement('p');notice.className='cost-example-notice';notice.textContent='Illustrative preset loaded: 12 months, $20/month hosting and $120 for other outside bills. Replace these assumptions with your actual costs. Tax and approved extras remain separate; nothing is booked.';calculator.prepend(notice);
 }
 if(annualOption){annualOption.disabled=prices.annual_available!==true;annualOption.hidden=prices.annual_available!==true;}
 if(prices.annual_available!==true&&field('billing').value==='annual')field('billing').value='monthly';
 const update=()=>{
  const existing=field('build').value==='existing';
  const noPlan=field('plan').value==='none';
  field('cycles').disabled=noPlan;
  const monthlyFields=calculator.querySelector?.('[data-monthly-cost-fields]');if(monthlyFields)monthlyFields.hidden=noPlan;
  field('billing').disabled=noPlan;
  field('cycles').readOnly=field('billing').value==='annual'&&!noPlan;
  for(const button of calculator.querySelectorAll('[data-cost-months]')){
   button.disabled=noPlan||field('cycles').readOnly;
   button.setAttribute('aria-pressed',String(button.dataset.costMonths===field('cycles').value));
  }
  field('baseline').disabled=!existing||field('sprint').checked;
  field('sprint').disabled=!existing;
  const projectFields=field('sprint').closest?.('fieldset');if(projectFields)projectFields.hidden=!existing;
  const baselineLabel=field('baseline').closest?.('label');
  if(baselineLabel)baselineLabel.hidden=!existing;
  const inputErrors={};
  const markError=(name,message)=>{inputErrors[name]=message;field(name).setAttribute('aria-invalid','true');const output=doc.querySelector('#cost-'+name+'-error');if(output)output.textContent=message;};
  for(const name of ['cycles','hostingMonths','external','hostingMonthly']){field(name).removeAttribute('aria-invalid');const output=doc.querySelector('#cost-'+name+'-error');if(output)output.textContent='';}
  if(!hostingEdited&&!noPlan)field('hostingMonths').value=field('cycles').value;
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
   for(const name of [...(hasHosting?['hostingMonths']:[]),...(noPlan?[]:['cycles'])])if(!/^\d+$/.test(f.get(name)?.trim()??'')||Number(f.get(name))>120||name==='cycles'&&Number(f.get(name))<1)markError(name,'Enter a whole number of months from '+(name==='cycles'?'1':'0')+' to 120.');
   if(Object.keys(inputErrors).length)throw Error('Invalid cost inputs');
   if(hasHosting&&!noPlan&&Number(f.get('cycles'))>Number(f.get('hostingMonths'))){markError('hostingMonths','Hosting months must cover all selected months of monthly help.');throw Error('Hosting period must include all monthly service months');}
   const v=calculateCost(prices,{add_ons:normalizeAddonSelection(Object.fromEntries((prices.add_ons||[]).filter(item=>f.has('addon_'+item.id)).map(item=>['addon_'+item.id,f.get('addon_'+item.id)]))),build:f.get('build'),plan:f.get('plan'),baseline:f.has('baseline'),sprint:f.has('sprint'),cycles:noPlan?0:Number(f.get('cycles')),...amounts,hostingMonths:hasHosting?Number(f.get('hostingMonths')):12,billing:noPlan?'monthly':f.get('billing')||'monthly'});
   const summary=calculator.querySelector?.('[data-addon-summary]');if(summary){summary.hidden=!v.addonLines.length;summary.querySelector('[data-addon-names]').textContent=v.addonLines.map(item=>item.public_name).join('; ');summary.querySelector('[data-addon-total]').textContent=money(v.addonTotal);}
   const removals=summary?.querySelector('[data-addon-removals]');if(removals)removals.replaceChildren(...v.addonLines.map(item=>{const button=doc.createElement('button');button.type='button';button.dataset.addonRemove=item.id;button.textContent='Remove '+item.public_name;return button;}));
   const copy=costEstimateCopy(v,{plan:noPlan?'none':field('plan').value,prices,external:amounts.external});
   total.textContent=copy.total;breakdown.textContent=copy.breakdown;note.textContent=copy.note+(hasHosting&&!noPlan&&v.hostingMonths!==v.cycles?' Hosting and monthly help cover different periods; compare the periods in the breakdown.':'');
   errorBox.textContent='';
  }catch(error){
   for(const input of calculator.querySelectorAll('[aria-invalid="true"]')){let disclosure=input.closest('details');while(disclosure){disclosure.open=true;disclosure=disclosure.parentElement?.closest('details');}}
   errorBox.textContent=Object.keys(inputErrors).length?'Check the highlighted fields. '+Object.entries(inputErrors).map(([name,message])=>({cycles:'Months of monthly help',hostingMonths:'Months of hosting',hostingMonthly:'Monthly hosting price',external:'Domain, email and tools'}[name])+': '+message).join(' '):error.message==='Annual billing requires one plan and twelve cycles'?'Annual prepayment covers exactly 12 monthly cycles.':'The estimate could not be calculated. Check your choices and try again.';
   total.textContent='Check the highlighted fields';breakdown.textContent='';note.textContent='The estimate will return when the inputs are valid.';
  }
 };
 calculator.addEventListener('input',event=>{if(event.target===field('hostingMonths'))hostingEdited=true;if(event.target===field('cycles')&&field('billing').value!=='annual'){cyclesEdited=true;monthlyCycles=field('cycles').value;}update();});
 calculator.addEventListener('change',event=>{
  if(event.target===field('build')&&!cyclesEdited){monthlyCycles='12';if(field('billing').value!=='annual')field('cycles').value=monthlyCycles;}
  if(event.target===field('billing')){
   if(field('billing').value==='annual'&&prices.annual_available===true){
    monthlyCycles=field('cycles').value;field('cycles').value='12';
    if(!hostingEdited)field('hostingMonths').value='12';
   }else{field('billing').value='monthly';field('cycles').value=monthlyCycles;}
  }
  update();
 });
 calculator.addEventListener('submit',event=>event.preventDefault());
 calculator.addEventListener('click',event=>{
  const period=event.target.closest?.('[data-cost-months]');
  if(period&&calculator.contains(period)){
   if(period.disabled)return;
   field('cycles').value=period.dataset.costMonths;monthlyCycles=field('cycles').value;cyclesEdited=true;update();return;
  }
  const remove=event.target.closest?.('[data-addon-remove]');if(!remove||!calculator.contains(remove))return;const input=field('addon_'+remove.dataset.addonRemove);if(!input)return;input.checked=false;update();(calculator.querySelector('[data-addon-remove]')||calculator.querySelector('[data-addon-picker] summary'))?.focus();
 });
 update();
 return update;
}
const calculator=typeof document==='undefined'?null:document.querySelector('form#cost-calculator');
if(calculator)fetch('/assets/prices.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw Error();return response.json();}).then(prices=>bindCostCalculator(calculator,prices)).catch(()=>{document.querySelector('#calculator-error').textContent='Calculator unavailable. Use the visible prices or email support@wonderandmethod.com.';});
const packSelector=typeof document==='undefined'?null:document.querySelector('#pack-selector');if(packSelector){document.querySelector('#pack-selector-control').hidden=false;const showPack=()=>{document.querySelectorAll('[data-pack]').forEach(item=>{item.hidden=item.dataset.pack!==packSelector.value;item.open=!item.hidden;});};packSelector.addEventListener('change',showPack);showPack();}
