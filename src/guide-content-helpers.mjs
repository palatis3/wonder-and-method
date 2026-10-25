import {escapeHtml as e} from './shared.mjs';
import {responsiveTables as accessibleGuideTables} from './responsive-tables.mjs';

// Shared markup only. Each guide's editorial content and final order live in guide-content.
export const p=text=>`<p>${text}</p>`;
export const a=(href,label)=>`<a href="${href}">${label}</a>`;
export const link=a;
export const section=(id,title,body)=>({id,title,body});
// Retain the bodyHTML shape used by existing guide consumers.
export const richSection=(id,title,body)=>({id,title,body,bodyHTML:body});
export const ul=items=>`<ul>${items.map(text=>`<li>${text}</li>`).join('')}</ul>`;
export const ol=items=>`<ol>${items.map(text=>`<li>${text}</li>`).join('')}</ol>`;
export const box=(title,body)=>`<div class="journal-callout" role="note"><h3>${title}</h3>${body}</div>`;
export const worksheet=(image,label)=>p(a(`/assets/guides/${image}-worksheet.txt`,label));
export const table = (caption, headings, rows) => `<div class="journal-table-wrap" role="region" tabindex="0" aria-label="${caption}"><table><caption>${caption}</caption><thead><tr>${headings.map(heading => `<th scope="col">${heading}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((cell, i) => i ? `<td>${cell}</td>` : `<th scope="row">${cell}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`;
// Short amount columns remain comparable beside their labels on a phone.
export const compactTable=(caption,headings,rows)=>accessibleGuideTables(table(caption,headings,rows).replace('<table>','<table class="compact-money-table">'));
export const auditTable=(caption,headers,rows)=>accessibleGuideTables(`<div class="journal-table-wrap" role="region" tabindex="0" aria-label="${e(caption)}"><table><caption>${e(caption)}</caption><thead><tr>${headers.map(x=>`<th scope="col">${e(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((cell,i)=>i?`<td>${cell}</td>`:`<th scope="row">${cell}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`);
export const download=(name,label)=>p(`${a(`/assets/downloads/audit-${name}.csv`,label+' (CSV)')}. ${{'launch-checklist':'Record pass, fail, not applicable or blocked for each check.','maintenance-budget':'Fill in your actual bills, billing intervals and renewal dates.','website-approach':'Try the same tasks in each option and record what happens.'}[name]||'Fill in your own findings and next steps.'}`);
export const sources={
  webflow:'https://webflow.com/pricing',
  indexing:'https://support.google.com/webmasters/answer/7440203',
  inspection:'https://support.google.com/webmasters/answer/9012289',
  email:'https://support.google.com/mail/answer/81126',
  challenge:'https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/error-codes/',
  aiContent:'https://developers.google.com/search/docs/fundamentals/using-gen-ai-content',
  aiSearch:'https://developers.google.com/search/docs/fundamentals/ai-optimization-guide',
  backups:'https://developer.wordpress.org/advanced-administration/security/backup/',
  lighthouse:'https://developer.chrome.com/docs/lighthouse/overview'
};

// Retired section bookmarks are declared where their replacement section is authored.
export const anchoredSection=(ids,item)=>({...item,body:ids.map(id=>`<span id="${id}"></span>`).join('')+item.body});
export const disclosureSection=(id,title,summary,children)=>section(id,title,`<details><summary>${summary}</summary>${children.map(child=>`<div${child.id===id?'':` id="${child.id}"`}><h3>${child.title}</h3>${child.body}</div>`).join('')}</details>`);

// One presentation pass for heading numbering and downloadable file labels.
// It does not select, overwrite, remove or reorder editorial sections.
export const formatGuideSections=sections=>sections.map(x=>({...x,title:x.title.replace(/^\d+[.)]\s*/,''),body:x.body.replace(/(<a[^>]+href="[^"]+\.(csv|txt)"[^>]*>)([^<]*)(<\/a>)/gi,(_m,open,ext,label,close)=>(/\bdownload(?:[=>\s]|$)/i.test(open)?open:open.replace(/>$/,' download>'))+label+(label.toUpperCase().includes(ext.toUpperCase())?'':' ('+ext.toUpperCase()+')')+close)}));
