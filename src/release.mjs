import {civicAssetState} from '../scripts/build-civic-assets.mjs';
import {livingCityAssetState} from '../scripts/build-living-city-assets.mjs';
import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
const digest=value=>createHash('sha256').update(value).digest('hex');
export async function releaseFingerprint(root){
 async function collect(paths){const entries=[];async function walk(path){const info=await stat(path);if(info.isDirectory()){for(const name of (await readdir(path)).sort())await walk(resolve(path,name));}else entries.push({path:relative(root,path).split(sep).join('/'),sha256:digest(await readFile(path))});}for(const path of paths)await walk(resolve(root,path));return entries.sort((a,b)=>a.path.localeCompare(b.path));}
 const artifacts=await collect(['dist']);
 // Bind the motion inputs consumed by the builder, not Blender files,
 // frame directories or render logs. Source edits invalidate approval even
 // before the corresponding dist files have been rebuilt.
 const config=JSON.parse(await readFile(resolve(root,'config/site.json'),'utf8'));
 const civic=await civicAssetState(root,config);
 const city=await livingCityAssetState(root,config);
 const source=await collect(['content','src','experience','scripts','authority/v5','package.json','package-lock.json','config/site.json','config/offers.json','config/page-dates.json','deployment/worker.mjs','deployment/public-route-canonical.mjs','deployment/retired-county-routes.mjs','deployment/inquiry-maintenance.mjs','deployment/inquiry-health.mjs','deployment/journey-counts.mjs','deployment/journey-dimensions.mjs','deployment/inquiry-rate.mjs','deployment/notification-budget.mjs','deployment/payment-records.mjs','deployment/migrations','deployment/wrangler.production.jsonc','deployment/package.json','deployment/package-lock.json','motion/civic-sculpture-preview.js','motion/civic-sculpture-preview.css',...(civic.civicSourceFiles??[]),...(city.livingCitySourceFiles??[])]);
 return {artifactSha256:digest(JSON.stringify(artifacts)),sourceSha256:digest(JSON.stringify(source))};
}
export function evaluateRelease(contract,evidence,current,config,deployment){
 const missing=contract.release_gates.filter(g=>!['live_verified','approved'].includes(evidence.gates[g.id]?.state)||!evidence.gates[g.id]?.evidence).map(g=>({gate:g.id,state:evidence.gates[g.id]?.state||'unrecorded',dependency:evidence.gates[g.id]?.evidence||g.acceptance}));
 for(const gate of ['inquiry','form_server','recovery'])if(evidence.gates[gate]?.state==='approved')missing.push({gate,dependency:'Actual live verification is required; approval alone does not verify provider/inbox or client-account recovery.'});
 if(!evidence.approvedVersion||evidence.approvedVersion.artifactSha256!==current.artifactSha256||evidence.approvedVersion.sourceSha256!==current.sourceSha256)missing.push({gate:'exact_version',dependency:'Approval must match both current source and generated-artifact SHA-256 digests.'});
 if((config.searchIndexing===true)!==(deployment.vars?.SEARCH_INDEXING==='true'))missing.push({gate:'indexing_consistency',dependency:'Frontend searchIndexing and Worker SEARCH_INDEXING must agree; owner authorization is required to change the intended indexing policy.'});
 const target=`https://${config.productionDomain}`;
 if(config.mode!=='production'||config.origin!==target||evidence.approvedTarget!==target)missing.push({gate:'exact_target',dependency:`Production mode, origin and approved target must all match ${target}.`});
 if(config.formMode!=='live'||!config.privacyReviewed||!config.contactVerified)missing.push({gate:'live_intake',dependency:'Reviewed live intake, privacy and verified mailbox required.'});
 const databases=deployment.d1_databases?.filter(x=>x.binding==='DB')||[];
 const databaseReady=databases.length===1&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(databases[0].database_id||'');
 if(deployment.vars?.ENVIRONMENT!=='production'||deployment.vars?.INQUIRY_MODE!=='live'||deployment.vars?.RELEASE_APPROVED!=='true'||!databaseReady||!deployment.routes?.some(x=>x.pattern===config.productionDomain&&x.custom_domain===true))missing.push({gate:'deployment_binding',dependency:'Production Worker needs reviewed live vars, one DB binding with actual non-placeholder UUID and the exact approved custom domain route.'});
 return {ready:!missing.length,currentVersion:current,target,missing,policy:'Edits invalidate version approval. Local checks never substitute for required live evidence.'};
}
