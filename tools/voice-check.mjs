import puppeteer from 'puppeteer-core';
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await puppeteer.launch({
  executablePath: chrome, headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  defaultViewport: { width: 900, height: 560 },
});
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run(label, voices) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(voices => {
    window.__spoken = [];
    const speak = u => window.__spoken.push({ text: u.text, lang: u.lang, voice: u.voice && u.voice.name });
    const getVoices = () => voices;
    const cancel = () => {};
    try {
      Object.defineProperty(SpeechSynthesis.prototype, 'getVoices', { value: getVoices, configurable: true });
      SpeechSynthesis.prototype.speak = speak;
      SpeechSynthesis.prototype.cancel = cancel;
      const Orig = window.SpeechSynthesisUtterance;
      window.SpeechSynthesisUtterance = new Proxy(Orig, {
        construct(target, args) {
          const u = new target(...args);
          window.__utters = window.__utters || [];
          window.__utters.push(u);
          return u;
        },
      });
    } catch (e) {
      window.__stubError = String(e);
    }
  }, voices);
  await page.goto('http://127.0.0.1:8123/kaancha-mela.html?v=' + Date.now(), { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.KaanchKaMela, { timeout: 30000 });
  await sleep(2600);
  await page.evaluate(() => {
    KaanchKaMela.startRun('cups');
    KaanchKaMela.state.nextBuffalo = performance.now() + 999999;
  });
  await sleep(2000);
  const before = await page.evaluate(() => (window.__utters || []).map(u => ({
    text: u.text, lang: u.lang, voice: u.voice && u.voice.name,
  })));
  await page.evaluate(() => {
    const u = new SpeechSynthesisUtterance('manual test');
    window.speechSynthesis.speak(u);
  });
  console.log(label, { before }, await page.evaluate(() => ({
    spoken: window.__spoken,
    stubError: window.__stubError || null,
    hasSynth: 'speechSynthesis' in window,
    voices: window.speechSynthesis.getVoices().map(v => v.lang + ':' + v.name),
    bubble: document.getElementById('tauntText').textContent,
    mode: KaanchKaMela.state.mode,
    muted: document.getElementById('soundBtn').classList.contains('muted'),
  })));
  await page.close();
}

await run('with hindi voice', [
  { name: 'Test Hindi', lang: 'hi-IN' },
  { name: 'Test English India', lang: 'en-IN' },
]);
await run('without hindi voice', [
  { name: 'Test English India', lang: 'en-IN' },
]);
await browser.close();
