import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import * as model from '../src/assets/lead-workbench-state.js';

const source=await readFile(new URL('../src/assets/lead-workbench.js',import.meta.url),'utf8');
const controller=source.replace(/^import [^\n]+\n/,'');
assert.notEqual(controller,source,'Controller harness must replace the module import with the real model exports');
const savedState=model.addSample(model.emptyState(),model.SAMPLES[0].id,'2026-10-15T12:00:00.000Z').state;

// Execute the actual controller and its event handlers with controllable storage failures.
// DOM stand-ins only support operations needed by the controller; this is not browser QA.
function mount(storage){
 const elements=new Map();
 function element(){return {value:'',checked:false,hidden:false,textContent:'',dataset:{},children:[],listeners:{},addEventListener(type,handler){this.listeners[type]=handler;},setAttribute(name,value){this[name]=value;},replaceChildren(...children){this.children=children;},append(...children){this.children.push(...children);},focus(){this.focused=true;}};}
 const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
 get('sample-inquiry').value=model.SAMPLES[0].id;get('sample-filter').value='all';
 runInNewContext(controller,{...model,document:{querySelector:selector=>get(selector.slice(1)),getElementById:get,createElement:element},window:{localStorage:storage}});
 const click=id=>{assert.equal(typeof get(id).listeners.click,'function',id);get(id).listeners.click();};
 return {get,click,note:()=>get('workbench-persistence').textContent,edit(text){get('sample-notes').value=text;get('sample-stage').value='Contacted';click('save-sample');},add(){get('sample-inquiry').value=model.SAMPLES[1].id;click('add-sample');},remember(checked){get('remember-samples').checked=checked;get('remember-samples').listeners.change();}};
}
function storageFixture(){let raw=JSON.stringify(savedState);const faults={write:false,clear:false};return {faults,storage:{getItem(key){assert.equal(key,model.STORAGE_KEY);return raw;},setItem(key,value){assert.equal(key,model.STORAGE_KEY);if(faults.write)throw Error('Quota exceeded');raw=value;},removeItem(key){assert.equal(key,model.STORAGE_KEY);if(faults.clear)throw Error('Clear blocked');raw=null;}},read:()=>raw};}
const assertUnresolved=app=>{assert.match(app.note(),/older saved copy may return after reload/);assert.doesNotMatch(app.note(),/^Memory only: changes disappear/);assert.equal(app.get('remember-samples').checked,false);};

test('controller retains failed-write warning through subsequent saves/adds until a successful overwrite',()=>{
 const fixture=storageFixture();fixture.faults.write=true;const app=mount(fixture.storage),original=fixture.read();
 assert.equal(app.get('remember-samples').checked,true);app.edit('First unsaved synthetic edit');assertUnresolved(app);assert.match(app.note(),/saving failed/);
 app.edit('Second unsaved synthetic edit');assertUnresolved(app);app.add();assertUnresolved(app);app.edit('New sample unsaved edit');assertUnresolved(app);
 assert.equal(fixture.read(),original);assert.match(app.get('workbench-status').textContent,/storage needs attention/);
 const reloaded=mount(fixture.storage);assert.equal(reloaded.get('sample-count').textContent,'1 of 1 sample inquiry shown.');assert.equal(reloaded.get('sample-notes').value,'');
 fixture.faults.write=false;app.remember(true);assert.doesNotMatch(app.note(),/older saved copy|saving failed/);assert.match(app.note(),/changes are saved/);
 const recovered=mount(fixture.storage);assert.equal(recovered.get('sample-count').textContent,'2 of 2 sample inquiries shown.');assert.equal(recovered.get('sample-notes').value,'Second unsaved synthetic edit');
});

for(const action of ['disable','reset'])test(`controller retains failed-${action} clear warning through edits/adds until a successful clear`,()=>{
 const fixture=storageFixture();fixture.faults.clear=true;const app=mount(fixture.storage),original=fixture.read();
 if(action==='disable')app.remember(false);else app.click('reset-samples');
 assertUnresolved(app);assert.match(app.note(),/could not be cleared/);app.add();assertUnresolved(app);app.edit('Later synthetic edit');assertUnresolved(app);app.add();assertUnresolved(app);
 assert.equal(fixture.read(),original);assert.equal(mount(fixture.storage).get('sample-count').textContent,'1 of 1 sample inquiry shown.');
 fixture.faults.clear=false;app.click('reset-samples');assert.equal(fixture.read(),null);assert.match(app.note(),/^Memory only:/);assert.doesNotMatch(app.note(),/could not be cleared|older saved copy/);
 app.add();app.edit('After successful clear');assert.match(app.note(),/^Memory only:/);assert.equal(mount(fixture.storage).get('sample-count').textContent,'1 of 1 sample inquiry shown.');assert.equal(fixture.read(),null,'The new fictional sample must not save itself');
});

test('successful overwrite resolves a failed-clear warning and successful clear resolves a failed-write warning',()=>{
 const clearFixture=storageFixture();clearFixture.faults.clear=true;const clearing=mount(clearFixture.storage);clearing.remember(false);clearing.edit('Synthetic overwrite');assertUnresolved(clearing);clearing.remember(true);assert.match(clearing.note(),/changes are saved/);assert.doesNotMatch(clearing.note(),/older saved copy/);assert.equal(mount(clearFixture.storage).get('sample-notes').value,'Synthetic overwrite');
 const writeFixture=storageFixture();writeFixture.faults.write=true;const writing=mount(writeFixture.storage);writing.edit('Synthetic failed write');assertUnresolved(writing);writing.click('reset-samples');assert.equal(writeFixture.read(),null);assert.match(writing.note(),/^Memory only:/);writing.add();assert.doesNotMatch(writing.note(),/older saved copy/);
});
