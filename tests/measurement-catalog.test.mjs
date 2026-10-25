import test from 'node:test';
import assert from 'node:assert/strict';
import {countyMeasurementCatalog,measurementPageType,measurementTypeTotals} from '../deployment/measurement-catalog.mjs';
import {formatMeasurement} from '../deployment/production-operator.mjs';

test('reviewed area inventory includes independent cities and counts shared pages once',()=>{
 for(const path of ['/areas/virginia/alexandria-city/','/areas/virginia/hampton-roads/','/areas/maryland/baltimore-area/']){
  assert.equal(countyMeasurementCatalog.filter(row=>row.path===path).length,1,path);
 }
 assert.equal(new Set(countyMeasurementCatalog.map(row=>row.page)).size,countyMeasurementCatalog.length);
 for(const page of ['areas_maryland_baltimore_city','areas_maryland_baltimore_county']){
  assert.equal(measurementPageType(page),'Retired county pages');
  assert.ok(!countyMeasurementCatalog.some(row=>row.page===page));
 }
 assert.equal(measurementPageType('areas_virginia_alexandria_city'),'County and equivalent-area services');
 assert.equal(measurementPageType('areas_virginia'),'Service-area directories and hubs');
 assert.equal(measurementPageType('guide'),'Guides');
 assert.equal(measurementPageType('areas_unknown_historical_county'),'Unclassified recorded keys');
});

test('page-type totals preserve every event exactly once without turning events into visitors',()=>{
 const counts=[
  {page:'areas_virginia_alexandria_city',event:'page_view',total:4},
  {page:'areas_virginia_alexandria_city',event:'contact_select',total:2},
  {page:'areas_virginia',event:'page_view',total:8},
  {page:'areas_maryland_baltimore_area',event:'page_view',total:3},
  {page:'areas_maryland_baltimore_city',event:'page_view',total:5},
  {page:'guide',event:'page_view',total:6},
  {page:'guide',event:'resource_select',total:7},
  {page:'unrecognized_old_key',event:'page_view',total:11},
 ];
 const copy=JSON.stringify(counts),totals=measurementTypeTotals(counts);
 assert.equal(totals.reduce((n,row)=>n+row.pageViews+row.otherEvents,0),46);
 assert.deepEqual(totals.find(row=>row.type==='County and equivalent-area services'),{type:'County and equivalent-area services',pageViews:7,otherEvents:2});
 const text=formatMeasurement({days:7,since:'2026-10-18',daily:[],counts,arrivals:[],note:'Synthetic events.'});
 assert.match(text,/VA: \d+ pages \/ 4 views/);
 assert.match(text,/MD: \d+ pages \/ 3 views/);
 assert.match(text,/Retired county-page keys[\s\S]*Area — Maryland Baltimore City: 5/);
 assert.match(text,/Guides \| 6 \| 7/);
 assert.match(text,/Unclassified recorded keys \| 11 \| 0/);
 assert.match(text,/not independently verified live deployment/);
 assert.match(text,/not unique people or conversion rates/);
 assert.match(text,/^LA: 5 pages \/ 0 views/m,'Five approved Louisiana service pages belong in the current catalog.');
 assert.match(text,/^AR: 3 pages \/ 0 views/m,'Three approved Arkansas service pages belong in the current catalog.');
 assert.equal(JSON.stringify(counts),copy);
});
