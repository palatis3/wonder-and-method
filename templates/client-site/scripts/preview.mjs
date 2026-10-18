import { createServer } from 'node:http';
import { readFile, lstat } from 'node:fs/promises';
import { extname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT must be 1024–65535');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`);
    const rel = relative(root, file);
    if (rel === '..' || rel.startsWith(`..${sep}`) || rel.split(/[\\/]/).some(part => part.startsWith('.'))) throw new Error('Invalid path');
    let cursor = root;
    for (const part of rel.split(sep)) { cursor = resolve(cursor, part); if ((await lstat(cursor)).isSymbolicLink()) throw new Error('Symlink'); }
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Local preview: http://127.0.0.1:${port} — Ctrl+C to stop`));
