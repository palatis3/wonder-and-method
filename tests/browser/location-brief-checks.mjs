import {expect} from './fixtures.mjs';
import briefs from '../../src/human-location-briefs.json' with {type:'json'};
import sources from '../../src/location-service-data.json' with {type:'json'};
const byPath=new Map(briefs.map(brief=>[brief.route,brief]));
const sourceByPath=new Map(sources.map(source=>[source.path,source]));
const dateFormat=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});

// Preserve the full authored decision and input coverage after removing the
// repeated summary/table/scope presentation. Every caller retains its original
// route inventory, axe pass, narrow-screen check and inquiry-context journey.
export async function assertLocationBrief(page,path){
 const brief=byPath.get(path);expect(brief,path+' has an individually authored brief').toBeDefined();
 const plan=page.locator('#buyer-task');
 await expect(plan.getByRole('heading',{level:2})).toHaveText(brief.heading);
 await expect(plan.locator('.local-customer-question')).toContainText(brief.customerQuestion);
 const steps=plan.locator('.local-decision-steps > li');await expect(steps).toHaveCount(3);
 for(const [index,decision] of brief.decisions.entries()){
  const step=steps.nth(index);await expect(step).toBeVisible();
  await expect(step.getByRole('heading',{level:3})).toHaveText(decision.label);
  await expect(step.locator('p')).toHaveText(decision.body);
 }
 await expect(plan.locator('.local-example-reason p')).toHaveText(brief.sourceBridge);
 await expect(plan.locator('.local-example-boundary')).toHaveText(brief.limits);
 await expect(plan.locator('details,.location-planning-table,.location-scope,.local-brief-summary')).toHaveCount(0);
 const inputs=page.locator('#questions');
 await expect(inputs).not.toHaveAttribute('open','');
 await inputs.locator(':scope > summary').focus();await page.keyboard.press('Enter');
 await expect(inputs).toHaveAttribute('open','');
 await expect(inputs.locator('li')).toHaveText(brief.ownerInputs);
 await inputs.locator(':scope > summary').focus();await page.keyboard.press('Space');
 await expect(inputs).not.toHaveAttribute('open','');
 return plan;
}

export async function assertLocationSources(page,path){
 const source=sourceByPath.get(path);expect(source,path+' has research provenance').toBeDefined();
 const details=page.locator('.location-source-note');
 await expect(details).not.toHaveAttribute('open','');
 await details.locator(':scope > summary').focus();await page.keyboard.press('Enter');
 await expect(details).toHaveAttribute('open','');
 await expect(details).toContainText('Reviewed '+dateFormat.format(new Date(source.checkedDate+'T00:00:00Z'))+'.');
 for(const item of source.sources){
  await expect(details.getByRole('link',{name:item.label,exact:true})).toHaveAttribute('href',item.url);
  await expect(details).toContainText(item.observation);
 }
}
