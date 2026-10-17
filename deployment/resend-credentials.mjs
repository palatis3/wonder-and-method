import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const cipherPath=fileURLToPath(new URL('../.runtime/credentials/resend-notifications.dpapi',import.meta.url));
const run=(command,input)=>{
  try {
    return execFileSync('pwsh',['-NoProfile','-NonInteractive','-Command',command],{
      input,encoding:'utf8',stdio:['pipe','pipe','pipe'],
      env:{...process.env,WM_RESEND_CIPHER:cipherPath}
    });
  } catch { throw new Error('Resend credential storage operation failed; inspect file availability without printing credentials.'); }
};

// Internal library only: no CLI and no secret-valued logs. The key travels through
// a child-process pipe, never a command argument, environment variable or plaintext file.
export function storeResendKey(key){
  if(typeof key!=='string'||!/^re_[A-Za-z0-9_-]{16,256}$/.test(key))throw new Error('Invalid Resend key format.');
  run("$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; $p=[Environment]::GetEnvironmentVariable('WM_RESEND_CIPHER'); [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($p)) | Out-Null; $s=[Console]::In.ReadToEnd(); $b=[Text.Encoding]::UTF8.GetBytes($s); $c=[Security.Cryptography.ProtectedData]::Protect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); $f=[IO.File]::Open($p,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None); try { $f.Write($c,0,$c.Length) } finally { $f.Dispose(); [Array]::Clear($b,0,$b.Length) }",key);
  if(readResendKey()!==key)throw new Error('Encrypted credential round-trip verification failed.');
  return {stored:true,storage:'Windows DPAPI CurrentUser',path:'.runtime/credentials/resend-notifications.dpapi'};
}

export function readResendKey(){
  const key=run("$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; $p=[Environment]::GetEnvironmentVariable('WM_RESEND_CIPHER'); $b=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($p),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); try { [Console]::Write([Text.Encoding]::UTF8.GetString($b)) } finally { [Array]::Clear($b,0,$b.Length) }");
  if(!/^re_[A-Za-z0-9_-]{16,256}$/.test(key))throw new Error('Stored Resend key format is invalid.');
  return key;
}
