export const roiFields={
 oneTime:{label:'One-time website cost',min:0,max:1000000000},
 monthlyCost:{label:'Additional monthly website and marketing cost',min:0,max:1000000000},
 months:{label:'Months to compare',min:1,max:120,integer:true},
 inquiries:{label:'Additional qualified inquiries per month',min:0,max:1000000},
 closeRate:{label:'Share of qualified inquiries that become jobs',min:0,max:100},
 contribution:{label:'Contribution per additional job',min:0,max:1000000000}
};
export function calculateWebsiteRoi(input){
 const values={},errors={};
 for(const [key,rule]of Object.entries(roiFields)){
  const raw=input[key],value=typeof raw==='number'?raw:typeof raw==='string'&&raw.trim()!==''?Number(raw):NaN;
  const invalidNotation=typeof raw==='string'&&!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(raw.trim());
  if(invalidNotation||!Number.isFinite(value)||value<rule.min||value>rule.max||(rule.integer?!Number.isInteger(value):Math.round(value*100)/100!==value))errors[key]=`${rule.label}: enter ${rule.integer?'a whole number':'a decimal number'} from ${rule.min.toLocaleString('en-US')} to ${rule.max.toLocaleString('en-US')}${rule.integer?'':', using no more than two decimal places'}. Do not use exponent notation.`;
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
