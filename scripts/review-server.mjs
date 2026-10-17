import http from 'node:http';
import {readFile,stat,realpath} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=await realpath(resolve(import.meta.dirname,'../.runtime/editorial-review'));
const port=Number(process.argv.find(x=>x.startsWith('--port='))?.slice(7)||4186);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Use a valid local review port.');
const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src https://my.spline.design; form-action 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'"};
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json','.xml':'application/xml','.txt':'text/plain','.mp4':'video/mp4','.webp':'image/webp','.png':'image/png'};
http.createServer(async(req,res)=>{
 const reply=(status,text)=>{res.writeHead(status,headers);res.end(text);};
 if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host))return reply(403,'Host denied');
 if(!['GET','HEAD'].includes(req.method))return reply(405,'Read-only editorial preview. No submissions are collected.');
 try{
  const url=new URL(req.url,`http://127.0.0.1:${port}`),path=decodeURIComponent(url.pathname);
  if(path.includes('\\')||path.includes('\0'))return reply(400,'Invalid path');
  let file=resolve(root,'.'+path);
  if(file!==root&&!file.startsWith(root+sep))return reply(403,'Path denied');
  if((await stat(file)).isDirectory()){
   if(!path.endsWith('/')){res.writeHead(308,{...headers,Location:path+'/'});return res.end();}
   file=resolve(file,'index.html');
  }
  file=await realpath(file);if(!file.startsWith(root+sep))return reply(403,'Path denied');
  const bytes=await readFile(file);res.writeHead(200,{...headers,'Content-Type':types[extname(file)]||'application/octet-stream','Content-Length':bytes.length});res.end(req.method==='HEAD'?undefined:bytes);
 }catch{return reply(404,'Page unavailable in the review build');}
}).listen(port,'127.0.0.1',()=>console.log(`Private full-site editorial review: http://127.0.0.1:${port}/review/ (read-only)`));
