import {escapeHtml} from './shared.mjs';

// Decode the entities produced by escapeHtml in one pass. In particular,
// literal text such as "&lt;" must not be decoded twice into a bracket.
const headerEntities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",'#39':"'"};
const headerText=html=>html.replace(/<[^>]+>/g,'').replace(/&(amp|lt|gt|quot|apos|#39);/g,(_match,name)=>headerEntities[name]).trim();

// Preserve the table container when the phone layout stacks rows. Native
// tr/th/td semantics remain intact in supported browsers without extra roles.
export function responsiveTables(html){
 return html.replace(/<table\b([^>]*)>([\s\S]*?)<\/table>/g,(_table,attrs,content)=>{
  const headers=[...(content.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/)?.[1]||'').matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map(m=>headerText(m[1]));
  if(!headers.length)return _table;
  if(!/\bclass=/.test(attrs))attrs+=' class="responsive-table"';
  else if(!/\bresponsive-table\b/.test(attrs))attrs=attrs.replace(/class="([^"]*)"/,'class="$1 responsive-table"');
  if(!/\brole=/.test(attrs))attrs+=' role="table"';
  content=content.replace(/<(thead|tbody)\b([^>]*)>/g,(_m,tag,a)=>`<${tag}${a}${/\brole=/.test(a)?'':' role="rowgroup"'}>`);
  content=content.replace(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/g,(_row,a,cells)=>{
   let index=0;
   const row=cells.replace(/<(th|td)\b([^>]*)>([\s\S]*?)<\/\1>/g,(_cell,tag,props,text)=>{
    const label=headers[index++];
    if(tag==='td'&&!/\bdata-label=/.test(props)&&label)props+=' data-label="'+escapeHtml(label)+'"';
    return `<${tag}${props}>${text}</${tag}>`;
   });
   return `<tr${a}>${row}</tr>`;
  });
  return `<table${attrs}>${content}</table>`;
 });
}
