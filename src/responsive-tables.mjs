import {escapeHtml} from './shared.mjs';

// Keep native table relationships explicit when the phone layout stacks rows.
export function responsiveTables(html){
 return html.replace(/<table\b([^>]*)>([\s\S]*?)<\/table>/g,(_table,attrs,content)=>{
  const headers=[...(content.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/)?.[1]||'').matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map(m=>m[1].replace(/<[^>]+>/g,'').replaceAll('&amp;','&').replaceAll('&#39;',"'").replaceAll('&quot;','"').trim());
  if(!headers.length)return _table;
  if(!/\bclass=/.test(attrs))attrs+=' class="responsive-table"';
  else if(!/\bresponsive-table\b/.test(attrs))attrs=attrs.replace(/class="([^"]*)"/,'class="$1 responsive-table"');
  if(!/\brole=/.test(attrs))attrs+=' role="table"';
  content=content.replace(/<(thead|tbody)\b([^>]*)>/g,(_m,tag,a)=>`<${tag}${a}${/\brole=/.test(a)?'':' role="rowgroup"'}>`);
  content=content.replace(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/g,(_row,a,cells)=>{
   let index=0;
   const row=cells.replace(/<(th|td)\b([^>]*)>([\s\S]*?)<\/\1>/g,(_cell,tag,props,text)=>{
    const label=headers[index++];
    if(!/\brole=/.test(props))props+=' role="'+(tag==='td'?'cell':/scope="row"/.test(props)?'rowheader':'columnheader')+'"';
    if(tag==='td'&&!/\bdata-label=/.test(props)&&label)props+=' data-label="'+escapeHtml(label)+'"';
    return `<${tag}${props}>${text}</${tag}>`;
   });
   return `<tr${a}${/\brole=/.test(a)?'':' role="row"'}>${row}</tr>`;
  });
  return `<table${attrs}>${content}</table>`;
 });
}
