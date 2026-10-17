import {build} from 'esbuild';
import {resolve} from 'node:path';
export async function bundleWaterfront(output){await Promise.all([['waterfront-client.js','waterfront.js'],['client.js','client.js']].map(([source,name])=>build({entryPoints:[resolve(import.meta.dirname,'../src',source)],outfile:resolve(output,'assets',name),bundle:true,minify:true,format:'esm',target:['es2022']})));}
