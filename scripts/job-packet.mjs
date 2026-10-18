import {quotedOffer} from '../src/commercial.mjs';
import {readFile,writeFile,realpath,lstat} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {escapeHtml} from '../src/shared.mjs';

const root=resolve(import.meta.dirname,'..');
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
const label=value=>value.replaceAll('_',' ');
function valueHtml(value){
 if(value===null||value===undefined||value==='')return '<span class="pending">Pending</span>';
 if(Array.isArray(value))return value.length?`<ul>${value.map(v=>`<li>${valueHtml(v)}</li>`).join('')}</ul>`:'<span class="pending">Not recorded</span>';
 if(typeof value==='object')return Object.keys(value).length?`<dl>${Object.entries(value).map(([k,v])=>`<div><dt>${escapeHtml(label(k))}</dt><dd>${valueHtml(v)}</dd></div>`).join('')}</dl>`:'<span class="pending">Not recorded</span>';
 return escapeHtml(typeof value==='boolean'?(value?'Yes':'No'):value);
}
const section=(title,content)=>`<section><h2>${escapeHtml(title)}</h2>${content}</section>`;
function rows(record,keys){return `<dl>${keys.map(key=>`<div><dt>${escapeHtml(label(key))}</dt><dd>${valueHtml(record[key])}</dd></div>`).join('')}</dl>`;}

const receiptBlocks=[
 ['completed_artifacts','Completed artifacts'],['decisions','Decisions'],
 ['status_notes','Status notes'],['changes','Scope changes'],['incidents','Incidents'],
 ['actual_tests','Actual tests and results'],['time_by_stage','Internal time by stage'],
 ['release_handoff','Release and handoff'],['monthly_services','Monthly services'],['exit','Exit and reconciliation']
];
function receiptHtml(receipt){
 const entries=receipt.entries||[];
 const events=entries.length?entries.map((entry,index)=>`<article class="receipt-entry"><h3>${escapeHtml(entry.date||'Date pending')} · ${escapeHtml(entry.type||'Entry')} · ${index+1}</h3>${rows(entry,Object.keys(entry).filter(key=>!['date','type'].includes(key)))}</article>`).join(''):'<p class="pending">No event entries recorded.</p>';
 const metadata=['client_id','accepted_scope_reference','invoice_system_reference','access_manager_reference'];
 const handled=new Set(['status','entries','entry_shape','buyer_session_shape','live_evidence','rules',...metadata,...receiptBlocks.map(([key])=>key)]);
 const additional=Object.keys(receipt).filter(key=>!handled.has(key));
 return `<p>${escapeHtml(receipt.status||'Status not recorded')}</p><p class="note">Internal working record: includes labor, decisions and unresolved items. Review before sharing. Blank sections mean not recorded; a printed entry is not proof that its action passed.</p>${rows(receipt,metadata)}<h3>Event history</h3>${events}${receiptBlocks.map(([key,title])=>`<div class="receipt-block"><h3>${escapeHtml(title)}</h3>${valueHtml(receipt[key]??[])}</div>`).join('')}${additional.length?`<div class="receipt-block"><h3>Additional recorded fields</h3>${rows(receipt,additional)}</div>`:''}${receipt.rules?`<h3>Record rules</h3>${valueHtml(receipt.rules)}`:''}<p>${escapeHtml(receipt.live_evidence||'Only performed work with evidence may be treated as completed.')}</p>`;
}

