import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderPages} from '../src/pages.mjs';
import {crawlFiles} from '../src/seo.mjs';
import {contentHash, nextPageDates, assertPageDates} from '../scripts/page-dates.mjs';
import worker from '../deployment/worker.mjs';

const read = async path => JSON.parse(await readFile(new URL('../' + path, import.meta.url), 'utf8'));
const [config, offers, map, geography, dates] = await Promise.all(['config/site.json', 'config/offers.json', 'authority/v5/site-map.json', 'authority/v5/geography.json', 'config/page-dates.json'].map(read));
const pages = renderPages({config, offers, map, geography});
const schema = page => JSON.parse(page.html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);

test('catalog offers lead to visible pricing anchors and resolve to named service entities', () => {
  const pricing = pages.find(page => page.path === '/pricing/');
  const catalog = schema(pricing).find(node => node['@type'] === 'OfferCatalog');
  assert.equal(catalog.itemListElement.length, 8);
  for (const offer of catalog.itemListElement) {
    const target = new URL(offer.url);
    assert.equal(target.pathname, '/pricing/');
    assert.ok(pricing.html.includes('id="' + target.hash.slice(1) + '"'));
    const serviceURL = new URL(offer.itemOffered['@id']);
    const service = schema(pages.find(page => page.path === serviceURL.pathname)).find(node => node['@id'] === offer.itemOffered['@id']);
    assert.ok(service?.name);assert.ok(service?.description);
    assert.ok(service.offers.some(item => item['@id'] === offer['@id']));
  }
  const seo = schema(pages.find(page => page.path === '/services/seo/')).find(node => node['@type'] === 'Service');
  assert.deepEqual(seo.offers.map(item => item.price), [offers.plans.improve.monthly_price, offers.plans.grow.monthly_price]);
  assert.ok(seo.offers.every(item => item.priceSpecification.unitCode === 'MON'));
});

test('public sitemap and directory include every published page except the error page and use recorded modification dates', () => {
  const crawl = crawlFiles(config, pages), urls = [...crawl.sitemap.matchAll(/<url><loc>(.*?)<\/loc><lastmod>(.*?)<\/lastmod><\/url>/g)];
  assert.equal(urls.length, pages.length-1);assert.ok(urls.some(([,url])=>url===config.origin+'/services/'));assert.ok(urls.some(([,url])=>url===config.origin+'/payments/'));
  for (const [, url, date] of urls) assert.equal(date, dates[new URL(url).pathname].modifiedAt);
  assert.match(crawl.llms, /\/pricing\//);assert.match(crawl.llms, /\/checkout\//);assert.match(crawl.llms, /\/areas\/new-york\//);assert.doesNotMatch(crawl.llms,/\/areas\/albany-county\/|\/404\/|\/api\/operator/);
  const missing = pages.find(page => page.path === '/404/');
  assert.doesNotMatch(missing.html, /rel="canonical"|property="og:url"/);
});

test('content dates change with content and stay stable across byline date updates', () => {
  const page = {path: '/example/', html: '<main><p class="journal-byline">Updated today</p><h1>Original</h1></main>'};
  const first = nextPageDates([page], {}, '2026-10-17');
  const byline = {...page, html: page.html.replace('today', 'tomorrow')};
  assert.equal(contentHash(byline.html), contentHash(page.html));
  assert.deepEqual(nextPageDates([byline], first, '2026-10-18'), first);
  const changed = {...page, html: page.html.replace('Original', 'Revised')};
  assert.throws(() => assertPageDates([changed], first), /Changed routes: \/example\//);
  assert.equal(nextPageDates([changed], first, '2026-10-18')['/example/'].modifiedAt, '2026-10-18');
});

test('edge robots policy permits all published content while private endpoints remain restricted', async () => {
  const env = {ENVIRONMENT: 'production', RELEASE_APPROVED: 'true', SEARCH_INDEXING: 'true', ASSETS: {fetch: async () => new Response('page')}};
  for (const route of ['/privacy/', '/payments/', '/work/fieldwork/', '/areas/monroe-county/','/checkout/launch-site/']) {
    const response = await worker.fetch(new Request('https://example.test' + route), env, {});
    assert.equal(response.headers.get('X-Robots-Tag'), null);
  }
  const privatePage = await worker.fetch(new Request('https://example.test/api/operator/inquiries'), env, {});
  assert.match(privatePage.headers.get('X-Robots-Tag'), /noindex, nofollow/);
});
