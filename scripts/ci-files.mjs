import {readdir,readFile} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';

export async function filesUnder(directory){
 const files=[];
 async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){const child=resolve(path,entry.name);if(entry.isDirectory())await walk(child);else if(entry.isFile())files.push(child);else throw Error('Unexpected non-file build entry: '+child);}}
 await walk(directory);return files.sort();
}
export async function buildManifest(directory){
 const entries=[];
 for(const file of await filesUnder(directory))entries.push({path:relative(directory,file).split(sep).join('/'),sha256:createHash('sha256').update(await readFile(file)).digest('hex')});
 return entries;
}
