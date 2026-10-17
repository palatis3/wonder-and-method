import {inquiryChoices,resolveServiceId,inquiryContextFields} from './shared.mjs';
export const serviceIds=inquiryChoices.map(([id])=>id);
export function validateInquiry(data){
  const errors={},value={};
  if(!data||typeof data!=='object'||Array.isArray(data))return {errors:{name:'Provide inquiry fields.'},value};
  for(const [key,max] of Object.entries({name:100,email:254,business:160,website:500,service:40,message:3000})){
    if(data[key]!==undefined&&typeof data[key]!=='string'){errors[key]='Use plain text.';value[key]='';continue;}
    value[key]=(data[key]||'').trim();
    if(!['website','business'].includes(key)&&!value[key])errors[key]='This field is required.';
    if(value[key].length>max)errors[key]=`Use no more than ${max} characters.`;
    if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value[key]))errors[key]='Remove unsupported control characters.';
  }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email))errors.email='Enter a valid email address.';
  value.service=resolveServiceId(value.service);
  if(!serviceIds.includes(value.service))errors.service='Choose one of the listed services.';
  if(value.message.length<10)errors.message='Please include at least 10 characters.';
  if(value.website){try{if(!/^[a-z][a-z0-9+.-]*:/i.test(value.website))value.website='https://'+value.website;const url=new URL(value.website);if(!['https:','http:'].includes(url.protocol)||url.username||url.password||!url.hostname.includes('.')||/\s/.test(value.website))throw new Error();}catch{errors.website='Enter a website such as example.com or https://example.com, without a username or password.';}}
  for(const [key,field] of Object.entries(inquiryContextFields)){if(data[key]===undefined||data[key]==='')continue;if(typeof data[key]!=='string'||!field.options.some(([id])=>id===data[key])){errors[key]='Choose one of the listed options.';continue;}if(!field.services.includes(value.service)){errors[key]='This option does not apply to the selected service.';continue;}value[key]=data[key];}
  if(data.company_url)errors.company_url='Unable to accept this submission.';
  return {errors,value};
}
