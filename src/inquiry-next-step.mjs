// Shared by native forms, enhanced forms and the saved-request receipt.
export function inquiryNextStep(service,requestKind,{received=false}={}){
 const review=['website_baseline','audit_fix_sprint'].includes(service);
 if(requestKind==='question')return received?'I’ll read your question and reply by email.':'I read your question and reply by email.';
 if(requestKind!=='checkout')return received?'I’ll read your message and reply by email.':'I read your message and reply by email.';
 if(review)return 'I check whether your website fits the listed review, confirm what is included and email you the available dates. The listed work has a fixed fee; any different work is quoted separately before you decide.';
 return received?'I’ll review your details and email you about the work, price and available dates.':'I review your project and email you about the work, price and available dates.';
}
