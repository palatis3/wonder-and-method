import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
// Internal subprocess pipe only. This module has no CLI and never prints decrypted values.
// Initial secrets were generated once and stored as DPAPI CurrentUser ciphertext.
export function readStagingCredentials() {
  const path=fileURLToPath(new URL('../.runtime/credentials/cloudflare-staging.dpapi',import.meta.url));
  const command="$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; $p=[Environment]::GetEnvironmentVariable('WM_STAGING_CIPHER'); $b=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($p),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Write([Text.Encoding]::UTF8.GetString($b))";
  return JSON.parse(execFileSync('pwsh',['-NoProfile','-Command',command],{encoding:'utf8',env:{...process.env,WM_STAGING_CIPHER:path},stdio:['ignore','pipe','pipe']}));
}
