import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {siteHeader,siteFooter} from '../../src/site-chrome.mjs';
import {supportChatMarkup} from '../../src/support-chat.mjs';
import {backToTopMarkup} from '../../src/navigation.mjs';

const read=path=>readFile(new URL('../../'+path,import.meta.url),'utf8');
const css=(await Promise.all(['style','journal','premium','site-refresh','layout-components','support-chat','section-surfaces'].map(name=>read(`src/assets/${name}.css`)))).join('\n');
const brand=await read('src/assets/brand.css');
const navigation=await read('src/assets/site-navigation.js');
const tools=await read('src/assets/page-navigation.js');
const chat=await read('src/assets/support-chat.js');
const chatConfig={mode:'production',formMode:'live',supportChat:{enabled:true,provider:'tawk',propertyId:'0123456789abcdef01234567',widgetId:'12345abcde',verified:true},privacy:{chat:'Optional chat disclosure',processors:[{name:'tawk.to'}]}};
async function fixture(page,{width=390,height=844}={}){
 await page.setViewportSize({width,height});
 await page.route('https://**',route=>route.abort());
 await page.route('**/__frontend-component-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
 await page.goto('/__frontend-component-fixture');
 const markup=supportChatMarkup(chatConfig).replace(/<script[\s\S]*?<\/script>/g,'');
 await page.setContent(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${brand}\n${css}</style></head><body id="page-top" class="studio-site studio-inner">${siteHeader('/pricing/')}<main id="main" tabindex="-1"><h1>Compare website packages.</h1><p>Choose the website that meets your needs.</p><div style="height:1200px"></div><a id="last-link" href="#main">Return to the plan choices</a><input aria-label="Sample question"></main><section class="site-tools" aria-label="Page help">${backToTopMarkup()}${markup}</section>${siteFooter({businessIdentity:'Wonder and Method'})}</body></html>`);
 await page.addScriptTag({content:navigation});
 await page.addScriptTag({content:chat});
 await page.addScriptTag({content:tools});
 await expect(page.locator('.support-chat-launch')).toBeVisible();
}

test('compact phone header and footer preserve usable navigation at320 and390',async({page})=>{
 for(const width of [320,390]){
  await fixture(page,{width});
  const header=page.locator('.site-header');
  const box=await header.boundingBox();expect(box.height).toBeLessThanOrEqual(90);
  await expect(header.getByRole('link',{name:'Contact',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('footer details.footer-group')).toHaveCount(4);await expect(page.locator('footer details.footer-group[open]')).toHaveCount(0);await expect(page.locator('footer summary')).toHaveCount(5);expect(await page.locator('footer nav[aria-label="Footer"]').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
  await expect(page.locator('.footer-essential').getByRole('link',{name:'Privacy',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Menu',exact:true}).click();
  await expect(page.locator('.service-navigation > summary')).toBeVisible();await expect(page.locator('.service-navigation')).not.toHaveAttribute('open','');await page.locator('.service-navigation > summary').click();await expect(page.locator('.service-links').getByRole('link',{name:'All services',exact:true})).toBeVisible();
  await expect(page.locator('#main-nav').getByRole('link',{name:'Process',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Menu',exact:true})).toBeFocused();
 }
});

test('floating phone help preserves focus and leaves fields unobstructed',async({page})=>{
 await fixture(page);
 const launch=page.locator('.support-chat-launch');
 await expect(page.locator('.support-chat')).toHaveCSS('position','fixed');
 await launch.scrollIntoViewIfNeeded();await expect(launch).toBeInViewport();
 expect((await launch.boundingBox()).width).toBeGreaterThanOrEqual(44);
 await launch.focus();
 await page.evaluate(()=>dispatchEvent(new Event('scroll')));
 await expect(launch).toBeFocused();await expect(launch).toBeVisible();
 await page.locator('#last-link').focus();
 await expect(page.locator('#last-link')).toBeFocused();expect(await page.locator('#last-link').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.left+5,r.top+5));})).toBe(true);
 await page.getByRole('textbox',{name:'Sample question'}).focus();
 await expect(page.getByRole('textbox',{name:'Sample question'})).toBeFocused();
 expect(await page.getByRole('textbox',{name:'Sample question'}).evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.left+5,r.top+5));})).toBe(true);
});

test('text-spacing leaves the mobile project action and menu unclipped',async({page})=>{
 await fixture(page,{width:320});
 await page.addStyleTag({content:'*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}'});
 const bounds=await page.locator('.site-header').evaluate(el=>[...el.children].filter(child=>getComputedStyle(child).display!=='none').map(child=>({left:child.getBoundingClientRect().left,right:child.getBoundingClientRect().right})));
 for(const b of bounds){expect(b.left).toBeGreaterThanOrEqual(0);expect(b.right).toBeLessThanOrEqual(320);}
 await expect(page.locator('.header-contact')).toBeVisible();
 await expect(page.getByRole('button',{name:'Menu',exact:true})).toBeVisible();
});

test('desktop chrome fits and forced-colors retains a visible mark and video focus',async({page})=>{
 await fixture(page,{width:1024,height:900});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.locator('#main-nav')).toBeVisible();
 await page.locator('main').evaluate(el=>{const video=document.createElement('video');video.controls=true;video.setAttribute('aria-label','Silent sample');el.append(video);});
 await page.getByLabel('Silent sample').focus();
 await expect(page.getByLabel('Silent sample')).toHaveCSS('outline-style','solid');
 await page.emulateMedia({forcedColors:'active',colorScheme:'dark'});
 const mark=await page.locator('.site-header .brand-lockup').evaluate(el=>{const style=getComputedStyle(el,'::before');return {width:style.width,height:style.height,background:style.backgroundColor,mask:style.maskImage};});
 expect(mark.width).toBe('28px');expect(mark.height).toBe('22px');expect(mark.background).not.toBe('rgba(0, 0, 0, 0)');expect(mark.mask).toContain('emblem.svg');
 await page.screenshot({path:'output/playwright/clarity-forced-dark.png'});
});

test('without scripts concept navigation and footer remain usable',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 try{
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:4187/work/hearthside/menu/?qa=1');
  await expect(page.locator('.concept-toolbar a[href="/work/"]')).toBeVisible();
  await expect(page.locator('.concept-toolbar a[href="/contact/#inquiry"]')).toBeVisible();
  await expect(page.locator('#main-nav')).toHaveCount(0);await expect(page.locator('.support-chat-launch')).toBeHidden();await expect(page.locator('.support-chat noscript a')).toBeVisible();
  await expect(page.locator('.concept-header nav').getByRole('link',{name:'Overview',exact:true})).toBeVisible();
  await expect(page.locator('.concept-menu-list article')).toHaveCount(3);
  await expect(page.locator('.concept-demo-form')).toHaveCount(0);
  await expect(page.locator('footer details.footer-group[open]')).toHaveCount(4);
  await expect(page.locator('footer').getByRole('link',{name:'Privacy',exact:true})).toBeVisible();
  await page.goto('http://127.0.0.1:4187/about/?qa=1');
  await expect(page.locator('#main-nav')).toBeVisible();
  await page.locator('.service-navigation>summary').click();
  await expect(page.locator('.service-links').getByRole('link',{name:'All services',exact:true})).toBeVisible();
  await page.locator('.support-chat noscript a').click();
  await expect(page).toHaveURL(/\/contact\/#inquiry$/);
 }finally{await context.close();}
});

test('enlarged text keeps floating chat discoverable without covering a focused link',async({page})=>{
 await fixture(page,{width:1024,height:900});
 await page.addStyleTag({content:'html{font-size:32px}#last-link{position:fixed;right:40px;bottom:115px;z-index:1}'});
 await expect(page.locator('.support-chat-launch')).toBeVisible();
 await page.locator('#last-link').focus();await expect(page.locator('#last-link')).toBeFocused();
 await expect(page.locator('.support-chat')).toHaveCSS('position','fixed');
 const unobstructed=await page.locator('#last-link').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.right-5,r.top+5));});expect(unobstructed).toBe(true);
});
