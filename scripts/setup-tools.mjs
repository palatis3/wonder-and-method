// Explicit install of the pinned scanner; no test bypass or global install.
import {mkdir,writeFile,chmod,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const version='8.30.1';
const builds={
 'win32-x64':['windows_x64.zip','d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e'],
 'linux-x64':['linux_x64.tar.gz','551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb'],
 'darwin-arm64':['darwin_arm64.tar.gz','b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5'],
 'darwin-x64':['darwin_x64.tar.gz','dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709']
};
const build=builds[`${process.platform}-${process.arch}`];
if(!build)throw Error('No pinned scanner for this platform. Install Gitleaks 8.30+ and set GITLEAKS_BIN.');
const root=resolve(import.meta.dirname,'..'),dir=join(root,'.runtime/tools/gitleaks'),bin=join(dir,'bin');
await mkdir(bin,{recursive:true});
const response=await fetch(`https://github.com/gitleaks/gitleaks/releases/download/v${version}/gitleaks_${version}_${build[0]}`,{signal:AbortSignal.timeout(60000)});
if(!response.ok)throw Error(`Scanner download failed: ${response.status}`);
const bytes=Buffer.from(await response.arrayBuffer());
if(createHash('sha256').update(bytes).digest('hex')!==build[1])throw Error('Scanner checksum mismatch; nothing executed.');
const archive=join(dir,build[0]);await writeFile(archive,bytes);
if(process.platform==='win32'){
 const literal=value=>"'"+value.replaceAll("'","''")+"'";
 execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Expand-Archive -LiteralPath ${literal(archive)} -DestinationPath ${literal(bin)} -Force`],{windowsHide:true});
}else{execFileSync('tar',['-xzf',archive,'-C',bin,'gitleaks']);await chmod(join(bin,'gitleaks'),0o755);}
await rm(archive);
console.log(`Installed Gitleaks ${version} at ${bin}. Python 3.9+ is also required for handoff verification.`);
