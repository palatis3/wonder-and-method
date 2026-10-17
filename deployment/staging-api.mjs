// Nonsecret staging-only packets for the connected Cloudflare API.
import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {extname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const config = JSON.parse(await readFile(join(root, 'deployment/wrangler.jsonc'), 'utf8'));
assert.equal(config.name, 'wonder-method-staging');
assert.equal(config.account_id, '4fc7ad8717e64e119476c2dcf8f0666e');
assert.equal(config.d1_databases.length, 1);
assert.equal(config.d1_databases[0].database_id, 'dfcded52-c87b-48f4-959a-84079e1cec97');
assert.equal(config.d1_databases[0].database_name, 'wonder-method-staging');
assert.equal(config.vars.ENVIRONMENT, 'staging');
assert.equal(config.vars.INQUIRY_MODE, 'synthetic');
assert.equal(config.vars.RELEASE_APPROVED, 'false');
assert.equal(config.assets.run_worker_first, true);
assert.equal(config.workers_dev, false);
const site = JSON.parse(await readFile(join(root, 'config/site.json'), 'utf8'));
assert.equal(site.mode, 'staging');
const manifest = {}, files = {};
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.xml':'application/xml','.json':'application/json'};
async function walk(dir, prefix='') {
  for (const item of await readdir(dir, {withFileTypes:true})) {
    const relative = prefix + item.name;
    assert(!item.isSymbolicLink(), 'Asset symlinks are forbidden');
    if (item.isDirectory()) { await walk(join(dir,item.name), relative+'/'); continue; }
    const type = types[extname(item.name)]; assert(type, `Unexpected asset type: ${relative}`);
    const bytes = await readFile(join(dir,item.name));
    if (item.name.endsWith('.html')) assert.match(bytes.toString(), /noindex/);
    const hash = createHash('sha256').update(bytes.toString('base64')+extname(item.name).slice(1)).digest('hex').slice(0,32);
    manifest['/'+relative] = {hash,size:bytes.length}; files[hash] = {bytes,type};
  }
}
await walk(join(root,'dist'));
const action = process.argv[2];
if (action === 'manifest') console.log(JSON.stringify({manifest}));
else if (action === 'packet') {
  const metadata = {main_module:'worker.js',compatibility_date:config.compatibility_date,compatibility_flags:config.compatibility_flags,
    bindings:[{type:'assets',name:'ASSETS'},{type:'d1',name:'DB',database_id:config.d1_databases[0].database_id},
      ...Object.entries(config.vars).map(([name,text])=>({type:'plain_text',name,text}))],
    keep_bindings:['secret_text'],keep_assets:true,
    assets:{config:{run_worker_first:true,html_handling:'auto-trailing-slash',not_found_handling:'404-page'}},observability:config.observability};
  console.log(JSON.stringify({metadata,code:await readFile(join(root,'deployment/dry-run/worker.js'),'utf8')}));
} else throw new Error('Expected manifest or packet. Upload changed assets through authenticated Wrangler.');
