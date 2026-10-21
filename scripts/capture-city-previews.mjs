// Capture current local concept pages; keep the surrounding studio navigation out.
// node scripts/capture-city-previews.mjs [Sharp module path | --python] [local origin] [--serve]
// --serve owns a synthetic dist server on port 4192 and closes it after capture.
import {chromium} from '@playwright/test';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {conceptPages} from '../src/portfolio-concepts.mjs';

const args=process.argv.slice(2),positional=args.filter(arg=>!arg.startsWith('--'));
const require=createRequire(import.meta.url),sharpModule=positional.find(arg=>!/^https?:/.test(arg))||'sharp';
const origin=new URL(positional.find(arg=>/^https?:/.test(arg))||'http://127.0.0.1:4192');
if(origin.protocol!=='http:'||!['127.0.0.1','localhost'].includes(origin.hostname))throw Error('Capture a local build only.');
if(args.includes('--serve')&&origin.port!=='4192')throw Error('The capture server uses port 4192 only.');
let sharp;
if(!args.includes('--python')){try{sharp=require(sharpModule);}catch(error){if(sharpModule!=='sharp')throw error;}}
const encoder=sharp?'sharp':'python-pillow';
const root=resolve(import.meta.dirname,'..'),output=resolve(root,'src/assets/work/concepts');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceFiles=['src/portfolio-concepts.mjs','src/assets/portfolio-concepts.css','src/buyer-experience.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(sourceFiles.map(async path=>[path,hash(await readFile(resolve(root,path)))])));
const sourceHashes=await hashes(),expected=conceptPages(),builtPages={};
await mkdir(output,{recursive:true});

const pillowEncoder = `
from PIL import Image
from io import BytesIO
from pathlib import Path
import json,sys
image=Image.open(BytesIO(sys.stdin.buffer.read())).convert('RGB')
target=Path(sys.argv[1])
image.save(target,format='WEBP',quality=92,method=6)
records=[dict(file=target.name,width=image.width,height=image.height)]
for width in json.loads(sys.argv[2]):
    if width>=image.width: continue
    height=round(image.height*width/image.width)
    resized=image.resize((width,height),Image.Resampling.LANCZOS)
    variant=target.with_name(target.stem+'-'+str(width)+'.webp')
    resized.save(variant,format='WEBP',quality=84,method=6)
    records.append(dict(file=variant.name,width=resized.width,height=resized.height))
print(json.dumps(records))
`;
async function encode(bytes,file,widths){
 let encoded=[];
 if(sharp){
  await sharp(bytes).webp({quality:92,effort:6}).toFile(resolve(output,file));
  const base=await sharp(resolve(output,file)).metadata();encoded.push({file,width:base.width,height:base.height});
  for(const width of widths.filter(width=>width<base.width)){
   const variant=file.replace('.webp','-'+width+'.webp');
   await sharp(bytes).resize({width,withoutEnlargement:true}).webp({quality:84,effort:6}).toFile(resolve(output,variant));
   const meta=await sharp(resolve(output,variant)).metadata();encoded.push({file:variant,width:meta.width,height:meta.height});
  }
 }else{
  const result=spawnSync(process.env.PYTHON||'python',['-c',pillowEncoder,resolve(output,file),JSON.stringify(widths)],{input:bytes,windowsHide:true,maxBuffer:4*1024*1024});
  if(result.error||result.status!==0)throw Error('Pillow encoding failed: '+(result.error?.message||result.stderr?.toString()));
  encoded=JSON.parse(result.stdout.toString());
 }
 return Promise.all(encoded.map(async item=>{const bytes=await readFile(resolve(output,item.file));return {path:'/assets/work/concepts/'+item.file,width:item.width,height:item.height,bytes:bytes.length,sha256:hash(bytes)};}));
}

let local,browser;
const records=[];
try{
 if(args.includes('--serve')){const {createServer}=await import('./server.mjs');local=await createServer({runtime:resolve(root,'.runtime/city-preview-captures'),siteDir:resolve(root,'dist'),port:4192});}
 const css=await fetch(new URL('/assets/portfolio-concepts.css',origin));
 if(!css.ok||await css.text()!==await readFile(resolve(root,'src/assets/portfolio-concepts.css'),'utf8'))throw Error('The served concept CSS is stale; build the current source first.');
 browser=await chromium.launch({headless:true});
 for(const camera of ['desktop','phone']){
  const page=await browser.newPage({viewport:camera==='desktop'?{width:1440,height:1200}:{width:700,height:1600},deviceScaleFactor:camera==='desktop'?1:2,reducedMotion:'reduce'});
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin.origin?route.continue():route.abort());
  for(const id of ['fieldwork','northline','hearthside']){
   const path='/work/'+id+'/',response=await page.goto(new URL(path+'?qa=1',origin).href);
   if(!response?.ok())throw Error('Concept page unavailable: '+path);
   const html=await response.text();
   if(!html.replace(/\?v=[a-f0-9]+(?=")/g,'').includes(expected.find(page=>page.path===path).body))throw Error('The served concept copy is stale: '+path);
   builtPages[path]=hash(Buffer.from(html));
   await page.evaluate(()=>document.fonts.ready);
   await page.locator('.concept-hero img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
   const clip=await page.locator('.portfolio-concept').evaluate(article=>{const box=article.getBoundingClientRect(),hero=article.querySelector('.concept-hero').getBoundingClientRect();return {x:box.x+scrollX,y:box.y+scrollY,width:box.width,height:hero.bottom-box.top};});
   const bytes=await page.screenshot({clip,animations:'disabled'}),file=id+'-showcase-'+camera+'.webp';
   const [base,...variants]=await encode(bytes,file,camera==='desktop'?[640,960]:[]);
   records.push({id,camera,...base,variants});
  }
  await page.close();
 }
 if(JSON.stringify(await hashes())!==JSON.stringify(sourceHashes))throw Error('Capture sources changed during the run; capture the finished build again.');
 await writeFile(resolve(root,'src/city-preview-captures.json'),JSON.stringify({capturedAt:new Date().toISOString(),encoder,sourceHashes,builtPages,records},null,2)+'\n');
 console.log('Captured six actual concept previews and six desktop variants with '+encoder+'.');
}finally{
 await browser?.close();
 // createServer closes its synthetic database when the server emits close.
 if(local)await new Promise((resolve,reject)=>local.server.close(error=>error?reject(error):resolve()));
}
