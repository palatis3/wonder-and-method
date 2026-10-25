import test from 'node:test';
import assert from 'node:assert/strict';
import {bindInquirySubmission} from '../src/inquiry-submit.mjs';
import {inquiryConfirmationHtml} from '../src/inquiry-confirmation.mjs';
import {inquiryResponseHtml} from '../src/inquiry-response.mjs';

test('optional preparation is restricted to real website-build proposal receipts',()=>{
 const reference='abcdef12-3456-4000-8000-000000000001';
 for(const service of ['launch_site','focused_site','signature_site']){
  const data={reference,service,request_kind:'checkout'};
  for(const html of [inquiryConfirmationHtml(data),inquiryResponseHtml(data)]){
   assert.match(html,/While you wait \(optional\)/);assert.match(html,/Keep passwords private/);
   assert.match(html,/photos you own or have permission to use/);assert.match(html,/do not need to send another message now/);
   assert.match(html,/No payment has been taken and no project is booked/);
  }
  for(const change of [{synthetic:true},{request_kind:'question'},{request_kind:'inquiry'}])assert.doesNotMatch(inquiryConfirmationHtml({...data,...change}),/inquiry-preparation|While you wait/);
 }
 for(const service of ['unsure','website_baseline','audit_fix_sprint','keep_running','improve','grow'])assert.doesNotMatch(inquiryConfirmationHtml({reference,service,request_kind:'checkout'}),/inquiry-preparation/);
});

test('public receipts use a short code with the complete reference in an optional disclosure',()=>{
 const reference='abcdef12-3456-4000-8000-000000000001';
 const html=inquiryConfirmationHtml({reference,email:'person@example.test',request_kind:'question',service:'unsure'});
 assert.match(html,/<p class="inquiry-reference"><strong>Your reference<\/strong><code>WM-ABCD-EF12-3456<\/code>/);
 assert.match(html,new RegExp('<details><summary>Full reference</summary><code>'+reference+'</code>'));
 assert.match(html,/I’ll reply to <strong>person@example.test<\/strong>/);
 assert.doesNotMatch(html,/My reply will come from/);assert.equal((html.match(/one business day/g)||[]).length,1);
});

function fixture(fetch, overrides={}){
  const values={name:'Synthetic Person',email:'fixture@example.test',service:'launch_site',request_kind:'checkout',message:'Synthetic browser behavior check.',...overrides};
  const elements=Object.fromEntries(Object.keys(values).map(id=>{
    const listeners={};
    return [id,{id,name:id,attributes:{},get value(){return values[id];},set value(value){values[id]=value;},checkValidity:()=>true,setAttribute(key,value){this.attributes[key]=value;},focus(){this.focused=true;},addEventListener(name,fn){(listeners[name]??=[]).push(fn);},emit(name){for(const fn of listeners[name]||[])fn();}}];
  }));
  const status={textContent:'',focus(){this.focused=true;}};
  const confirmation={hidden:true,focus(){this.focused=true;},scrollIntoView(){this.scrolled=true;}};
  const button={textContent:'Send inquiry',disabled:false};
  const errors=Object.fromEntries(Object.keys(values).map(id=>[id+'-error',{textContent:''}]));
  const form={action:'https://example.test/api/inquiries',dataset:{mode:'live'},hidden:false,elements:{namedItem:key=>elements[key]},addEventListener(event,handler){this[event]=handler;},querySelector:()=>button,querySelectorAll:()=>Object.values(elements),setAttribute(){},reset(){this.resetCalled=true;}};
  const counts=[];
  bindInquirySubmission(form,{fetch,document:{querySelector:id=>id==='#form-status'?status:confirmation,getElementById:id=>errors[id]},FormData:class {constructor(){return Object.entries(values);}},countJourney:(...args)=>counts.push(args)});
  return {form,status,confirmation,button,counts,elements,errors,submit:()=>form.submit({preventDefault(){}})};
}
const saved={reference:'reference-123',synthetic:false,message:'Your inquiry is saved.'};
const response=(data=saved,ok=true)=>({ok,json:async()=>data});

test('confirmed requests replace the form with a focused, visible receipt and prevent a second submission',async()=>{
  let release,calls=0;
  const ui=fixture(()=>{calls++;return new Promise(resolve=>release=resolve);});
  const pending=ui.submit();
  assert.equal(ui.button.disabled,true);assert.equal(ui.button.textContent,'Sending…');
  assert.match(ui.status.textContent,/Sending your request/);
  await ui.submit();assert.equal(calls,1);
  release(response());await pending;
  assert.equal(ui.form.hidden,true);assert.equal(ui.form.resetCalled,true);
  assert.equal(ui.confirmation.hidden,false);assert.equal(ui.confirmation.focused,true);assert.equal(ui.confirmation.scrolled,true);
  assert.match(ui.confirmation.innerHTML,/Proposal request received/);assert.match(ui.confirmation.innerHTML,/reference-123/);
  assert.match(ui.confirmation.innerHTML,/I’ll reply to/);assert.match(ui.confirmation.innerHTML,/do not need to submit again/);
  assert.deepEqual(ui.counts,[['inquiry_saved','launch_site']]);
  await ui.submit();assert.equal(calls,1);
});

