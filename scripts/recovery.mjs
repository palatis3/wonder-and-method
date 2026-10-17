import {cp,mkdir,readFile,readdir,writeFile,stat,rename,rm} from 'node:fs/promises';
import {resolve,join,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=resolve(import.meta.dirname,'..');
export async function manifest(folder){const rows=[];async function walk(dir){for(const name of (await readdir(dir)).sort()){const path=join(dir,name),info=await stat(path);if(info.isDirectory())await walk(path);else rows.push({path:relative(folder,path).split(sep).join('/'),sha256:createHash('sha256').update(await readFile(path)).digest('hex')});}}await walk(folder);return rows;}
export async function snapshot(workspace,label){if(!/^[a-z0-9][a-z0-9-]{0,60}$/.test(label))throw new Error('Use a lowercase release label.');const location=resolve(workspace,'.runtime/releases',label);await mkdir(location,{recursive:false});await cp(resolve(workspace,'dist'),join(location,'site'),{recursive:true});const files=await manifest(join(location,'site'));await writeFile(join(location,'manifest.json'),JSON.stringify({label,createdAt:new Date().toISOString(),files},null,2));return {location,files:files.length};}
export async function restore(workspace,label){
 if(!/^[a-z0-9][a-z0-9-]{0,60}$/.test(label))throw new Error('Invalid label');
 const location=resolve(workspace,'.runtime/releases',label),saved=JSON.parse(await readFile(join(location,'manifest.json'),'utf8'));
 const actual=await manifest(join(location,'site'));
 if(JSON.stringify(actual)!==JSON.stringify(saved.files))throw new Error('Snapshot checksum mismatch; restore refused');
 const live=resolve(workspace,'dist'),stage=resolve(workspace,'.runtime/restore-stage'),previous=resolve(workspace,'.runtime/before-restore');
 if(!stage.startsWith(resolve(workspace,'.runtime')+sep)||!previous.startsWith(resolve(workspace,'.runtime')+sep))throw new Error('Unsafe recovery paths');
 let hadLive=true;
 try{await stat(live);}catch(error){if(error.code==='ENOENT')hadLive=false;else throw error;}
 await rm(stage,{recursive:true,force:true});
 await cp(join(location,'site'),stage,{recursive:true});
 if(hadLive){await rm(previous,{recursive:true,force:true});await rename(live,previous);}
 try{await rename(stage,live);}catch(error){if(hadLive)await rename(previous,live);throw error;}
 return {restored:label,files:actual.length,previous:hadLive?previous:null};
}
async function main(){const [command,label]=process.argv.slice(2);await mkdir(resolve(root,'.runtime/releases'),{recursive:true});if(command==='snapshot')console.log(await snapshot(root,label));else if(command==='restore')console.log(await restore(root,label));else throw new Error('Use snapshot <label> or restore <label>. Local static artifacts only; source and inquiry records are untouched.');}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
