import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareClientHandoff } from '../scripts/prepare-client-handoff.mjs';

const repository = fileURLToPath(new URL('../', import.meta.url));
const template = join(repository, 'templates/client-site');
const localScanner = join(repository, '.runtime/tools/gitleaks/bin',process.platform === 'win32'?'gitleaks.exe':'gitleaks');
const scanner = process.env.GITLEAKS_BIN || (existsSync(localScanner)?localScanner:'gitleaks');
const digest = data => createHash('sha256').update(data).digest('hex');

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'wm-handoff-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, 'client');
  await cp(template, source, { recursive: true });
  const manifestPath = join(source, 'handoff-manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const options = { source, outputRoot: join(root, 'output'), workspaceRoot: root, gitleaks: scanner };
  return { root, source, manifest, options, save: () => writeFile(manifestPath, JSON.stringify(manifest)), run: overrides => prepareClientHandoff({ ...options, ...overrides }) };
}

async function hashes(root, prefix = '') {
  const result = {};
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(result, await hashes(root, rel));
    else result[rel] = digest(await readFile(join(root, rel)));
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

function python(script, ...args) {
  for (const command of ['python3', 'python']) {
    const check = spawnSync(command, ['-c', 'import sys; assert sys.version_info >= (3,9)'], { encoding: 'utf8', windowsHide: true });
    if (check.error || check.status !== 0) continue;
    const result = spawnSync(command, ['-c', script, ...args], { encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }
  assert.fail('Python >=3.9 must be installed to run the handoff integrity tests');
}

test('real scanner, fresh-copy build, ZIP inventory, and extracted-source rebuild agree', async t => {
  const f = await fixture(t);
  // Unlisted adjacent business records and unrelated client folders must never enter the delivery.
  await writeFile(join(f.source, 'invoice.json'), '{"private":"unlisted fixture"}');
  await mkdir(join(f.root, 'another-client'));
  await writeFile(join(f.root, 'another-client', 'index.html'), 'Unrelated client');
  const original = await hashes(f.source);
  const result = await f.run();
  assert.deepEqual(await hashes(f.source), original, 'Original source stays unchanged');
  assert.equal(result.status, 'fictional-sample');
  assert.equal(result.archiveSha256, digest(await readFile(result.zip)));
  const extracted = join(f.root, 'extracted');
  const archive = JSON.parse(python(`import hashlib,json,pathlib,sys,zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
    assert z.testzip() is None
    assert len(z.namelist()) == len(set(z.namelist()))
    for n in z.namelist():
        p=pathlib.PurePosixPath(n)
        assert not p.is_absolute() and '..' not in p.parts
    result={n:hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist()}
    z.extractall(sys.argv[2])
print(json.dumps(result))`, result.zip, extracted));
  assert.deepEqual(archive, await hashes(result.directory));
  assert.equal(result.archiveFiles, Object.keys(archive).length);
  assert.equal(Object.keys(archive).filter(path => path.startsWith('website-source/')).length, f.manifest.sourceFiles.length);
  for (const path of f.manifest.sourceFiles) assert.equal(archive[`website-source/${path}`], original[path]);
  assert(!Object.keys(archive).some(path => /invoice|another-client|\/dist\//.test(path)));
  const instructionPaths = ['START-HERE.txt', 'website-source/README.txt', ...f.manifest.documentFiles];
  assert(!Object.keys(archive).some(path => /\.md$/i.test(path)), 'Delivery contains plain-text instructions');
  for (const path of instructionPaths) {
    assert(Object.hasOwn(archive, path), `Missing instructions: ${path}`);
    const content = await readFile(join(extracted, path), 'utf8');
    assert.doesNotMatch(content, /^(?:#{1,6} |```|\|.*\|)|\*\*|`|\[[^\]]+\]\([^)]+\)/m, path);
    assert.doesNotMatch(content, /\.md\b|markdown|CMS|in-browser editor|portal|store|CRM|tracking-number|growth follow-up/i, path);
  }
  const sums = await readFile(join(extracted, 'verification/SHA256SUMS.txt'), 'utf8');
  for (const line of sums.trim().split('\n')) { const [expected, path] = line.split('  '); assert.equal(archive[path], expected, path); }
  assert.equal(sums.trim().split('\n').length, Object.keys(archive).length - 1);
  const website = join(extracted, 'website-source');
  for (const script of ['build.mjs', 'check.mjs']) {
    const run = spawnSync(process.execPath, [join(website, 'scripts', script)], { cwd: f.root, encoding: 'utf8', windowsHide: true });
    assert.equal(run.status, 0, run.stderr);
  }
  assert.deepEqual(await hashes(join(website, 'dist')), await hashes(join(extracted, 'ready-to-host')));
  const evidence = JSON.parse(await readFile(join(extracted, 'verification/results.json'), 'utf8'));
  assert.equal(evidence.secretScan.tool, 'Gitleaks');
  assert.equal(evidence.secretScan.findings, 0);
  assert.equal(evidence.freshCopyBuild, 'passed');
});

test('traversal, absolute paths, hidden files, private filenames, archives and duplicate aliases are rejected', async t => {
  for (const path of ['../outside.txt', '/absolute.txt', 'C:/outside.txt', 'public\\index.html', '.git/config', '.env', 'public/.env.example', 'docs/invoice.json', 'docs/credentials.json', 'docs/customer-backup.json', 'docs/data.sqlite', 'docs/source.zip', 'docs/guide.md', 'node_modules/pkg/index.js', 'public/CON.txt', 'public/trailing.txt ', 'public//index.html']) {
    await t.test(path, async t => {
      const f = await fixture(t);
      f.manifest.sourceFiles.push(path);
      await f.save();
      await assert.rejects(f.run(), /relative paths|Unsafe manifest path|forbidden|ENOENT/);
    });
  }
  const f = await fixture(t);
  f.manifest.sourceFiles.push('PUBLIC/INDEX.HTML'); await f.save();
  await assert.rejects(f.run(), /Duplicate manifest path/);
});

test('a multi-page handoff accepts directory links, sitemap and approved web motion assets', async t => {
  const f = await fixture(t);
  await mkdir(join(f.source, 'public/contact'));
  const home = await readFile(join(f.source, 'public/index.html'), 'utf8');
  await writeFile(join(f.source, 'public/index.html'), home.replace('</body>', '<nav><a href="/">Home</a><a href="/contact/">Contact</a><a href="./contact/#details">Details</a></nav></body>'));
  await writeFile(join(f.source, 'public/contact/index.html'), '<!doctype html><html lang="en"><head><title>Contact sample</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><h1 id="details">Contact</h1><a href="/">Home</a></body></html>');
  await writeFile(join(f.source, 'public/sitemap.xml'), '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.test/</loc></url></urlset>');
  // File transport fixtures, not playable-media assertions.
  for (const ext of ['mp4','webm']) await writeFile(join(f.source, 'public/hero.'+ext), Buffer.from('synthetic-media-packaging-fixture'));
  for (const name of ['contact/index.html','sitemap.xml','hero.mp4','hero.webm']) f.manifest.sourceFiles.push('public/'+name);
  await f.save();const result = await f.run();
  for (const name of ['contact/index.html','sitemap.xml','hero.mp4','hero.webm']) assert.deepEqual(await readFile(join(result.directory,'ready-to-host',name)), await readFile(join(f.source,'public',name)));
});

test('output overlap, source junctions and output junctions are rejected', async t => {
  const f = await fixture(t);
  await assert.rejects(f.run({ outputRoot: join(f.source, 'output') }), /output must be under/);
  const nested = join(f.root, 'output', 'client');
  await mkdir(dirname(nested), { recursive: true });
  await cp(f.source, nested, { recursive: true });
  await assert.rejects(f.run({ source: nested, outputRoot: join(nested, 'delivery') }), /disjoint/);
  await symlink(join(f.source, 'public'), join(f.source, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  f.manifest.sourceFiles.push('linked/index.html'); await f.save();
  await assert.rejects(f.run(), /Symlinks or junctions/);
  await symlink(f.source, join(f.root, 'output', 'linked-output'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(f.run({ outputRoot: join(f.root, 'output', 'linked-output') }), /Symlinks or junctions/);
});

test('missing scanner fails closed and produces no delivery', async t => {
  const f = await fixture(t);
  await assert.rejects(f.run({ gitleaks: join(f.root, 'missing-gitleaks') }), /Gitleaks is required/);
  await assert.rejects(readdir(f.options.outputRoot), /ENOENT/);
});

test('real scanner rejects a synthetic token even with an inline allow comment', async t => {
  const f = await fixture(t);
  await writeFile(join(f.source, 'public/service.js'), `const demo = "${'ghp_' + randomBytes(18).toString('hex')}"; // gitleaks:allow\n`);
  f.manifest.sourceFiles.push('public/service.js'); await f.save();
  await assert.rejects(f.run(), /Gitleaks source secret scan failed/);
  assert.deepEqual(await readdir(f.options.outputRoot), []);
});

test('fresh-copy check catches an omitted required asset and leaves no delivery', async t => {
  const f = await fixture(t);
  f.manifest.sourceFiles = f.manifest.sourceFiles.filter(path => path !== 'public/styles.css'); await f.save();
  await assert.rejects(f.run(), /Fresh-copy check failed/);
  assert.deepEqual(await readdir(f.options.outputRoot), []);
});

test('build cannot modify delivered source or add a forbidden generated file', async t => {
  for (const [name, tail, pattern] of [
    ['source mutation', "await (await import('node:fs/promises')).writeFile(new URL('../public/site.js', import.meta.url), '// changed');", /modified the allowlisted source/],
    ['generated credential file', "await (await import('node:fs/promises')).writeFile(new URL('../dist/.env', import.meta.url), 'PRIVATE_VALUE=fixture');", /Unsafe manifest path/],
    ['generated private data', "await (await import('node:fs/promises')).writeFile(new URL('../dist/invoice.json', import.meta.url), '{}');", /forbidden/]
  ]) await t.test(name, async t => {
    const f = await fixture(t);
    const path = join(f.source, 'scripts/build.mjs');
    await writeFile(path, `${await readFile(path, 'utf8')}\n${tail}\n`);
    await assert.rejects(f.run(), pattern);
    assert.deepEqual(await readdir(f.options.outputRoot), []);
  });
});

test('client instructions must use plain-text document filenames', async t => {
  const f = await fixture(t);
  await writeFile(join(f.source, 'docs/guide.html'), '<p>Instructions</p>');
  f.manifest.documentFiles.push('docs/guide.html');
  await f.save();
  await assert.rejects(f.run(), /documentFiles must be plain-text \.txt files/);
  await assert.rejects(readdir(f.options.outputRoot), /ENOENT/);
});
