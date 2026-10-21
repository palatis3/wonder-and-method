import {copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';

// Older bookmarks remain downloads of the canonical, maintained document.
export const downloadAliases=[
 ['assets/downloads/website-redesign-brief.txt','assets/guides/website-redesign-brief.txt'],
 ['assets/audit-implementation/work-receipt-template.txt','assets/guides/sample-monthly-report.txt']
];
export async function writeDownloadAliases(output){
 for(const [alias,canonical] of downloadAliases)await copyFile(resolve(output,canonical),resolve(output,alias));
}
