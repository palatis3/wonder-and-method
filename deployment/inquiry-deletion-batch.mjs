import {createHash} from 'node:crypto';
import {hasInquiryFollowup,hasInquiryResolutions,RETENTION_DAYS} from './inquiry-maintenance.mjs';

export const deletionBatchLimit=25;
const planLifetime=30*60*1000;
const origin='https://wonderandmethod.com';
const reference=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const reasons=['retention_due','resolved_spam_or_duplicate'];
// No inquiry text, address, name, or frozen notification body enters a plan.
const inquiryFields=['id','created_at','synthetic','delivery_status','provider_id','attempts','first_attempt_at','lease_until','last_substantive_contact_at','is_client','retention_hold','retention_hold_review_at'];
const resolutionFields=['resolved_at','outcome','evidence_reference'];
const selectFields=[...inquiryFields.map(field=>`i.${field}`),...resolutionFields.map(field=>`r.${field} AS resolution_${field}`)].join(',');
const snapshotFields=[...inquiryFields,...resolutionFields.map(field=>'resolution_'+field)];
const snapshot=row=>Object.fromEntries(snapshotFields.map(field=>[field,row[field]]));
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const exactKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');
const eligibleSql=(reason,acknowledgmentReady=false)=>`i.synthetic=0 AND i.is_client=0 AND i.retention_hold=0
 AND i.delivery_status!='sending' AND (i.lease_until IS NULL OR i.lease_until<?)
 ${acknowledgmentReady?"AND NOT EXISTS (SELECT 1 FROM inquiry_acknowledgments a WHERE a.inquiry_id=i.id AND a.status='sending')":''}
 AND ${reason==='retention_due'?'i.last_substantive_contact_at IS NOT NULL AND i.last_substantive_contact_at<=?':"i.delivery_status='manual_review' AND r.outcome IN ('spam_confirmed','duplicate_confirmed')"}`;
const eligibilityArgs=(reason,now)=>reason==='retention_due'?[now,now-RETENTION_DAYS*86400000]:[now];
const planBody=plan=>({version:plan.version,origin:plan.origin,reason:plan.reason,createdAt:plan.createdAt,expiresAt:plan.expiresAt,records:plan.records.map(snapshot)});
export const deletionPlanDigest=plan=>createHash('sha256').update(JSON.stringify(planBody(plan))).digest('hex');

async function requireSchema(db){
 if(!await hasInquiryFollowup(db)||!await hasInquiryResolutions(db))fail(503,'Inquiry follow-up and resolution migrations are required. No records changed.');
}

// Optional migration: old installations retain their existing deletion behavior.
// A present table must be queried successfully; a schema/query failure is never
// treated as proof that no acknowledgment is sending.
export async function hasInquiryAcknowledgmentTable(db){
 return Boolean(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='inquiry_acknowledgments'").first());
}

export const acknowledgmentDeletionInProgress=error=>typeof error?.message==='string'&&error.message.includes('ack-send-in-progress');

export async function createDeletionPlan(db,input,now=Date.now()){
 if(!exactKeys(input,['reason','references'])||!reasons.includes(input.reason)||!Array.isArray(input.references)||input.references.length<1||input.references.length>deletionBatchLimit||input.references.some(id=>typeof id!=='string'||!reference.test(id))||new Set(input.references).size!==input.references.length)fail(422,'Choose one deletion reason and 1–25 distinct full inquiry references.');
 await requireSchema(db);
 const acknowledgmentReady=await hasInquiryAcknowledgmentTable(db);
 const {results}=await db.prepare(`SELECT ${selectFields} FROM inquiries i LEFT JOIN inquiry_delivery_resolutions r ON r.inquiry_id=i.id
 WHERE i.id IN (SELECT value FROM json_each(?)) AND ${eligibleSql(input.reason,acknowledgmentReady)} ORDER BY i.id`).bind(JSON.stringify(input.references),...eligibilityArgs(input.reason,now)).all();
 if(results.length!==input.references.length)fail(409,'At least one reference is missing or ineligible. No plan created and no records changed.');
 const plan={version:1,origin,reason:input.reason,createdAt:now,expiresAt:now+planLifetime,records:results.map(snapshot)};
 return {...plan,digest:deletionPlanDigest(plan)};
}

export function validateDeletionPlan(plan,confirmation,now=Date.now()){
 if(!exactKeys(plan,['version','origin','reason','createdAt','expiresAt','records','digest'])||plan.version!==1||plan.origin!==origin||!reasons.includes(plan.reason)||!Number.isSafeInteger(plan.createdAt)||plan.createdAt<=0||plan.createdAt>now||plan.expiresAt!==plan.createdAt+planLifetime||now>=plan.expiresAt||!Array.isArray(plan.records)||plan.records.length<1||plan.records.length>deletionBatchLimit||plan.records.some(row=>!exactKeys(row,snapshotFields)||typeof row.id!=='string'||!reference.test(row.id))||new Set(plan.records.map(row=>row.id)).size!==plan.records.length)fail(422,'Invalid or expired deletion plan. Create and review a new plan.');
 if(typeof confirmation!=='string'||!/^[a-f0-9]{64}$/.test(confirmation)||confirmation!==plan.digest||deletionPlanDigest(plan)!==confirmation)fail(422,'The exact reviewed plan digest is required. No records changed.');
 return plan;
}

export async function executeDeletionPlan(db,plan,confirmation,now=Date.now()){
 validateDeletionPlan(plan,confirmation,now);await requireSchema(db);
 const acknowledgmentReady=await hasInquiryAcknowledgmentTable(db);
 const matches=[...inquiryFields.map(field=>`i.${field} IS json_extract(p.value,'$.${field}')`),...resolutionFields.map(field=>`r.${field} IS json_extract(p.value,'$.resolution_${field}')`)].join(' AND ');
 // MATERIALIZED freezes the complete eligible set before any deletion. The count
 // gate makes a missing, changed or newly ineligible row reject the entire batch.
 // This is one SQLite write, so no read/write race or partly deleted batch exists.
 let results;
 try{({results}=await db.prepare(`WITH matching AS MATERIALIZED (
 SELECT i.id FROM json_each(?) p JOIN inquiries i ON i.id=json_extract(p.value,'$.id')
 LEFT JOIN inquiry_delivery_resolutions r ON r.inquiry_id=i.id
 WHERE ${matches} AND ${eligibleSql(plan.reason,acknowledgmentReady)}
 ) DELETE FROM inquiries WHERE id IN (SELECT id FROM matching)
 AND (SELECT count(*) FROM matching)=? RETURNING id`).bind(JSON.stringify(plan.records),...eligibilityArgs(plan.reason,now),plan.records.length).all());}
 catch(error){if(acknowledgmentDeletionInProgress(error))fail(409,'An acknowledgment is sending. Nothing was deleted; wait for recovery, then create and review a new plan.');throw error;}
 if(results.length!==plan.records.length)fail(409,'The plan is stale or a record is no longer eligible. Nothing was deleted; create and review a new plan.');
 return {deleted:results.length,references:results.map(row=>row.id).sort(),digest:confirmation,message:'Deleted the reviewed records from active D1. Reconcile mailbox, exports, local plans and provider recovery copies under the retention policy separately.'};
}
