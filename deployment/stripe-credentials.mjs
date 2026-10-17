import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export function readStripeKey(mode){
 if(!['test','live'].includes(mode))throw Error('Choose test or live.');
 if(process.env.STRIPE_SECRET_KEY)return process.env.STRIPE_SECRET_KEY;
 const path=fileURLToPath(new URL(`../.runtime/credentials/stripe-${mode}.dpapi`,import.meta.url));
 try{return execFileSync('pwsh',['-NoProfile','-NonInteractive','-Command',"Add-Type -AssemblyName System.Security; $b=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($env:WM_STRIPE_CIPHER),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); try{[Console]::Write([Text.Encoding]::UTF8.GetString($b))}finally{[Array]::Clear($b,0,$b.Length)}"],{encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,WM_STRIPE_CIPHER:path}}).trim();}catch{throw Error('Stripe key unavailable. Use the private credential setup; never paste keys into chat or command arguments.');}
}
