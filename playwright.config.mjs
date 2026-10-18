import {defineConfig} from '@playwright/test';

export default defineConfig({
 testDir:'./tests/browser',
 outputDir:'output/playwright/results',
 timeout:30_000,
 globalTimeout:300_000,
 expect:{timeout:7000},
 workers:1,
 fullyParallel:false,
 forbidOnly:!!process.env.CI,
 retries:0,
 reporter:[['list'],['json',{outputFile:'output/playwright/results.json'}],['html',{outputFolder:'output/playwright/report',open:'never'}]],
 use:{baseURL:'http://127.0.0.1:4187',serviceWorkers:'block',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[
  {name:'desktop',use:{browserName:'chromium',viewport:{width:1440,height:1000}}},
  {name:'phone',use:{browserName:'chromium',viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
  {name:'phone-reduced-motion',use:{browserName:'chromium',viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}},
  {name:'no-javascript',testMatch:'**/no-javascript.spec.mjs',use:{browserName:'chromium',viewport:{width:390,height:844},javaScriptEnabled:false}}
 ],
 webServer:{command:'node scripts/browser-test-server.mjs',url:'http://127.0.0.1:4187',reuseExistingServer:false,timeout:30_000}
});
