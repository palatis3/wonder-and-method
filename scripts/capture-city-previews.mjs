// Capture the real concept design, excluding the surrounding studio navigation.
// node scripts/capture-city-previews.mjs <Sharp module path> [local preview origin]
import {chromium} from '@playwright/test';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),sharp=require(process.argv[2]||'sharp');
const origin=new URL(process.argv[3]||'http://127.0.0.1:4189');
if(!['127.0.0.1','localhost'].includes(origin.hostname))throw Error('Capture a local build only.');
const root=resolve(import.meta.dirname,'..'),output=resolve(root,'src/assets/work/concepts');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true}),records=[];
try{
 for(const camera of ['desktop','phone']){
  const page=await browser.newPage({viewport:camera==='desktop'?{width:1440,height:1200}:{width:700,height:1600},deviceScaleFactor:camera==='desktop'?1:2,reducedMotion:'reduce'});
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin.origin?route.continue():route.abort());
  for(const id of ['fieldwork','northline','hearthside']){
   await page.goto(new URL('/work/'+id+'/?qa=1',origin).href);await page.evaluate(()=>document.fonts.ready);
   const clip=await page.locator('.portfolio-concept').evaluate(article=>{const box=article.getBoundingClientRect(),hero=article.querySelector('.concept-hero').getBoundingClientRect();return {x:box.x+scrollX,y:box.y+scrollY,width:box.width,height:hero.bottom-box.top};});
   const bytes=await page.screenshot({clip,animations:'disabled'}),path=`${id}-showcase-${camera}.webp`;
   await sharp(bytes).webp({quality:92}).toFile(resolve(output,path));
   const metadata=await sharp(resolve(output,path)).metadata();records.push({id,camera,path:'/assets/work/concepts/'+path,width:metadata.width,height:metadata.height,bytes:(await readFile(resolve(output,path))).length});
  }
  await page.close();
 }
}finally{await browser.close();}
const sourceFiles=['src/portfolio-concepts.mjs','src/assets/portfolio-concepts.css'];
const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async file=>[file,createHash('sha256').update(await readFile(resolve(root,file))).digest('hex')])));
await writeFile(resolve(root,'src/city-preview-captures.json'),JSON.stringify({capturedAt:new Date().toISOString(),sourceHashes,records},null,2)+'\n');
console.log('Captured six actual website concept previews.');
