import test from 'node:test';
import assert from 'node:assert/strict';
import {minorFromMicros,metricRatio,proratedRefund,csvExport,allowedReturnPath,validateCommand,canonical} from '../../src/workspace/domain/contracts.mjs';
test('money preserves micros precision, signed rounding, missing data and actual period duration',()=>{
  assert.equal(minorFromMicros('1500000000'),150000);assert.equal(minorFromMicros('15000'),2);assert.equal(minorFromMicros('-15000'),-2);
  assert.equal(metricRatio(0,10),0);assert.equal(metricRatio(null,10),null);assert.equal(metricRatio(10,0),null);
  assert.equal(proratedRefund({paidMinor:75000,periodStart:'2026-02-01T05:00:00Z',periodEnd:'2026-03-01T05:00:00Z',effectiveAt:'2026-02-15T05:00:00Z'}),37500);
  assert.throws(()=>minorFromMicros('999999999999999999999999999999'));
});
test('exports neutralize formulas; redirects cannot leave the private app; command input cannot add roles',()=>{
  assert.match(csvExport([{name:'=HYPERLINK("https://evil.example")'}],['name']),/'=HYPERLINK/);
  assert.equal(allowedReturnPath('https://evil.example'),'/workspace/');assert.equal(allowedReturnPath('//evil.example'),'/workspace/');
  assert.equal(allowedReturnPath('/workspace/abc/work'),'/workspace/abc/work');
  assert.throws(()=>validateCommand('request.create',{outcome:'Test',actor_id:crypto.randomUUID()}),/unsupported fields/);
  assert.equal(canonical({z:2,a:1}),' {"a":1,"z":2}'.trim());
});
