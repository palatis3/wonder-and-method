import assert from 'node:assert/strict';

export function verifyWorkerVersion(expectedWorkerVersion,observedWorkerVersion){
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
 assert.match(expectedWorkerVersion||'',uuid,'Supply the expected deployed Worker UUID.');
 assert.match(observedWorkerVersion||'',uuid,'The authenticated runtime must expose a valid Worker version binding.');
 assert.equal(observedWorkerVersion,expectedWorkerVersion,'Running Worker version differs from the expected release.');
 return {expectedWorkerVersion,observedWorkerVersion,verified:true,source:'authenticated_runtime_version_binding'};
}

export function verifyTechnicalManifest(manifest,current){
 assert.equal(manifest.schemaVersion,1,'Unsupported technical manifest.');
 assert.equal(manifest.kind,'website-technical','Business approval is separate.');
 assert.equal(manifest.dirty,false,'Technical checks must run from clean source before deploy.');
 for(const key of ['commit','sourceSha256','artifactSha256']){
  assert.ok(current[key],`Missing current ${key}`);
  assert.equal(manifest[key],current[key],`Technical verification no longer matches ${key}; rerun technical:check.`);
 }
 assert.deepEqual(manifest.checks,['build','tests','static-verification','worker-dry-run'],'Incomplete technical check sequence.');
 return true;
}