test('questions get their own receipt and synthetic submissions never promise a real reply',async()=>{
  const question=fixture(async()=>response(),{request_kind:'question'});await question.submit();
  assert.match(question.confirmation.innerHTML,/Question received/);assert.match(question.confirmation.innerHTML,/read your question/);
  assert.deepEqual(question.counts,[['question_saved','launch_site']]);
  const synthetic=fixture(async()=>response({...saved,synthetic:true}));await synthetic.submit();
  assert.match(synthetic.confirmation.innerHTML,/No email was sent and no reply is expected/);
  assert.doesNotMatch(synthetic.confirmation.innerHTML,/one business day|Request received/);assert.equal(synthetic.counts.length,0);
});

test('failed, unreadable and unconfirmed responses keep the populated form available',async()=>{
  for(const fetch of [async()=>{throw new TypeError('Failed to fetch');},async()=>({ok:true,json:async()=>{throw Error('not JSON');}}),async()=>response({message:'OK'}),async()=>response(null),async()=>response({message:'Check your email',errors:{email:'Use a valid email'}},false)]){
    const ui=fixture(fetch);await ui.submit();
    assert.equal(ui.form.hidden,false);assert.equal(ui.form.resetCalled,undefined);assert.equal(ui.confirmation.hidden,true);assert.equal(ui.button.disabled,false);assert.equal(ui.counts.length,0);
    assert.ok(ui.status.textContent.length>10);assert.ok(ui.status.focused||ui.elements.email.focused);
  }
});

test('field corrections clear client errors and the summary without another submission',async()=>{
  let calls=0;
  const ui=fixture(async()=>{calls++;return response();},{name:' ',email:'invalid',message:'short'});
  await ui.submit();
  assert.equal(calls,0);assert.match(ui.status.textContent,/3 highlighted fields/);
  ui.elements.name.value='Synthetic Person';ui.elements.name.emit('input');
  assert.equal(ui.errors['name-error'].textContent,'');assert.equal(ui.elements.name.attributes['aria-invalid'],'false');
  assert.match(ui.status.textContent,/2 highlighted fields/);
  ui.elements.email.value='fixture@example.test';ui.elements.email.emit('input');
  ui.elements.message.value='Please review this fictional website.';ui.elements.message.emit('input');
  assert.equal(ui.status.textContent,'');assert.equal(ui.elements.email.attributes['aria-invalid'],'false');
  assert.equal(calls,0);
  await ui.submit();assert.equal(calls,1);assert.equal(ui.confirmation.hidden,false);
});

test('blur validates a field while first-entry typing is quiet',()=>{
  const ui=fixture(async()=>response());
  ui.elements.email.value='invalid';ui.elements.email.emit('input');
  assert.equal(ui.errors['email-error'].textContent,'');assert.equal(ui.status.textContent,'');
  ui.elements.email.emit('blur');
  assert.match(ui.errors['email-error'].textContent,/full email/);assert.match(ui.status.textContent,/highlighted field/);
  ui.elements.email.value='fixture@example.test';ui.elements.email.emit('input');
  assert.equal(ui.errors['email-error'].textContent,'');assert.equal(ui.status.textContent,'');
});

test('server field errors remain until the rejected value is edited',async()=>{
  const ui=fixture(async()=>response({message:'Please check your email.',errors:{email:'Please use another email address.'}},false));
  await ui.submit();ui.elements.email.emit('blur');
  assert.equal(ui.errors['email-error'].textContent,'Please use another email address.');
  ui.elements.email.value='different@example.test';ui.elements.email.emit('input');
  assert.equal(ui.errors['email-error'].textContent,'');assert.equal(ui.elements.email.attributes['aria-invalid'],'false');assert.equal(ui.status.textContent,'');
  assert.equal(ui.form.hidden,false);assert.equal(ui.confirmation.hidden,true);
});

test('native and enhanced receipts share visible next steps and escape response values',()=>{
  const data={...saved,service:'launch_site',request_kind:'checkout'};
  const html=inquiryResponseHtml(data);
  assert.match(html,/<h1 id="inquiry-confirmation-heading">Thanks\. I have your request\./);
  assert.match(html,/Your reference/);assert.match(html,/What happens next/);assert.match(html,/no project is booked/);
  assert.doesNotMatch(html,/<script/);
  const escaped=inquiryConfirmationHtml({...data,reference:'<img src=x onerror=alert(1)>'});
  assert.match(escaped,/&lt;img/);assert.doesNotMatch(escaped,/<img/);
});
