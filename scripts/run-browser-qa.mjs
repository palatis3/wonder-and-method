import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const cli=process.argv[2];
if(!cli)throw new Error('Pass the installed playwright-cli JS entry path.');
const code=readFileSync(process.argv[3]||new URL('./browser-qa.txt',import.meta.url),'utf8');
const result=spawnSync(process.execPath,[cli,'-s=wonder','run-code',code],{encoding:'utf8',maxBuffer:10*1024*1024});
writeFileSync(process.argv[4]||new URL('../evidence/browser-qa.txt',import.meta.url),result.stdout+'\n'+result.stderr);
console.log(result.stdout);if(result.stderr)console.error(result.stderr);process.exitCode=result.status||(/### Error/.test(result.stdout)?1:0);
