// Local UI preview only. It never connects to a business database or provider.
import {createServer} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
const port=Number(process.env.PORT||4198),root=new URL('../src/workspace/',import.meta.url);
const synthetic=process.argv.includes('--synthetic');
const fixture=synthetic?await(await import('../tests/workspace/preview-fixture.mjs')).previewFixture():null;
const dbTools=synthetic?await import('../tests/workspace/database.mjs'):null;
const commandNames={'request.create':'request_create','request.accept':'request_accept','message.send':'message_send','revision.create':'revision_create','decision.record':'decision_record','ads.stop':'ads_stop','operation.prepare':'operation_prepare','operation.reconcile':'reconcile_request','file.intent':'file_intent'};
let serial=Promise.resolve();
async function fixtureApi(req,res,url){
 const role=/preview_role=(operator|customer|signedout)/.exec(req.headers.cookie||'')?.[1]||'customer';
 const send=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 if(url.pathname==='/_preview/role'){
  const selected=url.searchParams.get('as');if(!['operator','customer','signedout'].includes(selected)){send({error:{message:'Unknown synthetic role'}},400);return;}
  res.writeHead(303,{'Location':'/workspace/','Set-Cookie':`preview_role=${selected}; Path=/; SameSite=Strict`});res.end();return;
 }
 const user=role==='operator'?fixture.ids.operator:fixture.ids.client;
 if(url.pathname==='/api/session'){send({user:role==='signedout'?null:{id:user,email:role==='operator'?'studio@synthetic.example':'avery@synthetic.example',aal:role==='operator'?'aal2':'aal1'},csrf:'synthetic-only',synthetic:true});return;}
 if(url.pathname==='/api/auth/logout'){res.setHeader('Set-Cookie','preview_role=signedout; Path=/; SameSite=Strict');send({signed_out:true});return;}
 if(role==='signedout'){send({error:{message:'Use the synthetic preview role links above.',code:'sign_in'}},401);return;}
 try{
  await dbTools.actor(fixture.db,user,{aal:role==='operator'?'aal2':'aal1'});
  if(url.pathname==='/api/agreement-receipt'){res.setHeader('Content-Disposition','attachment; filename=agreement-receipt.json');send((await fixture.db.query('select public.wm_agreement_receipt($1,$2) as r',[url.searchParams.get('business'),url.searchParams.get('id')])).rows[0].r);return;}
  if(url.pathname==='/api/invitations'){send((await fixture.db.query('select public.wm_invitations() as r')).rows[0].r);return;}
  if(url.pathname==='/api/connections'){send({providers:[{id:'google_ads',name:'Google Ads',enabled:false}],connections:[]});return;}
  if(url.pathname==='/api/businesses'){send((await fixture.db.query('select public.wm_businesses() as r')).rows[0].r);return;}
  if(url.pathname==='/api/workspace'){send({... (await fixture.db.query('select public.wm_workspace($1) as r',[url.searchParams.get('business')])).rows[0].r,file_policy:'invite_only_unscanned'});return;}
  if(req.method==='POST'&&url.pathname==='/api/command'){
   if(req.headers.origin!==`http://127.0.0.1:${port}`||req.headers['x-csrf-token']!=='synthetic-only')throw Error('Synthetic preview origin required');
   const chunks=[];let bytes=0;for await(const c of req){bytes+=c.length;if(bytes>524288)throw Error('Request too large');chunks.push(c);}
   const input=JSON.parse(Buffer.concat(chunks).toString()),key=req.headers['idempotency-key'];
   if(input.organization_id!==fixture.ids.org)throw Error('Synthetic business unavailable');
   const {validateCommand}=await import('../src/workspace/domain/contracts.mjs');validateCommand(input.command,input.input);
   if(commandNames[input.command]){send(await dbTools.command(fixture.db,commandNames[input.command],input.input,{key}));return;}
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
 }catch(error){send({error:{message:error.message,code:error.code==='40001'?'changed':'invalid_action'}},error.code==='40001'?409:400);}
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
