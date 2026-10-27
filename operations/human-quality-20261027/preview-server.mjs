import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {renderPages} from '../../src/pages.mjs';
const root=resolve(import.meta.dirname,'../..');
const names=['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json'];
const [config,offers,map,geography]=await Promise.all(names.map(async file=>JSON.parse(await readFile(resolve(root,file),'utf8'))));
// The production builder adds these rules to the shared CSS bundle. Keep the
// source preview's load order equivalent without mutating the frozen build.
const pages=new Map(renderPages({config,offers,map,geography}).map(page=>[page.path,page.html.replace('<link rel="stylesheet" href="/assets/layout-components.css">','<link rel="stylesheet" href="/assets/layout-components.css"><link rel="stylesheet" href="/assets/section-surfaces.css">')]));
const types={'.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2','.json':'application/json'};
const roots=[resolve(root,'src'),resolve(root,'dist')];
http.createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pages.has(path)){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(pages.get(path));return;}
  for(const folder of roots){
   const file=resolve(folder,'.'+path);if(!file.startsWith(folder+sep))continue;
   try{const content=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(content);return;}catch(error){if(!['ENOENT','EISDIR'].includes(error.code))throw error;}
  }
  res.writeHead(404);res.end('Not found');
 }catch(error){res.writeHead(500);res.end('Preview error');console.error(error.message);}
}).listen(4201,'127.0.0.1',()=>console.log(`Source preview: http://127.0.0.1:4201 (${pages.size} pages)`));
