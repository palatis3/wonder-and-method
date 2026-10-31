import test from 'node:test';
import assert from 'node:assert/strict';
import {sealSession,readSession,sessionCookie,requireCsrf,handleAuth} from '../../worker/workspace/auth/session.mjs';
import {requireOrigin,body,errorResponse} from '../../worker/workspace/http.mjs';
import {handleRequest} from '../../worker/workspace/index.mjs';
const env={APP_ORIGIN:'https://app.synthetic.example',SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_PUBLISHABLE_KEY:'synthetic-public-key',SESSION_KEY:Buffer.alloc(32,7).toString('base64url')};

test('failed server revocation cannot report a completed sign-out',async(t)=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json({error:'unavailable'},{status:503}));
 const request=new Request(env.APP_ORIGIN+'/api/auth/logout',{method:'POST',headers:{origin:env.APP_ORIGIN,'content-type':'application/json','x-csrf-token':'synthetic-csrf'},body:'{}'});
 await assert.rejects(handleAuth(request,{...env,LOCAL_TEST_MODE:'true'},{access_token:'synthetic',csrf:'synthetic-csrf'}),/Sign-out could not be confirmed/);
});

test('session cookies are encrypted, host-only, and bound to the exact private origin',async()=>{
 const session={access_token:'synthetic-secret-access',refresh_token:'synthetic-secret-refresh',csrf:'synthetic-csrf',exp:Math.floor(Date.now()/1000)+60};
 const cookie=await sessionCookie(session,env);assert.ok(cookie.includes('__Host-'));assert.ok(cookie.includes('Secure; HttpOnly; SameSite=Strict'));assert.ok(!cookie.includes('Domain='));assert.ok(!cookie.includes('synthetic-secret'));
 const request=new Request(env.APP_ORIGIN,{headers:{cookie}});assert.deepEqual(await readSession(request,env),session);
 assert.equal(await readSession(request,{...env,APP_ORIGIN:'https://staging.synthetic.example'}),null);
 const bad=new Request(env.APP_ORIGIN,{headers:{cookie:cookie.replace('v1.','v2.')}});assert.equal(await readSession(bad,env),null);
 assert.equal(await readSession(new Request(env.APP_ORIGIN,{headers:{cookie:`${cookie}; ${cookie}`}}),env),null);
 const expired=await sealSession({...session,exp:1},env);assert.equal(await readSession(new Request(env.APP_ORIGIN,{headers:{cookie:`__Host-wm_session=${expired}`}}),env),null);
});
test('same-site marketing origin cannot mutate the private workspace and missing CSRF is rejected',()=>{
 const request=origin=>new Request(env.APP_ORIGIN+'/api/command',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'});
 assert.doesNotThrow(()=>requireOrigin(request(env.APP_ORIGIN),env));
 assert.throws(()=>requireOrigin(request('https://www.synthetic.example'),env),/workspace/);
 assert.throws(()=>requireOrigin(request('null'),env),/workspace/);
 assert.throws(()=>requireCsrf(request(env.APP_ORIGIN),{csrf:'real-csrf'}),/Reload/);
});
test('oversize bodies and unexpected hosts fail before private data or asset fallback',async()=>{
 await assert.rejects(body(new Request(env.APP_ORIGIN,{method:'POST',headers:{'content-type':'application/json'},body:'{"large":"'+'.'.repeat(200)+'"}'}),50),/too large/);
 const r=await handleRequest(new Request('https://www.synthetic.example/api/workspace'),env);assert.equal(r.status,421);assert.equal(r.headers.get('access-control-allow-origin'),null);
 const privateResponse=await handleRequest(new Request(env.APP_ORIGIN+'/api/not-a-route'),env);assert.equal(privateResponse.status,401);assert.ok(privateResponse.headers.get('content-security-policy').includes("frame-ancestors 'none'"));assert.equal(privateResponse.headers.get('cache-control'),'no-store, private');
 const error=errorResponse(new Error('SECRET_DATABASE_PASSWORD'),crypto.randomUUID());assert.ok(!(await error.text()).includes('SECRET_DATABASE_PASSWORD'));
});

test('the production Worker serves every entry module imported by the workspace interface',async()=>{
 const {readFile}=await import('node:fs/promises');const app=await readFile(new URL('../../src/workspace/app.mjs',import.meta.url),'utf8');
 const modules=[...app.matchAll(/from ['"]\.\/([^'"]+)['"]/g)].map(m=>m[1]);
 for(const module of modules){const response=await handleRequest(new Request(env.APP_ORIGIN+'/'+module),{...env,ASSETS:{fetch:async()=>new Response('synthetic module')}});assert.equal(response.status,200,module);}
});
test('authenticated intake actions work without a business and retain exact Origin and CSRF checks',async(t)=>{
 const user='20000000-0000-4000-8000-000000000005',exp=Math.floor(Date.now()/1000)+3600,claims={sub:user,iss:env.SUPABASE_URL+'/auth/v1',role:'authenticated',exp,aal:'aal2'};
 const token=Buffer.from('{"alg":"synthetic-only"}').toString('base64url')+'.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.synthetic';
 const cookie=await sessionCookie({access_token:token,csrf:'synthetic-csrf',exp},env),calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  if(String(url).endsWith('/auth/v1/user'))return Response.json({id:user,email:'intake@synthetic.example'});
  const name=String(url).split('/').at(-1);calls.push({name,args:JSON.parse(options.body)});
  if(name==='wm_session_check')return Response.json({active:true});
  if(name==='wm_intake_command')return Response.json({id:'40000000-0000-4000-8000-000000000001',version:2});throw Error('Unexpected request');
 });
 const input={command:'intake.assign',input:{id:'40000000-0000-4000-8000-000000000001',expected_version:1,assignee_id:user,reason:'Explicit reviewed assignee'}};
 const req=(origin=env.APP_ORIGIN,csrf='synthetic-csrf')=>new Request(env.APP_ORIGIN+'/api/command',{method:'POST',headers:{cookie,origin,'content-type':'application/json','x-csrf-token':csrf,'idempotency-key':crypto.randomUUID()},body:JSON.stringify(input)});
 assert.equal((await handleRequest(req(),env)).status,200);assert.equal(calls.filter(c=>c.name==='wm_intake_command').length,1);assert.equal(calls.at(-1).args.p_command,'intake.assign');
 assert.equal((await handleRequest(req('https://www.synthetic.example'),env)).status,403);assert.equal((await handleRequest(req(env.APP_ORIGIN,'wrong'),env)).status,403);assert.equal(calls.filter(c=>c.name==='wm_intake_command').length,1);
});
