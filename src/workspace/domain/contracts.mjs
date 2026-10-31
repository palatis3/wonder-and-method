// Browser-safe contracts. Authority is independently enforced in Postgres.
export const REQUEST_STATES = Object.freeze(['received','triage','waiting','accepted','preparing','in_review','approved','executing','verifying','complete','changes_requested']);
export const OPERATION_STATES = Object.freeze(['pending','in_flight','unknown','verified','failed','cancelled']);
export const SERVICE_TYPES = Object.freeze(['ads_search','ads_social','ads_professional','web_design','seo','care','catalog_project']);
export const AI_TASKS = Object.freeze(['request_brief','scope_comparison','missing_inputs','feedback_grouping','cover_handoff','completion_explanation','weekly_improvement']);
export const FILE_TYPES = Object.freeze({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',pdf:'application/pdf',txt:'text/plain',csv:'text/csv',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_FILES_PER_REQUEST = 10;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class WorkspaceError extends Error {
  constructor(code, message, status=400, fields={}) { super(message); this.name='WorkspaceError'; this.code=code; this.status=status; this.fields=fields; }
}
export const fail = (code,message,status=400,fields={}) => { throw new WorkspaceError(code,message,status,fields); };
export function text(value, field, {max=4000,optional=false}={}) {
  if(optional&&(value===undefined||value===null||value==='')) return null;
  if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) fail('invalid_field',`Check ${field}.`,400,{[field]:`Enter between 1 and ${max} characters.`});
  return value.trim();
}
export function uuid(value,field='record') { if(!UUID.test(value||'')) fail('invalid_field',`Choose a valid ${field}.`); return value.toLowerCase(); }
export function integer(value,field,{min=0,max=Number.MAX_SAFE_INTEGER}={}) { if(!Number.isSafeInteger(value)||value<min||value>max) fail('invalid_field',`Check ${field}.`); return value; }
export function choice(value,allowed,field) { if(!allowed.includes(value)) fail('invalid_field',`Choose a valid ${field}.`); return value; }
export function isoDate(value,field='date') {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)||!Number.isFinite(Date.parse(value))) fail('invalid_field',`Check ${field}.`);
  return new Date(value).toISOString();
}
export function timezone(value) { try { new Intl.DateTimeFormat('en-US',{timeZone:value}).format(); } catch { fail('invalid_field','Choose a valid time zone.'); } return value; }
export function currency(value) { if(!/^[A-Z]{3}$/.test(value||'')) fail('invalid_field','Choose a three-letter currency.'); return value; }
export function publicHttps(value,field='URL') {
  let u; try {u=new URL(value);} catch {fail('invalid_field',`Check ${field}.`);}
  if(u.protocol!=='https:'||u.username||u.password||u.hash||u.hostname==='localhost'||!u.hostname.includes('.')||/^\d+[.]/.test(u.hostname)||u.hostname.includes(':')) fail('invalid_field',`Use a public HTTPS ${field}.`);
  return u.href;
}
export function canonical(value) {
  if(value===null||typeof value==='boolean'||typeof value==='string') return JSON.stringify(value);
  if(typeof value==='number') {if(!Number.isFinite(value))fail('invalid_number','Numbers must be finite.');return JSON.stringify(value);}
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype)return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  fail('invalid_payload','Use plain JSON values.');
}
export async function digest(value) {const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value)));return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');}
export function minorFromMicros(value,exponent=2) {
  if(!/^-?\d+$/.test(String(value))||!Number.isInteger(exponent)||exponent<0||exponent>6) fail('invalid_money','Check the monetary amount.');
  const n=BigInt(value),divisor=10n**BigInt(6-exponent),sign=n<0n?-1n:1n;
  const rounded=sign*((sign*n+divisor/2n)/divisor);
  if(rounded>BigInt(Number.MAX_SAFE_INTEGER)||rounded<BigInt(Number.MIN_SAFE_INTEGER))fail('invalid_money','Amount exceeds the supported range.');
  return Number(rounded);
}
export function moneyDisplay(minor,code='USD',exponent=2) {
  if(minor===null||minor===undefined)return 'Not available';
  integer(minor,'amount',{min:-Number.MAX_SAFE_INTEGER});currency(code);
  return new Intl.NumberFormat('en-US',{style:'currency',currency:code,minimumFractionDigits:exponent,maximumFractionDigits:exponent}).format(minor/10**exponent);
}
export function metricRatio(numerator,denominator) {return numerator===null||denominator===null||denominator===0?null:numerator/denominator;}
export function proratedRefund({paidMinor,earnedMinor=0,periodStart,periodEnd,effectiveAt}) {
  integer(paidMinor,'paid amount');integer(earnedMinor,'earned amount',{max:paidMinor});
  const start=Date.parse(isoDate(periodStart)),end=Date.parse(isoDate(periodEnd)),at=Date.parse(isoDate(effectiveAt));
  if(end<=start)fail('invalid_period','The billing period must end after it starts.');
  const total=BigInt(end-start),remaining=BigInt(Math.max(0,end-Math.max(start,at)));
  return Number((BigInt(paidMinor-earnedMinor)*remaining+total/2n)/total);
}
export function spreadsheetCell(value) {const s=String(value??'');return /^[\s]*[=+@-]/.test(s)?`'${s}`:s;}
export function csvExport(rows,columns) {const cell=v=>'"'+spreadsheetCell(v).replaceAll('"','""')+'"';return '\uFEFF'+[columns.map(cell).join(','),...rows.map(r=>columns.map(k=>cell(r[k])).join(','))].join('\r\n');}
export function allowedReturnPath(value) {return typeof value==='string'&&/^\/(?:workspace|operator)\/(?:[a-zA-Z0-9_\-/]*)?(?:\?[a-zA-Z0-9_=&%.-]*)?$/.test(value)&&!value.includes('//')?value:'/workspace/';}

