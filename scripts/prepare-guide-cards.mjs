// Related cards use the full-size reviewed artwork, contained in a 3:2 canvas.
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {journal} from '../src/journal.mjs';
const require=createRequire(import.meta.url),sharp=require(process.argv[2]||'sharp');
const root=resolve(import.meta.dirname,'..'),records=[];
for(const item of journal){
 const slug=item.path.split('/').filter(Boolean).at(-1);
 const source=resolve(root,'src/assets/guides',item.diagram?`${item.image}-social.png`:`${slug}-illustration.svg`);
 for(const width of [480,720,1080]){
  const output=resolve(root,`src/assets/guides/${slug}-card-${width}.webp`);
  const info=await sharp(source,{density:144}).resize(width,width*2/3,{fit:'contain',background:'#edf0e6'}).webp({quality:85}).toFile(output);
  records.push({slug,width,height:info.height,bytes:info.size});
 }
}
console.log(JSON.stringify(records));
