// Maintenance export: node scripts/prepare-responsive-images.mjs <optional Sharp module path>
// Reviewed originals are retained; ordinary builds use the checked-in derivatives.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,basename,extname} from 'node:path';
const require=createRequire(import.meta.url),sharp=require(process.argv[2]||'sharp');
const root=resolve(import.meta.dirname,'..');
const sources=[
 '/assets/work/concepts/fieldwork-desktop.webp','/assets/work/concepts/northline-desktop.webp','/assets/work/concepts/hearthside-desktop.webp',
 '/assets/work/studio-website.webp','/assets/work/lead-workbench.webp','/assets/waterfront/hero-desktop.webp',
 '/assets/creative-samples/photo-before.webp','/assets/creative-samples/photo-after.webp'
];
const manifest={};
for(const source of sources){
 const input=resolve(root,'src'+source),meta=await sharp(input).metadata(),variants=[];
 for(const width of [640,960].filter(width=>width<meta.width)){
  const path=source.slice(0,-extname(source).length)+`-${width}.webp`;
  await sharp(input).resize({width,withoutEnlargement:true}).webp({quality:82}).toFile(resolve(root,'src'+path));
  variants.push({path,width});
 }
 manifest[source]={width:meta.width,height:meta.height,variants:[...variants,{path:source,width:meta.width}]};
}
await writeFile(resolve(root,'src/assets/responsive-images.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Prepared responsive exports for ${sources.length} source images.`);
