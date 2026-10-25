import {relative,resolve} from 'node:path';
import {saveJson} from './ci-contract.mjs';

// Explicit leaf identities are also accepted by Playwright --test-list.
// Line numbers are deliberately absent: Playwright ignores them in test lists.
export function testIdentity(test,root,listRoot=root){
 const project=test.parent.project().name;
 const file=relative(root,test.location.file).replaceAll('\\','/');
 const titles=test.titlePath().slice(3);
 if(!titles.length||titles.some(title=>/[\r\n›>]/.test(title)))throw Error('Unsupported or ambiguous test-list title');
 const listFile=relative(listRoot,test.location.file).replaceAll('\\','/');
 return {identity:`[${project}] › ${file} › ${titles.join(' › ')}`,listEntry:`[${project}] › ${listFile} › ${titles.join(' › ')}`,file,project,titles};
}
export default class CiBrowserReporter{
 constructor(){this.results=[];this.errors=[];}
 onBegin(config,suite){this.root=process.cwd();this.listRoot=config.rootDir;this.startedAt=new Date().toISOString();this.inventory=suite.allTests().map(test=>testIdentity(test,this.root,this.listRoot));}
 onTestEnd(test,result){this.results.push({...testIdentity(test,this.root),status:result.status,retry:result.retry,duration:result.duration,errors:result.errors.map(error=>error.message||String(error)),annotations:test.annotations.map(({type,description})=>({type,description:description||''}))});}
 onError(error){this.errors.push(error.message||String(error));}
 async onEnd(result){
  const file=process.env.WM_CI_REPORT;if(!file)throw Error('WM_CI_REPORT is required for the CI reporter');
  await saveJson(resolve(file),{schemaVersion:1,mode:process.env.WM_CI_DISCOVERY==='1'?'list':'run',status:result.status,startedAt:this.startedAt,finishedAt:new Date().toISOString(),inventory:this.inventory||[],results:this.results,errors:this.errors});
 }
}
