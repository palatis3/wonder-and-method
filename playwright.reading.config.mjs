import {defineConfig} from '@playwright/test';
import base from './playwright.config.mjs';

export default defineConfig({...base,testDir:'./tests/reading',outputDir:'output/reading/results',timeout:60_000,globalTimeout:900_000,
 use:{...base.use,baseURL:'http://127.0.0.1:4198'},
 webServer:{command:'node scripts/browser-test-server.mjs 4198',url:'http://127.0.0.1:4198',reuseExistingServer:false,timeout:30_000},
 reporter:[['list'],['json',{outputFile:'output/reading/results.json'}],['html',{outputFolder:'output/reading/report',open:'never'}]],
 projects:[{name:'reading',use:{browserName:'chromium',viewport:{width:1280,height:900},reducedMotion:'reduce'}}]});
