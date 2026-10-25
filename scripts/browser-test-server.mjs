import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from './server.mjs';

// This server has only synthetic SQLite intake. It has no delivery credentials,
// email integration or production target, even if browser mocking fails.
const port=process.argv[2]===undefined?4187:Number(process.argv[2]);
if(![4187,4198].includes(port))throw Error('Use a dedicated browser test port');
const runtime=await mkdtemp(join(tmpdir(),'wm-browser-'));
const {server,url}=await createServer({runtime,port});
let closing=false;
async function stop(){
 if(closing)return;closing=true;
 server.closeAllConnections();
 await new Promise(done=>server.close(done));
 if(!runtime.startsWith(join(tmpdir(),'wm-browser-')))throw Error('Unexpected test runtime');
 await rm(runtime,{recursive:true,force:true});
 process.exit(0);
}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
console.log(`Browser test server: ${url}; synthetic only, no outbound delivery.`);
