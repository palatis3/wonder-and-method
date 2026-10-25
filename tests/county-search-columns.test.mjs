import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {packCountySearch,packCountySearchCards,decodeCountySearchCards} from '../src/assets/county-directory.js';
const envelope=bytes=>({encoding:'gzip-base64',format:'columns-v1',data:gzipSync(bytes).toString('base64')});

test('column search encoding preserves large dictionary indices, repeated names, merged types and card order',async()=>{
 const names=Array.from({length:70001},(_,i)=>'name '+i),dictionary={names,indices:new Map(names.map((name,i)=>[name,i]))};
 const expected=[['ca:name 70000','ca:name 0','s:name 65535','s:name 65536','o:name 128'],['y:name 1','z:name 127','y:name 1']];
 const packed=expected.map(card=>packCountySearch(card.join('|'),dictionary));
 assert.deepEqual(await decodeCountySearchCards(envelope(packCountySearchCards(packed)),names),expected);
 assert.deepEqual(await decodeCountySearchCards({encoding:'gzip-base64',data:gzipSync(packed.join('\n')).toString('base64')},names),expected);
 const manyTypes=Array.from({length:257},(_,i)=>'type'+i+':name 0');
 assert.deepEqual(await decodeCountySearchCards(envelope(packCountySearchCards([packCountySearch(manyTypes.join('|'),dictionary)])),names),[manyTypes]);
});

test('column search decoding rejects truncated payloads and missing names while accepting an empty inventory',async()=>{
 const bytes=packCountySearchCards(['c:0,1']);
 await assert.rejects(()=>decodeCountySearchCards(envelope(bytes.subarray(0,bytes.length-1)),['first','second']),/Invalid county search columns/);
 await assert.rejects(()=>decodeCountySearchCards(envelope(bytes),['first']),/Missing county search name/);
 assert.deepEqual(await decodeCountySearchCards(envelope(packCountySearchCards([])),[]),[]);
});
