// Local UI preview only. It never connects to a business database or provider.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const port=Number(process.env.PORT||4198),root=new URL('../src/workspace/',import.meta.url);
const allowed=new Set(['index.html','app.css','app.mjs','favicon.svg','domain/contracts.mjs','domain/channels.mjs']);
createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/session'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({user:null,csrf:'local-ui-preview-only'}));return;}
  if(url.pathname.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{message:'This is a local interface preview. Live accounts are not connected.'}}));return;}
  const file=url.pathname==='/'||url.pathname.startsWith('/workspace/')||url.pathname.startsWith('/operator/')?'index.html':url.pathname.slice(1);
  if(!allowed.has(file)){res.writeHead(404);res.end('Not found');return;}
  const data=await readFile(new URL(file,root));res.writeHead(200,{'Content-Type':file.endsWith('.mjs')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.svg')?'image/svg+xml':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(500);res.end('Preview unavailable');}
}).listen(port,'127.0.0.1',()=>console.log(`Workspace preview: http://127.0.0.1:${port}`));
