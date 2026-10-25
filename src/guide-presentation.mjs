import {guideDownload,guideDownloadLabel} from './guide-decisions.mjs';
import {fictionalTemplateGuides} from './guide-scope-notes.mjs';

// Consolidate preparation notes without removing dated source observations.
export function withoutRepeatedPreparation(body){
 return body.replace(/<p>This is original website-planning analysis informed by the linked public sources\. AI assisted research and drafting,[\s\S]*?<\/p>/g,'')
  .replace('The proposed layout, worksheet and illustrative check are original website-planning analysis developed with AI assistance and editorial review. These organizations are cited as public examples; this article does not describe a client project or a partnership.','').replace(/\s+<\/p>/g,'</p>');
}
export function guidePreparationNote(item){
 if(fictionalTemplateGuides.has(item.path.split('/').filter(Boolean).at(-1)))return '<aside class="guide-method" aria-label="Guide preparation"><p>These examples are fictional and do not describe client work or measured results. AI assisted the research and drafting; Wonder and Method is responsible for the published content. <a href="/about/#guide-method">Preparation and corrections</a>.</p></aside>';
 const publicExamples=['Business workflows','Local website cases'].includes(item.category);
 return `<aside class="guide-method" aria-label="Guide preparation"><p>AI assisted research and drafting.${publicExamples?' Named organizations are public examples, not clients or partners; their services were not transaction-tested.':''} Check current source instructions before using a dated example. <a href="/about/#guide-method">Preparation and corrections</a>.</p></aside>`;
}
const secondaryLabels={'/assets/guides/monthly-seo-opportunity-worksheet.csv':'monthly opportunity worksheet'};
export function friendlyGuideDownloads(body,path){
 const primary=guideDownload(path);
 return body.replace(/(<a\b[^>]*href="([^"]+)\.(csv|txt)"[^>]*>)([^<]*)(<\/a>)/gi,(_match,open,stem,ext,label,close)=>{
  const href=stem+'.'+ext,clean=label.replace(/\s*\((?:CSV|TXT)\)/gi,'').trim();
  const core=(href===primary?guideDownloadLabel(path).replace(/^Download (?:the )?/,''):secondaryLabels[href]);
  // A noun phrase fits an inline sentence; standalone download actions keep the verb.
  const consistent=core?(/^(?:Download|Use)\b/.test(clean)?'Download the '+core:core):clean;
  return open+consistent+(ext.toLowerCase()==='csv'?' (spreadsheet)':' (text file)')+close;
 });
}
