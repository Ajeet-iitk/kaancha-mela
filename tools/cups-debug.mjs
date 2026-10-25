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
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
const sleep = ms => new Promise(r => setTimeout(r, ms));
await page.goto('http://127.0.0.1:8123/kaancha-mela.html?v=' + Date.now(), { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.KaanchKaMela, { timeout: 30000 });
await sleep(3000);
await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
await page.evaluate(() => {
  KaanchKaMela.startRun('cups');
  KaanchKaMela.state.nextBuffalo = performance.now() + 999999;
});
await sleep(4000);
const info = await page.evaluate(() => ({
  mode: KaanchKaMela.state.mode,
  items: KaanchKaMela.state.target.items.map(i => ({
    name: i.name,
    pos: [+i.body.position.x.toFixed(2), +i.body.position.y.toFixed(2), +i.body.position.z.toFixed(2)],
    visible: i.mesh.visible,
    meshPos: [+i.mesh.position.x.toFixed(2), +i.mesh.position.y.toFixed(2), +i.mesh.position.z.toFixed(2)],
  })),
  groupVisible: KaanchKaMela.state.target.group.visible,
}));
console.log(JSON.stringify(info, null, 1));
await page.screenshot({ path: path.join(outDir, '64-cups-late.png') });
await page.evaluate(() => KaanchKaMela.setLanguage('hi'));
await sleep(500);
await page.screenshot({ path: path.join(outDir, '65-cups-late-hi.png') });
await browser.close();
