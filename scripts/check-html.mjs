import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {filesUnder} from './ci-files.mjs';
const require=createRequire(import.meta.url),root=resolve(import.meta.dirname,'..'),output=resolve(root,'output/ci/html');
await mkdir(output,{recursive:true});
const files=(await filesUnder(resolve(root,'dist'))).filter(file=>file.endsWith('.html'));
if(!files.length)throw Error('Build the site before validating HTML.');
const {resolveJava}=require('vnu-jar/vnu-java-downloader.js'),java=await resolveJava();
const result=spawnSync(java,['-Xmx1g','-jar',String(require('vnu-jar')),'--format','json','--skip-non-html',resolve(root,'dist')],{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024,timeout:600_000,windowsHide:true});
await writeFile(resolve(output,'validator.json'),result.stderr||result.stdout||'');
if(result.error)throw result.error;
let report;try{report=JSON.parse(result.stderr||result.stdout);}catch{throw Error('HTML validator did not produce a valid JSON report. See output/ci/html/validator.json.');}
const errors=report.messages.filter(message=>message.type==='error'),warnings=report.messages.filter(message=>message.type!=='error');
const groups=new Map();for(const message of errors){const group=groups.get(message.message)||{message:message.message,count:0,example:message.url,line:message.lastLine};group.count++;groups.set(message.message,group);}
await writeFile(resolve(output,'summary.json'),JSON.stringify({schemaVersion:1,checkedAt:new Date().toISOString(),validator:require('vnu-jar/package.json').version,files:files.length,errors:errors.length,warnings:warnings.length,groups:[...groups.values()]},null,2)+'\n');
console.log(`Nu HTML validation: ${files.length} documents, ${errors.length} errors, ${warnings.length} warnings.`);
for(const group of [...groups.values()].slice(0,20))console.error(`${group.count} × ${group.message} (${group.example}:${group.line})`);
if(result.status!==0||errors.length)throw Error('Generated HTML did not pass Nu validation.');
