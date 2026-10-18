// Explicit artwork export. Normal builds use the reviewed checked-in files.
// node scripts/prepare-content-art.mjs <optional Sharp module path>
import {createRequire} from 'node:module';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {renderPages} from '../src/pages.mjs';
import {socialCardPath} from '../src/social-cards.mjs';
import {guideArt} from '../src/guide-art.mjs';
const require = createRequire(import.meta.url), sharp = require(process.argv[2] || 'sharp');
const root = resolve(import.meta.dirname, '..');
const read = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const [config, offers, map, geography] = await Promise.all(['config/site.json', 'config/offers.json', 'authority/v5/site-map.json', 'authority/v5/geography.json'].map(read));
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function wrap(text, max) {
  const lines = [''];
  for (const word of text.split(/\s+/)) {
    if (lines.at(-1).length + word.length + 1 > max && lines.at(-1)) lines.push(word);
    else lines[lines.length - 1] += (lines.at(-1) ? ' ' : '') + word;
  }
  return lines;
}
await mkdir(resolve(root, 'src/assets/social'), {recursive: true});
const emblem=(await readFile(resolve(root,'src/assets/brand/emblem.svg'),'utf8')).replace('<svg ','<svg x="1010" y="85" width="92" height="60" ');
for (const page of renderPages({config, offers, map, geography})) {
  const output = socialCardPath(page.path); if (!output) continue;
  const lines = wrap(page.title.replace(/<[^>]+>/g, ''), 32);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#f2f2e8"/><rect x="42" y="42" width="1116" height="546" rx="4" fill="none" stroke="#a1afa0"/>${emblem}<text x="86" y="121" font-family="Arial,sans-serif" font-size="24" letter-spacing="2" fill="#38564a">WONDER AND METHOD</text>${lines.map((line, index) => `<text x="86" y="${237 + index * 73}" font-family="Georgia,serif" font-size="62" fill="#1d3029">${escape(line)}</text>`).join('')}<path d="M86 490h1028" stroke="#a1afa0"/><text x="86" y="542" font-family="Arial,sans-serif" font-size="24" fill="#38564a">Buffalo web studio · wonderandmethod.com</text></svg>`;
  await sharp(Buffer.from(svg)).png({compressionLevel: 9}).toFile(resolve(root, 'src' + output));
}
for (const [slug, rows] of Object.entries(guideArt)) {
  function diagram(width, height) {
    const scale = height / 800, left = 60, cardWidth = width - 120, rowHeight = 186 * scale;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#edf0e6"/>${rows.map(([title, description], index) => {
      const y = 64 * scale + index * 224 * scale;
      return `<rect x="${left}" y="${y}" width="${cardWidth}" height="${rowHeight}" rx="6" fill="#fafbf5" stroke="#a1afa0"/><text x="${left + 32}" y="${y + 62 * scale}" font-family="Arial,sans-serif" font-size="${30 * scale}" fill="#5f7865">0${index + 1}</text><text x="${left + 110}" y="${y + 67 * scale}" font-family="Georgia,serif" font-size="${44 * scale}" fill="#1d3029">${escape(title)}</text>${wrap(description, Math.floor(cardWidth / (18 * scale))).map((line, lineIndex) => `<text x="${left + 32}" y="${y + (125 + lineIndex * 35) * scale}" font-family="Arial,sans-serif" font-size="${29 * scale}" fill="#38564a">${escape(line)}</text>`).join('')}`;
    }).join('')}</svg>`;
  }
  const base = resolve(root, 'src/assets/guides/' + slug + '-illustration');
  const svg = diagram(1200, 800);
  await writeFile(base + '.svg', svg);
  for (const width of [640, 1200]) await sharp(Buffer.from(svg)).resize({width}).webp({quality: 88}).toFile(base + '-' + width + '.webp');
  for (const [suffix, width, height] of [['square', 800, 800], ['4x3', 1200, 900], ['16x9', 1280, 720]]) await sharp(Buffer.from(diagram(width, height))).png({compressionLevel: 9}).toFile(base + '-' + suffix + '.png');
}
// Preserve the complete portrait diagram in its landscape sharing/thumbnail exports.
const careDiagram=(await readFile(resolve(root,'src/assets/guides/care-versus-seo.svg'),'utf8')).replace('<svg ','<svg x="770" y="54" ');
const careShare=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#f8f7f2"/><path d="M54 58H700" stroke="#b9c5b5"/><g font-family="Arial,sans-serif" fill="#0e1b2a"><text x="54" y="110" font-size="24" letter-spacing="2">WONDER AND METHOD</text><text x="54" y="218" font-family="Georgia,serif" font-size="53"><tspan x="54">Care keeps it working.</tspan><tspan x="54" dy="72">SEO makes it useful.</tspan></text><text x="54" y="384" font-size="27"><tspan x="54">Monthly research. Complete improvements.</tspan><tspan x="54" dy="43">Connected growth and promotional reuse.</tspan></text><text x="54" y="548" font-size="23" fill="#38564a">Compare the work, scope and evidence.</text></g>${careDiagram}</svg>`;
for(const [suffix,width,height]of [['social',1200,630],['thumb',480,252]])await sharp(Buffer.from(careShare)).resize(width,height).png({compressionLevel:9}).toFile(resolve(root,`src/assets/guides/care-versus-seo-${suffix}.png`));
console.log('Prepared page social cards, nine topic-specific guide diagrams and care/SEO diagram exports.');
