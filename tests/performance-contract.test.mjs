import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePerformanceConfig,summarizePerformanceRuns,performanceFailures,layoutShiftScore} from '../scripts/performance-contract.mjs';

const config={runs:3,profiles:['mobile','desktop'],paths:['/','/contact/'],budgets:{'first-contentful-paint':1800,'largest-contentful-paint':2500,'cumulative-layout-shift':0.1,'total-blocking-time':200,'speed-index':3400},minimumPerformanceScore:0.9};
const run={metrics:{'first-contentful-paint':1200,'largest-contentful-paint':2000,'cumulative-layout-shift':0.01,'total-blocking-time':0,'speed-index':1500},score:0.95};
test('performance gate rejects empty, incomplete and invalid configurations before measuring',()=>{
 assert.equal(validatePerformanceConfig(config),config);
 for(const patch of [{runs:0},{runs:2},{runs:3.5},{paths:[]},{paths:['/','/']},{paths:['//outside.example/']},{paths:['/\\outside.example/']},{paths:['https://outside.example/']},{paths:['/contact/?external=1']},{budgets:{}},{budgets:{...config.budgets,'total-blocking-time':Infinity}},{budgets:{...config.budgets,'total-blocking-time':-1}},{minimumPerformanceScore:NaN},{minimumPerformanceScore:1.1}])assert.throws(()=>validatePerformanceConfig({...config,...patch}));
});

test('every metric fails independently and an intermittent layout shift cannot hide behind the median',()=>{
 assert.equal(performanceFailures([run,run,run],config).failures.length,0);
 for(const [metric,limit] of Object.entries(config.budgets)){
  const bad={...run,metrics:{...run.metrics,[metric]:limit+1}};
  assert.deepEqual(performanceFailures([bad,bad,run],config).failures.map(f=>f.metric),[metric]);
 }
 const shifted={...run,metrics:{...run.metrics,'cumulative-layout-shift':0.267}};
 assert.equal(performanceFailures([run,run,shifted],config).failures[0].actual,0.267);
 assert.equal(performanceFailures([run,{...run,score:0.8},{...run,score:0.8}],config).failures[0].metric,'performance-score');
 assert.throws(()=>validatePerformanceConfig({...config,profiles:['mobile']}));
});

test('CLS uses the largest session window and excludes recent user input',()=>{
 assert.equal(layoutShiftScore([{value:0.05,startTime:100},{value:0.08,startTime:999},{value:0.2,startTime:2000},{value:1,startTime:2100,hadRecentInput:true}]),0.2);
 assert.equal(layoutShiftScore(Array.from({length:8},(_,i)=>({value:0.1,startTime:100+i*900}))),0.6);
 assert.ok(layoutShiftScore(Array.from({length:6},(_,i)=>({value:0.02,startTime:900+i*900})))>0.1,'The first window starts at the first shift, not navigation time');
 assert.equal(layoutShiftScore([]),0);
 assert.throws(()=>layoutShiftScore([{value:NaN,startTime:100}]));
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
