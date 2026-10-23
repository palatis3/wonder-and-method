const metricIds=['largest-contentful-paint','cumulative-layout-shift','total-blocking-time'];
const finiteNonnegative=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const validScore=value=>finiteNonnegative(value)&&value<=1;

export function validatePerformanceConfig(config){
 if(!config||!Number.isInteger(config.runs)||config.runs<3)throw Error('Performance configuration requires at least three runs');
 if(!Array.isArray(config.paths)||!config.paths.length||new Set(config.paths).size!==config.paths.length||config.paths.some(path=>typeof path!=='string'||!/^\/(?!\/)[^\\?#\s]*$/.test(path)))throw Error('Performance configuration requires unique local paths');
 if(!config.budgets||Object.keys(config.budgets).length!==metricIds.length||metricIds.some(id=>!finiteNonnegative(config.budgets[id])))throw Error('Performance configuration requires finite, nonnegative LCP, CLS and TBT budgets');
 if(!validScore(config.minimumPerformanceScore))throw Error('Performance configuration requires a score between zero and one');
 return config;
}

export function summarizePerformanceRuns(runs,config){
 validatePerformanceConfig(config);
 if(!Array.isArray(runs)||runs.length!==config.runs||runs.some(run=>!validScore(run?.score)||metricIds.some(id=>!finiteNonnegative(run?.metrics?.[id]))))throw Error('Performance measurements must be complete and finite');
 const median=values=>{const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;};
 const metrics=Object.fromEntries(metricIds.map(id=>[id,median(runs.map(run=>run.metrics[id]))])),score=median(runs.map(run=>run.score));
 if(!validScore(score)||Object.values(metrics).some(value=>!finiteNonnegative(value)))throw Error('Performance aggregates must be finite');
 return {metrics,score};
}
