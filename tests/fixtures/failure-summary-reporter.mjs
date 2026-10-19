// Optional bounded diagnostics: node --test --test-reporter=./tests/fixtures/failure-summary-reporter.mjs tests/*.test.mjs
export default async function* report(events) {
 for await (const {type,data} of events) {
  if(type==='test:fail'){
   const error=data.details.error.cause||data.details.error;
   yield JSON.stringify({name:data.name,file:data.file,message:String(error.message).split('Input:')[0].slice(0,800),location:error.stack?.split('\n').find(line=>line.includes('TestContext'))})+'\n';
  }
  if(type==='test:summary'&&!data.file)yield JSON.stringify(data)+'\n';
 }
}
