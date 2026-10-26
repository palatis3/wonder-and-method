import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {decodeCountySearchAsset,packCountyNames,packCountySearch,packCountySearchCards,decodeCountySearchCards,packCountyBase91,unpackCountyBase91} from '../src/assets/county-directory.js';
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

const denseEnvelope=bytes=>({encoding:'gzip-base91',format:'columns-delta-v1',data:packCountyBase91(gzipSync(bytes,{level:9}))});
test('base91 roundtrips every byte value and partial final groups without script delimiters',()=>{
 const bytes=Uint8Array.from({length:4096},(_,i)=>(i*73+Math.floor(i/256))%256);
 for(const length of [0,1,2,3,4,5,6,7,8,9,13,14,15,16,127,128,255,256,257,1024,4095,4096]){
  const input=bytes.subarray(0,length),encoded=packCountyBase91(input);
  assert.doesNotMatch(encoded,/[<"\\]/);assert.deepEqual(unpackCountyBase91(encoded),input);
 }
});
test('relative columns and base91 preserve signed jumps, large indices, type boundaries and order',async()=>{
 const names=Array.from({length:70001},(_,i)=>'name '+i),dictionary={names,indices:new Map(names.map((name,i)=>[name,i]))};
 const expected=[['ca:name 70000','ca:name 0','ca:name 70000','s:name 65535','s:name 65536','o:name 128'],['y:name 1','z:name 127','y:name 1']];
 const cards=expected.map(card=>packCountySearch(card.join('|'),dictionary));
 const payload=denseEnvelope(packCountySearchCards(cards,{relative:true}));
 assert.doesNotMatch(payload.data,/[<"\\]/,'transport cannot terminate an HTML script or require JSON escaping');
 assert.deepEqual(JSON.parse(JSON.stringify(payload)),payload);
 assert.deepEqual(await decodeCountySearchCards(payload,names),expected);
 assert.deepEqual(await decodeCountySearchCards(denseEnvelope(packCountySearchCards([],{relative:true})),[]),[]);
});

test('dense transport rejects malformed alphabet, compression, headers and out-of-range references',async()=>{
 const bytes=packCountySearchCards(['c:0,1'],{relative:true});
 for(const data of ['<script>','a\\b','"',null])await assert.rejects(()=>decodeCountySearchCards({encoding:'gzip-base91',format:'columns-delta-v1',data},[]),/Invalid county search base91/);
 await assert.rejects(()=>decodeCountySearchCards({encoding:'gzip-base91',format:'columns-delta-v1',data:packCountyBase91(new Uint8Array([1,2,3,4]))},[]));
 await assert.rejects(()=>decodeCountySearchCards(denseEnvelope(bytes.subarray(0,-1)),['first','second']),/Invalid county search columns/);
 await assert.rejects(()=>decodeCountySearchCards(denseEnvelope(bytes),['first']),/Missing county search name/);
 await assert.rejects(()=>decodeCountySearchCards(denseEnvelope(packCountySearchCards(['c:-1'],{relative:true})),['first']),/Missing county search name/);
 const end=bytes.indexOf(10),header=JSON.parse(new TextDecoder().decode(bytes.subarray(0,end)));
 for(const patch of [{cards:-1},{cards:Number.MAX_SAFE_INTEGER},{groups:0},{indexWidth:7},{lengthBytes:0}]){
  const broken=Buffer.concat([Buffer.from(JSON.stringify({...header,...patch})+'\n'),bytes.subarray(end+1)]);
  await assert.rejects(()=>decodeCountySearchCards(denseEnvelope(broken),['first','second']),/Invalid county search/);
 }
});

const assetEnvelope=(names,cards)=>{
 const text=Buffer.from(packCountyNames(names)),header=Buffer.alloc(4);header.writeUInt32LE(text.length);
 return gzipSync(Buffer.concat([header,text,packCountySearchCards(cards,{relative:true})]));
};
test('static search asset preserves ordered typed terms and rejects damaged framing',async()=>{
 const names=['alpha','beta'],cards=['ca:1,-1|y:1','s:0'];
 const decoded=await decodeCountySearchAsset(assetEnvelope(names,cards));
 assert.deepEqual(decoded,{names,entries:[['ca:beta','ca:alpha','y:beta'],['s:alpha']]});
 for(const data of [new Uint8Array([1,2,3]),gzipSync(Buffer.from([0,0,0])),gzipSync(Buffer.from([255,255,255,255,0]))])await assert.rejects(()=>decodeCountySearchAsset(data));
 await assert.rejects(()=>decodeCountySearchAsset(assetEnvelope(['alpha'],['y:1'])),/Missing county search name/);
 const valid=assetEnvelope(names,cards);await assert.rejects(()=>decodeCountySearchAsset(valid.subarray(0,valid.length-5)));
});
