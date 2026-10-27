import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {editorialKey,verifyEditorialDecisions} from '../../scripts/editorial-rules.mjs';
const root=resolve(import.meta.dirname,'../..'),read=async p=>JSON.parse(await readFile(resolve(root,p),'utf8'));
const report=await read('output/seo/report.json'),previous=await read('operations/editorial-review.json'),old=new Map(previous.decisions.map(row=>[editorialKey(row),row]));
// Root read each complete flagged sentence in the current emitted paragraphs.
const reasons={
 '/areas/alaska/':'The colon introduces one exhaustive named set of census areas sharing the stated government status. Keeping their full official names avoids ambiguity; the preceding heading separates this reference list from general browsing instructions.',
 '/areas/texas/bosque-county/':'One historical example contrasts two award mechanisms: purchase for a stated amount versus an award added to a sale. The time boundary and both mechanisms belong together, and none of the sentence implies current availability.',
 '/areas/texas/coke-county/':'The sentence compares three concrete times to explain why a scheduled video does not establish adequate time for the full visit. Retaining all three values makes the condition assessable without an unstated timing inference.',
 '/areas/texas/san-saba-county/':'The sentence connects an operator address, city-limit description and independent county corroboration. The semicolon makes the second source relationship clear and preserves the distinction between a mailing/place name and county location.',
 '/areas/oklahoma/pawnee-county/':'Parallel clauses preserve the research inputs, hourly versus copy charges, and the known-amount prerequisite for payment through a donation-labelled button. These are material conditions on the same research request.',
 '/areas/oregon/wallowa-county/':'The while clause compares two explicitly named booking products and their different cutoff/capacity limitations. Both remain attributed to the source rather than becoming a current availability promise.',
 '/areas/montana/cascade-county/':'The sentence connects the request-not-completion boundary with the returning maker’s required confirmation step. Concrete actions explain what must be confirmed without inventing an immediate drop-off or collection entitlement.'
};
const decisions=report.findings.filter(row=>row.severity==='review').map(row=>{
 const retained=old.get(editorialKey(row));if(retained)return retained;
 const reason=reasons[row.route];if(!reason)throw Error('Unreviewed finding '+row.route);
 return {route:row.route,rule:row.rule,evidenceSha256:row.evidenceSha256,disposition:'retain',reason,reviewer:'Codex primary: exact complete emitted sentence reviewed',reviewedAt:new Date().toISOString()};
});
const ledger={schemaVersion:1,decisions};verifyEditorialDecisions(report,ledger);
await writeFile(resolve(root,'output/human-quality-20261027/editorial-decisions-before.json'),JSON.stringify(previous,null,2)+'\n');
await writeFile(resolve(root,'operations/editorial-review.json'),JSON.stringify(ledger,null,2)+'\n');
console.log(JSON.stringify({currentDecisions:decisions.length,unchangedRetained:decisions.filter(r=>old.has(editorialKey(r))).length,newlyReviewed:7}));
