import {WorkspaceError,UUID} from '../../../src/workspace/domain/contracts.mjs';
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
function registry(value){
 if(value===undefined||value===null||value==='')return {};
 let parsed=value;try{if(typeof parsed==='string')parsed=JSON.parse(parsed);}catch{}
 if(!object(parsed))throw new WorkspaceError('notification_config','The reviewed notification connection needs attention.',503);return parsed;
}
export function notificationChannels(env){
 const channels=registry(env.NOTIFICATION_CHANNELS),result={};
 for(const [id,channel]of Object.entries(channels)){
  if(!/^[A-Za-z0-9_-]{1,80}$/.test(id)||!object(channel)||!['staging','production'].includes(channel.environment)||typeof channel.account_id!=='string'||!channel.account_id)throw new WorkspaceError('notification_config','The reviewed notification connection needs attention.',503);
  if(env.ENVIRONMENT&&channel.environment!==env.ENVIRONMENT)continue;result[id]=channel;
 }
 return result;
}
// Only independently reviewed original-operation bindings can read historical
// sends. This registry never authorizes a new POST or retargets a send.
export function legacyNotificationEnvironment(env,permit){
 const b=registry(env.LEGACY_NOTIFICATION_READS)[permit.operation.id];let origin;
 try{origin=new URL(b?.origin);}catch{}
 if(!UUID.test(permit.operation.id||'')||!object(b)||b.organization_id!==permit.operation.organization_id||!['staging','production'].includes(b.environment)||(env.ENVIRONMENT&&env.ENVIRONMENT!==b.environment)
  ||typeof b.account_id!=='string'||!b.account_id||typeof b.api_key!=='string'||!b.api_key||typeof b.from_address!=='string'||typeof b.evidence!=='string'||b.evidence.length<10||b.evidence.length>2000
  ||!Number.isFinite(Date.parse(b.qualified_at))||Date.parse(b.qualified_at)>Date.now()||origin?.protocol!=='https:'||origin.origin!==b.origin)throw new WorkspaceError('legacy_notification_binding','Verify the original notification account before reading its historical outcome.',503);
 return {...env,APP_ORIGIN:b.origin,RESEND_API_KEY:b.api_key,NOTIFICATION_FROM:b.from_address};
}
