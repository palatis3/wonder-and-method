import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {buildManifest} from './ci-files.mjs';
const root=resolve(import.meta.dirname,'..'),output=resolve(root,'output/ci/reproducibility');
await mkdir(output,{recursive:true});
const build=()=>execFileSync(process.execPath,['scripts/build.mjs'],{cwd:root,stdio:'inherit',windowsHide:true});
// The builder empties only its fixed dist directory before each run. Compare
// every emitted byte, including version.json; no blanket metadata exclusions.
build();const first=await buildManifest(resolve(root,'dist'));
build();const second=await buildManifest(resolve(root,'dist'));
const before=new Map(first.map(row=>[row.path,row.sha256])),after=new Map(second.map(row=>[row.path,row.sha256]));
const differences=[...new Set([...before.keys(),...after.keys()])].filter(path=>before.get(path)!==after.get(path));
await writeFile(resolve(output,'report.json'),JSON.stringify({schemaVersion:1,checkedAt:new Date().toISOString(),files:first.length,first,second,differences},null,2)+'\n');
if(differences.length)throw Error('Clean builds differ: '+differences.slice(0,30).join(', '));
console.log(`Reproducible build: ${first.length} files are byte-identical across two clean builds.`);
