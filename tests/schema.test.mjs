import test from 'node:test';import assert from 'node:assert/strict';
import {articleDateSchema} from '../src/schema.mjs';
test('Article schema preserves recorded datetimes and omits day-only dates without inventing a time',()=>{
 assert.deepEqual(articleDateSchema({datePublished:'2026-10-14',dateModified:'2026-10-16'}),{});
 const exact={datePublished:'2026-10-14T18:13:05-04:00',dateModified:'2026-10-16T20:23:06.702Z'};
 assert.deepEqual(articleDateSchema(exact),exact);
 assert.deepEqual(articleDateSchema({datePublished:'2026-10-14T18:13:05',dateModified:'invalid'}),{});
});
