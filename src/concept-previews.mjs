import captures from './city-preview-captures.json' with {type:'json'};
import {escapeHtml as e} from './shared.mjs';

export function conceptCapture(id,camera){
 const capture=captures.records.find(row=>row.id===id&&row.camera===camera);
 if(!capture)throw Error('Missing concept capture: '+id+'/'+camera);
 return capture;
}
export const conceptPreviewSourceSet=capture=>[...capture.variants,capture].map(row=>`${row.path} ${row.width}w`).join(', ');
export function conceptPreviewPicture(id,{sizes,phoneSizes='(max-width:767px) calc(100vw - 40px), 350px',alt}={}){
 const desktop=conceptCapture(id,'desktop'),phone=conceptCapture(id,'phone');
 return `<picture><source media="(max-width:767px)" srcset="${conceptPreviewSourceSet(phone)}" sizes="${e(phoneSizes)}" width="${phone.width}" height="${phone.height}"><img src="${desktop.path}" srcset="${conceptPreviewSourceSet(desktop)}" sizes="${e(sizes||'(max-width:1023px) 84vw, 52vw')}" width="${desktop.width}" height="${desktop.height}" loading="lazy" decoding="async" alt="${e(alt||id+' fictional website concept, showing its actual page design.')}"></picture>`;
}
