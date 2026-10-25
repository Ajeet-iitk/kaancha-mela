import path from 'node:path';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const outDir = 'C:/Users/ajeet/AppData/Local/Temp/opencode/mela-layouts';
fs.mkdirSync(outDir, { recursive: true });
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await puppeteer.launch({
  executablePath: chrome, headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function selectShot(w, h, name, lang) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 500, hasTouch: w < 500 });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto('http://127.0.0.1:8123/kaancha-mela.html?v=' + Date.now(), { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.KaanchKaMela, { timeout: 30000 });
  await sleep(3500);
  await page.evaluate(lang => KaanchKaMela.setLanguage(lang), lang);
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  await page.click('#enterBtn');
  await sleep(1200);
  await page.screenshot({ path: path.join(outDir, name + '.png') });
  const info = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.target-card')].map(c => ({
      w: +c.getBoundingClientRect().width.toFixed(0),
      h: +c.getBoundingClientRect().height.toFixed(0),
      tag: c.querySelector('.tag').textContent,
      desc: c.querySelector('.desc').textContent,
    }));
    return {
      mode: KaanchKaMela.state.mode,
      scrollW: document.documentElement.scrollWidth,
      scrollH: document.documentElement.scrollHeight,
      cards,
    };
  });
  console.log(name, JSON.stringify(info, null, 1));
  await page.close();
}
await selectShot(1280, 720, '66-select-en', 'en');
await selectShot(390, 844, '67-select-mobile-en', 'en');
await selectShot(390, 844, '68-select-mobile-hi', 'hi');
await browser.close();
