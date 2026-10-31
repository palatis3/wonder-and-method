// Run only against a new, unapplied migration produced by `supabase migration new`.
import {readFile,writeFile} from 'node:fs/promises';
import {CATALOG} from '../worker/workspace/commercial/catalog.mjs';
const path=process.argv[2];if(!path?.endsWith('.sql'))throw Error('Supply an unapplied migration path with a CATALOG_SEED marker.');
const sql=await readFile(path,'utf8');if(!sql.includes('-- CATALOG_SEED'))throw Error('Seed marker absent; never rewrite an applied catalog.');
const literal=value=>"'"+value.replaceAll("'","''")+"'";
const seed=CATALOG.map(c=>{const json=literal(JSON.stringify(c));return `insert into wm.catalog_registry(catalog_id,variant,catalog_version,snapshot,digest) select s->>'id',s->>'variant',s->>'catalog_version',s,wm.hash_json(s) from (values(${json}::jsonb)) seed(s);`;}).join('\n');
await writeFile(path,sql.replace('-- CATALOG_SEED',seed));console.log(`Seeded ${CATALOG.length} immutable catalog variants.`);
