import assert from 'node:assert/strict';
import { readFile, readdir, lstat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
let htmlCount = 0;
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    assert(!(await lstat(file)).isSymbolicLink(), 'No output symlinks');
    if (entry.isDirectory()) { await inspect(file); continue; }
    if (!entry.name.endsWith('.html')) continue;
    htmlCount++;
    const html = await readFile(file, 'utf8');
    assert.match(html, /<html\b[^>]*\blang=["'][^"']+["']/i, `${file}: document language`);
    assert.match(html, /<title>[^<]+<\/title>/i, `${file}: title`);
    assert.match(html, /name=["']viewport["']/i, `${file}: viewport`);
    assert.match(html, /<h1\b/i, `${file}: main heading`);
    for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
      const url = match[1];
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url)) continue;
      const [pathname, fragment] = url.split('#');
      const clean = decodeURIComponent(pathname.split('?')[0]);
      let target = clean ? resolve(clean.startsWith('/') ? dist : directory, clean.replace(/^\//, '')) : file;
      const rel = relative(dist, target);
      assert(rel !== '..' && !rel.startsWith(`..${sep}`), `${url}: outside site`);
      let info = await lstat(target);
      assert(!info.isSymbolicLink(), `${url}: no symlinks`);
      if (info.isDirectory()) { target = join(target, 'index.html'); info = await lstat(target); }
      assert(info.isFile() && !info.isSymbolicLink(), `${url}: expected a regular file`);
      if (fragment && target.endsWith('.html')) {
        const targetHtml = target === file ? html : await readFile(target, 'utf8');
        const ids = [...targetHtml.matchAll(/\bid=["']([^"']+)["']/g)].map(item => item[1]);
        assert(ids.includes(decodeURIComponent(fragment)), `${url}: missing fragment`);
      }
    }
  }
}
await inspect(dist);
assert(htmlCount > 0, 'At least one HTML page is required');
console.log(`Checked ${htmlCount} HTML page(s): metadata and local HTML references. Visual, accessibility, and external-service review remain manual.`);
