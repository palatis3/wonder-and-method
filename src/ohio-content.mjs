import {ohioProfilesA} from './ohio-profiles-a.mjs';
import {ohioProfilesB} from './ohio-profiles-b.mjs';
import {ohioProfilesC} from './ohio-profiles-c.mjs';
import {ohioProfilesD} from './ohio-profiles-d.mjs';
import {ohioTasksA} from './ohio-tasks-a.mjs';
import {ohioTasksB} from './ohio-tasks-b.mjs';
import {ohioTasksC} from './ohio-tasks-c.mjs';
import {ohioTasksD} from './ohio-tasks-d.mjs';
import {ohioQuestionRowsA} from './ohio-questions-a.mjs';
import {ohioQuestionRowsB} from './ohio-questions-b.mjs';
import {ohioQuestionRowsC} from './ohio-questions-c.mjs';
import {ohioQuestionRowsD} from './ohio-questions-d.mjs';

export const ohioProfiles=[...ohioProfilesA,...ohioProfilesB,...ohioProfilesC,...ohioProfilesD];
export const ohioBuyerTasks={...ohioTasksA,...ohioTasksB,...ohioTasksC,...ohioTasksD};
const questionRows=offers=>({...ohioQuestionRowsA(offers),...ohioQuestionRowsB(offers),...ohioQuestionRowsC(offers),...ohioQuestionRowsD(offers)});

export function ohioSearchQuestions(slug,offers){
 return (questionRows(offers)[slug]||[]).map(row=>row.slice(0,4));
}
export function ohioQuestionSources(offers){
 return Object.entries(questionRows(offers)).flatMap(([slug,rows])=>rows.map(([question,,guide,,sourceQuery],index)=>({slug,index:index+1,question,sourceQuery,guide})));
}
