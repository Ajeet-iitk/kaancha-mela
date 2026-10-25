import path from 'node:path';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const outDir = 'C:/Users/ajeet/AppData/Local/Temp/opencode/mela-madira';
fs.mkdirSync(outDir, { recursive: true });
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await puppeteer.launch({
  executablePath: chrome, headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitMode = (page, modes, timeout = 60000) => page.waitForFunction(
  ms => ms.includes(window.KaanchKaMela.state.mode), { timeout, polling: 100 }, modes
);

async function offerShot(w, h, lang, name) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 500, hasTouch: w < 500 });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto('http://127.0.0.1:8123/kaancha-mela.html?v=' + Date.now(), { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.KaanchKaMela, { timeout: 30000 });
  await sleep(3000);
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  await page.evaluate(lang => {
    KaanchKaMela.startRun('cups');
    KaanchKaMela.setLanguage(lang);
    KaanchKaMela.state.nextBuffalo = performance.now() + 999999;
  }, lang);
  await sleep(1800);
  await page.evaluate(() => KaanchKaMela.throwAt(0, 1.33, 1));
  await waitMode(page, ['offer', 'win', 'lose']).catch(() => {});
  await sleep(600);
  await page.screenshot({ path: path.join(outDir, name + '.png') });
  const info = await page.evaluate(() => {
    const card = document.querySelector('.offer-card').getBoundingClientRect();
    const accept = document.getElementById('offerAccept').getBoundingClientRect();
    const refuse = document.getElementById('offerRefuse').getBoundingClientRect();
    return {
      lang: KaanchKaMela.lang,
      mode: KaanchKaMela.state.mode,
      scrollW: document.documentElement.scrollWidth,
      scrollH: document.documentElement.scrollHeight,
      card: { top: +card.top.toFixed(0), bottom: +card.bottom.toFixed(0), left: +card.left.toFixed(0), right: +card.right.toFixed(0) },
      accept: { top: +accept.top.toFixed(0), bottom: +accept.bottom.toFixed(0) },
      refuse: { top: +refuse.top.toFixed(0), bottom: +refuse.bottom.toFixed(0) },
      title: document.getElementById('offerTitle').textContent,
      warn: document.querySelector('.offer-warn').textContent.trim(),
    };
  });
  console.log(name, JSON.stringify(info, null, 1));
  await page.close();
}

await offerShot(1280, 720, 'hi', '53-offer-hi');
await offerShot(390, 844, 'en', '54-offer-mobile');
await offerShot(360, 740, 'hi', '55-offer-mobile-hi');
await browser.close();
