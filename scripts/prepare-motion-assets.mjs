import {mkdir,cp} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'public/motion');
await mkdir(out,{recursive:true});
for(const file of ['ribbon-loop.mp4','ribbon-poster.webp'])await cp(resolve(root,'output/motion',file),resolve(out,file));
for(const file of ['font-1.woff2','font-2.woff2'])await cp(resolve(root,'src/assets/fonts',file),resolve(out,file));
console.log('Remotion source assets prepared in public/motion.');
