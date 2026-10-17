import {resolve} from 'node:path';
import {createServer} from './server.mjs';
const root=resolve(import.meta.dirname,'..');
const {url}=await createServer({siteDir:resolve(root,'.runtime/buffalo-motion-review'),runtime:resolve(root,'.runtime/buffalo-review-inquiries'),port:4221});
console.log(`Buffalo motion review: ${url} (synthetic inquiries; no email)`);
