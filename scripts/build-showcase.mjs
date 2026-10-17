import {mkdir,writeFile,cp,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {showcasePages} from '../showcase/pages.mjs';
const root=resolve(import.meta.dirname,'..');
export async function buildShowcase(output=resolve(root,'.runtime/editorial-review')){
 for(const dependency of ['assets/fonts.css','review/index.html','work/index.html']){
  try{if(!(await stat(resolve(output,dependency))).isFile())throw Error('Not a file');}
  catch{throw new Error('Showcase requires the complete private preview. Run npm run review:all-pages first. Missing: '+dependency);}
 }
 const pages=showcasePages();
 await mkdir(resolve(output,'concepts/assets'),{recursive:true});
 await cp(resolve(root,'showcase/assets'),resolve(output,'concepts/assets'),{recursive:true});
 for(const page of pages){const file=resolve(output,`.${page.path}index.html`);await mkdir(dirname(file),{recursive:true});await writeFile(file,page.html);}
 return pages.map(p=>p.path);
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename)){console.log(`Prepared ${(await buildShowcase()).length} private concept routes; no public dist change.`);}
