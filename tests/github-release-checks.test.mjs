import test from 'node:test';import assert from 'node:assert/strict';
import {verifyGithubRun,requiredGithubJobs} from '../scripts/verify-github-checks.mjs';
const run={id:17,path:'.github/workflows/site-checks.yml',head_sha:'release',status:'completed',conclusion:'success',html_url:'https://github.com/example/run/17'};
const jobs=requiredGithubJobs.map(name=>({name,status:'completed',conclusion:'success'}));
test('release requires every quality job on its exact commit',()=>{
 assert.equal(verifyGithubRun(run,'release',jobs).runId,17);
 assert.throws(()=>verifyGithubRun(run,'different',jobs),/exact release commit/);
 assert.throws(()=>verifyGithubRun({...run,status:'in_progress'},'release',jobs),/still running/);
 assert.throws(()=>verifyGithubRun({...run,conclusion:'cancelled'},'release',jobs),/did not pass/);
 assert.throws(()=>verifyGithubRun(run,'release',jobs.slice(0,1)),/Missing/);
 assert.throws(()=>verifyGithubRun(run,'release',[jobs[0],{...jobs[1],conclusion:'skipped'}]),/must pass/);
 assert.throws(()=>verifyGithubRun({...run,path:'.github/workflows/capture.yml'},'release',jobs),/Unexpected/);
 for(const job of jobs){
  assert.throws(()=>verifyGithubRun(run,'release',jobs.filter(row=>row.name!==job.name)),/Missing/);
  assert.throws(()=>verifyGithubRun(run,'release',jobs.map(row=>row.name===job.name?{...row,conclusion:'skipped'}:row)),/must pass/);
 }
});
