import {decodeJwt} from 'jose';
import {WorkspaceError,allowedReturnPath} from '../../../src/workspace/domain/contracts.mjs';
import {body,config,json,limited,providerFetch,requireOrigin} from '../http.mjs';
import {rpc} from '../database.mjs';
const COOKIE='__Host-wm_session';
const encoder=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const unb64=text=>Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
export function randomToken(){return b64(crypto.getRandomValues(new Uint8Array(24)));}
async function key(env){
  let raw;try{raw=unb64(env.SESSION_KEY||'');}catch{}
  if(raw?.length!==32)throw new WorkspaceError('not_configured','Sign-in is temporarily unavailable.',503);
  return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);
}
export async function sealSession(value,env){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(config(env).origin)},await key(env),encoder.encode(JSON.stringify(value)));
  return `v1.${b64(iv)}.${b64(new Uint8Array(encrypted))}`;
}
export async function readSession(request,env){
  const cookies=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(COOKIE+'='));
  if(cookies.length!==1)return null;const value=cookies[0].slice(COOKIE.length+1);
  if(value.length>3800)return null;
  try{
    const [version,iv,cipher,...extra]=value.split('.');if(version!=='v1'||extra.length)return null;
    const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv),additionalData:encoder.encode(config(env).origin)},await key(env),unb64(cipher));
    const session=JSON.parse(new TextDecoder().decode(decrypted));
    if(!Number.isSafeInteger(session.exp)||session.exp<=Date.now()/1000||typeof session.csrf!=='string')return null;
    return session;
  }catch{return null;}
}
export async function sessionCookie(session,env){const value=await sealSession(session,env);if(value.length>3800)throw new WorkspaceError('session_size','Sign-in could not be saved.',503);return `${COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${Math.max(0,Math.floor(session.exp-Date.now()/1000))}`;}
export const clearSessionCookie=()=>`${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`;
export function requireCsrf(request,session){if(!session||!session.csrf||request.headers.get('x-csrf-token')!==session.csrf)throw new WorkspaceError('invalid_csrf','Reload this page before continuing.',403);}
export async function authRequest(env,path,{token,method='POST',data,fetcher=fetch}={}){
  const response=await providerFetch(`${config(env).supabase}/auth/v1/${path}`,{method,headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(data?{body:JSON.stringify(data)}:{})},fetcher);
  const result=await response.json().catch(()=>({}));return {ok:response.ok,status:response.status,result};
}
export async function identity(session,env,fetcher=fetch){
  if(!session?.access_token)throw new WorkspaceError('sign_in','Sign in to continue.',401);
  const {ok,result}=await authRequest(env,'user',{method:'GET',token:session.access_token,fetcher});
  if(!ok||!result.id)throw new WorkspaceError('sign_in','Sign in again to continue.',401);
  // Decode only AFTER the Auth service has validated this exact bearer token.
  let claims;try{claims=decodeJwt(session.access_token);}catch{throw new WorkspaceError('sign_in','Sign in again to continue.',401);}
  if(claims.sub!==result.id||claims.iss!==`${config(env).supabase}/auth/v1`||claims.role!=='authenticated'||claims.exp<=Date.now()/1000)throw new WorkspaceError('sign_in','Sign in again to continue.',401);
  await rpc(env,session.access_token,'wm_session_check',{},fetcher);
  return {id:result.id,email:result.email,aal:claims.aal||'aal1',factors:(result.factors||[]).filter(x=>x.status==='verified').map(x=>({id:x.id,type:x.factor_type,name:x.friendly_name}))};
}
function validEmail(value){if(typeof value!=='string'||value.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(value))throw new WorkspaceError('email','Enter your email address.');return value.trim().toLowerCase();}
async function sessionFromTokens(tokens,previous,env){
  if(!tokens.access_token||!tokens.refresh_token)throw new WorkspaceError('sign_in','Sign-in could not be completed.',401);
  const session={access_token:tokens.access_token,refresh_token:tokens.refresh_token,csrf:randomToken(),exp:Math.floor(Date.now()/1000)+43200,return_path:allowedReturnPath(previous?.return_path)};
  await identity(session,env);return session;
}
export async function handleAuth(request,env,session){
  const path=new URL(request.url).pathname;
  if(request.method==='GET'&&path==='/api/session'){
    if(session?.access_token){
      try{const user=await identity(session,env);return json({user,csrf:session.csrf,return_path:session.return_path});}
      catch(error){
        if(error.status!==401)throw error;
        // Preserve the CSRF token so the same-origin client can refresh or sign in.
        return json({user:null,csrf:session.csrf,refresh_available:Boolean(session.refresh_token),return_path:session.return_path});
      }
    }
    const fresh={csrf:randomToken(),exp:Math.floor(Date.now()/1000)+1800};return json({user:null,csrf:fresh.csrf},200,{'Set-Cookie':await sessionCookie(fresh,env)});
  }
  if(!path.startsWith('/api/auth/'))return null;
  if(request.method!=='POST')return json({error:{message:'Use POST for this action.'}},405);
  requireOrigin(request,env);requireCsrf(request,session);
  await limited(env,`auth:${request.headers.get('cf-connecting-ip')||'unknown'}`);
  const input=await body(request,8192);
  if(path==='/api/auth/start'){
    const email=validEmail(input.email);await limited(env,`email:${await crypto.subtle.digest('SHA-256',encoder.encode(email)).then(x=>b64(new Uint8Array(x)))}`);
    const r=await authRequest(env,'otp',{data:{email,create_user:false}});
    if(r.status>=500)throw new WorkspaceError('sign_in_unavailable','Email sign-in is temporarily unavailable.',503);
    const fresh={csrf:randomToken(),email,return_path:allowedReturnPath(input.return_path),exp:Math.floor(Date.now()/1000)+1800};
    return json({message:'If this address has workspace access, a sign-in code is on its way.',csrf:fresh.csrf},200,{'Set-Cookie':await sessionCookie(fresh,env)});
  }
  if(path==='/api/auth/verify'){
    if(!session.email||!/^\d{6,10}$/.test(input.code||''))throw new WorkspaceError('invalid_code','Enter the code from your email.');
    const r=await authRequest(env,'verify',{data:{email:session.email,token:input.code,type:'email'}});
    if(!r.ok)throw new WorkspaceError('invalid_code','That code is invalid or expired. Request a new one.',401);
    const fresh=await sessionFromTokens(r.result,session,env);return json({csrf:fresh.csrf,return_path:fresh.return_path},200,{'Set-Cookie':await sessionCookie(fresh,env)});
  }
  if(path==='/api/auth/refresh'){
    if(!session.refresh_token)throw new WorkspaceError('sign_in','Sign in to continue.',401);
    const r=await authRequest(env,'token?grant_type=refresh_token',{data:{refresh_token:session.refresh_token}});
    if(!r.ok)throw new WorkspaceError('sign_in','Sign in again to continue.',401);
    const fresh=await sessionFromTokens(r.result,session,env);return json({csrf:fresh.csrf},200,{'Set-Cookie':await sessionCookie(fresh,env)});
  }
  if(path==='/api/auth/logout'){
    if(session.access_token){
      let r=await authRequest(env,'logout?scope=local',{token:session.access_token});
      if(r.status===401&&session.refresh_token){
        const refreshed=await authRequest(env,'token?grant_type=refresh_token',{data:{refresh_token:session.refresh_token}});
        if(refreshed.ok)r=await authRequest(env,'logout?scope=local',{token:refreshed.result.access_token});
      }
      if(!r.ok)throw new WorkspaceError('logout_unconfirmed','Sign-out could not be confirmed. Please try again.',503);
    }
    return json({signed_out:true},200,{'Set-Cookie':clearSessionCookie()});
  }
  const user=await identity(session,env);
  if(path==='/api/auth/mfa/enroll'){
    const r=await authRequest(env,'factors',{token:session.access_token,data:{factor_type:'totp',friendly_name:'Wonder and Method workspace'}});
    if(!r.ok)throw new WorkspaceError('mfa','Authenticator setup could not start.',400);
    return json({factor_id:r.result.id,secret:r.result.totp?.secret,uri:r.result.totp?.uri});
  }
  if(path==='/api/auth/mfa/verify'){
    if(!/^[a-f0-9-]{36}$/i.test(input.factor_id||'')||!/^\d{6}$/.test(input.code||''))throw new WorkspaceError('mfa','Enter the six-digit authenticator code.');
    const c=await authRequest(env,`factors/${input.factor_id}/challenge`,{token:session.access_token,data:{}});
    if(!c.ok)throw new WorkspaceError('mfa','Authenticator challenge could not start.');
    const r=await authRequest(env,`factors/${input.factor_id}/verify`,{token:session.access_token,data:{challenge_id:c.result.id,code:input.code}});
    if(!r.ok)throw new WorkspaceError('mfa','That authenticator code did not work.');
    const fresh=await sessionFromTokens({...r.result,refresh_token:r.result.refresh_token||session.refresh_token},session,env);
    return json({csrf:fresh.csrf,user_id:user.id},200,{'Set-Cookie':await sessionCookie(fresh,env)});
  }
  return json({error:{message:'This sign-in action does not exist.'}},404);
}
