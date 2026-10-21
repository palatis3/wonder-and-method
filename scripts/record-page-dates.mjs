import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {renderPages} from '../src/pages.mjs';
import {civicAssetState} from './build-civic-assets.mjs';
import {livingCityAssetState} from './build-living-city-assets.mjs';
import {nextPageDates} from './page-dates.mjs';

const root = resolve(import.meta.dirname, '..');
const read = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const [config, offers, map, tokens, geography, previous] = await Promise.all(['config/site.json', 'config/offers.json', 'authority/v5/site-map.json', 'authority/v5/design-tokens.json', 'authority/v5/geography.json', 'config/page-dates.json'].map(read));
Object.assign(config, await civicAssetState(root, config));
Object.assign(config, await livingCityAssetState(root, config));
const date = process.argv[process.argv.indexOf('--date') + 1];
if (!process.argv.includes('--date') || date > new Date().toISOString().slice(0, 10)) throw Error('Supply the actual review date, no later than today: --date YYYY-MM-DD');
const records = nextPageDates(renderPages({config, offers, map, tokens, geography}), previous, date);
await writeFile(resolve(root, 'config/page-dates.json'), JSON.stringify(records, null, 2) + '\n');
console.log('Recorded reviewed content dates for ' + Object.keys(records).length + ' pages.');
