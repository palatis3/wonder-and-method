import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePerformanceConfig,summarizePerformanceRuns} from '../scripts/performance-contract.mjs';

const config={runs:3,paths:['/','/contact/'],budgets:{'largest-contentful-paint':2500,'cumulative-layout-shift':0.1,'total-blocking-time':200},minimumPerformanceScore:0.9};
const run={metrics:{'largest-contentful-paint':2000,'cumulative-layout-shift':0.01,'total-blocking-time':0},score:0.95};
test('performance gate rejects empty, incomplete and invalid configurations before measuring',()=>{
 assert.equal(validatePerformanceConfig(config),config);
 for(const patch of [{runs:0},{runs:2},{runs:3.5},{paths:[]},{paths:['/','/']},{paths:['//outside.example/']},{paths:['/\\outside.example/']},{paths:['https://outside.example/']},{paths:['/contact/?external=1']},{budgets:{}},{budgets:{...config.budgets,'total-blocking-time':Infinity}},{budgets:{...config.budgets,'total-blocking-time':-1}},{minimumPerformanceScore:NaN},{minimumPerformanceScore:1.1}])assert.throws(()=>validatePerformanceConfig({...config,...patch}));
});
test('performance gate rejects missing and nonfinite measurements and computes medians',()=>{
 const runs=[structuredClone(run),structuredClone(run),structuredClone(run)];
 runs[0].metrics['largest-contentful-paint']=1800;runs[2].metrics['largest-contentful-paint']=2400;
 assert.deepEqual(summarizePerformanceRuns(runs,config),run);
 assert.throws(()=>summarizePerformanceRuns([],config));
 assert.throws(()=>summarizePerformanceRuns(runs.slice(1),config));
 for(const score of [null,undefined,NaN,Infinity,-1,1.01])assert.throws(()=>summarizePerformanceRuns([{...run,score},run,run],config));
 for(const value of [null,undefined,NaN,Infinity,-1])assert.throws(()=>summarizePerformanceRuns([{...run,metrics:{...run.metrics,'largest-contentful-paint':value}},run,run],config));
});
