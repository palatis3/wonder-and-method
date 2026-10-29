// Encode an actual CUA browser capture; never render or synthesize page pixels.
import assert from 'node:assert/strict';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..'),require=createRequire(import.meta.url);
const sharp=require(process.argv[2]||'sharp'),capture=resolve(root,'evidence/v4-offers-20261029/homepage-capture.jpg');
const bytes=await readFile(capture),meta=await sharp(bytes).metadata();
assert.equal(meta.width,1426);assert.equal(meta.height,980);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const file=resolve(root,'src/portfolio-captures.json'),record=JSON.parse(await readFile(file,'utf8'));
const oldTracker=JSON.stringify(record.trackerCapture),capturedAt=(await stat(capture)).mtime.toISOString();
const asset='/assets/work/studio-website.webp',output=resolve(root,'src'+asset);
await sharp(bytes).webp({quality:92,effort:6}).toFile(output);
const variants=[];
for(const width of [240,480,640,960]){
 const path=asset.replace('.webp',`-${width}.webp`),target=resolve(root,'src'+path);
 await sharp(bytes).resize({width,withoutEnlargement:true}).webp({quality:82,effort:6}).toFile(target);
 const info=await sharp(target).metadata(),data=await readFile(target);
 variants.push({path,width:info.width,height:info.height,bytes:data.length,sha256:sha(data),quality:82});
}
for(const path of new Set([...Object.keys(record.sourceHashes),'config/offers.json','config/site.json','src/offer-catalog.mjs']))record.sourceHashes[path]=sha(await readFile(resolve(root,path)));
record.capturedAt=capturedAt;record.homeViewport={width:meta.width,height:meta.height};
const encoded=await readFile(output);
record.homeCapture={path:asset,width:meta.width,height:meta.height,bytes:encoded.length,sha256:sha(encoded),quality:92,variants,encoder:'sharp-webp',reducedMotion:'reduce',builtPage:{path:'dist/index.html',sha256:sha(await readFile(resolve(root,'dist/index.html')))},builtStyles:{'dist/assets/site-home.css':sha(await readFile(resolve(root,'dist/assets/site-home.css')))},capturedAt,captureMethod:'Actual CUA browser screenshot, fonts loaded and living-city ready; no pixel synthesis.',captureSourceSha256:sha(bytes)};
assert.equal(JSON.stringify(record.trackerCapture),oldTracker);
await writeFile(file,JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({capturedAt,dimensions:[meta.width,meta.height],assets:5,homepagePrice:2195,trackerPreserved:true}));
