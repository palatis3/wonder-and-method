// Explicit maintenance tool: node scripts/rasterize-brand-assets.mjs <sharp module path>
// Normal website builds copy the reviewed exports and do not need Sharp.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {readFile,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),sharp=require(process.argv[2]||'sharp');
const base=new URL('../src/assets/brand/',import.meta.url);
const square=await readFile(new URL('logo-square.svg',base));
for(const [name,size] of [['logo-square',512],['favicon-96',96],['apple-touch-icon',180]])await sharp(square).resize(size,size).removeAlpha().png().toFile(fileURLToPath(new URL(name+'.png',base)));
await sharp(await readFile(new URL('social-card.svg',base))).resize(1200,630).removeAlpha().png().toFile(fileURLToPath(new URL('social-card.png',base)));
const sizes=[16,32,48],images=await Promise.all(sizes.map(size=>sharp(square).resize(size,size).removeAlpha().png().toBuffer()));
const header=Buffer.alloc(6+sizes.length*16);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
let offset=header.length;
for(const [i,size] of sizes.entries()){const pos=6+i*16;header[pos]=size;header[pos+1]=size;header.writeUInt16LE(1,pos+4);header.writeUInt16LE(24,pos+6);header.writeUInt32LE(images[i].length,pos+8);header.writeUInt32LE(offset,pos+12);offset+=images[i].length;}
await writeFile(new URL('favicon.ico',base),Buffer.concat([header,...images]));
console.log('Exported opaque PNGs and a true 16/32/48 multi-image ICO from the vector master.');
