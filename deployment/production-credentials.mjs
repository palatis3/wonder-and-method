import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const cipher=fileURLToPath(new URL('../.runtime/credentials/cloudflare-production.dpapi',import.meta.url));
function run(command,input){try{return execFileSync('pwsh',['-NoProfile','-NonInteractive','-Command',command],{input,encoding:'utf8',stdio:['pipe','pipe','pipe'],env:{...process.env,WM_PRODUCTION_CIPHER:cipher}});}catch{throw Error('Production credential operation failed; do not print credential material.');}}
export function prepareProductionCredentials(){
 if(existsSync(cipher))return {created:false,names:Object.keys(readProductionCredentials())};
 const values={OPERATOR_TOKEN:randomBytes(48).toString('base64url'),FINGERPRINT_SECRET:randomBytes(48).toString('base64url')};
 run("$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; $p=[Environment]::GetEnvironmentVariable('WM_PRODUCTION_CIPHER'); [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($p)) | Out-Null; $b=[Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd()); $c=[Security.Cryptography.ProtectedData]::Protect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); $f=[IO.File]::Open($p,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None); try{$f.Write($c,0,$c.Length)}finally{$f.Dispose();[Array]::Clear($b,0,$b.Length)}",JSON.stringify(values));
 const restored=readProductionCredentials();for(const key of Object.keys(values))if(values[key]!==restored[key])throw Error('Encrypted production credential verification failed.');
 return {created:true,names:Object.keys(values),storage:'Windows DPAPI CurrentUser'};
}
export function readProductionCredentials(){
 const values=JSON.parse(run("$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; $p=[Environment]::GetEnvironmentVariable('WM_PRODUCTION_CIPHER'); $b=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($p),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); try{[Console]::Write([Text.Encoding]::UTF8.GetString($b))}finally{[Array]::Clear($b,0,$b.Length)}"));
 for(const key of ['OPERATOR_TOKEN','FINGERPRINT_SECRET'])if(!/^[A-Za-z0-9_-]{64}$/.test(values[key]||''))throw Error('Invalid stored production credential.');
 return values;
}
