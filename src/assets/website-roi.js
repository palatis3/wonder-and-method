import {calculateWebsiteRoi,roiFields} from './roi-math.mjs';
const form=document.getElementById('website-roi');
const results=document.getElementById('roi-results');
const output=document.getElementById('roi-output');
const status=document.getElementById('roi-status');
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
const number=value=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(value);
function clearErrors(){for(const key of Object.keys(roiFields)){form.elements[key].removeAttribute('aria-invalid');document.getElementById(`roi-${key}-error`).textContent='';}}
function calculate(){
 clearErrors();
 const input=Object.fromEntries(Object.keys(roiFields).map(key=>[key,form.elements[key].value]));
 const result=calculateWebsiteRoi(input);
 if(!result.ok){results.hidden=true;for(const [key,error]of Object.entries(result.errors)){form.elements[key].setAttribute('aria-invalid','true');document.getElementById(`roi-${key}-error`).textContent=error;}status.textContent='Check the highlighted assumptions before calculating.';form.elements[Object.keys(result.errors)[0]].focus();return;}
 const stats=[['Total website cost',money(result.totalCost)],['Additional contribution',money(result.totalContribution)],['Net after website costs',money(result.net)],['Scenario ROI',result.roiPercent===null?'Not defined: zero cost':number(result.roiPercent)+'%']];
 const sensitivity=[['Half the inquiries',0.5],['Your assumption',1],['50% more inquiries',1.5]].map(([label,factor])=>{const altNet=result.totalContribution*factor-result.totalCost;return `<tr><th scope="row">${label}</th><td>${number(result.values.inquiries*factor)}</td><td>${money(altNet)}</td></tr>`;}).join('');
 output.innerHTML=`<dl class="roi-stat-grid">${stats.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><p>Expected additional jobs across ${number(result.values.months)} months: <strong>${number(result.expectedJobs)}</strong>. Fractional values represent averages, not booked work.</p><p><strong>Simple payback:</strong> ${result.paybackMonths===null?'No positive monthly surplus under these assumptions.':number(result.paybackMonths)+' months at this steady pace'+(result.paybackMonths>result.values.months?' — beyond your selected comparison period.':'.')}</p><p><strong>Break-even inquiries:</strong> ${result.breakEvenInquiries===null?'Not reachable with a zero close rate or zero contribution per job.':number(result.breakEvenInquiries)+' additional qualified inquiries per month on average over the selected period.'}</p><h3>Change just the inquiry assumption</h3><div class="roi-table" role="region" aria-label="Inquiry scenarios" tabindex="0"><table><thead><tr><th scope="col">Scenario</th><th scope="col">Extra inquiries / month</th><th scope="col">Net after website costs</th></tr></thead><tbody>${sensitivity}</tbody></table></div><p>All other assumptions remain the same. These scenarios do not predict demand or establish that the website caused an inquiry. Values are rounded for display.</p>`;
 results.hidden=false;status.textContent='Scenario calculated. Results follow the form.';document.getElementById('roi-results-title').focus();
}
if(form){form.hidden=false;form.addEventListener('submit',event=>{event.preventDefault();calculate();});form.addEventListener('input',()=>{results.hidden=true;status.textContent='Assumptions changed. Calculate again to update the result.';});form.addEventListener('reset',()=>{clearErrors();results.hidden=true;output.replaceChildren();status.textContent='Example assumptions restored. Calculate to see the result.';});}
