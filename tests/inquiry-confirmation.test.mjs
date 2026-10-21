import test from 'node:test';
import assert from 'node:assert/strict';
import {bindInquirySubmission} from '../src/inquiry-submit.mjs';
import {inquiryConfirmationHtml} from '../src/inquiry-confirmation.mjs';
import {inquiryResponseHtml} from '../src/inquiry-response.mjs';

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
  const elements=Object.fromEntries(Object.keys(values).map(id=>[id,{id,checkValidity:()=>true,setAttribute(){},focus(){this.focused=true;}}]));
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

test('native and enhanced receipts share visible next steps and escape response values',()=>{
  const data={...saved,service:'launch_site',request_kind:'checkout'};
  const html=inquiryResponseHtml(data);
  assert.match(html,/<h1 id="inquiry-confirmation-heading">Thanks\. I have your request\./);
  assert.match(html,/Your reference/);assert.match(html,/What happens next/);assert.match(html,/no project is booked/);
  assert.doesNotMatch(html,/<script/);
  const escaped=inquiryConfirmationHtml({...data,reference:'<img src=x onerror=alert(1)>'});
  assert.match(escaped,/&lt;img/);assert.doesNotMatch(escaped,/<img/);
});