const fields = {
  'delivery.start':['request_id','agreement_id','period_key'],
  'delivery.facts':['revision_id','fact_ids'],
  'delivery.observe':['id','expected_version','step_key','outcome','evidence','observed_at','revision_id','operation_id','report_id','details'],
  'delivery.complete':['id','expected_version','revision_id'],
  'outcome.record':['engagement_id','id','expected_version','source','source_key','received_at','event_key','event_at','outcome','value_minor','currency','definition_version','consent_ref','retention_until','supersedes_id'],
  'reporting.stage':['engagement_id','source','account_reference','currency','timezone','period_start','period_end','rows','supersedes_id'],
  'reporting.promote':['id','expected_version'],
  'reporting.draft':['engagement_id','request_id','period_key','snapshot_ids','summary','limitations','supersedes_id'],
  'reporting.review':['id','expected_version','digest'],
  'reporting.publish':['id','expected_version','digest'],
  'billing.prepare':['schedule_id','expected_version'],
  'closure.statement':['closure_id','expected_version','basis_digest','lines','tax_evidence','summary'],
  'billing.check_charge':['obligation_id','expected_version','charge_reference'],
  'billing.refund':['charge_binding_id','expected_version','amount_minor','reason','tax_evidence'],
  'billing.hosting':['schedule_id','expected_version','attachment_id','eligible_minor','reason'],
  'billing.enable':['engagement_id','agreement_id','expected_version','evidence'],
  'billing.start_service':['engagement_id','agreement_id','expected_version','started_at','evidence','launch_operation_id'],
  'service.create':['catalog_id','variant','catalog_version','title'],
  'proposal.create':['engagement_id','catalog_id','variant','catalog_version','expected_version','starts_at','scope_note','site_host','incremental_price_minor','overlap_evidence','quote_minor','waiver_evidence','waiver_kind','waiver_agreement_id','supersedes_id'],
  'proposal.send':['id','expected_version'],
  'proposal.withdraw':['id','expected_version','reason'],
  'agreement.accept':['id','expected_version','digest','consent','signer_name'],
  'onboarding.update':['id','expected_version','status','account_reference','evidence','next_action'],
  'milestone.link':['id','expected_version','request_id','evidence'],
  'milestone.due':['id','expected_version','evidence'],
  'milestone.complete':['id','expected_version','evidence','request_id'],
  'invitation.create':['email','role'],
  'invitation.revoke':['id','expected_version'],
  'invitation.accept':['id','business_name'],
  'member.change':['user_id','role','status','expected_version'],
  'authority.assign':['engagement_id','user_id','domain','kind','starts_at','ends_at','evidence','previous_id','expected_version'],
  'authority.revoke':['id','expected_version','reason'],
  'request.create':['engagement_id','outcome','source'],
  'request.accept':['request_id','expected_version','scope','coverage','owner_id','due_at','next_contact_at','approver_id','blockers'],
  'request.progress':['request_id','expected_version','state','reason','next_contact_at'],
  'message.send':['engagement_id','request_id','body','visibility'],
  'revision.create':['request_id','expected_version','kind','manifest','summary','cost_effect','date_effect'],
  'decision.record':['request_id','expected_version','revision_id','digest','decision','feedback','shown_scope'],
  'ads.stop':['engagement_id','reason'],
  'ads.clear_stop':['engagement_id','expected_version','reason'],
  'operation.prepare':['engagement_id','request_id','revision_id','digest','kind','expected_version'],
  'operation.reconcile':['operation_id','expected_version'],
  'operation.takeover':['operation_id','expected_version','reason'],
  'fact.confirm':['key','value','source','valid_until','expected_version'],
  'lead.save':['engagement_id','outcomes'],
  'time.record':['engagement_id','request_id','category','minutes','occurred_at'],
  'absence.save':['starts_at','ends_at','next_contact_at','message'],
  'preference.save':['digest','email_enabled'],
  'engagement.cancel':['engagement_id','expected_version','timing','reason','exit_mode'],
  'file.intent':['engagement_id','request_id','message_id','name','media_type','bytes','visibility'],
  'file.finish':['file_id','checksum','bytes'],
  'export.request':['engagement_id'],
  'ai.prepare':['engagement_id','request_id','task_type','retry_unknown'],
  'ai.review':['id','expected_version','decision','text','minutes'],
  'ai.preference':['enabled'],
  'allowance.reserve':['entitlement_id','request_id','quantity','expected_version','reason'],
  'allowance.settle':['entitlement_id','request_id','quantity','expected_version','reason'],
  'allowance.release':['entitlement_id','request_id','quantity','expected_version','reason'],
  'allowance.defect':['entitlement_id','request_id','quantity','expected_version','reason'],
};
export function validateCommand(command,input) {
  if(!Object.hasOwn(fields,command)) fail('unknown_command','This action is not supported.');
  if(!input||typeof input!=='object'||Array.isArray(input)) fail('invalid_payload','The action needs a JSON object.');
  const unknown=Object.keys(input).filter(k=>!fields[command].includes(k));
  if(unknown.length)fail('invalid_payload','The action contains unsupported fields.');
  for(const [k,v] of Object.entries(input)) {
    if((k.endsWith('_id')&&k!=='catalog_id'||k==='id')&&v!==null)uuid(v,k);
    if(k==='expected_version')integer(v,'version',{min:1});
    if(k.endsWith('_at')&&v!==null)isoDate(v,k);
  }
  if(command==='request.create')text(input.outcome,'what you need',{max:4000});
  if(command==='message.send')text(input.body,'message',{max:20000});
  if(command==='decision.record') {choice(input.decision,['approve','request_changes','withdraw'],'decision');if(input.decision==='request_changes')text(input.feedback,'requested changes');if(!/^[a-f0-9]{64}$/.test(input.digest||''))fail('invalid_revision','Reload the version before deciding.',409);}
  if(command==='time.record')integer(input.minutes,'minutes',{min:1,max:1440});
  if(command==='billing.refund')integer(input.amount_minor,'refund amount',{min:1,max:Number.MAX_SAFE_INTEGER});
  if(command==='closure.statement'){
    if(!Array.isArray(input.lines))fail('invalid_payload','Review the statement lines.');
    for(const line of input.lines){uuid(line.id,'invoice');integer(line.earned_minor,'earned amount',{min:0,max:Number.MAX_SAFE_INTEGER});integer(line.tax_credit_minor,'tax credit',{min:0,max:Number.MAX_SAFE_INTEGER});}
  }
  if(command==='ai.prepare')choice(input.task_type,AI_TASKS,'AI task');
  if(command==='engagement.cancel'){choice(input.timing,['immediate','period_end'],'end date');choice(input.exit_mode,['stop','transfer'],'handoff');}
  if(command==='file.intent'){integer(input.bytes,'file size',{min:1,max:MAX_FILE_BYTES});text(input.name,'filename',{max:180});const ext=input.name.split('.').at(-1).toLowerCase();if(FILE_TYPES[ext]!==input.media_type)fail('unsupported_file','Choose a supported image, document, text or spreadsheet file.');}
  return structuredClone(input);
}
