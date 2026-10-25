import {calculateWebsiteRoi,roiFields,breakEvenDisplayBound} from './roi-math.mjs';
import {countJourney} from './journey-counts.js';
const form=document.getElementById('website-roi');
const results=document.getElementById('roi-results');
const output=document.getElementById('roi-output');
const status=document.getElementById('roi-status');
const stale=document.getElementById('roi-stale');
let timer;
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:Number.isInteger(value)?0:2,maximumFractionDigits:2}).format(value);
const number=value=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(value);
function clearErrors(){for(const key of Object.keys(roiFields)){form.elements[key].removeAttribute('aria-invalid');document.getElementById(`roi-${key}-error`).textContent='';}}
function calculate({manual=false}={}){
 if(manual)clearErrors();
 const input=Object.fromEntries(Object.keys(roiFields).map(key=>[key,form.elements[key].value]));
 if(!manual&&Object.values(input).some(value=>/[.,]$/.test(value.trim())))return;
 const result=calculateWebsiteRoi(input);
 if(!result.ok){if(stale)stale.hidden=results.hidden;if(!manual)return;for(const [key,error]of Object.entries(result.errors)){form.elements[key].setAttribute('aria-invalid','true');document.getElementById(`roi-${key}-error`).textContent=error;}status.textContent='Check the highlighted assumptions before calculating.';form.elements[Object.keys(result.errors)[0]].focus();return;}
 const stats=[['Total website cost',money(result.totalCost)],['Money from extra jobs after direct costs',money(result.totalContribution)],['Money left after website costs',money(result.net)],['Return on the website cost',result.roiPercent===null?'Not defined: zero cost':number(result.roiPercent)+'%']];
 const sensitivity=[['Half the inquiries',0.5],['Your assumption',1],['50% more inquiries',1.5]].map(([label,factor])=>{const altNet=result.totalContribution*factor-result.totalCost;return `<tr><th scope="row">${label}</th><td>${number(result.values.inquiries*factor)}</td><td>${money(altNet)}</td></tr>`;}).join('');
 output.innerHTML=`${result.checks.length?`<p class="roi-assumption-check"><strong>Double-check these large assumptions:</strong> ${result.checks.join('; ')}. Your numbers are still used below. Check them against your own costs, inquiry records and capacity.</p>`:''}<dl class="roi-stat-grid">${stats.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><p>Extra jobs assumed across ${number(result.values.months)} months: <strong>${number(result.expectedJobs)}</strong>. Fractional values are averages, not booked work.</p><p><strong>Months to earn back the build cost:</strong> ${result.values.oneTime===0?'No upfront build cost to earn back. Monthly website costs still need to be covered.':result.paybackMonths===null?'There is no money left each month after direct job and website costs under these assumptions.':(result.paybackMonths<0.1?'Less than 0.1':number(result.paybackMonths))+' months at this steady pace'+(result.paybackMonths>result.values.months?' — beyond your selected comparison period.':'.')}</p><p><strong>Inquiries per month needed to break even:</strong> ${result.breakEvenInquiries===null?'Not reachable if no inquiries become jobs or no money is kept from each job.':number(breakEvenDisplayBound(result.breakEvenInquiries))+' extra serious inquiries per month on average over the selected period.'}</p><h3>Change just the inquiry assumption</h3><p>Inquiries are extra inquiries per month. Net is money left after direct job costs and all website costs over ${number(result.values.months)} months.</p><div class="roi-table" role="region" aria-label="Inquiry scenarios" tabindex="0"><table><thead><tr><th scope="col">Scenario</th><th scope="col">Inquiries</th><th scope="col">Net</th></tr></thead><tbody>${sensitivity}</tbody></table></div><p>Values are rounded for display. Open “How this is calculated” for the formulas, example and limits.</p>`;
 results.hidden=false;if(stale)stale.hidden=true;clearErrors();
 if(manual){status.textContent='Scenario calculated. Results follow the form.';document.getElementById('roi-results-title').focus();try{countJourney('roi_calculate');}catch{}}
}
if(form){
 form.hidden=false;calculate();
 form.addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);calculate({manual:true});});
 form.addEventListener('input',()=>{clearTimeout(timer);if(stale&&!results.hidden)stale.hidden=false;status.textContent='';timer=setTimeout(()=>calculate(),400);});
 form.addEventListener('reset',()=>{clearTimeout(timer);setTimeout(()=>{clearErrors();calculate();status.textContent='Example assumptions and matching results restored.';},0);});
}
