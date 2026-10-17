import {resolve} from 'node:path';
import {createServer} from './server.mjs';
const root=resolve(import.meta.dirname,'..');
const {url}=await createServer({siteDir:resolve(root,'.runtime/experience-review'),runtime:resolve(root,'.runtime/premium-inquiries'),port:Number(process.env.PORT||4214)});
console.log(`Premium site preview: ${url} (synthetic inquiries; no email)`);
