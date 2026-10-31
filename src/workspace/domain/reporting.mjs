import {WorkspaceError} from './contracts.mjs';
const HEADERS=['metric','value','unit','definition_version','observed_at','provisional'];
function invalid(message){throw new WorkspaceError('invalid_report_file',message);}
export function parseMetricCsv(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>128*1024)invalid('Use a UTF-8 CSV smaller than 128 KB.');
 text=text.replace(/^\uFEFF/,'');if(/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text))invalid('The CSV contains unsupported control characters.');
 const rows=[];let row=[],cell='',quoted=false,closed=false;
 const pushCell=()=>{if(cell.length>1000)invalid('A CSV cell is too long.');row.push(cell);cell='';closed=false;if(row.length>6)invalid('Use exactly the six template columns.');};
 const pushRow=()=>{pushCell();if(row.some(x=>x!==''))rows.push(row);row=[];if(rows.length>501)invalid('Import at most 500 rows at a time.');};
 for(let i=0;i<text.length;i++){
  const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c==='"'){if(cell!==''||closed)invalid('Check the CSV quotation marks.');quoted=true;}
  else if(c===',')pushCell();else if(c==='\n'||c==='\r'){pushRow();if(c==='\r'&&text[i+1]==='\n')i++;}
  else{if(closed)invalid('Unexpected text after a quoted cell.');cell+=c;}
 }
 if(quoted)invalid('Close the quoted CSV field.');if(cell!==''||row.length||closed)pushRow();
 if(rows.length<2||rows[0].join(',')!==HEADERS.join(','))invalid('Use the six columns from the reporting template, in their original order.');
 return rows.slice(1).map((r,i)=>{
  if(r.length!==6)invalid(`Row ${i+2} needs all six columns.`);
  if(r.some(v=>/^\s*[=+@-]/.test(v)))invalid(`Row ${i+2} contains a spreadsheet formula or unsupported signed value.`);
  const item=Object.fromEntries(HEADERS.map((h,j)=>[h,r[j]]));
  item.value=item.value===''?null:item.value;
  if(!['true','false'].includes(item.provisional))invalid(`Row ${i+2}: provisional must be true or false.`);
  item.provisional=item.provisional==='true';return item;
 });
}
export const metricCsvTemplate='metric,value,unit,definition_version,observed_at,provisional\r\nclicks,25,count,confirmed-definition-v1,2026-10-01T12:00:00Z,false\r\nwon,,count,client-feedback-v1,2026-10-01T12:00:00Z,true\r\ncost,1234567,micros,provider-cost-v1,2026-10-01T12:00:00Z,false\r\n';
export function displayExactMetric(value,unit,currency){
 if(value===null||value===undefined)return 'Not available';
 const s=String(value);if(!/^\d+(?:\.\d+)?$/.test(s))return 'Not available';
 if(unit==='micros')return `${currency} ${s.padStart(7,'0').slice(0,-6)}.${s.padStart(7,'0').slice(-6)}`;
 return s;
}
