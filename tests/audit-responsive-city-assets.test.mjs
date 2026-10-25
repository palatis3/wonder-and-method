import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import responsiveImages from '../src/assets/responsive-images.json' with {type:'json'};
import {workItems,workGallery} from '../src/work-gallery.mjs';

const read=path=>readFile(new URL('../'+path,import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const captures=JSON.parse(await read('src/city-preview-captures.json'));
const manifest=JSON.parse(await read('public/living-city/manifest.json'));
const originalMedia={
  "desktopPoster": {
    "path": "/living-city/desktop-poster.webp",
    "bytes": 176090,
    "sha256": "c522de581f06c121baf51d5d2c63d55e7626063a91cadd951275108c542ef0e0",
    "width": 1440,
    "height": 960
  },
  "desktopEnd": {
    "path": "/living-city/desktop-end.webp",
    "bytes": 208104,
    "sha256": "46e34248e91f9fbcc2f52ec1cadbde97b4a78fe83a78f6d89d0e4216908aa018",
    "width": 1440,
    "height": 960
  },
  "desktopSmallPoster": {
    "path": "/living-city/desktop-small-poster.webp",
    "bytes": 72286,
    "sha256": "d8b24a4678f50fa8a1196af6c8f423ede522d7aa72bab8aa3c6f07bae6ae57cd",
    "width": 960,
    "height": 640
  },
  "desktopVideo": {
    "path": "/living-city/desktop-film.mp4",
    "bytes": 696070,
    "sha256": "7625f1db64ddf2dbb8ab69e72c335d9446cac762b9d5c45d3e8091adee9ceee3",
    "width": 1440,
    "height": 960
  },
  "mobilePoster": {
    "path": "/living-city/mobile-poster.webp",
    "bytes": 87472,
    "sha256": "148548f9eb9a3fe39c86a214b48a86fcf8ca96ae7444b18b78485eb8e71a72bf",
    "width": 828,
    "height": 1216
  },
  "mobileEnd": {
    "path": "/living-city/mobile-end.webp",
    "bytes": 103404,
    "sha256": "8697811a04bd52f4d7ee54b9595635009bb8429c8fe5de9831ac323b41b3e3eb",
    "width": 828,
    "height": 1216
  },
  "mobileSmallPoster": {
    "path": "/living-city/mobile-small-poster.webp",
    "bytes": 22528,
    "sha256": "a0b5aa54834c0008939908f2d3e90ab0423988dc6a58c5f98535d8eaa73baf7e",
    "width": 414,
    "height": 608
  },
  "mobileVideo": {
    "path": "/living-city/mobile-film.mp4",
    "bytes": 511892,
    "sha256": "faa4cf418551c2241c758726a9e89b1d7b34db169eeb8949e9af65d45502ffb8",
    "width": 828,
    "height": 1216
  }
};

function webpDimensions(bytes){
 assert.equal(bytes.toString('ascii',0,4),'RIFF');
 assert.equal(bytes.toString('ascii',8,12),'WEBP');
 for(let offset=12;offset+8<=bytes.length;){
  const type=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4),data=offset+8;
  if(type==='VP8 ')return {width:bytes.readUInt16LE(data+6)&0x3fff,height:bytes.readUInt16LE(data+8)&0x3fff};
  if(type==='VP8X')return {width:bytes.readUIntLE(data+4,3)+1,height:bytes.readUIntLE(data+7,3)+1};
  if(type==='VP8L'){const bits=bytes.readUInt32LE(data+1);return {width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1};}
  offset=data+size+(size%2);
 }
 throw Error('WebP dimensions missing');
}

test('work image dimensions and responsive descriptors match the real image bytes',async()=>{
 const tracker=responsiveImages['/assets/work/lead-workbench.webp'];
 assert.deepEqual(webpDimensions(await read('src/assets/work/lead-workbench.webp')),{width:tracker.width,height:tracker.height});
 for(const variant of tracker.variants)assert.equal(webpDimensions(await read('src'+variant.path)).width,variant.width,variant.path+' width descriptor');
 const waterfront=workItems({}).find(item=>item.id==='studies');
 const dimensions=webpDimensions(await read('src'+waterfront.image));
 assert.deepEqual({width:waterfront.width,height:waterfront.height},dimensions);
 assert.ok(workGallery({}).includes(`src="${waterfront.image}" width="${dimensions.width}" height="${dimensions.height}"`));
});

test('all six actual concept captures record the current copy and stylesheet',async()=>{
 const expected=['fieldwork','northline','hearthside'].flatMap(id=>['desktop','phone'].map(camera=>id+':'+camera)).sort();
 assert.deepEqual(captures.records.map(record=>record.id+':'+record.camera).sort(),expected);
 for(const [path,sha256] of Object.entries(captures.sourceHashes))assert.equal(hash(await read(path)),sha256,path+' changed since the captures');
 assert.equal(Object.keys(captures.builtPages).length,3);
 for(const id of ['fieldwork','northline','hearthside'])assert.match(captures.builtPages['/work/'+id+'/'],/^[a-f0-9]{64}$/);
});

test('responsive capture variants are real smaller WebP files with matching dimensions and integrity',async()=>{
 const paths=new Set();let variantCount=0;
 for(const record of captures.records){
  if(record.camera==='desktop')assert.deepEqual(record.variants.map(variant=>variant.width),[480,640,960]);
  else {assert.deepEqual(record.variants.map(variant=>variant.width),[350]);assert.equal(record.viewport.width,390);assert.equal(record.deviceScaleFactor,2);assert.ok(record.clip.width<=390);assert.equal(record.width,record.clip.width*2);}
  for(const asset of [record,...record.variants]){
   assert.ok(!paths.has(asset.path),asset.path);paths.add(asset.path);
   assert.match(asset.path,/^\/assets\/work\/concepts\/(?:fieldwork|northline|hearthside)-showcase-(?:desktop|phone)(?:-(?:350|480|640|960))?\.webp$/);
   const bytes=await read('src'+asset.path);
   assert.equal(bytes.length,asset.bytes,asset.path);assert.equal(hash(bytes),asset.sha256,asset.path);
   assert.deepEqual(webpDimensions(bytes),{width:asset.width,height:asset.height},asset.path);
   if(asset!==record){
    variantCount++;assert.ok(asset.width<record.width);assert.ok(asset.bytes<record.bytes);
    assert.ok(Math.abs(asset.height-record.height*asset.width/record.width)<=0.51,asset.path+' must retain the complete aspect ratio');
   }
  }
 }
 assert.equal(paths.size,18);assert.equal(variantCount,12);
});

test('the smaller initial mobile poster preserves the city dimensions and every original asset',async()=>{
 for(const [key,expected] of Object.entries(originalMedia)){
  const item=manifest.files[key];assert.ok(item,key);
  for(const field of ['path','bytes','sha256','width','height'])assert.equal(item[field],expected[field],key+' '+field);
  const bytes=await read('public'+item.path);assert.equal(bytes.length,item.bytes,key);assert.equal(hash(bytes),item.sha256,key);
 }
 const item=manifest.files.mobileWebPoster,original=manifest.files.mobilePoster;
 assert.equal(item.path,'/living-city/mobile-web-poster.webp');
 assert.deepEqual({width:item.width,height:item.height},{width:828,height:1216});
 assert.ok(item.bytes<=65000&&item.bytes<original.bytes);
 assert.ok(item.quality>=76&&item.quality<=82);
 assert.deepEqual(item.derivedFrom,{path:original.path,sha256:original.sha256});
 const bytes=await read('public'+item.path);
 assert.equal(bytes.length,item.bytes);assert.equal(hash(bytes),item.sha256);
 assert.deepEqual(webpDimensions(bytes),{width:item.width,height:item.height});
});
