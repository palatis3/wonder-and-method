import {readFile,writeFile,cp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {transform} from 'esbuild';

// All browser assets live with the experience source so a clean checkout can build it.
export async function bundleExperience(output){
 const root=resolve(import.meta.dirname,'..');
 await cp(resolve(root,'experience/assets'),resolve(output,'assets/experience'),{recursive:true});
 for(const [file,loader] of [['style.css','css'],['client.js','js']]){
  const source=await readFile(resolve(root,'experience',file),'utf8');
  const {code}=await transform(source,{loader,minify:true,target:['chrome110','safari16']});
  await writeFile(resolve(output,`assets/experience.${loader}`),code);
 }
}
