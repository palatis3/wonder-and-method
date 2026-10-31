import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/workspace/browser',outputDir:'output/playwright/workspace/results',workers:1,fullyParallel:false,retries:0,timeout:45000,
 forbidOnly:!!process.env.CI,reporter:[['list'],['html',{outputFolder:'output/playwright/workspace/report',open:'never'}]],
 use:{baseURL:'http://127.0.0.1:4211',serviceWorkers:'block',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'desktop',use:{browserName:'chromium',viewport:{width:1440,height:1000}}},{name:'phone',use:{browserName:'chromium',viewport:{width:390,height:844},isMobile:true,hasTouch:true}}],
 webServer:{command:'node scripts/workspace-preview.mjs --synthetic',env:{PORT:'4211',WORKSPACE_TEST_DATABASE_URL:''},url:'http://127.0.0.1:4211',reuseExistingServer:false,timeout:30000}
});
