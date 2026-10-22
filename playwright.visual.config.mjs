import {defineConfig} from '@playwright/test';

export default defineConfig({
 testDir:'./tests/visual',outputDir:'output/visual/results',
 timeout:60_000,globalTimeout:600_000,workers:1,retries:0,forbidOnly:!!process.env.CI,
 updateSnapshots:'none',
 snapshotPathTemplate:'{testDir}/baselines/{platform}/{projectName}/{arg}{ext}',
 expect:{timeout:10_000,toHaveScreenshot:{animations:'disabled',caret:'hide',threshold:.12,maxDiffPixelRatio:.001}},
 reporter:[['list'],['html',{outputFolder:'output/visual/report',open:'never'}],['json',{outputFile:'output/visual/results.json'}]],
 use:{baseURL:'http://127.0.0.1:4187',browserName:'chromium',reducedMotion:'reduce',serviceWorkers:'block',locale:'en-US',timezoneId:'America/New_York',colorScheme:'light',trace:'retain-on-failure'},
 projects:[{name:'desktop',use:{viewport:{width:1440,height:1000}}},{name:'phone',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}],
 webServer:{command:'node scripts/browser-test-server.mjs',url:'http://127.0.0.1:4187',reuseExistingServer:false,timeout:30_000}
});
