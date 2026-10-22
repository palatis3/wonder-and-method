import test from 'node:test';import assert from 'node:assert/strict';
import {verifyGithubRun} from '../scripts/verify-github-checks.mjs';
const run={id:17,path:'.github/workflows/site-checks.yml',head_sha:'release',status:'completed',conclusion:'success',html_url:'https://github.com/example/run/17'};
const jobs=['verify','visual'].map(name=>({name,status:'completed',conclusion:'success'}));
test('release requires successful technical and visual CI on its exact commit',()=>{
 assert.equal(verifyGithubRun(run,'release',jobs).runId,17);
 assert.throws(()=>verifyGithubRun(run,'different',jobs),/exact release commit/);
 assert.throws(()=>verifyGithubRun({...run,status:'in_progress'},'release',jobs),/still running/);
 assert.throws(()=>verifyGithubRun({...run,conclusion:'cancelled'},'release',jobs),/did not pass/);
 assert.throws(()=>verifyGithubRun(run,'release',jobs.slice(0,1)),/Missing/);
 assert.throws(()=>verifyGithubRun(run,'release',[jobs[0],{...jobs[1],conclusion:'skipped'}]),/must pass/);
 assert.throws(()=>verifyGithubRun({...run,path:'.github/workflows/capture.yml'},'release',jobs),/Unexpected/);
});
