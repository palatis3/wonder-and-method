import {inquiryChoices,resolveServiceId,inquiryContextFields,inquiryNeedsWebsite} from './shared.mjs';
export function validEmail(email){
  if(typeof email!=='string'||email.length>254)return false;
  const parts=email.split('@');
  if(parts.length!==2||parts[0].length>64||!parts[0]||parts[0].startsWith('.')||parts[0].endsWith('.')||parts[0].includes('..'))return false;
  if(!/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+$/.test(parts[0]))return false;
  const labels=parts[1].split('.');
  return labels.length>=2&&labels.every(label=>/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(label));
}
export const serviceIds=inquiryChoices.map(([id])=>id);
export function inquiryFieldMessage(key,validity={}){
 if(key==='email'&&(validity.valueMissing||validity.typeMismatch||validity.patternMismatch))return 'Please enter your full email, like name@business.com.';
 if(validity.valueMissing){if(key==='name')return 'Please add your name.';if(key==='message')return 'Please tell me a little about what you need (at least 10 characters).';return 'Please complete this field.';}
 if(validity.tooShort&&key==='message')return 'Please tell me a little about what you need (at least 10 characters).';
 if(validity.tooLong)return key==='message'?'Keep this message within 3,000 characters. Email longer notes to support@wonderandmethod.com.':'Please shorten this entry to the stated limit.';
 return key==='email'?'Please enter your full email, like name@business.com.':'Please check this entry.';
}
export function validateInquiry(data){
  const errors={},value={};
  if(!data||typeof data!=='object'||Array.isArray(data))return {errors:{name:'Provide inquiry fields.'},value};
  for(const [key,max] of Object.entries({name:100,email:254,business:160,website:500,service:40,message:3000})){
    if(data[key]!==undefined&&typeof data[key]!=='string'){errors[key]='Use plain text.';value[key]='';continue;}
    value[key]=(data[key]||'').trim();
    if(!['website','business','service'].includes(key)&&!value[key])errors[key]=inquiryFieldMessage(key,{valueMissing:true});
    if(value[key].length>max)errors[key]=key==='message'?inquiryFieldMessage(key,{tooLong:true}):`Use no more than ${max} characters.`;
    if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value[key]))errors[key]='Remove unsupported control characters.';
  }
  if(!validEmail(value.email))errors.email=inquiryFieldMessage('email',{typeMismatch:true});
  value.service=resolveServiceId(value.service)||'unsure';
  if(!serviceIds.includes(value.service))errors.service='Choose one of the listed services.';
  if(value.message.length<10)errors.message=inquiryFieldMessage('message',{tooShort:true});
  if(value.website){
    const original=value.website,scheme=/^https?:/i.test(original);
    if(validEmail(original))errors.website='That looks like an email address. Put it in the Email field above, and use a website address or a short note here.';
    else if(/^(?:javascript|data|vbscript|file|blob|ftp):/i.test(original))errors.website='Please use a normal website address, social handle or short note.';
    else if(scheme||(!original.startsWith('@')&&!/\s/.test(original)&&original.includes('.')))try{
      const url=new URL(scheme?original:'https://'+original);
      if(url.username||url.password){if(scheme||original.includes('@')&&!original.startsWith('@'))errors.website='Please remove the username or password from this address.';}
      else if(['http:','https:'].includes(url.protocol)&&url.hostname.includes('.')&&!/\s/.test(original))value.website=scheme?original:'https://'+original;
    }catch{/* A harmless website/social note remains plain text, never a generated link. */}
  }
  for(const [key,field] of Object.entries(inquiryContextFields)){if(data[key]===undefined||data[key]==='')continue;if(typeof data[key]!=='string'||!field.options.some(([id])=>id===data[key])){errors[key]='Choose one of the listed options.';continue;}if(!field.services.includes(value.service))continue;value[key]=data[key];}
  if(!inquiryNeedsWebsite(value)&&/^(?:none|n\/?a|no website|not yet|-)?$/i.test(value.website))value.website='';
  if(inquiryNeedsWebsite(value)&&!value.website)errors.website='Please add the website address, or a short note if it is not live yet.';
  if(data._faxcheck||data.company_url)errors.company_url='Unable to accept this submission.';
  return {errors,value};
}
