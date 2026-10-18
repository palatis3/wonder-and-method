// Browser-local synthetic records only. No network, identity, or protected storage.
export const STORAGE_KEY='wm.synthetic-lead-workbench.v1';
export const STAGES=Object.freeze(['New','Contacted','Proposal','Won','Closed']);
export const SAMPLES=Object.freeze([
 Object.freeze({id:'sample-consultation',name:'Sample Alex',business:'Fictional consulting studio',email:'alex@example.test',request:'Explain two services and offer a consultation booking.'}),
 Object.freeze({id:'sample-publishing',name:'Sample Morgan',business:'Fictional garden-care business',email:'morgan@example.test',request:'Explain seasonal garden care and collect an estimate request.'}),
 Object.freeze({id:'sample-projects',name:'Sample Casey',business:'Fictional remodeling business',email:'casey@example.test',request:'Show approved remodeling projects and explain which jobs are a fit.'}),
]);
const sampleById=new Map(SAMPLES.map(sample=>[sample.id,sample]));
export const emptyState=()=>({version:1,records:[]});
const exactKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const validNotes=notes=>typeof notes==='string'&&notes.length<=1500&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(notes);
export function validateState(state){
 if(!exactKeys(state,['version','records'])||state.version!==1||!Array.isArray(state.records)||state.records.length>SAMPLES.length)return false;
 const seen=new Set();
 return state.records.every(record=>{
  if(!exactKeys(record,['sampleId','stage','notes','createdAt'])||!sampleById.has(record.sampleId)||seen.has(record.sampleId)||!STAGES.includes(record.stage)||!validNotes(record.notes)||typeof record.createdAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(record.createdAt)||!Number.isFinite(Date.parse(record.createdAt))||new Date(record.createdAt).toISOString()!==record.createdAt)return false;
  seen.add(record.sampleId);return true;
 });
}
function requireState(state){if(!validateState(state))throw Error('Invalid synthetic workbench state');}
export function addSample(state,sampleId,createdAt=new Date().toISOString()){
 requireState(state);if(!sampleById.has(sampleId))throw Error('Choose a provided synthetic sample');
 if(state.records.some(record=>record.sampleId===sampleId))return {state,created:false,sampleId};
 const next={version:1,records:[...state.records,{sampleId,stage:'New',notes:'',createdAt}]};requireState(next);
 return {state:next,created:true,sampleId};
}
export function updateRecord(state,sampleId,{stage,notes}){
 requireState(state);if(!state.records.some(record=>record.sampleId===sampleId))throw Error('Select an existing sample');
 if(!STAGES.includes(stage)||!validNotes(notes))throw Error('Use an available stage and at most 1,500 characters of synthetic notes');
 return {version:1,records:state.records.map(record=>record.sampleId===sampleId?{...record,stage,notes}:record)};
}
export function displayRecords(state,{query='',stage='all'}={}){
 requireState(state);if(typeof query!=='string'||(stage!=='all'&&!STAGES.includes(stage)))throw Error('Invalid sample filter');
 const term=query.trim().toLocaleLowerCase('en-US');
 return state.records.map(record=>({...sampleById.get(record.sampleId),...record})).filter(record=>(stage==='all'||stage===record.stage)&&[record.name,record.business,record.email,record.request,record.notes,record.stage].some(value=>value.toLocaleLowerCase('en-US').includes(term)));
}
export function parseSaved(raw){
 if(raw===null)return {state:emptyState(),status:'empty'};
 try{const state=JSON.parse(raw);if(validateState(state))return {state,status:'restored'};}catch{}
 return {state:emptyState(),status:'invalid'};
}
export function readSaved(storage){try{return parseSaved(storage.getItem(STORAGE_KEY));}catch{return {state:emptyState(),status:'unavailable'};}}
export function saveState(storage,state){requireState(state);try{storage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch{return false;}}
export function clearSaved(storage){try{storage.removeItem(STORAGE_KEY);return true;}catch{return false;}}
// Quote every field and double embedded quotes. Formula-like cells are text in common spreadsheets.
export function csvCell(value){const text=String(value);return '"'+(/^[\s\uFEFF]*[=+\-@]/u.test(text)?"'"+text:text).replaceAll('"','""')+'"';}
export function exportCsv(state){
 const rows=[['Sample ID','Contact','Business','Email','Request','Stage','Synthetic notes','Created UTC'],...displayRecords(state).map(record=>[record.sampleId,record.name,record.business,record.email,record.request,record.stage,record.notes,record.createdAt])];
 return rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