export function renderJobPacket(scope,receipt,offers){
 const snapshot=scope.commercial_snapshot;
 const snapshotValid=Boolean(snapshot&&snapshot.version===scope.commercial_version&&snapshot.offer_id===scope.offer_id&&snapshot.offer?.payment_schedule&&snapshot.provider_policy);
 const offer=snapshotValid?snapshot.offer:quotedOffer(offers,scope.offer_id,scope.billing_option==='annual'?'annual':'monthly');
 const recurring=['keep_running','improve','grow'].includes(scope.offer_id);
 // Read the saved terms; a changed scope label or cycle count never reinterprets its price.
 const billingCompatible=!recurring||Boolean(snapshotValid&&['monthly','annual'].includes(snapshot.billing)&&snapshot.billing===scope.billing_option&&scope.service_period?.cycles===(snapshot.billing==='annual'?12:1)&&offer.public_price===(snapshot.billing==='annual'?offer.annual?.upfront_price:offer.monthly_price)&&(snapshot.billing!=='annual'||offer.annual?.cycles===12));
 if(!offer?.payment_schedule)throw new Error('A supported offer_id is required. Create a draft scope first.');
 const synthetic=/SYNTHETIC/i.test(scope.status||'');
 const priceMatches=snapshotValid && billingCompatible && scope.fixed_price===offer.public_price && scope.milestones?.length===offer.payment_schedule.length && offer.payment_schedule.every((m,i)=>scope.milestones[i].amount===m.amount&&scope.milestones[i].percent===m.percent&&scope.milestones[i].event===m.event);
 const milestones=priceMatches?offer.payment_schedule:[];
 const invoiceHtml=milestones.map((m,i)=>{
  const saved=scope.milestones[i];
  return `<article class="invoice"><p class="eyebrow">Private draft ${i+1} of ${milestones.length}</p><h2>${escapeHtml(m.event)}</h2><p class="draft">DRAFT — NOT ISSUED</p><p>This is a local planning document. No invoice was sent, finalized or charged.</p><dl><div><dt>Client reference</dt><dd>${escapeHtml(scope.client_id)}</dd></div><div><dt>Offer / milestone</dt><dd>${escapeHtml(label(scope.offer_id))} · ${m.percent}%</dd></div><div><dt>Draft reference</dt><dd>${escapeHtml(saved.invoice_system_reference||`LOCAL-DRAFT-${i+1}`)}</dd></div><div><dt>Proposed due date</dt><dd>${valueHtml(saved.due_date)}</dd></div><div><dt>Required approval</dt><dd>${valueHtml(saved.approval_reference)}</dd></div></dl><table><thead><tr><th scope="col">Description</th><th scope="col">Qty</th><th scope="col" class="amount">Draft amount</th></tr></thead><tbody><tr><td>${escapeHtml(label(scope.offer_id))} — ${escapeHtml(m.event)}</td><td>1</td><td class="amount">${money(m.amount)}</td></tr></tbody><tfoot><tr><th scope="row" colspan="2">Milestone amount</th><td class="amount">${money(m.amount)}</td></tr></tfoot></table><p class="note">The milestone is conditional on its written scope and approval trigger. Taxes and mandatory external costs must be resolved before any real invoice is issued. No payment link or automatic collection is enabled.</p>${synthetic?'<p class="warning">Synthetic client: no actual acceptance, sale or payment.</p>':''}</article>`;
 }).join('');
 const digest=createHash('sha256').update(JSON.stringify({scope,receipt,offer})).digest('hex');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Private job review — ${escapeHtml(scope.client_id)}</title><style>
*{box-sizing:border-box}body{margin:0;background:#f3eee6;color:#152432;font:16px/1.55 system-ui,sans-serif}main{max-width:1000px;margin:auto;padding:40px 28px}h1,h2{font-family:Georgia,serif;line-height:1.15}h1{font-size:clamp(2rem,5vw,3.5rem);margin:.3em 0}h2{font-size:1.65rem}h3{font-size:1.1rem}p,li,dd,td{overflow-wrap:anywhere}.eyebrow{font-size:.8rem;font-weight:750;letter-spacing:.1em;text-transform:uppercase}.lead{font-size:1.2rem;max-width:70ch}.warning,.draft{border-left:5px solid #a64420;padding:12px 16px;background:#fff7ec;font-weight:700}.pending{color:#745c45;font-style:italic}.note{font-size:.9rem}.invoice,section{background:#fffdf9;border:1px solid #cfc5b7;padding:26px;margin:24px 0}.invoice .draft{font-size:1.45rem}dl{margin:0}dl>div{display:grid;grid-template-columns:minmax(130px,1fr) minmax(0,3fr);gap:16px;border-bottom:1px solid #e7e0d5;padding:10px 0}dt{text-transform:capitalize;font-weight:650}dd{margin:0;min-width:0}dd dl>div{display:block}dd dt{font-size:.85rem}ul{padding-left:22px;margin:0}li+li{margin-top:6px}table{width:100%;border-collapse:collapse;margin:20px 0}th{text-align:left;font-size:.9rem}th,td{padding:12px 10px;border-bottom:1px solid #ccc4b7;vertical-align:top}.amount{text-align:right;white-space:nowrap}tfoot{font-weight:700}code{font-size:.85rem;overflow-wrap:anywhere}footer{font-size:.8rem;border-top:1px solid #cfc5b7;padding-top:20px}@media(max-width:600px){main{padding:20px 12px}.invoice,section{padding:18px 14px}dl>div{display:block}dt{margin-bottom:4px}th,td{padding:10px 5px}table{font-size:.9rem}}@media print{@page{size:letter;margin:15mm}body{background:white;font-size:10pt}main{max-width:none;padding:0}.invoice{break-before:page;break-after:page;border:0;padding:0}section{border:0;padding:0;break-before:page}h2,h3,dt{break-after:avoid}tr{break-inside:avoid}.warning,.draft{background:white}header{break-after:avoid}}
</style></head><body><main><header><p class="eyebrow">Wonder &amp; Method · Local working copy</p><h1>Scope, billing &amp; work review</h1><p class="lead">${escapeHtml(scope.client_id)} · ${synthetic?'Synthetic rehearsal':'Private client draft'}</p><p>${escapeHtml(scope.status||'Draft; status not recorded')}</p><p class="warning">This file is a read-only view of the two working records. It is not a signed agreement, issued invoice, payment receipt, booking or release approval.</p><p>Edit <code>accepted-scope.json</code> and <code>cumulative-receipt.json</code>, then regenerate this file. Use your browser’s Print command for a paper or PDF review copy. Keep client copies private and outside the website.</p></header>
${section('1. Scope and buyer fit',rows(scope,['version','commercial_version','commercial_snapshot','offer_id','billing_option','fixed_price','named_approver','buyer_job','audience','primary_action','service_area','editing_choice','technical_editor_or_separate_cms_scope','source_delivery','exact_routes','copy_form_redirect_media_limits','commercial_boundaries']))}
${section('2. Dates, inputs and costs',rows(scope,['service_period','schedule','project_fact_sheet','external_costs','acceptance_tests','buyer_confirmation']))}
${section('3. Boundaries and exit',rows(scope,['included_revisions','defect_window','exclusions','change_process','paid_work_rights','cancellation_reconciliation','optional_services']))}
${section('4. Milestone billing drafts',`<p>The ${money(offer.public_price)} ${snapshotValid?'saved commercial snapshot':'current reference offer (not an accepted agreement)'} uses ${offer.payment_schedule.map(m=>m.percent+'%').join(' / ')} milestones. Drafts below require an explicit human decision in the actual invoice system before issue.</p>${priceMatches?'': '<p class="warning">Commercial mismatch: a versioned saved commercial snapshot is missing, invalid, or its billing/cycles or price/milestones differ from the saved scope. Historical hosting and refund rights cannot be inferred from current prices. Invoice drafts are withheld. Reconcile the original written agreement and preserved benefit ledger before proceeding; do not silently replace accepted terms with a new offer.</p>'}`)}
${invoiceHtml}
${section('5. Cumulative work receipt',receiptHtml(receipt))}
${section('6. Local review checklist','<ul><li>Confirm the buyer job, scope, facts and rights.</li><li>Resolve missing costs, calendar, staffing and written approvals.</li><li>Use only synthetic details in local inquiry tests.</li><li>Verify change, incident, renewal/pause and cancellation decisions in the cumulative receipt.</li><li>Keep real account, inbox, payment and public-release evidence pending until actually performed.</li></ul>')}
<footer>Generated from the scope, receipt and selected commercial source. Source fingerprint: <code>${digest}</code>. This file contains no external assets, scripts, form submission or payment actions.</footer></main></body></html>`;
}

export async function buildJobPacket(workspace,jobDirectory){
 const base=await realpath(workspace),folder=await realpath(resolve(base,jobDirectory));
 const comparable=p=>process.platform==='win32'?p.toLowerCase():p;
 const allowed=['operations/jobs','operations/synthetic'].some(p=>comparable(folder).startsWith(comparable(resolve(base,p)+sep)));
 if(!allowed)throw new Error('Job packets must stay in private operations/jobs or explicitly synthetic operations/synthetic subfolders, never public assets.');
 const [scope,receipt,offers]=await Promise.all(['accepted-scope.json','cumulative-receipt.json',resolve(base,'config/offers.json')].map(p=>readFile(resolve(folder,p),'utf8').then(JSON.parse)));
 const output=resolve(folder,'review.html');
 try{if((await lstat(output)).isSymbolicLink())throw new Error('Refusing to overwrite a symbolic-link review file.');}catch(error){if(error.code!=='ENOENT')throw error;}
 await writeFile(output,renderJobPacket(scope,receipt,offers));
 return {path:output,relativePath:relative(base,output),externalActions:[],issuedInvoices:0};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))buildJobPacket(root,process.argv[2]||'operations/synthetic/example-client').then(result=>console.log(`Private local review: ${result.path}. No invoice issued or sent.`)).catch(error=>{console.error(error.message);process.exitCode=1;});
