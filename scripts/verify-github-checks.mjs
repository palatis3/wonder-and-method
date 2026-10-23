import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
export const requiredGithubJobs=['verify','visual','standards','cross-browser','performance','dependencies','links'];

export function verifyGithubRun(run,commit,jobs){
 assert.equal(run.head_sha,commit,'GitHub checks must match the exact release commit.');
 assert.equal(run.path,'.github/workflows/site-checks.yml','Unexpected verification workflow.');
 assert.equal(run.status,'completed','GitHub checks are still running.');
 assert.equal(run.conclusion,'success','GitHub verification did not pass.');
 for(const name of requiredGithubJobs){
  const matches=jobs.filter(job=>job.name===name);
  assert.equal(matches.length,1,`Missing or ambiguous required GitHub job: ${name}`);
  assert.equal(matches[0].status,'completed',`${name} is not complete.`);
  assert.equal(matches[0].conclusion,'success',`${name} must pass; skipped jobs do not qualify.`);
 }
 return {runId:run.id,commit,url:run.html_url,checks:requiredGithubJobs};
}
export function requireGithubChecks(root,commit){
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
 const remote=git('remote','get-url','origin'),repo=remote.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/)?.[1];
 assert.ok(repo,'A GitHub origin is required for release checks.');
 const api=path=>JSON.parse(execFileSync('gh',['api',path],{cwd:root,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
 const runs=api(`repos/${repo}/actions/runs?head_sha=${commit}&per_page=100`).workflow_runs.filter(run=>run.path==='.github/workflows/site-checks.yml').sort((a,b)=>b.id-a.id);
 assert.ok(runs.length,'No GitHub verification run exists for this exact commit. Push and wait for checks before deploying.');
 const run=runs[0],jobs=api(`repos/${repo}/actions/runs/${run.id}/jobs?filter=latest&per_page=100`).jobs;
 return verifyGithubRun(run,commit,jobs);
}
