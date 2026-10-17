import {STAGES,SAMPLES,emptyState,addSample,updateRecord,displayRecords,readSaved,saveState,clearSaved,exportCsv} from './lead-workbench-state.js?v=20261015-v1';

const workbench=document.querySelector('#lead-workbench');
if(workbench){
 const get=id=>document.getElementById(id),status=get('workbench-status'),persistence=get('workbench-persistence'),remember=get('remember-samples');
 let storage;try{storage=window.localStorage;}catch{}
 const restored=readSaved(storage);let state=restored.state,selectedId=state.records[0]?.sampleId??null;
 remember.checked=restored.status==='restored';
 const announce=message=>{status.textContent=message;};
 let storageWarning='';
 const persistenceText=()=>{persistence.textContent=storageWarning||(remember.checked?'Synthetic changes are saved in this browser for this website and survive reload. Other tabs on this browser can access the same unprotected storage.':'Memory only: changes disappear when you reload or close this page unless you enable browser saving.');};
 const persist=()=>{if(remember.checked){if(saveState(storage,state))storageWarning='';else{remember.checked=false;storageWarning='Browser saving failed. Current changes remain in memory only; an older saved copy may return after reload. Use Reset to clear saved data or your browser’s site-data controls.';}}persistenceText();return !storageWarning;};
 const removeSavedCopy=()=>{const cleared=clearSaved(storage);storageWarning=cleared?'':'Browser storage could not be cleared. Current changes remain in memory only; an older saved copy may return after reload. Use Reset to try again or clear this website’s data in browser settings.';return cleared;};
 function renderEditor(){
  const record=displayRecords(state).find(item=>item.sampleId===selectedId),editor=get('sample-editor');editor.hidden=!record;get('editor-empty').hidden=Boolean(record);
  if(!record)return;
  get('selected-sample-title').textContent=record.name+' · '+record.business;
  get('selected-sample-request').textContent=record.request;
  get('selected-sample-email').textContent=record.email;
  get('sample-stage').value=record.stage;get('sample-notes').value=record.notes;
 }
 function renderList(){
  const records=displayRecords(state,{query:get('sample-search').value,stage:get('sample-filter').value}),list=get('sample-list');list.replaceChildren();
  get('sample-count').textContent=records.length+' of '+state.records.length+' synthetic records shown.';
  get('list-empty').hidden=records.length>0;get('list-empty').textContent=state.records.length?'No samples match these filters. Your records are still available when you clear the filters.':'Choose a sample inquiry above to create the first record.';
  get('export-samples').disabled=state.records.length===0;
  for(const record of records){const li=document.createElement('li'),button=document.createElement('button'),name=document.createElement('strong'),stage=document.createElement('span');button.type='button';button.setAttribute('aria-pressed',String(selectedId===record.sampleId));button.dataset.sampleId=record.sampleId;name.textContent=record.name+' · '+record.business;stage.textContent=record.stage;button.append(name,stage);button.addEventListener('click',()=>{selectedId=record.sampleId;renderList();renderEditor();get('selected-sample-title').focus();});li.append(button);list.append(li);}
 }
 function refresh(){renderList();renderEditor();}
 get('add-sample').addEventListener('click',()=>{
  const result=addSample(state,get('sample-inquiry').value);state=result.state;selectedId=result.sampleId;
  get('sample-search').value='';get('sample-filter').value='all';const saved=persist();refresh();
  announce((result.created?'One synthetic record added.':'This sample already exists; opened it without adding a duplicate.')+(saved?'':' Browser storage needs attention; see the storage note.'));get('selected-sample-title').focus();
 });
 get('save-sample').addEventListener('click',()=>{
  try{state=updateRecord(state,selectedId,{stage:get('sample-stage').value,notes:get('sample-notes').value});const saved=persist();refresh();announce('Sample stage and notes updated.'+(saved?'':' Browser storage needs attention; see the storage note.'));}
  catch(error){announce(error.message);get('sample-notes').focus();}
 });
 get('sample-search').addEventListener('input',renderList);get('sample-filter').addEventListener('change',renderList);
 get('clear-filters').addEventListener('click',()=>{get('sample-search').value='';get('sample-filter').value='all';renderList();get('sample-search').focus();});
 remember.addEventListener('change',()=>{if(remember.checked){const saved=persist();announce(saved?'Saving enabled for these synthetic records.':'Saving is unavailable; changes are kept in memory only.');}else{const cleared=removeSavedCopy();persistenceText();announce(cleared?'Saved copy removed. Current samples remain in memory until reload.':'The saved copy could not be cleared; see the storage note.');}});
 get('reset-samples').addEventListener('click',()=>{const cleared=removeSavedCopy();state=emptyState();selectedId=null;remember.checked=false;get('sample-search').value='';get('sample-filter').value='all';refresh();persistenceText();announce(cleared?'Workbench reset and its saved copy removed. Downloaded CSV files are not deleted.':'Visible workbench reset. Saved browser data could not be cleared; see the storage note.');get('sample-inquiry').focus();});
 get('export-samples').addEventListener('click',()=>{const csv=exportCsv(state),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='synthetic-lead-workbench.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('CSV download prepared for all '+state.records.length+' synthetic records, including any hidden by filters. Formula-like values are prefixed with an apostrophe.');});
 // Controls never become a native submission path when JavaScript is unavailable.
 workbench.hidden=false;get('workbench-loading').hidden=true;persistenceText();refresh();
 if(restored.status==='restored')announce('Saved synthetic records restored from this browser.');
 else if(restored.status==='invalid'){persistence.textContent='Saved demo data was invalid and was not loaded. Start with the supplied samples; Reset removes the unusable saved copy.';announce('Invalid saved data was ignored; workbench starts empty.');}
 else if(restored.status==='unavailable')persistence.textContent='Browser storage is unavailable. You can use the workbench in memory; changes disappear on reload.';
}
