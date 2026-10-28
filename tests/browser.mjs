import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const executablePath=process.env.CHROMIUM_PATH||'/home/konner/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const errors=[];let checks=0;
await fs.mkdir('test-results',{recursive:true});
try{
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.BASE_URL||'http://127.0.0.1:4520',{waitUntil:'networkidle'});
await page.waitForSelector('#world[data-ready=true]',{timeout:45000});checks++;
await page.waitForSelector('.loader.hidden',{state:'attached'});await page.waitForTimeout(1000);
assert.equal(await page.locator('.intro').isVisible(),true);checks++;await page.locator('.intro-skip').click();await page.waitForTimeout(1800);assert.equal(await page.locator('.intro').isVisible(),false);
await page.screenshot({path:'test-results/desktop-hero.png'});
assert.equal(await page.title(),'Avaiz — Systems for a smarter world.');checks++;
await page.locator('.menu-toggle').click();assert.equal(await page.locator('#navigation').isVisible(),true);await page.locator('#navigation a[href="#services"]').click();await page.waitForTimeout(1400);assert.equal(await page.locator('#navigation').isVisible(),false);checks++;
await page.screenshot({path:'test-results/desktop-services.png'});
for(const name of ['intelligence','automation','software']){await page.locator(`[data-service="${name}"]`).click();assert.equal(await page.locator('#service-dialog').isVisible(),true);assert.equal(await page.locator('#detail-list li').count(),4);await page.keyboard.press('Escape');assert.equal(await page.locator('#service-dialog').isVisible(),false);checks++;}
await page.locator('#start-project').scrollIntoViewIfNeeded();await page.locator('#start-project').click();await page.locator('#project-name').fill('Browser test');await page.locator('#project-need').fill('Connect our tools.');const downloadPromise=page.waitForEvent('download');await page.locator('#brief-form button[type=submit]').click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'avaiz-project-brief.txt');assert.match(await page.locator('#form-status').innerText(),/not been submitted/);checks++;await page.keyboard.press('Escape');
await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');checks++;
await page.locator('#motion').click();assert.match(await page.locator('#motion').innerText(),/Off/);checks++;
await page.screenshot({path:'test-results/desktop-connect.png'});
const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(process.env.BASE_URL||'http://127.0.0.1:4520',{waitUntil:'networkidle'});await mobile.waitForSelector('#world[data-ready=true]',{timeout:45000});await mobile.waitForSelector('.loader.hidden',{state:'attached'});assert.match(await mobile.locator('#motion').innerText(),/Off/);checks++;assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks++;await mobile.screenshot({path:'test-results/mobile-hero.png'});await mobile.locator('#services').scrollIntoViewIfNeeded();await mobile.waitForTimeout(500);await mobile.screenshot({path:'test-results/mobile-services.png'});await mobile.locator('[data-service=automation]').click();assert.equal(await mobile.locator('#service-dialog').isVisible(),true);await mobile.screenshot({path:'test-results/mobile-dialog.png'});checks++;
assert.deepEqual(errors,[]);checks++;console.log(`${checks} browser checks passed; no uncaught page errors.`);
}finally{await browser.close()}
