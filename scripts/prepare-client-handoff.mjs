import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repository = fileURLToPath(new URL('../', import.meta.url));
const allowedExtensions = new Set(['.html', '.css', '.js', '.mjs', '.json', '.md', '.txt', '.xml', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.woff', '.woff2', '.mp4', '.webm']);
const privateNames = /(?:^|[-_.])(credentials?|secrets?|passwords?|tokens?|private|invoices?|billing|customers?|clients|database|backup|id_rsa|id_ed25519)(?:$|[-_.])/i;
const forbiddenDirectories = new Set(['node_modules', 'dist', 'output', 'verification', 'operations', 'authority', 'evidence']);
const hash = data => createHash('sha256').update(data).digest('hex');
const inside = (root, candidate) => { const rel = relative(root, candidate); return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel); };

function safeRelative(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes(':') || /[\x00-\x1f\x7f]/.test(value) || isAbsolute(value)) throw new Error('Manifest paths must be ordinary relative paths with forward slashes');
  const parts = value.split('/');
  if (parts.some(part => !part || part.startsWith('.') || /[ .]$/.test(part) || /[<>"|?*]/.test(part) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) throw new Error(`Unsafe manifest path: ${value}`);
  if (parts.some(part => privateNames.test(part) || forbiddenDirectories.has(part.toLowerCase())) || !allowedExtensions.has(extname(value).toLowerCase())) throw new Error(`Private, generated, or unsupported file is forbidden: ${value}`);
  return value;
}

async function noSymlinkAncestors(path) {
  let current = resolve(path);
  while (true) {
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error(`Symlinks or junctions are forbidden: ${current}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

async function regularFile(path) {
  await noSymlinkAncestors(path);
  const info = await lstat(path);
  if (!info.isFile() || info.nlink > 1) throw new Error(`Expected a regular, unlinked file: ${path}`);
}

async function treeFiles(root, prefix = '') {
  const files = [];
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const path = join(root, rel);
    const info = await lstat(path);
    if (info.isSymbolicLink()) throw new Error(`Symlinks are forbidden: ${rel}`);
    if (info.isDirectory()) files.push(...await treeFiles(root, rel));
    else { await regularFile(path); files.push(rel); }
  }
  return files.sort();
}

async function inventory(root) {
  const result = {};
  for (const path of await treeFiles(root)) result[path] = hash(await readFile(join(root, path)));
  return result;
}

function run(command, args, { cwd, env = process.env, label = basename(command), timeout = 120_000 } = {}) {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', timeout, maxBuffer: 4 * 1024 * 1024, windowsHide: true, shell: false });
  if (result.error || result.status !== 0) throw new Error(`${label} failed${result.error ? ` (${result.error.code || result.error.message})` : ` (exit ${result.status})`}. No delivery was completed. Run the failing command locally to inspect its output; raw output is withheld from the handoff.`);
  return result.stdout.trim();
}

async function findScanner(explicit, workspaceRoot) {
  const local = join(workspaceRoot, '.runtime/tools/gitleaks/bin', process.platform === 'win32' ? 'gitleaks.exe' : 'gitleaks');
  let candidate = explicit || process.env.GITLEAKS_BIN;
  if (!candidate) { try { await regularFile(local); candidate = local; } catch { candidate = 'gitleaks'; } }
  try { const version = run(candidate, ['version'], { label: 'Gitleaks availability check' }); return { command: candidate, version }; }
  catch { throw new Error('Gitleaks is required. Install Gitleaks 8.30 or newer, put it on PATH, or pass --gitleaks PATH. No secret-scan bypass is supported.'); }
}

function findPython(explicit) {
  for (const candidate of explicit ? [explicit] : ['python3', 'python']) {
    try { run(candidate, ['-c', 'import sys,zipfile; assert sys.version_info >= (3,9)'], { label: 'Python availability check' }); return candidate; } catch { /* Try the next executable. */ }
  }
  throw new Error('Python 3.9 or newer is required for standard-library ZIP creation and verification. Use --python PATH when it is not on PATH.');
}

async function scan(scanner, directory, scratch, label) {
  // Explicit default rules and empty ignore file prevent ambient config/allow comments suppressing scans.
  const config = join(scratch, 'scanner.toml');
  const ignore = join(scratch, 'scanner-ignore.txt');
  const report = join(scratch, `scan-${label}.json`);
  await writeFile(config, '[extend]\nuseDefault = true\n');
  await writeFile(ignore, '');
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GITLEAKS_')));
  run(scanner.command, ['dir', directory, '--config', config, '--gitleaks-ignore-path', ignore, '--ignore-gitleaks-allow', '--redact=100', '--no-banner', '--no-color', '--exit-code', '23', '--report-format', 'json', '--report-path', report], { cwd: scratch, env, label: `Gitleaks ${label} secret scan` });
  const findings = JSON.parse(await readFile(report, 'utf8'));
  if (!Array.isArray(findings) || findings.length !== 0) throw new Error(`Gitleaks ${label} scan did not return a clean report`);
}

async function copyAllowed(source, destination, paths, stripDocs = false) {
  for (const path of paths) {
    await regularFile(join(source, path));
    const target = join(destination, stripDocs ? path.slice('docs/'.length) : path);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(source, path), target);
    if (hash(await readFile(target)) !== hash(await readFile(join(source, path)))) throw new Error(`Source changed while copying: ${path}`);
  }
}

const zipProgram = `import hashlib,json,pathlib,sys,zipfile
root=pathlib.Path(sys.argv[1]); archive=pathlib.Path(sys.argv[2])
paths=sorted(p for p in root.rglob('*') if p.is_file())
with zipfile.ZipFile(archive,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for path in paths: z.write(path,path.relative_to(root).as_posix())
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None, 'ZIP CRC check failed'
    names=z.namelist()
    assert len(names)==len(set(names)), 'Duplicate archive paths'
    actual={name:hashlib.sha256(z.read(name)).hexdigest() for name in sorted(names)}
expected={p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
assert actual==expected, 'ZIP differs from delivered folder'
print(json.dumps({'files':len(actual),'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()}))
`;

/** Build only trusted client source: this is a packaging safety boundary, not a code sandbox. */
export async function prepareClientHandoff({ source = join(repository, 'templates/client-site'), outputRoot = join(repository, 'output/client-handoffs'), manifest: manifestPath, gitleaks, python, workspaceRoot = repository } = {}) {
  source = resolve(source); outputRoot = resolve(outputRoot); workspaceRoot = resolve(workspaceRoot);
  if (![join(workspaceRoot, 'output'), join(workspaceRoot, '.runtime')].some(root => outputRoot === root || inside(root, outputRoot))) throw new Error('Handoff output must be under this workspace output/ or .runtime/');
  if (source === outputRoot || inside(source, outputRoot) || inside(outputRoot, source)) throw new Error('Source and output must be disjoint; output-inside-source is forbidden');
  await noSymlinkAncestors(source); await noSymlinkAncestors(outputRoot);
  if (!(await lstat(source)).isDirectory()) throw new Error('Source must be a dedicated client directory');
  manifestPath = resolve(manifestPath || join(source, 'handoff-manifest.json'));
  if (!inside(source, manifestPath)) throw new Error('Manifest must be inside the selected client source');
  await regularFile(manifestPath);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.schemaVersion !== 1 || !/^[a-z][a-z0-9-]{2,63}$/.test(manifest.clientSlug || '') || typeof manifest.displayName !== 'string' || !manifest.displayName.trim() || /[\r\n\x00-\x1f<>]/.test(manifest.displayName) || manifest.displayName.length > 120 || !['fictional-sample', 'client-delivery'].includes(manifest.status)) throw new Error('Invalid handoff manifest identity or status');
  if (!Array.isArray(manifest.sourceFiles) || !manifest.sourceFiles.length || !Array.isArray(manifest.documentFiles) || !manifest.documentFiles.length) throw new Error('Explicit sourceFiles and documentFiles allowlists are required');
  const seen = new Set();
  for (const file of [...manifest.sourceFiles, ...manifest.documentFiles]) {
    safeRelative(file);
    if (seen.has(file.toLowerCase())) throw new Error(`Duplicate manifest path: ${file}`);
    seen.add(file.toLowerCase());
    await regularFile(join(source, file));
  }
  if (manifest.sourceFiles.some(file => file.startsWith('docs/')) || manifest.documentFiles.some(file => !file.startsWith('docs/'))) throw new Error('documentFiles must be under docs/; sourceFiles must be outside docs/');
  for (const required of ['package.json', 'README.md', 'scripts/build.mjs', 'scripts/check.mjs', 'scripts/preview.mjs', 'public/index.html']) if (!manifest.sourceFiles.includes(required)) throw new Error(`Missing required source file: ${required}`);
  const packageJson = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
  if (['dependencies', 'devDependencies', 'optionalDependencies'].some(key => Object.keys(packageJson[key] || {}).length)) throw new Error('This starter handoff supports dependency-free sites only; use a separately reviewed workflow for dependency installation');
  const scanner = await findScanner(gitleaks, workspaceRoot);
  const pythonCommand = findPython(python);
  await mkdir(outputRoot, { recursive: true });
  const scratch = await mkdtemp(join(outputRoot, '.handoff-'));
  const delivery = join(scratch, 'delivery');
  const name = `${manifest.clientSlug}-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
  const finalDirectory = join(outputRoot, name);
  const finalZip = `${finalDirectory}.zip`;
  let moved = false;
  try {
    const website = join(delivery, 'website-source');
    await mkdir(website, { recursive: true });
    await copyAllowed(source, website, manifest.sourceFiles);
    await copyAllowed(source, join(delivery, 'docs'), manifest.documentFiles, true);
    await scan(scanner, delivery, scratch, 'source');
    const sourceHashes = await inventory(website);
    run(process.execPath, ['scripts/build.mjs'], { cwd: website, label: 'Fresh-copy build' });
    run(process.execPath, ['scripts/check.mjs'], { cwd: website, label: 'Fresh-copy check' });
    const output = join(website, 'dist');
    await noSymlinkAncestors(output);
    const builtPaths = await treeFiles(output);
    if (!builtPaths.includes('index.html')) throw new Error('Fresh build must produce dist/index.html');
    for (const file of builtPaths) safeRelative(file);
    const builtHashes = await inventory(output);
    await mkdir(join(delivery, 'ready-to-host'));
    await copyAllowed(output, join(delivery, 'ready-to-host'), builtPaths);
    // The delivered source remains a clean rebuildable copy, with no generated dist or extra files.
    await rm(output, { recursive: true });
    if (JSON.stringify(await inventory(website)) !== JSON.stringify(sourceHashes)) throw new Error('Build/check modified the allowlisted source or introduced unlisted source files');
    if (JSON.stringify(await inventory(join(delivery, 'ready-to-host'))) !== JSON.stringify(builtHashes)) throw new Error('Ready-to-host files differ from the verified build');
    await mkdir(join(delivery, 'verification'));
    await writeFile(join(delivery, 'verification/handoff-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    const status = manifest.status === 'fictional-sample'
      ? 'FICTIONAL SAMPLE: no real client launch, public form submission, or email delivery has been verified. No deployment is performed by this command.'
      : 'SOURCE DELIVERY: this folder alone does not verify a launch, public form submission, or email delivery. Refer to the separate project launch record.';
    await writeFile(join(delivery, 'START-HERE.md'), `# ${manifest.displayName}\n\n${status}\n\n## Your files\n\n- website-source/: editable source, build, check and local preview scripts.\n- ready-to-host/: static files from the successful fresh-copy build; upload the contents to the agreed static host.\n- docs/: editing, deployment, scope and service limitations.\n- verification/: manifest, build/scan result and SHA-256 inventory.\n\n## Edit and preview\n\nInstall Node.js 24 or newer. No dependency install is needed. Open website-source/ in your code editor. From that folder run:\n\n\x60\x60\x60sh\nnode scripts/build.mjs\nnode scripts/check.mjs\nnode scripts/preview.mjs\n\x60\x60\x60\n\nOpen http://127.0.0.1:4173 and use Ctrl+C to stop. Edit public/; rebuild before deploying. See website-source/README.md for full instructions. Python and Gitleaks are needed only by the studio's packaging command, not to edit, build, preview or host this delivered site.\n\nThe website package includes custom code, one initial launch, a source ZIP, two review rounds and the agreed 30-day defect correction. The signed scope controls price, page cap, creative scope and all terms. This archive creates no accounts or ongoing services. There is no bundled CMS/editor, portal, store, CRM, configured booking/newsletter account, tracking-number setup or scheduled growth follow-up.\n\nStatic source/build files are portable. Connected provider services, DNS, email, form endpoints, secrets, and accounts require separate setup or migration. The sample sends nothing. Automated checks and a clean scanner result do not guarantee the absence of every secret or replace browser and launch review.\n`);
    await scan(scanner, delivery, scratch, 'delivery');
    const verification = {
      createdAt: new Date().toISOString(), status: manifest.status,
      freshCopyBuild: 'passed', freshCopyCheck: 'passed', sourceUnchanged: true,
      sourceFileCount: Object.keys(sourceHashes).length, readyToHostFileCount: builtPaths.length,
      nodeVersion: process.version,
      secretScan: { tool: 'Gitleaks', version: scanner.version, passes: ['allowlisted source and docs before execution', 'complete delivery before verification metadata'], findings: 0, rules: 'built-in defaults; ambient config, ignore lists and inline allow comments disabled', limitation: 'A clean scan does not guarantee that all secrets or private information are absent. Review client ownership and content before release.' },
      launch: 'not performed or verified by packager', formAndEmail: 'not verified by packager',
      automatedCheckScope: 'Runs the delivered build/check scripts; starter checks HTML metadata and local HTML references. Browser, accessibility, provider and live-delivery checks are separate.',
      archiveIntegrity: 'ZIP creation checks CRC and compares every archive path and SHA-256 with the completed delivery folder. Archive SHA-256 is returned by the CLI.'
    };
    await writeFile(join(delivery, 'verification/results.json'), `${JSON.stringify(verification, null, 2)}\n`);
    const sums = await inventory(delivery);
    await writeFile(join(delivery, 'verification/SHA256SUMS.txt'), `${Object.entries(sums).map(([path, digest]) => `${digest}  ${path}`).join('\n')}\n`);
    const temporaryZip = join(scratch, 'handoff.zip');
    const zip = JSON.parse(run(pythonCommand, ['-c', zipProgram, delivery, temporaryZip], { label: 'ZIP creation and round-trip verification' }));
    await rename(delivery, finalDirectory); moved = true;
    await rename(temporaryZip, finalZip);
    return { directory: finalDirectory, zip: finalZip, archiveSha256: zip.sha256, archiveFiles: zip.files, sourceFiles: Object.keys(sourceHashes).length, builtFiles: builtPaths.length, status: manifest.status };
  } catch (error) {
    if (moved) await rm(finalDirectory, { recursive: true, force: true });
    throw error;
  } finally { await rm(scratch, { recursive: true, force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const options = {};
    const names = { '--source': 'source', '--out': 'outputRoot', '--manifest': 'manifest', '--gitleaks': 'gitleaks', '--python': 'python' };
    for (let index = 2; index < process.argv.length; index++) {
      const flag = process.argv[index];
      if (flag === '--help') { console.log('node scripts/prepare-client-handoff.mjs [--source CLIENT_FOLDER] [--out output/client-handoffs] [--manifest FILE] [--gitleaks EXECUTABLE] [--python EXECUTABLE]\nDefaults to the fictional templates/client-site starter. Requires Node >=24, Python >=3.9 and Gitleaks >=8.30. Builds trusted source locally; does not deploy or send files.'); process.exit(0); }
      if (!names[flag] || !process.argv[index + 1] || process.argv[index + 1].startsWith('--')) throw new Error(`Unknown or incomplete option: ${flag}`);
      if (Object.hasOwn(options, names[flag])) throw new Error(`Duplicate option: ${flag}`);
      options[names[flag]] = process.argv[++index];
    }
    console.log(JSON.stringify(await prepareClientHandoff(options), null, 2));
  } catch (error) { console.error(`Handoff failed: ${error.message}`); process.exitCode = 1; }
}
