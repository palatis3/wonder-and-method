import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',
 testMatch:['tailored-design.spec.mjs','buyer-journeys.spec.mjs','footer-surfaces.spec.mjs','header-resize.spec.mjs','payment-schedule.spec.mjs','table-semantics.spec.mjs','ks-ne-nd-sd-directory.spec.mjs','ca-nm-directory.spec.mjs','az-or-directory.spec.mjs','nv-wa-directory.spec.mjs','co-ut-pr-directory.spec.mjs','id-mt-directory.spec.mjs','wy-hi-ak-directory.spec.mjs'],
 outputDir:'output/cross-browser/results',
 timeout:30_000,globalTimeout:900_000,expect:{timeout:7000},workers:1,
 fullyParallel:false,forbidOnly:!!process.env.CI,retries:0,
 reporter:[['list'],['json',{outputFile:'output/cross-browser/results.json'}],['html',{outputFolder:'output/cross-browser/report',open:'never'}]],
 use:{baseURL:'http://127.0.0.1:4187',serviceWorkers:'block',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[
  {name:'firefox',use:{browserName:'firefox',viewport:{width:1440,height:1000}}},
  {name:'webkit',use:{browserName:'webkit',viewport:{width:1440,height:1000}}},
  {name:'phone',use:{browserName:'webkit',viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
  {name:'phone-reduced-motion',use:{browserName:'webkit',viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}}
 ],
 webServer:{command:'node scripts/browser-test-server.mjs',url:'http://127.0.0.1:4187',reuseExistingServer:false,timeout:30_000}
});
