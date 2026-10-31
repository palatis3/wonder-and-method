import {WorkspaceError} from '../../src/workspace/domain/contracts.mjs';
import {config,providerFetch} from './http.mjs';
export async function rpc(env,token,name,args,fetcher=fetch){
  if(!/^wm_[a-z_]+$/.test(name))throw new WorkspaceError('unknown_action','This action is unavailable.');
  const r=await providerFetch(`${config(env).supabase}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(args)},fetcher);
  const data=await r.json().catch(()=>null);
  if(!r.ok){
    const code=data?.code;
    if(code==='40001')throw new WorkspaceError('changed','This work changed. Reload before continuing.',409);
    if(code==='42501')throw new WorkspaceError('not_allowed','This action is unavailable for your current access.',403);
    if(code==='28000'||r.status===401)throw new WorkspaceError('sign_in','Confirm your sign-in before continuing.',401);
    if(['23503','23505','23514','22023','22P02','23502'].includes(code))throw new WorkspaceError('invalid_action','Check the details and reload the current record before continuing.',400);
    throw new WorkspaceError('database_unavailable','This action could not be saved. Please try again.',503);
  }return data;
}
export async function machineRpc(env,name,args,fetcher=fetch){
  if(!env.SUPABASE_SECRET_KEY)throw new WorkspaceError('not_configured','The service worker is not configured.',503);
  // Secret API keys belong in apikey; Supabase derives the service role itself.
  const r=await providerFetch(`${config(env).supabase}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'},body:JSON.stringify(args)},fetcher);
  if(!r.ok)throw new WorkspaceError('worker_database','Background work needs attention.',503);return r.json();
}
