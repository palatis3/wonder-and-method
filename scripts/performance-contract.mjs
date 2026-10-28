export const performanceMetricIds=['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index'];
export const performanceProfiles=['mobile','desktop'];
const metricIds=performanceMetricIds;
const finiteNonnegative=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const validScore=value=>finiteNonnegative(value)&&value<=1;

export function validatePerformanceConfig(config){
 if(!config||!Number.isInteger(config.runs)||config.runs<3||config.runs>7)throw Error('Performance configuration requires three to seven runs');
 if(!Array.isArray(config.paths)||!config.paths.length||new Set(config.paths).size!==config.paths.length||config.paths.some(path=>typeof path!=='string'||!/^\/(?!\/)[^\\?#\s]*$/.test(path)))throw Error('Performance configuration requires unique local paths');
 if(!Array.isArray(config.profiles)||JSON.stringify(config.profiles)!==JSON.stringify(performanceProfiles))throw Error('Performance configuration requires mobile and desktop profiles');
 if(!config.budgets||Object.keys(config.budgets).length!==metricIds.length||metricIds.some(id=>!finiteNonnegative(config.budgets[id])))throw Error('Performance configuration requires finite, nonnegative FCP, LCP, TBT, CLS and Speed Index budgets');
 if(!validScore(config.minimumPerformanceScore))throw Error('Performance configuration requires a score between zero and one');
 return config;
}

export function summarizePerformanceRuns(runs,config){
 validatePerformanceConfig(config);
 if(!Array.isArray(runs)||runs.length!==config.runs||runs.some(run=>!validScore(run?.score)||metricIds.some(id=>!finiteNonnegative(run?.metrics?.[id]))))throw Error('Performance measurements must be complete and finite');
 const median=values=>{const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;};
 const metrics=Object.fromEntries(metricIds.map(id=>[id,median(runs.map(run=>run.metrics[id]))])),score=median(runs.map(run=>run.score));
 // A sporadic visible jump must not disappear behind two successful loads.
 metrics['cumulative-layout-shift']=Math.max(...runs.map(run=>run.metrics['cumulative-layout-shift']));
 if(!validScore(score)||Object.values(metrics).some(value=>!finiteNonnegative(value)))throw Error('Performance aggregates must be finite');
 return {metrics,score};
}

export function performanceFailures(runs,config){
 const {metrics,score}=summarizePerformanceRuns(runs,config);
 const failures=Object.entries(config.budgets).filter(([id,limit])=>metrics[id]>limit).map(([metric,limit])=>({metric,actual:metrics[metric],limit}));
 if(score<config.minimumPerformanceScore)failures.push({metric:'performance-score',actual:score,limit:config.minimumPerformanceScore});
 return {metrics,score,failures};
}

// CLS is the largest session window, not the sum across a long visit.
export function layoutShiftScore(entries){
 if(!Array.isArray(entries)||entries.some(e=>!finiteNonnegative(e?.value)||!finiteNonnegative(e?.startTime)))throw Error('Layout shift entries must be finite');
 let largest=0,total=0,start,previous;
 for(const entry of [...entries].filter(e=>!e.hadRecentInput).sort((a,b)=>a.startTime-b.startTime)){
  if(start!==undefined&&entry.startTime-previous<1000&&entry.startTime-start<5000)total+=entry.value;
  else {total=entry.value;start=entry.startTime;}
  previous=entry.startTime;largest=Math.max(largest,total);
 }
 return largest;
}
