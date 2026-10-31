import {WorkspaceError} from '../../src/workspace/domain/contracts.mjs';
export const PRIVATE_HEADERS=Object.freeze({
  'Cache-Control':'no-store, private','Pragma':'no-cache','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY','Cross-Origin-Resource-Policy':'same-origin','Cross-Origin-Opener-Policy':'same-origin',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self' https://billing.stripe.com",
  'Strict-Transport-Security':'max-age=31536000',
});
export function secure(response){const headers=new Headers(response.headers);for(const [k,v] of Object.entries(PRIVATE_HEADERS))headers.set(k,v);headers.delete('Access-Control-Allow-Origin');headers.delete('Access-Control-Allow-Credentials');return new Response(response.body,{status:response.status,headers});}
export function json(data,status=200,headers={}){return secure(new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...headers}}));}
export function config(env){
  let origin,supabase;try{origin=new URL(env.APP_ORIGIN);supabase=new URL(env.SUPABASE_URL);}catch{throw new WorkspaceError('not_configured','The workspace is being configured.',503);}
  if(origin.origin!==env.APP_ORIGIN||origin.protocol!=='https:'||supabase.protocol!=='https:'||!supabase.hostname.endsWith('.supabase.co')||!env.SUPABASE_PUBLISHABLE_KEY)throw new WorkspaceError('not_configured','The workspace is being configured.',503);
  return {origin:origin.origin,supabase:supabase.origin};
}
export async function body(request,maxBytes=131072){
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new WorkspaceError('invalid_body','Send a JSON request.',415);
  if(Number(request.headers.get('content-length'))>maxBytes)throw new WorkspaceError('too_large','This request is too large.',413);
  const reader=request.body?.getReader();if(!reader)throw new WorkspaceError('invalid_body','This request is empty.');
  let length=0,chunks=[];for(;;){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>maxBytes){await reader.cancel();throw new WorkspaceError('too_large','This request is too large.',413);}chunks.push(value);}
  const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
  let result;try{result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new WorkspaceError('invalid_body','This request could not be read.');}
  if(!result||typeof result!=='object'||Array.isArray(result))throw new WorkspaceError('invalid_body','Send a JSON object.');return result;
}
export function requireOrigin(request,env){
  const origin=config(env).origin;
  if(new URL(request.url).origin!==origin||request.headers.get('origin')!==origin||['cross-site','same-site'].includes(request.headers.get('sec-fetch-site')))throw new WorkspaceError('invalid_origin','Open this action from the workspace.',403);
}
export async function limited(env,key){
  if(!env.AUTH_LIMITER){if(env.LOCAL_TEST_MODE==='true')return;throw new WorkspaceError('not_configured','Sign-in is temporarily unavailable.',503);}
  const {success}=await env.AUTH_LIMITER.limit({key});if(!success)throw new WorkspaceError('rate_limited','Please wait a minute before trying again.',429);
}
export async function providerFetch(url,options={},fetcher=fetch){
  try{return await fetcher(url,{...options,redirect:'error',signal:AbortSignal.timeout(20000)});}catch{throw new WorkspaceError('provider_unavailable','The connected service did not respond. Please try again.',503);}
}
export function errorResponse(error,correlationId){
  if(error instanceof WorkspaceError)return json({error:{code:error.code,message:error.message,fields:error.fields},correlation_id:correlationId},error.status);
  // Never expose SQL, provider response bodies, JWTs, or exception stacks.
  return json({error:{code:'unavailable',message:'This action could not be completed. Please try again.'},correlation_id:correlationId},500);
}
