import {WorkspaceError,uuid} from '../../../src/workspace/domain/contracts.mjs';
import {rpc} from '../database.mjs';

export const OWNER_COMMANDS=Object.freeze(['owner.estimate','owner.capacity','owner.date.propose','owner.date.decide','owner.cover.assign','owner.cover.revoke']);
const fields={
 'owner.estimate':['request_id','expected_version','minutes'],
 'owner.capacity':['week_start','timezone','expected_version','available_minutes','other_minutes','contingency_minutes'],
 'owner.date.propose':['request_id','expected_version','blocking_request_id','due_at','next_contact_at','reason'],
 'owner.date.decide':['proposal_id','expected_version','decision','reason'],
 'owner.cover.assign':['recipient_id','capabilities','starts_at','ends_at','reason'],
 'owner.cover.revoke':['cover_id','expected_version','reason']
};
export function validateOwnerCommand(command,input){
 if(!OWNER_COMMANDS.includes(command)||!input||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype)throw new WorkspaceError('owner_input','Check this owner action.');
 const required=fields[command];
 if(Object.keys(input).some(k=>!required.includes(k))||required.some(k=>!(k in input)))throw new WorkspaceError('owner_input','Check the required fields.');
 for(const k of required){
  const v=input[k];
  if(k.endsWith('_id')&&!(k==='blocking_request_id'&&v===null))uuid(v,k);
  if(['expected_version','minutes','available_minutes','other_minutes','contingency_minutes'].includes(k)&&(!Number.isSafeInteger(v)||v<0||v>(k==='expected_version'?Number.MAX_SAFE_INTEGER:10080)))throw new WorkspaceError('owner_input','Use whole nonnegative minutes and versions.');
  if(['starts_at','ends_at','due_at','next_contact_at'].includes(k)&&(!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v||'')||!Number.isFinite(Date.parse(v))))throw new WorkspaceError('owner_input','Use a date with an explicit timezone.');
 }
 return input;
}
export async function ownerCommand(env,session,org,command,input,key,{call=rpc}={}){
 validateOwnerCommand(command,input);uuid(org);
 if(!/^[A-Za-z0-9_-]{16,200}$/.test(key||''))throw new WorkspaceError('action_key','Retry with the original action identifier.');
 return call(env,session.access_token,'wm_owner_command',{p_org:org,p_command:command,p_input:input,p_key:key});
}
export async function ownerQueue(env,session,{query='',week_start,timezone='UTC',after=null}={}, {call=rpc}={}){
 if(typeof query!=='string'||query.length>100||!/^\d{4}-\d{2}-\d{2}$/.test(week_start||'')||typeof timezone!=='string'||timezone.length>100)throw new WorkspaceError('owner_input','Choose a week, timezone and short search.');
 if(after!==null)uuid(after);
 return call(env,session.access_token,'wm_owner_queue',{p_query:query,p_week:week_start,p_timezone:timezone,p_after:after});
}
