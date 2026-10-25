import path from 'node:path';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const outDir = 'C:/Users/ajeet/AppData/Local/Temp/opencode/mela-features';
fs.mkdirSync(outDir, { recursive: true });
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const logs = [];
const missing = [];
page.on('console', m => { if (m.type() !== 'debug') logs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', e => logs.push(`PAGEERROR: ${e.stack || e.message}`));
page.on('response', r => { if (r.status() >= 400) missing.push(`${r.status()} ${r.url()}`); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = (name, p = page) => p.screenshot({ path: path.join(outDir, name + '.png') });
const state = () => page.evaluate(() => {
  const s = window.KaanchKaMela.state;
  return {
    mode: s.mode, lang: s.lang, distance: s.distance, damage: s.damage,
    buffaloActive: s.buffaloActive, buffaloShooed: s.buffaloShooed,
    throwsUsed: s.throwsUsed, toppled: s.toppled, required: s.required,
  };
});

try {
  await page.goto('http://127.0.0.1:8123/kaancha-mela.html?v=' + Date.now(), { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.KaanchKaMela, { timeout: 30000 });
  await sleep(3000);
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });

  // ── language toggle on intro ────────────────────────────────
  console.log('intro en title', await page.$eval('.intro-lede', el => el.textContent.trim().slice(0, 60)));
  await page.click('#intro .lang-btn[data-lang="hi"]');
  await sleep(350);
  console.log('intro hi', await page.evaluate(() => ({
    lang: document.documentElement.lang,
    title: document.querySelector('.intro-lede').textContent.trim().slice(0, 50),
    chip: document.querySelector('.chip').textContent.trim(),
    stored: localStorage.getItem('kaancha-lang'),
    active: document.querySelector('#intro .lang-btn[data-lang="hi"]').classList.contains('active'),
  })));
  await shot('01-intro-hi');
  await page.click('#intro .lang-btn[data-lang="en"]');
  await sleep(300);

  // ── into the game ───────────────────────────────────────────
  await page.click('#enterBtn');
  await sleep(600);
  console.log('select en', await page.evaluate(() => ({
    title: document.querySelector('.select-head h2').textContent,
    cups: document.querySelector('.target-card[data-target="cups"] h3').textContent,
  })));
  await page.click('.target-card[data-target="cups"]');
  await sleep(1400);
  console.log('start', await state());

  // ── distance buttons ────────────────────────────────────────
  await page.click('#stepBackBtn');
  await sleep(250);
  const d1 = await page.evaluate(() => ({
    d: KaanchKaMela.state.distance,
    label: document.getElementById('distValue').textContent,
    camZ: +(KaanchKaMela.state.simTime * 0).toFixed(0),
  }));
  console.log('after step back', d1);
  await page.click('#stepInBtn');
  await sleep(250);
  console.log('after step in', await page.evaluate(() => ({
    d: KaanchKaMela.state.distance,
    label: document.getElementById('distValue').textContent,
  })));

  // ── stall hits ──────────────────────────────────────────────
  await page.evaluate(() => KaanchKaMela.hit('anna'));
  await sleep(500);
  console.log('after anna hit', await state(), await page.evaluate(() => ({
    pill: !document.getElementById('damagePill').classList.contains('hidden'),
    dmgText: document.getElementById('damageText').textContent,
    bubble: document.getElementById('tauntText').textContent,
  })));
  await shot('02-anna-hit');

  await page.evaluate(() => KaanchKaMela.hit('teddy'));
  await sleep(400);
  await page.evaluate(() => KaanchKaMela.hit('sign'));
  await sleep(500);
  console.log('after teddy+sign', await state(), await page.evaluate(() => ({
    dmgText: document.getElementById('damageText').textContent,
  })));
  await shot('03-stall-damage');

  // ── buffalo ─────────────────────────────────────────────────
  await page.evaluate(() => KaanchKaMela.spawnBuffalo());
  await sleep(600);
  console.log('buffalo in', await state(), await page.evaluate(() => ({
    pill: !document.getElementById('intruderPill').classList.contains('hidden'),
  })));
  await shot('04-buffalo');
  // let it walk to its pause spot
  await sleep(5200);
  console.log('buffalo paused', await page.evaluate(() => ({
    x: +KaanchKaMela.state.buffaloActive,
    mode: window.__bufMode || null,
  })));
  const beforeThrow = await state();
  await page.evaluate(() => KaanchKaMela.throwAt(-1.75, 1.25, 0.8));
  await sleep(2500);
  console.log('after buffalo throw', await state());
  if ((await state()).buffaloActive) await page.evaluate(() => KaanchKaMela.shooBuffalo());
  await sleep(1200);
  console.log('buffalo resolved', await state(), await page.evaluate(() => ({
    toast: document.getElementById('toast').textContent.trim(),
    pillHidden: document.getElementById('intruderPill').classList.contains('hidden'),
  })));
  await shot('05-buffalo-shooed');
  // wait for the throw to resolve and the chance to be consumed
  await page.waitForFunction(() => ['aim', 'lose', 'win', 'offer'].includes(KaanchKaMela.state.mode), { timeout: 30000 }).catch(() => {});
  if (await page.evaluate(() => KaanchKaMela.state.mode === 'offer')) {
    await sleep(700);
    await page.click('#offerRefuse');
    await page.waitForFunction(() => ['aim', 'lose', 'win'].includes(KaanchKaMela.state.mode), { timeout: 20000 }).catch(() => {});
  }
  await sleep(400);
  console.log('after buffalo ball', await state());

  // ── language switch mid-game ────────────────────────────────
  await page.evaluate(() => KaanchKaMela.setLanguage('hi'));
  await sleep(500);
  console.log('hindi hud', await page.evaluate(() => ({
    lang: document.documentElement.lang,
    target: document.getElementById('targetLabel').textContent,
    scoreWord: document.querySelector('.scoreline span').textContent,
    dist: document.querySelector('.dist-read span').textContent,
    dmg: document.getElementById('damageText').textContent,
    sound: document.getElementById('soundBtn').getAttribute('aria-label'),
    bubble: document.getElementById('tauntText').textContent,
    bubbleSub: document.getElementById('tauntSub').textContent,
  })));
  await shot('06-hindi-hud');

  console.log('MISSING\n' + (missing.join('\n') || '(none)'));
  console.log('LOGS\n' + (logs.join('\n') || '(none)'));
} catch (e) {
  console.error('TEST ERROR', e);
  console.log('MISSING\n' + missing.join('\n'));
  console.log('LOGS\n' + logs.join('\n'));
  try { await shot('99-error'); } catch (_) {}
} finally {
  await browser.close();
}
