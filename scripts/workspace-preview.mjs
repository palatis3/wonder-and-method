// Local UI preview only. It never connects to a business database or provider.
import {createServer} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
const port=Number(process.env.PORT||4198),root=new URL('../src/workspace/',import.meta.url);
const synthetic=process.argv.includes('--synthetic');
const fixture=synthetic?await(await import('../tests/workspace/preview-fixture.mjs')).previewFixture():null;
const dbTools=synthetic?await import('../tests/workspace/database.mjs'):null;
const exportTools=synthetic?await import('../worker/workspace/exports/service.mjs'):null;
const backupTools=synthetic?await import('../worker/workspace/backups/service.mjs'):null;
const backupEnvironment={BACKUP_ENABLED:'true',RECOVERY_WITNESS_ENABLED:'true',BACKUP_KEYS:JSON.stringify({synthetic:Buffer.alloc(32,7).toString('base64')}),BACKUP_KEY_ID:'synthetic',BACKUP_QUALIFICATION:JSON.stringify({bytes_identity:'Synthetic bytes account',witness_identity:'Synthetic separate witness account',custody_reference:'Synthetic offline custodian',witness_hooks_version:'tenant-witness-v1'}),RECOVERY_BYTES:{},RECOVERY_WITNESS:{}};
const exportObjects=new Map(),exportStore={target:'r2:synthetic-preview',async get(key){return exportObjects.get(key)||null;},async put(key,bytes){if(exportObjects.has(key))throw Error('Synthetic immutable export already exists');exportObjects.set(key,bytes);}};
const exportControl=async(_env,id)=>{if(![fixture.ids.org,fixture.ids.other].includes(id))throw Error('Synthetic recovery control unavailable');return {access_state:'open',external_generation:id===fixture.ids.org?'fixture-generation-1':'fixture-generation-2'};};
const commandNames={'request.create':'request_create','request.accept':'request_accept','message.send':'message_send','revision.create':'revision_create','decision.record':'decision_record','ads.stop':'ads_stop','operation.prepare':'operation_prepare','operation.reconcile':'reconcile_request','file.intent':'file_intent'};
let serial=Promise.resolve();
async function fixtureApi(req,res,url){
 const role=/preview_role=(operator|intake|customer|signedout)/.exec(req.headers.cookie||'')?.[1]||'customer';
 const send=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 if(url.pathname==='/_preview/role'){
  const selected=url.searchParams.get('as');if(!['operator','intake','customer','signedout'].includes(selected)){send({error:{message:'Unknown synthetic role'}},400);return;}
  res.writeHead(303,{'Location':'/workspace/','Set-Cookie':`preview_role=${selected}; Path=/; SameSite=Strict`});res.end();return;
 }
 const user=role==='intake'?'20000000-0000-4000-8000-000000000005':role==='operator'?fixture.ids.operator:fixture.ids.client;
 if(url.pathname==='/api/session'){send({user:role==='signedout'?null:{id:user,email:role==='intake'?'intake@synthetic.example':role==='operator'?'studio@synthetic.example':'avery@synthetic.example',aal:role==='customer'?'aal1':'aal2'},csrf:'synthetic-only',synthetic:true});return;}
 if(url.pathname==='/api/auth/logout'){res.setHeader('Set-Cookie','preview_role=signedout; Path=/; SameSite=Strict');send({signed_out:true});return;}
 if(role==='signedout'){send({error:{message:'Use the synthetic preview role links above.',code:'sign_in'}},401);return;}
 try{
  await dbTools.actor(fixture.db,user,{aal:role==='customer'?'aal1':'aal2'});
  const exportCall=async(_env,_token,name,args)=>{await dbTools.actor(fixture.db,user,{aal:role==='customer'?'aal1':'aal2'});if(!/^wm_[a-z_]+$/.test(name))throw Error('Unknown synthetic export call');const values=Object.values(args);return (await fixture.db.query(`select public.${name}(${values.map((_,i)=>'$'+(i+1)).join(',')}) r`,values)).rows[0].r;};
  if(url.pathname==='/api/backups'){send(await backupTools.backupStatus(backupEnvironment,{access_token:'synthetic'},url.searchParams.get('business'),{call:exportCall,control:exportControl}));return;}
  if(url.pathname==='/api/customer-exports'){send(await exportTools.exportStatus({}, {access_token:'synthetic'},url.searchParams.get('business'),url.searchParams.get('before')||null,{call:exportCall,control:exportControl}));return;}
  if(/^\/api\/customer-exports\/[^/]+\/download$/.test(url.pathname)){const response=await exportTools.downloadCustomerExport(new Request(url.href),{}, {access_token:'synthetic'},{call:exportCall,control:exportControl,store:exportStore});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;}
  if(url.pathname==='/api/owner'){const {ownerQueue}=await import('../worker/workspace/owner/service.mjs');send(await ownerQueue({}, {access_token:'synthetic'},{query:url.searchParams.get('query')||'',week_start:url.searchParams.get('week_start'),timezone:url.searchParams.get('timezone')||'UTC',after:url.searchParams.get('after')||null},{call:async(_e,_t,_n,p)=>(await fixture.db.query('select public.wm_owner_queue($1,$2,$3,$4) r',[p.p_query,p.p_week,p.p_timezone,p.p_after])).rows[0].r}));return;}
  if(url.pathname==='/api/owner-dates'){send((await fixture.db.query('select public.wm_owner_dates($1) r',[url.searchParams.get('business')])).rows[0].r);return;}
  if(url.pathname==='/api/intake'){send((await fixture.db.query('select public.wm_intake_queue($1,$2,$3) r',[url.searchParams.get('query')||'',url.searchParams.get('stage')||'',url.searchParams.get('after')||null])).rows[0].r);return;}
  if(url.pathname==='/api/agreement-receipt'){res.setHeader('Content-Disposition','attachment; filename=agreement-receipt.json');send((await fixture.db.query('select public.wm_agreement_receipt($1,$2) as r',[url.searchParams.get('business'),url.searchParams.get('id')])).rows[0].r);return;}
  if(url.pathname==='/api/invitations'){send((await fixture.db.query('select public.wm_invitations() as r')).rows[0].r);return;}
  if(url.pathname==='/api/inbound'){send((await fixture.db.query('select public.wm_inbound_list($1) r',[url.searchParams.get('business')])).rows[0].r);return;}
  if(url.pathname==='/api/notifications'){send((await fixture.db.query('select public.wm_notification_status($1) r',[url.searchParams.get('business')])).rows[0].r);return;}
  if(url.pathname==='/api/analytics'){send((await fixture.db.query('select public.wm_analytics_list($1,$2) r',[url.searchParams.get('business'),url.searchParams.get('before')||null])).rows[0].r);return;}
  if(url.pathname==='/api/analytics/manifest'){res.setHeader('Content-Disposition','attachment; filename=reporting-observation.json');send((await fixture.db.query('select public.wm_analytics_manifest($1,$2) r',[url.searchParams.get('business'),url.searchParams.get('id')])).rows[0].r);return;}
  if(url.pathname==='/api/connections'){send({providers:[{id:'google_ads',name:'Google Ads',enabled:false}],connections:[]});return;}
  if(url.pathname==='/api/businesses'){send((await fixture.db.query('select public.wm_businesses() as r')).rows[0].r);return;}
  if(url.pathname==='/api/workspace'){send({... (await fixture.db.query('select public.wm_workspace($1) as r',[url.searchParams.get('business')])).rows[0].r,file_policy:'invite_only_unscanned'});return;}
  if(req.method==='POST'&&url.pathname==='/api/command'){
   if(req.headers.origin!==`http://127.0.0.1:${port}`||req.headers['x-csrf-token']!=='synthetic-only')throw Error('Synthetic preview origin required');
   const chunks=[];let bytes=0;for await(const c of req){bytes+=c.length;if(bytes>524288)throw Error('Request too large');chunks.push(c);}
   const input=JSON.parse(Buffer.concat(chunks).toString()),key=req.headers['idempotency-key'];
   if(input.command.startsWith('intake.')){const {validateIntakeCommand}=await import('../worker/workspace/intake/service.mjs');validateIntakeCommand(input.command,input.input);send((await fixture.db.query('select public.wm_intake_command($1,$2,$3) r',[input.command,input.input,key])).rows[0].r);return;}
   if(input.organization_id!==fixture.ids.org)throw Error('Synthetic business unavailable');
   if(exportTools.EXPORT_COMMANDS.has(input.command)){
    const result=await exportTools.exportCommand({}, {access_token:'synthetic'},input.organization_id,input.command,input.input,key,{call:exportCall,control:exportControl});
    if(input.command==='customer_export.request'&&result.state==='captured')await exportTools.processCustomerExports({}, {call:async(_env,name,args)=>{await dbTools.actor(fixture.db,fixture.ids.operator,{role:'service_role'});const values=Object.values(args);return (await fixture.db.query(`select public.${name}(${values.map((_,i)=>'$'+(i+1)).join(',')}) r`,values)).rows[0].r;},control:exportControl,store:exportStore,loadSource:async()=>{throw Object.assign(Error('Synthetic source file bytes unavailable'),{code:'source_unavailable'});}});
    send(result);return;
   }
   if(input.command.startsWith('owner.')){const {validateOwnerCommand}=await import('../worker/workspace/owner/service.mjs');validateOwnerCommand(input.command,input.input);send((await fixture.db.query('select public.wm_owner_command($1,$2,$3,$4) r',[input.organization_id,input.command,input.input,key])).rows[0].r);return;}
   if(input.command.startsWith('notification.')){const {validateNotificationCommand}=await import('../worker/workspace/notifications/service.mjs');validateNotificationCommand(input.command,input.input);send((await fixture.db.query('select public.wm_notification_command($1,$2,$3,$4) r',[input.organization_id,input.command,input.input,key])).rows[0].r);return;}
   if(backupTools.BACKUP_COMMANDS.has(input.command)){send(await backupTools.backupCommand(backupEnvironment,{access_token:'synthetic'},input.organization_id,input.command,input.input,key,{call:exportCall,control:exportControl}));return;}
   const {validateCommand}=await import('../src/workspace/domain/contracts.mjs');validateCommand(input.command,input.input);
   if(commandNames[input.command]){send(await dbTools.command(fixture.db,commandNames[input.command],input.input,{key}));return;}
   if(input.command.startsWith('analytics.')){send((await fixture.db.query('select public.wm_analytics_command($1,$2,$3,$4) r',[input.organization_id,input.command,input.input,key])).rows[0].r);return;}
   if(input.command.startsWith('inbound.')){const r=(await fixture.db.query('select public.wm_inbound_command($1,$2,$3,$4) r',[input.organization_id,input.command,input.input,key])).rows[0].r;if(r.token){r.reply_address=`r.${r.token}@synthetic.example`;delete r.token;}send(r);return;}
   if(input.command.startsWith('website.')){if(input.command==='website.preview')input.input.baseline_deployment_id='40000000-0000-4000-8000-000000000004';send((await fixture.db.query('select public.wm_website_command($1,$2,$3,$4) as r',[input.organization_id,input.command,input.input,key])).rows[0].r);return;}
   if(input.command.startsWith('delivery.')){send((await fixture.db.query('select public.wm_delivery_command($1,$2,$3,$4) as r',[input.organization_id,input.command,input.input,key])).rows[0].r);return;}
   if(input.command.startsWith('outcome.')){send((await fixture.db.query('select public.wm_outcome_command($1,$2,$3,$4) as r',[input.organization_id,input.command,input.input,key])).rows[0].r);return;}
   if(input.command.startsWith('reporting.')){send((await fixture.db.query('select public.wm_reporting_command($1,$2,$3,$4) as r',[input.organization_id,input.command,input.input,key])).rows[0].r);return;}
   if(input.command.startsWith('closure.')){send((await fixture.db.query('select public.wm_closure_command($1,$2,$3,$4) as r',[input.organization_id,input.command,input.input,key])).rows[0].r);return;}
   if(input.command.startsWith('billing.')){send((await fixture.db.query('select public.wm_billing_command($1,$2,$3,$4) as r',[input.organization_id,input.command,input.input,key])).rows[0].r);return;}
   if(/^(service|proposal|agreement|onboarding|milestone)\./.test(input.command)){send((await fixture.db.query('select public.wm_commercial_command($1,$2,$3,$4) as r',[input.organization_id,input.command,input.input,key])).rows[0].r);return;}
   if(/^(invitation|member|authority)\./.test(input.command)){send((await fixture.db.query('select public.wm_people_command($1,$2,$3,$4) as r',[input.organization_id,input.command,input.input,key])).rows[0].r);return;}
   if(input.command.startsWith('ai.')){
    const prepared=(await fixture.db.query('select public.wm_ai_command($1,$2,$3,$4) as r',[input.organization_id,input.command,input.input,key])).rows[0].r;
    if(prepared.dispatch){
     await dbTools.actor(fixture.db,user,{role:'service_role'});
     const output={title:'Synthetic '+input.input.task_type.replaceAll('_',' '),draft:'Synthetic prepared draft. Review the original facts and confirm the next step. No provider was contacted.',claims:[],questions:['Which source facts need confirmation?'],warnings:['Synthetic test output only.']};
     send((await fixture.db.query('select public.wm_ai_complete($1,$2,$3,$4,$5,null) as r',[input.organization_id,prepared.id,prepared.dispatch_nonce,output,{}])).rows[0].r);return;
    }send(prepared);return;
   }
   send((await fixture.db.query('select public.wm_service_command($1,$2,$3,$4) as r',[input.organization_id,input.command,input.input,key])).rows[0].r);return;
  }
  send({error:{message:'This provider action is not connected in the synthetic preview.'}},503);
 }catch(error){const status=error.code==='40001'?409:error.code==='42501'?403:error.code==='28000'?401:400;send({error:{message:error.message,code:status===409?'changed':status===403?'not_allowed':status===401?'sign_in':'invalid_action'}},status);}
}
const allowed=new Set((await readdir(root,{recursive:true})).filter(f=>/\.(html|css|mjs|svg)$/.test(f)).map(f=>f.replaceAll('\\','/')));
createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(synthetic&&(url.pathname.startsWith('/api/')||url.pathname.startsWith('/_preview/'))){serial=serial.then(()=>fixtureApi(req,res,url));await serial;return;}
  if(url.pathname==='/api/session'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({user:null,csrf:'local-ui-preview-only'}));return;}
  if(url.pathname.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{message:'This is a local interface preview. Live accounts are not connected.'}}));return;}
  const file=url.pathname==='/'||url.pathname.startsWith('/workspace/')||url.pathname.startsWith('/operator/')?'index.html':url.pathname.slice(1);
  if(!allowed.has(file)){res.writeHead(404);res.end('Not found');return;}
  let data=await readFile(new URL(file,root));
  if(synthetic&&file==='index.html')data=data.toString().replace('<body>','<body><aside style="padding:10px 20px;background:#ffe8a3;color:#3b351f;font:13px system-ui;position:relative;z-index:20">Synthetic preview — no live accounts or provider actions. <a href="/_preview/role?as=customer">Customer</a> · <a href="/_preview/role?as=operator">Studio</a> · <a href="/_preview/role?as=signedout">Sign-in screen</a></aside>');
  res.writeHead(200,{'Content-Type':file.endsWith('.mjs')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.svg')?'image/svg+xml':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(500);res.end('Preview unavailable');}
}).listen(port,'127.0.0.1',()=>console.log(`Workspace preview: http://127.0.0.1:${port}`));
