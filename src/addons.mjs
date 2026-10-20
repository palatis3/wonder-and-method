import offers from '../config/offers.json' with {type:'json'};

const fail=message=>{throw new Error(message);};
const own=(value,key)=>Object.hasOwn(value,key);
const idPattern=/^[a-z][a-z0-9_]{1,63}$/;
const priceCents=value=>{
 if(!Number.isFinite(value)||value<=0||!Number.isSafeInteger(Math.round(value*100))||Math.abs(value*100-Math.round(value*100))>0.000001)fail('Add-on prices must be positive amounts in whole cents.');
 return Math.round(value*100);
};
function catalogMap(catalog){
 if(!Array.isArray(catalog)||catalog.length>100)fail('The add-on catalog is unavailable.');
 const map=new Map();
 for(const item of catalog){
  if(!item||typeof item.id!=='string'||!idPattern.test(item.id)||map.has(item.id))fail('The add-on catalog contains an invalid or repeated identifier.');
  map.set(item.id,item);
 }
 return map;
}
function selection(ids,catalog){
 const map=catalogMap(catalog);
 if(!Array.isArray(ids)||ids.length>map.size||ids.length>100)fail('Choose each listed add-on at most once.');
 if(ids.some(id=>typeof id!=='string'||!map.has(id)))fail('Choose only the listed add-ons.');
 if(new Set(ids).size!==ids.length)fail('Choose each add-on once; additional quantities need an agreed scope.');
 return [...ids].sort();
}

// Form submissions use unique checkbox names. Enhanced JSON uses only the
// normalized array; accepting both representations would hide conflicting intent.
export function normalizeAddonSelection(data={},catalog=offers.add_ons){
 if(!data||typeof data!=='object'||Array.isArray(data))fail('Provide a valid add-on selection.');
 const keys=Object.keys(data),checkboxes=keys.filter(key=>key.startsWith('addon_'));
 if(keys.some(key=>key==='addons'||/^(?:add_ons?|addons)(?:_|\.|\[)/.test(key)))fail('Use the listed add-on choices, without quantities or prices.');
 if(own(data,'add_ons')){
  if(checkboxes.length)fail('Use one add-on selection format, not conflicting fields.');
  return selection(data.add_ons,catalog);
 }
 const map=catalogMap(catalog),ids=[];
 for(const key of checkboxes){
  const id=key.slice(6);
  if(!map.has(id))fail('Choose only the listed add-ons.');
  if(data[key]!=='1')fail('Choose each add-on once; additional quantities need an agreed scope.');
  ids.push(id);
 }
 return selection(ids,catalog);
}

export function addonSelectionFromQuery(value,catalog=offers.add_ons){
 if(value===null||value===undefined||value==='')return [];
 if(typeof value!=='string'||value.length>2048)fail('Use a valid add-on selection link.');
 return selection(value.split(','),catalog);
}

// Caller-controlled prices are never inputs. Passing a catalog is reserved for
// a trusted current offer or the preserved line items of an accepted snapshot.
export function priceAddons(ids,catalog=offers.add_ons){
 const normalized=selection(ids,catalog),map=catalogMap(catalog);
 let total=0;
 const lines=normalized.map(id=>{
  const item=map.get(id),amount=priceCents(item.public_price);
  if(typeof item.public_name!=='string'||!item.public_name.trim())fail('The add-on name must be recorded.');
  for(const key of ['group','summary','scope'])if(item[key]!==undefined&&typeof item[key]!=='string')fail('Add-on details must be plain text.');
  for(const key of ['exclusions','acceptance'])if(item[key]!==undefined&&(!Array.isArray(item[key])||!item[key].length||item[key].some(text=>typeof text!=='string'||!text.trim())))fail('Add-on exclusions and acceptance checks must be recorded.');
  total+=amount;
  if(!Number.isSafeInteger(total))fail('The selected add-on total is too large.');
  return {id,public_name:item.public_name,public_price:amount/100,...Object.fromEntries(['group','summary','scope'].filter(key=>item[key]!==undefined).map(key=>[key,item[key]])),...Object.fromEntries(['exclusions','acceptance'].filter(key=>item[key]!==undefined).map(key=>[key,[...item[key]]])),quantity:1,line_total:amount/100};
 });
 return {ids:normalized,lines,total:total/100};
}
