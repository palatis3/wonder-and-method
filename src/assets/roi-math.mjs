export const roiFields={
 oneTime:{label:'One-time website cost',min:0,max:1000000000,money:true},
 monthlyCost:{label:'Extra website and marketing costs per month',min:0,max:1000000000,money:true},
 months:{label:'Months to compare',min:1,max:120,integer:true},
 inquiries:{label:'Extra serious inquiries per month',min:0,max:1000000},
 closeRate:{label:'Inquiries that become paying jobs',min:0,max:100},
 contribution:{label:'Money kept from one extra job after materials and labor',min:0,max:1000000000,money:true}
};
// Validate grouping before removing separators so a mistyped amount cannot change value.
export function parseMoneyInput(raw,{min=0,max=1000000000}={}){
 if(typeof raw==='string'&&raw.trim()==='')return {ok:false,reason:'empty'};
 if(!['string','number'].includes(typeof raw))return {ok:false,reason:'format'};
 const text=String(raw).trim();
 if(!/^-?\$?[ \u00a0\u202f]*(?:(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+)(?:\.\d*)?|\.\d+)$/.test(text))return {ok:false,reason:'format'};
 const normalized=text.replace(/[$,\s\u00a0\u202f]/g,''),value=Number(normalized);
 if(!Number.isFinite(value)||value<min||value>max)return {ok:false,reason:'range'};
 if((normalized.split('.')[1]?.length??0)>2||Math.round(value*100)/100!==value)return {ok:false,reason:'precision'};
 return {ok:true,value};
}
export function calculateWebsiteRoi(input){
 const values={},errors={};
 for(const [key,rule]of Object.entries(roiFields)){
  const raw=input[key];
  if(rule.money){
   const parsed=parseMoneyInput(raw,rule);
   if(parsed.ok)values[key]=parsed.value;
   else errors[key]=parsed.reason==='empty'?'Enter an amount, like 2350.':parsed.reason==='precision'?'Use whole dollars or cents only.':parsed.reason==='range'?`Enter an amount from $${rule.min.toLocaleString('en-US')} to $${rule.max.toLocaleString('en-US')}.`:'Enter an amount like 2350 or $2,350.00.';
   continue;
  }
  const value=typeof raw==='number'?raw:typeof raw==='string'&&raw.trim()!==''?Number(raw):NaN;
  const invalidNotation=typeof raw==='string'&&!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(raw.trim());
  if(invalidNotation||!Number.isFinite(value)||value<rule.min||value>rule.max||(rule.integer?!Number.isInteger(value):Math.round(value*100)/100!==value))errors[key]=rule.integer?'Enter a whole number of months from 1 to 120.':key==='closeRate'?'Enter a percentage from 0 to 100, like 25. Use no more than two decimal places.':'Enter a number of inquiries from 0 to 1,000,000, using no more than two decimal places.';
  else values[key]=value;
 }
 if(Object.keys(errors).length)return {ok:false,errors};
 const {oneTime,monthlyCost,months,inquiries,closeRate,contribution}=values;
 const contributionPerInquiry=closeRate/100*contribution;
 const totalCost=oneTime+monthlyCost*months;
 const monthlyContribution=inquiries*contributionPerInquiry;
 const totalContribution=monthlyContribution*months;
 const net=totalContribution-totalCost;
 const monthlyNet=monthlyContribution-monthlyCost;
 return {ok:true,values,totalCost,totalContribution,net,roiPercent:totalCost>0?net/totalCost*100:null,expectedJobs:inquiries*closeRate/100*months,monthlyNet,paybackMonths:monthlyNet>0?oneTime/monthlyNet:null,breakEvenInquiries:totalCost===0?0:contributionPerInquiry>0?totalCost/(months*contributionPerInquiry):null};
}
