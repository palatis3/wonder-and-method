import {pennsylvaniaProfilesA} from './pennsylvania-profiles-a.mjs';
import {pennsylvaniaProfilesB} from './pennsylvania-profiles-b.mjs';
import {pennsylvaniaProfilesC} from './pennsylvania-profiles-c.mjs';
import {pennsylvaniaProfilesD} from './pennsylvania-profiles-d.mjs';
import {pennsylvaniaTasksA} from './pennsylvania-tasks-a.mjs';
import {pennsylvaniaTasksB} from './pennsylvania-tasks-b.mjs';
import {pennsylvaniaTasksC} from './pennsylvania-tasks-c.mjs';
import {pennsylvaniaTasksD} from './pennsylvania-tasks-d.mjs';
import {pennsylvaniaQuestionRowsA} from './pennsylvania-questions-a.mjs';
import {pennsylvaniaQuestionRowsB} from './pennsylvania-questions-b.mjs';
import {pennsylvaniaQuestionRowsC} from './pennsylvania-questions-c.mjs';
import {pennsylvaniaQuestionRowsD} from './pennsylvania-questions-d.mjs';

export const pennsylvaniaProfiles=[...pennsylvaniaProfilesA,...pennsylvaniaProfilesB,...pennsylvaniaProfilesC,...pennsylvaniaProfilesD];
export const pennsylvaniaBuyerTasks={...pennsylvaniaTasksA,...pennsylvaniaTasksB,...pennsylvaniaTasksC,...pennsylvaniaTasksD};
const questionRows=offers=>({...pennsylvaniaQuestionRowsA(offers),...pennsylvaniaQuestionRowsB(offers),...pennsylvaniaQuestionRowsC(offers),...pennsylvaniaQuestionRowsD(offers)});

export function pennsylvaniaSearchQuestions(slug,offers){
 return (questionRows(offers)[slug]||[]).map(row=>row.slice(0,4));
}
export function pennsylvaniaQuestionSources(offers){
 return Object.entries(questionRows(offers)).flatMap(([slug,rows])=>rows.map(([question,,guide,,sourceQuery],index)=>({slug,index:index+1,question,sourceQuery,guide})));
}
