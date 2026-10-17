import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {productionOperator} from '../deployment/production-operator.mjs';
const id='12345678-1234-1234-1234-123456789abc';
const credentials=()=>({OPERATOR_TOKEN:'test-token'});
const record={id,delivery_status:'accepted',payload:'private test contact'};

test('production status reports counts without inquiry content and refuses redirected credentials',async()=>{
 const calls=[];const result=await productionOperator(['status'],{credentials,fetchImpl:async(url,options)=>{calls.push({url,options});return Response.json({records:[record],next_cursor:null});}});
 assert.deepEqual(result,{origin:'https://wonderandmethod.com',total:1,delivery:{accepted:1},containsInquiryText:false});
 assert.equal(calls[0].url,'https://wonderandmethod.com/api/operator/inquiries?after=');assert.equal(calls[0].options.redirect,'error');assert.ok(!JSON.stringify(result).includes('private test contact'));
});
test('production export follows pagination into a new private file and never overwrites it',async()=>{
 const workspace=await mkdtemp(join(tmpdir(),'wm-operator-'));let calls=0;
 const fetchImpl=async url=>{calls++;return Response.json(url.endsWith('?after=')?{records:[record],next_cursor:id}:{records:[],next_cursor:null});};
 try{const result=await productionOperator(['export','owner-review'],{workspace,credentials,fetchImpl});assert.equal(calls,2);assert.equal(result.file,join(workspace,'.runtime/exports/owner-review.json'));assert.equal(JSON.parse(await readFile(result.file,'utf8')).records[0].payload,record.payload);await assert.rejects(()=>productionOperator(['export','owner-review'],{workspace,credentials,fetchImpl}),/EEXIST/);}finally{assert.ok(resolve(workspace).startsWith(resolve(tmpdir())+sep+'wm-operator-'));await rm(workspace,{recursive:true,force:true});}
});
test('dangerous or ambiguous production operator arguments fail before reading secrets or making a request',async()=>{
 for(const args of [['export','../../dist/leak'],['export','C:\\public'],['delete',id],['retry',id,'different'],['status','extra'],['unrecognized']])await assert.rejects(()=>productionOperator(args,{credentials:()=>{throw Error('must not read credentials');}}),/Use status|filename label|exact inquiry reference|Status takes/);
});
test('production retry and deletion require exact references and correct confirmation headers',async()=>{
 for(const action of ['retry','delete']){let call;await productionOperator([action,id,id],{credentials,fetchImpl:async(url,options)=>{call={url,options};return Response.json({status:'test_only'});}});assert.equal(call.options.method,action==='retry'?'POST':'DELETE');assert.equal(call.options.headers[action==='retry'?'X-Confirm-Retry':'X-Confirm-Delete'],id);assert.equal(call.url,'https://wonderandmethod.com/api/operator/inquiries/'+id+(action==='retry'?'/retry':''));}
});
test('production export rejects repeated cursors and hides error response bodies',async()=>{
 await assert.rejects(()=>productionOperator(['status'],{credentials,fetchImpl:async()=>Response.json({records:[record],next_cursor:id})}),/repeated export cursor/);
 await assert.rejects(()=>productionOperator(['status'],{credentials,fetchImpl:async()=>new Response('sensitive response',{status:503})}),error=>error.message.includes('503')&&!error.message.includes('sensitive response'));
});
