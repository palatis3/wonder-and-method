import {spawnSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),output=resolve(root,'output/ci/dependencies');
await mkdir(output,{recursive:true});
// npm run supplies the exact npm CLI used for this checkout. No shell or
// user-controlled command interpolation is needed, including on Windows.
if(!process.env.npm_execpath)throw Error('Run this check through npm run check:dependencies.');
let failed=false;
for(const [name,cwd] of [['site',root],['deployment',resolve(root,'deployment')]]){
 const result=spawnSync(process.execPath,[process.env.npm_execpath,'audit','--json','--audit-level=high'],{cwd,encoding:'utf8',maxBuffer:16*1024*1024,timeout:120_000,windowsHide:true});
 await writeFile(resolve(output,name+'.json'),result.stdout||'{}');
 if(result.error)throw result.error;
 const report=JSON.parse(result.stdout||'{}');
 if(report.error||!report.metadata?.vulnerabilities)throw Error(`Dependency audit unavailable for ${name}; see the retained report.`);
 console.log(name+': '+JSON.stringify(report.metadata.vulnerabilities));
 if(result.status!==0)failed=true;
}
if(failed)throw Error('High or critical dependency vulnerabilities require review. All severity levels are retained in the reports.');
