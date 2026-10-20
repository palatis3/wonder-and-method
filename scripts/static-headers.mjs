import {privateRoute} from '../src/index-policy.mjs';

const hintEligible=path=>!privateRoute(path)&&path!=='/payments/';

export function buildEarlyHints(pages,assetVersions){
 const entries=pages.map(page=>({
  path:page.path,
  link:hintEligible(page.path)?[...page.html.matchAll(/<link rel="stylesheet" href="(\/assets\/[^"?]+\.css)"/g)]
   .map(([,asset])=>`<${asset}?v=${assetVersions.get(asset)}>; rel=preload; as=style`).join(', '):''
 }));
 // Only share a family rule when every emitted member has the same hints.
 // A future page with different styles falls back to exact rules.
 const areas=entries.filter(entry=>entry.path.startsWith('/areas/'));
 const groupAreas=areas.length>1&&Boolean(areas[0].link)&&areas.every(entry=>entry.link===areas[0].link);
 let areaRuleWritten=false;
 return entries.flatMap(entry=>{
  if(!entry.link)return [];
  if(groupAreas&&entry.path.startsWith('/areas/')){
   if(areaRuleWritten)return [];
   areaRuleWritten=true;
   return [`/areas/*\n  Link: ${entry.link}\n`];
  }
  return [`${entry.path}\n  Link: ${entry.link}\n`];
 }).join('\n');
}

export function assertStaticHeaderLimits(headers){
 const lines=headers.split(/\r?\n/);
 const rules=lines.filter(line=>line.trim()&&!/^\s/.test(line)&&!line.startsWith('#')).length;
 if(rules>100)throw Error(`Static headers contain ${rules} rules; Cloudflare allows at most 100.`);
 const longLine=lines.findIndex(line=>line.length>2000);
 if(longLine!==-1)throw Error(`Static headers line ${longLine+1} exceeds Cloudflare's 2000-character limit.`);
 return {rules};
}
