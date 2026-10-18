import { cp, lstat, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
async function checkTree(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const info = await lstat(path);
    if (info.isSymbolicLink()) throw new Error(`Symlinks are not supported: ${path}`);
    if (info.isDirectory()) await checkTree(path);
    else if (!info.isFile()) throw new Error(`Unsupported file: ${path}`);
  }
}
await checkTree(join(root, 'public'));
const dist = join(root, 'dist');
try { if ((await lstat(dist)).isSymbolicLink()) throw new Error('dist must not be a symlink'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await rm(dist, { recursive: true, force: true });
await mkdir(dist);
await cp(join(root, 'public'), dist, { recursive: true });
console.log('Built static site into dist/.');
