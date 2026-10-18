import {inquiryResponseHtml} from '../src/inquiry-response.mjs';
import http from 'node:http';
import {readFile,mkdir,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateInquiry} from '../src/inquiry.mjs';
import {escapeHtml,selectedInquiryContext} from '../src/shared.mjs';
import {prefillInquiryHtml} from '../src/inquiry-prefill.mjs';
const root=resolve(import.meta.dirname,'..');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.ico':'image/x-icon','.mp4':'video/mp4','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
const security={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'",'Cache-Control':'no-store'};
export async function createServer({runtime=resolve(root,'.runtime'),port=4183,siteDir=resolve(root,'dist')}={}){
 siteDir=resolve(siteDir);
 await mkdir(runtime,{recursive:true});
 const db=new DatabaseSync(resolve(runtime,'inquiries.sqlite'));
 db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS inquiries (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, fingerprint TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL); CREATE INDEX IF NOT EXISTS inquiry_fingerprint ON inquiries(fingerprint,created_at);');
 const attempts=new Map();
 const server=http.createServer(async(req,res)=>{
  const host=req.headers.host;
  const validHosts=[`127.0.0.1:${server.address().port}`,`localhost:${server.address().port}`];
  if(!validHosts.includes(host)){res.writeHead(403,security);res.end('Host not allowed');return;}
  const url=new URL(req.url,`http://${host}`);
  const reply=(status,payload,retry)=>{const json=req.headers.accept?.includes('application/json');res.writeHead(status,{...security,'Content-Type':json?'application/json':'text/html; charset=utf-8'});res.end(json?JSON.stringify(payload):inquiryResponseHtml({...payload,retry}));};
  try{
   if(url.pathname==='/api/inquiries'){
    if(req.method!=='POST'){reply(405,{message:'Use POST for inquiries.'});return;}
    const origin=req.headers.origin;
    if((origin&&origin!==`http://${host}`)||req.headers['sec-fetch-site']==='cross-site'){reply(403,{message:'Submit from this website.'});return;}
    const now=Date.now(),ip=req.socket.remoteAddress;
    const recent=(attempts.get(ip)||[]).filter(t=>now-t<60000);recent.push(now);attempts.set(ip,recent);
    if(recent.length>5){reply(429,{message:'Too many attempts. Your details have not been saved. Wait one minute and try again.'});return;}
    const type=req.headers['content-type']?.split(';')[0];
    if(!['application/json','application/x-www-form-urlencoded'].includes(type)){reply(415,{message:'Use the inquiry form to send these details.'});return;}
    let body='',size=0;
    for await(const chunk of req){size+=chunk.length;if(size>16000){reply(413,{message:'The request is too large. Shorten your message.'});return;}body+=chunk;}
    let data;try{data=type==='application/json'?JSON.parse(body):Object.fromEntries(new URLSearchParams(body));}catch{reply(400,{message:'The request could not be read. Please try again.'});return;}
    const {value,errors}=validateInquiry(data);
    if(Object.keys(errors).length){reply(422,{message:'Check the highlighted fields. Nothing has been saved.',errors,service:value.service,...selectedInquiryContext(value)},value);return;}
    const fingerprint=createHash('sha256').update(JSON.stringify(value)).digest('hex');
    const existing=db.prepare('SELECT id FROM inquiries WHERE fingerprint=? AND created_at>?').get(fingerprint,new Date(now-86400000).toISOString());
    const id=existing?.id||randomUUID();
    if(!existing)db.prepare('INSERT INTO inquiries VALUES (?,?,?,?,?)').run(id,new Date(now).toISOString(),fingerprint,JSON.stringify(value),'synthetic_saved_not_emailed');
    reply(existing?200:201,{reference:id,synthetic:true,email:value.email,service:value.service,...selectedInquiryContext(value),message:`Synthetic inquiry ${existing?'already recorded':'saved'}. Reference: ${id}. No email was sent; actual inbox verification remains pending.`});return;
   }
   if(!['GET','HEAD'].includes(req.method)){reply(405,{message:'Method not allowed.'});return;}
   let path;try{path=decodeURIComponent(url.pathname);}catch{reply(400,{message:'Invalid path.'});return;}
   if(path.includes('\\')||path.includes('\0')){reply(400,{message:'Invalid path.'});return;}
   let file=resolve(siteDir,'.'+path);
   if(!file.startsWith(siteDir+sep)&&file!==siteDir){reply(403,{message:'Access denied.'});return;}
   let code=200;
   try{let info;try{info=await stat(file);}catch{if(extname(file))throw Error();file+='.html';info=await stat(file);}if(info.isDirectory()){if(!path.endsWith('/')){res.writeHead(308,{...security,Location:path+'/'+url.search});res.end();return;}file=resolve(file,'index.html');}await stat(file);}catch{file=resolve(siteDir,'404/index.html');code=404;}
   let bytes=await readFile(file);if(code===200&&extname(file)==='.html')bytes=Buffer.from(prefillInquiryHtml(bytes.toString('utf8'),url));res.writeHead(code,{...security,'Content-Type':types[extname(file)]||'application/octet-stream','Content-Length':bytes.length});res.end(req.method==='HEAD'?undefined:bytes);
  }catch{if(!res.headersSent)reply(503,{message:'The inquiry service is unavailable. Your entries remain in the form; please try again.'});else res.end();}
 });
 server.on('close',()=>db.close());
 await new Promise((done,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{server.removeListener('error',reject);done();});});
 return {server,db,url:`http://127.0.0.1:${server.address().port}`};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const {url}=await createServer({port:Number(process.env.PORT||4183)});console.log(`Local: ${url} (loopback-only, synthetic records, no email)`);}
