import test from 'node:test';import assert from 'node:assert/strict';import {stat} from 'node:fs/promises';
import {workGallery,workItems,assetRoundsPreview,assetRoundsDetail} from '../src/work-gallery.mjs';
test('AssetRounds is real website work with actual desktop/phone captures while concepts stay labeled',async()=>{
 const html=workGallery({}),item=workItems({})[0];
 assert.equal(item.id,'assetrounds');assert.equal(item.href,'/work/assetrounds/');
 for(const path of ['desktop.webp','desktop-480.webp','desktop-960.webp','desktop-1440.webp','mobile.webp'])assert.ok((await stat(new URL('../src/assets/work/assetrounds/'+path,import.meta.url))).size>2000);
 assert.match(html,/id="assetrounds"/);assert.match(html,/alt="Actual AssetRounds website/);
 assert.match(html,/Website concepts · fictional businesses/);assert.match(html,/October 22, 2026 capture/);
 assert.match(html,/href="\/work\/assetrounds\/"/);
 const detail=assetRoundsDetail();assert.match(detail,/alt="Actual AssetRounds phone homepage/);
 assert.match(detail,/captured October 22, 2026/);
 assert.match(detail,/href="https:\/\/assetrounds.com\/" target="_blank" rel="noopener noreferrer"/);
 assert.match(assetRoundsPreview(),/href="\/work\/assetrounds\/"/);
});
