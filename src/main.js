import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { buildWorld } from './scene.js';
import { MelaAudio } from './audio.js';
import { STRINGS, translator } from './i18n.js';
import {
  TARGETS, TARGET_ORDER, buildTarget, settleStack, syncItems,
  countToppled, physicsMaterials, disposeTarget, TABLE_TOP,
} from './items.js';

/* ── DOM ──────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const canvas = $('scene');
const introEl = $('intro');
const selectEl = $('select');
const resultEl = $('result');
const helpEl = $('help');
const offerEl = $('offer');
const hudEl = $('hud');
const annaBubble = $('annaBubble');
const tauntText = $('tauntText');
const tauntSub = $('tauntSub');
const targetLabel = $('targetLabel');
const toppleCountEl = $('toppleCount');
const needCountEl = $('needCount');
const ballRow = $('ballRow');
const powerPanel = $('powerPanel');
const powerFill = $('powerFill');
const powerPct = $('powerPct');
const powerLabel = $('powerLabel');
const toastEl = $('toast');
const soundBtn = $('soundBtn');
const laughsEl = $('laughs');
const distValue = $('distValue');
const stepBackBtn = $('stepBackBtn');
const stepInBtn = $('stepInBtn');
const damagePill = $('damagePill');
const damageText = $('damageText');
const drunkPill = $('drunkPill');
const intruderPill = $('intruderPill');

const isMobile = (() => {
  try { return matchMedia('(pointer: coarse)').matches || window.innerWidth < 820; }
  catch (_) { return window.innerWidth < 820; }
})();

const readLang = () => {
  try {
    const v = localStorage.getItem('kaancha-lang');
    return v === 'hi' ? 'hi' : 'en';
  } catch (_) { return 'en'; }
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];


/* ── audio + voice lines ─────────────────────────────────────── */
const audio = new MelaAudio();
audio.onSpeaking = on => annaBubble.classList.toggle('speaking', !!on);

const L = {
  start: {
    cups: {
      text: 'Kulhad hain! Halke hain — phir bhi tod nahi paaye toh sharam ki baat hai!',
      hi: 'कुल्हड़ हैं! हल्के हैं — फिर भी तोड़ नहीं पाए तो शर्म की बात है!',
      en: 'Clay cups! They are light. If you cannot break these, that is just embarrassing!',
    },
    glasses: {
      text: 'Kaanch ke glass! Dheere se, warna Amma ro degi!',
      hi: 'काँच के गिलास! धीरे से, वरना अम्मा रो देगी!',
      en: 'Glass tumblers! Easy now, or Amma will cry!',
    },
    crockery: {
      text: 'Shaadi ka bartan hai! Ek bhi plate tooti toh teri shaadi cancel!',
      hi: 'शादी का बर्तन है! एक भी प्लेट टूटी तो तेरी शादी कैंसिल!',
      en: 'This is the wedding crockery! Break one plate and your wedding is cancelled!',
    },
    buckets: {
      text: 'Balte! Loha hai, beta, laddoo nahi!',
      hi: 'बाल्टे! लोहा है, बेटा, लड्डू नहीं!',
      en: 'Buckets! That is steel, kid, not laddu!',
    },
  },
  idle: [
    { text: 'Arre, aankh kahan hai? Chashma pehen ke aana!', hi: 'अरे, आँख कहाँ है? चश्मा पहन के आना!', en: 'Where are your eyes? Come back with glasses!' },
    { text: 'Meri dadi bhi isse door phenkti hai!', hi: 'मेरी दादी भी इससे दूर फेंकती है!', en: 'My grandmother throws farther than that!' },
    { text: 'Ball chhod, apne naseeb ko maar!', hi: 'बॉल छोड़, अपने नसीब को मार!', en: 'Forget the ball, hit your luck!' },
    { text: 'Aisa khel toh bandar bhi khelta hai!', hi: 'ऐसा खेल तो बंदर भी खेलता है!', en: 'Even a monkey plays better than this!' },
    { text: 'Haath mein jaan hai ya jalebi?', hi: 'हाथ में जान है या जलेबी?', en: 'Is there strength in that arm, or is it jalebi?' },
    { text: 'Jaldi kar, mera mela chalana hai!', hi: 'जल्दी कर, मेरा मेला चलाना है!', en: 'Hurry up, I have a fair to run!' },
    { text: 'Teddy chahiye? Pehle himmat dikha!', hi: 'टेडी चाहिए? पहले हिम्मत दिखा!', en: 'Want the teddy? Show some guts first!' },
    { text: 'Paisa vasool nahi hua, bhai!', hi: 'पैसा वसूल नहीं हुआ, भाई!', en: 'I am not getting my money worth, brother!' },
    { text: 'Tere throw se chai thandi ho gayi!', hi: 'तेरे थ्रो से चाय ठंडी हो गई!', en: 'Your throw made my chai go cold!' },
    { text: 'Ek miss aur, main teri mummy ko bula lunga!', hi: 'एक मिस और, मैं तेरी मम्मी को बुला लूंगा!', en: 'One more miss and I am calling your mother!' },
  ],
  miss: [
    { text: 'Hawa ko bhi sharm aa gayi!', hi: 'हवा को भी शर्म आ गई!', en: 'Even the air is embarrassed!' },
    { text: 'Ball wapas kar, woh bhi mehngi hai!', hi: 'बॉल वापस कर, वो भी महँगी है!', en: 'Give the ball back, it is expensive!' },
    { text: 'Andhe ho kya? Stack saamne hai!', hi: 'अंधे हो क्या? स्टैक सामने है!', en: 'Are you blind? The stack is right there!' },
    { text: 'Lagta hai aankhein chhutti pe gayi hain!', hi: 'लगता है आँखें छुट्टी पे गई हैं!', en: 'Looks like your eyes are on holiday!' },
  ],
  hit: [
    { text: 'Arre! Mera maal! Tu todega ya roega?', hi: 'अरे! मेरा माल! तू तोड़ेगा या रोएगा?', en: 'Oi! My goods! Are you breaking them or crying?' },
    { text: 'Thoda aur zor, nimbu!', hi: 'थोड़ा और ज़ोर, नींबू!', en: 'A little more force, lemon!' },
    { text: 'Oh ho! Chai wala comeback!', hi: 'ओ हो! चाय वाला कमबैक!', en: 'Oh ho! The chai-wallah comeback!' },
    { text: 'Bas bas, dukaan mat utha le!', hi: 'बस बस, दुकान मत उठा ले!', en: 'Enough, do not pick up the whole shop!' },
    { text: 'Arre baap re! Meri kaanch!', hi: 'अरे बाप रे! मेरी काँच!', en: 'Oh my! My glassware!' },
  ],
  win: [
    { text: 'Le ja teddy... agle saal double paisa!', hi: 'ले जा टेडी... अगले साल डबल पैसा!', en: 'Take the teddy... double the price next year!' },
    { text: 'Arre wah! Kismat chamki aaj!', hi: 'अरे वाह! किस्मत चमकी आज!', en: 'Well well! Your luck is shining today!' },
  ],
  lose: [
    { text: 'Ha ha ha! Khaali haath, bhara pet!', hi: 'हा हा हा! खाली हाथ, भरा पेट!', en: 'Ha ha ha! Empty hands, full stomach!' },
    { text: 'Teddy toh sapna hai, beta!', hi: 'टेडी तो सपना है, बेटा!', en: 'The teddy was always a dream, kid!' },
    { text: 'Agli baar paisa leke aana, himmat bhi!', hi: 'अगली बार पैसा लेके आना, हिम्मत भी!', en: 'Next time bring money, and courage too!' },
  ],
  shopHit: [
    { text: 'Arre! Meri pagdi! Meri izzat!', hi: 'अरे! मेरी पगड़ी! मेरी इज़्ज़त!', en: 'Oi! My turban! My dignity!' },
    { text: 'Aankh kahan thi? Main dukaan hoon!', hi: 'आँख कहाँ थी? मैं दुकान हूँ, बर्तन नहीं!', en: 'Where were you looking? I am the shop, not the crockery!' },
    { text: 'Dukaan tod di! Ab sab chai piyenge?', hi: 'दुकान तोड़ दी! अब सब चाय पिएंगे?', en: 'You broke the shop! Now who is paying for everyone\'s chai?' },
  ],
  teddyHit: [
    { text: 'Arre! Teddy ko kyun maara? Woh masoom hai!', hi: 'अरे! टेडी को क्यों मारा? वो मासूम है!', en: 'Oi! Why hit the teddy? He is innocent!' },
    { text: 'Teddy ki keemat teri scooter se zyada hai!', hi: 'टेडी की कीमत तेरी स्कूटर से ज़्यादा है!', en: 'That teddy costs more than your scooter!' },
  ],
  signHit: [
    { text: 'Nishan pe nahi, sign pe! Kamaal hai!', hi: 'निशाने पे नहीं, साइन पे! कमाल है!', en: 'Not the target, the sign! Brilliant!' },
  ],
  stepBack: [
    { text: 'Aage se nahi, peeche se! Ab asli khel shuru!', hi: 'आगे से नहीं, पीछे से! अब असली खेल शुरू!', en: 'From farther back now. Let us see the real player!' },
  ],
  buffalo: [
    { text: 'Arre, bhains! Mela hai, tera gaushala nahi!', hi: 'अरे, भैंस! मेला है, तेरा गौशाला नहीं!', en: 'Oi, buffalo! This is a fair, not your barn!' },
  ],
  buffaloShooed: [
    { text: 'Wah, bhains ko bhaga diya! Ek ball gaya, hero.', hi: 'वाह, भैंस को भगा दिया! एक गेंद गई, हीरो।', en: 'Nice, you shooed the buffalo! One ball gone, hero.' },
  ],
  buffaloGone: [
    { text: 'Dekh, bhains khud chali gayi. Tune ball bacha li.', hi: 'देख, भैंस खुद चली गई। तूने गेंद बचा ली।', en: 'See? The buffalo left by itself. You saved a ball.' },
  ],
  madiraOffer: [
    { text: 'Pehla ball gaya. Nerves ke liye thodi madira? Ghar ki bani hai.', hi: 'पहला बॉल गया। नसों के लिए थोड़ी मदिरा? घर की बनी है।', en: 'First ball gone. A little madira for the nerves? Made at home.' },
  ],
  madiraAccept: [
    { text: 'Nishana ab dheere-dheere... aur duniya gol-gol.', hi: 'निशाना अब धीरे-धीरे... और दुनिया गोल-गोल।', en: 'Your aim now goes slow... and the world goes round and round.' },
    { text: 'Aa gaya asli maza! Ab dekh, dukaan kaise naachti hai.', hi: 'आ गया असली मज़ा! अब देख, दुकान कैसे नाचती है।', en: 'Now the real fun begins! Watch the stall dance.' },
  ],
  madiraRefuse: [
    { text: 'Theek hai, theek hai. Sharafat se khelo.', hi: 'ठीक है, ठीक है। शराफ़त से खेलो।', en: 'Fine, fine. Play it straight then.' },
    { text: 'Mana kar diya? Tere jaise chhote log...', hi: 'मना कर दिया? तेरे जैसे छोटे लोग...', en: 'Refused? Small-timers like you...' },
  ],
  langSwitch: [
    { text: 'Hindi! Ab samajh mein aayega?', hi: 'हिंदी! अब समझ में आएगा?', en: 'Hindi now! Let us see if you understand.' },
    { text: 'Angrezi mein baat karein? Fine.', hi: 'अंग्रेज़ी में बात करें? ठीक है।', en: 'English it is. Try not to cry.' },
  ],
};

/* ── state ────────────────────────────────────────────────────── */
const state = {
  mode: 'intro',
  lang: readLang(),
  targetId: null,
  def: null,
  target: null,
  throwsUsed: 0,
  required: 0,
  toppled: 0,
  toppledBeforeThrow: 0,
  canThrow: false,
  pointerDown: false,
  chargeStart: 0,
  charge: 0,
  aim: new THREE.Vector3(0, 1.45, 0),
  activeBall: null,
  balls: [],
  flightStart: 0,
  nextTaunt: 0,
  lastTaunt: 0,
  winReveal: 0,
  winPending: false,
  simTime: 0,
  flightStartSim: 0,
  shakeUntil: 0,
  shakeStrength: 0,
  view: 'intro',
  resultShown: false,
  distance: 0,
  damage: 0,
  buffaloActive: false,
  buffaloShooed: false,
  nextBuffalo: 0,
  buffaloTimer: null,
  drunk: false,
  offerShown: false,
  lastHit: { anna: 0, teddy: 0, sign: 0, buffalo: 0 },
  _maxDamageNotified: false,
};

/* ── language ─────────────────────────────────────────────────── */
let dictFn = translator(state.lang);
const t = (key, vars) => dictFn(key, vars);
const targetName = id => t(`select.${id}.name`);

function applyLanguage() {
  document.documentElement.lang = state.lang;
  document.title = state.lang === 'hi'
    ? 'काँच का मेला — 3 गेंदें, 1 टेडी'
    : 'Kaanch Ka Mela — 3 Balls, 1 Teddy';
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const v = dictFn(el.dataset.i18n);
    if (v != null) el.textContent = v;
  }
  for (const el of document.querySelectorAll('[data-i18n-html]')) {
    const v = dictFn(el.dataset.i18nHtml);
    if (v != null) el.innerHTML = v;
  }
  for (const el of document.querySelectorAll('[data-i18n-aria]')) {
    const v = dictFn(el.dataset.i18nAria);
    if (v != null) el.setAttribute('aria-label', v);
  }
  for (const el of document.querySelectorAll('[data-i18n-title]')) {
    const v = dictFn(el.dataset.i18nTitle);
    if (v != null) el.title = v;
  }
  for (const btn of document.querySelectorAll('[data-lang]')) {
    const on = btn.dataset.lang === state.lang;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  const muted = soundBtn.classList.contains('muted');
  const soundLabel = t(muted ? 'hud.unmute' : 'hud.sound');
  soundBtn.setAttribute('aria-label', soundLabel);
  soundBtn.title = soundLabel;
}

function setLanguage(lang, announce = false) {
  const next = lang === 'hi' ? 'hi' : 'en';
  const changed = next !== state.lang;
  state.lang = next;
  dictFn = translator(next);
  try { localStorage.setItem('kaancha-lang', next); } catch (_) {}
  applyLanguage();
  audio.setLanguage(next);
  if (currentAnnaLine) setAnnaText(currentAnnaLine);
  updateHUD();
  updatePowerUI();
  if (state.resultShown && state.def) renderResult(resultEl.dataset.result === 'win');
  if (changed && announce && state.mode === 'aim') {
    const line = next === 'hi' ? L.langSwitch[0] : L.langSwitch[1];
    annaSay(line, { speak: true });
  }
}


const VIEWS = {
  intro: {
    pos: new THREE.Vector3(0.35, 2.62, 9.0),
    look: new THREE.Vector3(-0.55, 2.02, -0.1),
  },
  select: {
    pos: new THREE.Vector3(0.9, 2.7, 9.25),
    look: new THREE.Vector3(0.1, 1.92, 0),
  },
  play: {
    pos: new THREE.Vector3(0.32, 2.08, 5.78),
    look: new THREE.Vector3(0, 1.46, 0),
  },
  win: {
    pos: new THREE.Vector3(0.18, 1.38, 4.55),
    look: new THREE.Vector3(0.18, 1.1, 1.85),
  },
};
let targetPos = VIEWS.intro.pos.clone();
let targetLook = VIEWS.intro.look.clone();
const camPos = targetPos.clone();
const camLook = targetLook.clone();

/* ── renderer / scene ────────────────────────────────────────── */
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, powerPreference: 'high-performance', alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a1511);
const camera = new THREE.PerspectiveCamera(47, window.innerWidth / window.innerHeight, 0.07, 220);
camera.position.copy(camPos);
camera.lookAt(camLook);
scene.add(camera);

const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.solver.iterations = 14;
world.solver.tolerance = 0.001;
world.defaultContactMaterial.friction = 0.42;
world.defaultContactMaterial.restitution = 0.08;

/* static colliders */
const groundBody = new CANNON.Body({ mass: 0, material: physicsMaterials.wood });
groundBody.addShape(new CANNON.Plane());
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

const tableBody = new CANNON.Body({ mass: 0, material: physicsMaterials.wood });
tableBody.addShape(new CANNON.Box(new CANNON.Vec3(1.4, 0.06, 0.76)));
tableBody.position.set(0, 1.0, 0);
world.addBody(tableBody);

const backdropBody = new CANNON.Body({ mass: 0, material: physicsMaterials.wood });
backdropBody.addShape(new CANNON.Box(new CANNON.Vec3(2.8, 1.68, 0.06)));
backdropBody.position.set(0, 2.02, -1.58);
world.addBody(backdropBody);

// contact feel
for (const m of [physicsMaterials.clay, physicsMaterials.glass, physicsMaterials.steel, physicsMaterials.china]) {
  world.addContactMaterial(new CANNON.ContactMaterial(m, physicsMaterials.wood, {
    friction: 0.58, restitution: 0.06, contactEquationStiffness: 1e8,
  }));
  world.addContactMaterial(new CANNON.ContactMaterial(m, physicsMaterials.ball, {
    friction: 0.32, restitution: 0.22,
  }));
  world.addContactMaterial(new CANNON.ContactMaterial(m, m, {
    friction: 0.44, restitution: 0.07,
  }));
}

/* ── scene dressing ──────────────────────────────────────────── */
let worldScene = null;
let effects = null;
let buffaloBody = null;
const hittableBodies = {};

/* ── effects and reusable objects ────────────────────────────── */
const reticle = new THREE.Group();
const reticleMat = new THREE.MeshBasicMaterial({
  color: 0xffd27a, transparent: true, opacity: 0.92,
  depthTest: false, depthWrite: false, side: THREE.DoubleSide,
});
{
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.215, 40), reticleMat);
  ring.renderOrder = 999;
  reticle.add(ring);
  const outer = new THREE.Mesh(new THREE.RingGeometry(0.27, 0.284, 44), reticleMat.clone());
  outer.material.opacity = 0.35; outer.renderOrder = 999;
  reticle.add(outer);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.024, 16), reticleMat);
  dot.renderOrder = 999; reticle.add(dot);
  for (let i = 0; i < 4; i++) {
    const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.014, 0.075), reticleMat);
    const a = i * Math.PI / 2;
    tick.position.set(Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0);
    tick.rotation.z = a; tick.renderOrder = 999;
    reticle.add(tick);
  }
  reticle.visible = false;
  scene.add(reticle);
}

const TRAJ_N = 46;
const trajGeo = new THREE.BufferGeometry();
const trajPos = new Float32Array(TRAJ_N * 3);
trajGeo.setAttribute('position', new THREE.BufferAttribute(trajPos, 3));
const trajMat = new THREE.PointsMaterial({
  color: 0xffd27a, size: 0.07, transparent: true, opacity: 0.78,
  depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
});
const trajectory = new THREE.Points(trajGeo, trajMat);
trajectory.frustumCulled = false;
trajectory.visible = false;
scene.add(trajectory);

const BASE_BALL_START = new THREE.Vector3(0.48, 1.78, 4.82);
const BALL_START = BASE_BALL_START.clone();
const HAND_BASE = new THREE.Vector3(0.57, -0.4, -1.04);
const MAX_DISTANCE = 3.6;
const DIST_STEP = 0.6;

function throwDistance() { return 4.82 + state.distance; }

function applyDistance() {
  const d = state.distance;
  BALL_START.set(0.48, BASE_BALL_START.y + d * 0.02, BASE_BALL_START.z + d);
  VIEWS.play.pos.set(0.32, 2.08 + d * 0.045, 5.78 + d * 0.98);
  if (state.view === 'play') {
    targetPos.copy(VIEWS.play.pos);
    targetLook.copy(VIEWS.play.look);
  }
}

function changeDistance(delta, opts = {}) {
  const before = state.distance;
  state.distance = clamp(state.distance + delta, 0, MAX_DISTANCE);
  if (state.distance === before) {
    if (!opts.silent) {
      audio.ui();
      toast(t(delta > 0 ? 'toast.maxDistance' : 'toast.minDistance'), 1900);
    }
    return false;
  }
  applyDistance();
  updateHUD();
  if (!opts.silent) {
    audio.ui();
    toast(t('toast.distance', { m: throwDistance().toFixed(1) }), 2100);
  }
  return true;
}

const ballGeo = new THREE.SphereGeometry(0.105, 24, 18);
const ballMat = new THREE.MeshStandardMaterial({ color: 0xc63b2d, roughness: 0.42, metalness: 0.02 });
const seamMat = new THREE.MeshStandardMaterial({ color: 0xf5e6c9, roughness: 0.6 });
function makeBallVisual() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(ballGeo, ballMat);
  core.castShadow = true; g.add(core);
  const seam1 = new THREE.Mesh(new THREE.TorusGeometry(0.104, 0.0045, 4, 24), seamMat);
  seam1.rotation.x = Math.PI / 2; g.add(seam1);
  const seam2 = new THREE.Mesh(new THREE.TorusGeometry(0.104, 0.0045, 4, 24), seamMat);
  seam2.rotation.y = Math.PI / 2; seam2.rotation.z = 0.5; g.add(seam2);
  return g;
}

/* hand + ball in foreground */
const handRig = new THREE.Group();
handRig.position.copy(HAND_BASE);
handRig.scale.setScalar(0.55);
handRig.visible = false;
camera.add(handRig);
{
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x9a633c, roughness: 0.8 });
  const sleeveMat = new THREE.MeshStandardMaterial({ color: 0xdfcba6, roughness: 0.95 });
  const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.3, 4, 8), skinMat);
  forearm.position.set(-0.035, -0.14, 0.04); forearm.rotation.z = -0.38; forearm.rotation.x = 0.25;
  handRig.add(forearm);
  const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.24, 4, 8), sleeveMat);
  sleeve.position.set(-0.06, -0.27, 0.1); sleeve.rotation.z = -0.38; sleeve.rotation.x = 0.25;
  handRig.add(sleeve);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.078, 10, 8), skinMat);
  hand.scale.set(0.95, 1.1, 0.8); hand.position.set(0, 0, 0); handRig.add(hand);
  // fingers hint
  for (let i = 0; i < 3; i++) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.017, 0.045, 2, 5), skinMat);
    finger.position.set(-0.04 + i * 0.037, 0.055, -0.035);
    finger.rotation.x = 0.5; handRig.add(finger);
  }
  const ballInHand = makeBallVisual();
  ballInHand.scale.setScalar(0.88);
  ballInHand.position.set(0, 0.075, -0.075);
  ballInHand.rotation.set(0.4, 0.2, 0.3);
  ballInHand.traverse(o => { if (o.isMesh) o.castShadow = false; });
  handRig.userData.ball = ballInHand;
  handRig.add(ballInHand);
}

/* ── helpers ─────────────────────────────────────────────────── */
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2(0, 0);
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const GRAV = 9.82;

function setMode(mode) {
  state.mode = mode;
  document.body.dataset.mode = mode;
}

function setView(name) {
  state.view = name;
  const v = VIEWS[name] || VIEWS.play;
  targetPos.copy(v.pos);
  targetLook.copy(v.look);
}

function easeOutBack(x) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function solveLaunch(from, to, speed) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const dy = to.y - from.y;
  const D = Math.hypot(dx, dz);
  if (D < 0.001) return new THREE.Vector3(0, speed, 0);
  const s2 = speed * speed;
  const disc = s2 * s2 - GRAV * (GRAV * D * D + 2 * dy * s2);
  if (disc < 0) {
    return new THREE.Vector3(dx / D, 0.45, dz / D).normalize().multiplyScalar(speed);
  }
  const tan = (s2 - Math.sqrt(disc)) / (GRAV * D);
  const cos = 1 / Math.sqrt(1 + tan * tan);
  const vh = speed * cos;
  return new THREE.Vector3(dx / D * vh, speed * tan, dz / D * vh);
}

/* A throw is aimed at the reticle, but the energy in the arm decides how far
   it actually carries. Full charge lands exactly on the aim point; a weak
   release drops well short. */
const LAUNCH_FULL_SPEED = 23;
const LAUNCH_MIN_SPEED = 5;
function chargeSpeed(charge) {
  const p = clamp(charge, 0, 1);
  return LAUNCH_MIN_SPEED + (LAUNCH_FULL_SPEED - LAUNCH_MIN_SPEED) * p * p;
}
function launchVelocity(from, to, charge) {
  const full = solveLaunch(from, to, LAUNCH_FULL_SPEED);
  return full.normalize().multiplyScalar(chargeSpeed(charge));
}

/* Anna's "medicine" does not steady the hand. The aim point swims on its own,
   and the ball follows exactly what the ring is showing at release. */
function aimWobble(now = performance.now()) {
  if (!state.drunk) return { x: 0, y: 0 };
  const t = now / 1000;
  const k = 1 + state.distance * 0.06;
  return {
    x: (Math.sin(t * 2.35) * 0.10 + Math.sin(t * 5.3 + 1.4) * 0.03) * k,
    y: (Math.cos(t * 1.9 + 0.5) * 0.075 + Math.sin(t * 4.6 + 2.1) * 0.022) * k,
  };
}
const _wobbleAim = new THREE.Vector3();
function drunkAim(now = performance.now()) {
  const w = aimWobble(now);
  return _wobbleAim.set(state.aim.x + w.x, state.aim.y + w.y, state.aim.z);
}

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function toast(html, ms = 2100) {
  toastEl.innerHTML = html;
  toastEl.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('show'), ms);
}

function updateHUD() {
  distValue.textContent = `${throwDistance().toFixed(1)} m`;
  stepBackBtn.disabled = state.distance >= MAX_DISTANCE - 0.001;
  stepInBtn.disabled = state.distance <= 0.001;
  const dmg = state.damage;
  damageText.textContent = t(`hud.damage${clamp(dmg, 0, 3)}`);
  damagePill.classList.toggle('hidden', dmg <= 0);
  drunkPill.classList.toggle('hidden', !state.drunk);
  if (!state.def) return;
  targetLabel.textContent = targetName(state.targetId);
  needCountEl.textContent = state.def.required;
  toppleCountEl.textContent = state.toppled;
  const slots = [...ballRow.children];
  slots.forEach((el, i) => {
    el.classList.toggle('spent', i < state.throwsUsed);
    el.classList.toggle('next', i === state.throwsUsed && (state.mode === 'aim' || state.mode === 'charging'));
  });
}

function bumpTopple() {
  toppleCountEl.textContent = state.toppled;
  if (toppleCountEl.animate) {
    toppleCountEl.animate([
      { transform: 'scale(1.45)', color: '#fff4c8' },
      { transform: 'scale(1)', color: '#ffd37c' },
    ], { duration: 340, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
}

function refreshTopples(announce = true) {
  if (!state.target) return state.toppled;
  const n = countToppled(state.target.items, state.def.threshold);
  if (n !== state.toppled) {
    state.toppled = n;
    if (announce) bumpTopple();
  }
  return n;
}

function updatePowerUI() {
  const charging = state.mode === 'charging';
  if (charging) {
    const pct = Math.round(state.charge * 100);
    powerFill.style.width = `${pct}%`;
    powerPct.textContent = `${pct}%`;
    powerLabel.textContent = t('hud.power');
    powerPanel.classList.add('charging');
  } else {
    powerFill.style.width = '0%';
    powerPct.textContent = '0%';
    powerLabel.textContent = state.mode === 'flying' ? t('hud.inAir')
      : (state.mode === 'resolving' ? t('hud.counting') : t('hud.powerHold'));
    powerPanel.classList.remove('charging');
  }
}

function updateAimFromPointer(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  camera.updateMatrixWorld();
  raycaster.setFromCamera(pointerNDC, camera);
  const p = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(aimPlane, p)) {
    state.aim.set(clamp(p.x, -3.05, 3.05), clamp(p.y, 0.32, 4.2), 0.02);
  }
}

function updateAimVisuals(now) {
  const visible = (state.mode === 'aim' || state.mode === 'charging') && state.canThrow && !!state.target;
  reticle.visible = visible;
  trajectory.visible = visible;
  if (!visible) return;

  const charge = state.mode === 'charging' ? state.charge : 0;
  const warm = new THREE.Color(0xffd27a);
  const hot = new THREE.Color(0xff5a33);
  const c = warm.clone().lerp(hot, charge);
  reticleMat.color.copy(c);
  reticleMat.opacity = 0.92;
  const pulse = 1 + Math.sin(now / 180) * 0.035 + charge * 0.22;
  const aimPoint = drunkAim(now);
  reticle.position.copy(aimPoint);
  reticle.scale.setScalar(pulse);
  reticle.rotation.z = now / 2200;

  const previewCharge = state.mode === 'charging' ? charge : 1;
  const vel = launchVelocity(BALL_START, aimPoint, previewCharge);
  const pos = trajGeo.attributes.position.array;
  let first = true;
  for (let i = 0; i < TRAJ_N; i++) {
    const t = i * 0.035;
    _v.copy(BALL_START).addScaledVector(vel, t);
    _v.y -= 0.5 * GRAV * t * t;
    if (_v.y < 0.02 || t > 1.8) {
      for (let j = i; j < TRAJ_N; j++) { pos[j * 3 + 1] = -50; }
      break;
    }
    pos[i * 3] = _v.x; pos[i * 3 + 1] = _v.y; pos[i * 3 + 2] = _v.z;
    if (first) first = false;
  }
  trajGeo.attributes.position.needsUpdate = true;
  trajMat.color.copy(c);
  trajMat.size = 0.065 + charge * 0.035;
}

function resetHand() {
  handRig.visible = true;
  handRig.userData.ball.visible = true;
  handRig.rotation.set(0, 0, 0);
  handRig.position.copy(HAND_BASE);
}

function clearBalls() {
  for (const b of state.balls) {
    world.removeBody(b.body);
    scene.remove(b.mesh);
  }
  state.balls = [];
  state.activeBall = null;
}

function cleanupTarget() {
  if (state.target) {
    disposeTarget(state.target, scene, world);
    state.target = null;
  }
}

/* ── Anna ────────────────────────────────────────────────────── */
let speakingTimer = null;
let currentAnnaLine = null;
function setAnnaText(line) {
  const hi = state.lang === 'hi';
  tauntText.textContent = (hi ? line.hi : line.en) || line.text || '';
  tauntSub.textContent = (hi ? line.en : line.hi) || '';
}
function annaSay(line, opts = {}) {
  if (!line) return;
  currentAnnaLine = line;
  setAnnaText(line);
  annaBubble.classList.add('show');
  annaBubble.classList.remove('pop');
  void annaBubble.offsetWidth;
  annaBubble.classList.add('pop');
  annaBubble.classList.add('speaking');
  clearTimeout(speakingTimer);
  speakingTimer = setTimeout(() => annaBubble.classList.remove('speaking'), 2400);
  state.lastTaunt = performance.now();
  if (worldScene) worldScene.organizerApi.talk(2600);
  if (opts.speak !== false) audio.taunt(line, state.lang);
}

let lastTauntBucket = -1;
function randomLine(bucket) {
  const arr = L[bucket];
  if (!arr.length) return null;
  let i = Math.floor(Math.random() * arr.length);
  if (arr.length > 1 && i === lastTauntBucket) i = (i + 1) % arr.length;
  lastTauntBucket = i;
  return arr[i];
}

/* ── animations / effects ────────────────────────────────────── */
function crowdCheer(ms = 2600) {
  if (worldScene) worldScene.crowdMood('cheer', ms);
  audio.crowdCheer(1);
}
function crowdLaugh(ms = 4200) {
  if (worldScene) worldScene.crowdMood('laugh', ms);
  audio.crowdLaugh();
}
function cameraShake(ms = 700, strength = 1) {
  state.shakeUntil = performance.now() + ms;
  state.shakeStrength = strength;
}
function showLaughs() {
  laughsEl.classList.remove('show');
  void laughsEl.offsetWidth;
  laughsEl.classList.add('show');
  clearTimeout(showLaughs._t);
  showLaughs._t = setTimeout(() => laughsEl.classList.remove('show'), 3100);
}

/* ── stall damage: Anna, teddy and the sign ──────────────────── */
const HIT_DEBOUNCE = 1400;

function setupHittables() {
  if (hittableBodies.ready) return;
  hittableBodies.ready = true;

  function register(kind, body) {
    body.userData = { ...(body.userData || {}), isHittable: kind };
    body.addEventListener('collide', ev => {
      const other = ev.body;
      if (!other || !other.userData || !other.userData.isBall) return;
      handleWorldHit(kind, other.position);
    });
    world.addBody(body);
    hittableBodies[kind] = body;
  }

  // Anna's torso
  const anna = new CANNON.Body({ mass: 0, material: physicsMaterials.wood });
  anna.addShape(new CANNON.Cylinder(0.5, 0.58, 1.9, 10), new CANNON.Vec3(0, 0.95, 0));
  anna.addShape(new CANNON.Sphere(0.4), new CANNON.Vec3(0, 2.05, 0));
  anna.position.set(2.62, 0, 1.02);
  register('anna', anna);

  // prize teddy sitting on the shelf
  const teddy = new CANNON.Body({ mass: 0, material: physicsMaterials.wood });
  teddy.addShape(new CANNON.Box(new CANNON.Vec3(0.3, 0.36, 0.24)), new CANNON.Vec3(0, 0, 0));
  teddy.position.set(2.3, 1.53, -1.07);
  register('teddy', teddy);

  // the big sign behind the stall
  const sign = new CANNON.Body({ mass: 0, material: physicsMaterials.wood });
  sign.addShape(new CANNON.Box(new CANNON.Vec3(2.4, 0.68, 0.07)), new CANNON.Vec3(0, 0, 0));
  sign.position.set(0, 3.78, -1.52);
  register('sign', sign);
}

function handleWorldHit(kind, bodyPos) {
  const now = performance.now();
  if (now - (state.lastHit[kind] || 0) < HIT_DEBOUNCE) return;
  state.lastHit[kind] = now;

  const p = new THREE.Vector3(bodyPos.x, bodyPos.y, bodyPos.z);
  const colors = { anna: 0xffb347, teddy: 0xffd9a0, sign: 0xffc76b };
  if (effects) effects.burst(p, colors[kind] || 0xffc87a, 28, 1.3);
  cameraShake(300, 0.65);

  if (kind === 'anna') {
    audio.bonk();
    state.damage = Math.min(3, state.damage + 1);
    if (worldScene) {
      worldScene.damageStall('anna');
      worldScene.organizerApi.talk(2800);
    }
    // hitting Anna is funny, but he moves you back a step
    let stepped = false;
    if (state.distance < MAX_DISTANCE - 0.001) {
      stepped = changeDistance(DIST_STEP, { silent: true });
    }
    const dmg = t(`hud.damage${clamp(state.damage, 0, 3)}`);
    const m = throwDistance().toFixed(1);
    annaSay(randomLine('shopHit'));
    toast(t('toast.annaHit', { dmg, m }), 3000);
    if (stepped) setTimeout(() => { if (state.mode === 'aim') toast(t('toast.distance', { m }), 2200); }, 1500);
  } else if (kind === 'teddy') {
    audio.squeak();
    state.damage = Math.min(3, state.damage + 1);
    if (worldScene) {
      worldScene.damageStall('teddy');
      worldScene.organizerApi.talk(2400);
    }
    annaSay(randomLine('teddyHit'));
    toast(t('toast.teddyHit'), 2600);
  } else if (kind === 'sign') {
    audio.impact('wood', 0.9);
    state.damage = Math.min(3, state.damage + 1);
    if (worldScene) {
      worldScene.damageStall('sign');
      worldScene.organizerApi.talk(2200);
    }
    annaSay(randomLine('signHit'));
    toast(t('toast.signHit', { dmg: t(`hud.damage${clamp(state.damage, 0, 3)}`) }), 2400);
  }

  updateHUD();
  if (state.damage >= 3 && !state._maxDamageNotified) {
    state._maxDamageNotified = true;
    setTimeout(() => toast(t('toast.damageMax'), 2800), 900);
  }
}

/* ── the buffalo ─────────────────────────────────────────────── */
function ensureBuffaloBody() {
  if (buffaloBody) return buffaloBody;
  buffaloBody = new CANNON.Body({ mass: 0, material: physicsMaterials.wood });
  buffaloBody.addShape(new CANNON.Box(new CANNON.Vec3(0.88, 0.62, 0.54)), new CANNON.Vec3(0, 1.16, 0));
  buffaloBody.addShape(new CANNON.Sphere(0.42), new CANNON.Vec3(0.98, 1.22, 0));
  buffaloBody.userData = { isBuffalo: true };
  buffaloBody.addEventListener('collide', ev => {
    if (ev.body && ev.body.userData && ev.body.userData.isBall) shooBuffalo();
  });
  return buffaloBody;
}

function attachBuffaloBody() {
  const body = ensureBuffaloBody();
  const p = worldScene.buffalo.position();
  body.position.set(p.x, 0, p.z);
  body.aabbNeedsUpdate = true;
  if (!world.bodies.includes(body)) world.addBody(body);
}

function detachBuffaloBody() {
  if (buffaloBody && world.bodies.includes(buffaloBody)) world.removeBody(buffaloBody);
}

function spawnBuffalo() {
  if (!state.target || state.buffaloActive) return false;
  if (!['aim', 'charging'].includes(state.mode)) return false;
  if (state.throwsUsed >= 3) return false;

  state.buffaloActive = true;
  state.buffaloShooed = false;
  if (worldScene) worldScene.buffalo.enter();
  attachBuffaloBody();
  intruderPill.classList.remove('hidden');
  audio.grunt();
  toast(t('toast.buffaloIn'), 3000);
  annaSay(randomLine('buffalo'));
  return true;
}

function stopBuffalo() {
  state.buffaloActive = false;
  if (worldScene) worldScene.buffalo.reset();
  detachBuffaloBody();
  intruderPill.classList.add('hidden');
}

function shooBuffalo() {
  if (!state.buffaloActive) return false;
  if (state.mode !== 'flying') return false;

  state.buffaloShooed = true;
  state.buffaloActive = false;
  if (worldScene) {
    worldScene.buffalo.hit();
    const p = worldScene.buffalo.position();
    if (effects) effects.burst(new THREE.Vector3(p.x, 1.2, p.z), 0xffb066, 32, 1.4);
  }
  detachBuffaloBody();
  intruderPill.classList.add('hidden');
  audio.grunt();
  cameraShake(260, 0.5);
  annaSay(randomLine('buffaloShooed'));
  toast(t('toast.buffaloShooed'), 2600);
  state.nextBuffalo = performance.now() + 12000 + Math.random() * 8000;
  return true;
}

function onBuffaloLeft() {
  state.buffaloActive = false;
  detachBuffaloBody();
  intruderPill.classList.add('hidden');
  audio.grunt();
  annaSay(randomLine('buffaloGone'));
  toast(t('toast.buffaloGone'), 2400);
  state.nextBuffalo = performance.now() + 12000 + Math.random() * 8000;
}

/* ── game flow ───────────────────────────────────────────────── */
function startRun(targetId) {
  audio.init();
  audio.ui();
  const def = TARGETS[targetId];
  if (!def) return;

  clearMadira();
  hide(resultEl);
  hide(selectEl);
  hide(introEl);
  hide(helpEl);
  state.resultShown = false;

  cleanupTarget();
  clearBalls();
  state.distance = 0;
  state.damage = 0;
  state.buffaloActive = false;
  state.buffaloShooed = false;
  state._maxDamageNotified = false;
  clearTimeout(state.buffaloTimer);
  detachBuffaloBody();
  if (worldScene) {
    worldScene.winGroup.visible = false;
    worldScene.setWinLight(false);
    worldScene.effects.clear();
    worldScene.resetStall();
    worldScene.buffalo.reset();
  }
  applyDistance();
  intruderPill.classList.add('hidden');

  state.targetId = targetId;
  state.def = def;
  state.target = buildTarget(targetId, scene, world);
  settleStack(state.target.items, world, 120);
  syncItems(state.target.items);

  for (const item of state.target.items) attachItemSounds(item);

  state.throwsUsed = 0;
  state.required = def.required;
  state.toppled = 0;
  state.toppledBeforeThrow = 0;
  state.charge = 0;
  state.pointerDown = false;
  state.canThrow = false;
  state.activeBall = null;
  state.aim.set(def.aimX || 0, def.aimY, 0.02);
  state.nextTaunt = performance.now() + 7200;
  state.nextBuffalo = performance.now() + 15000 + Math.random() * 9000;
  state.damage = 0;
  state.lastHit.anna = state.lastHit.teddy = state.lastHit.sign = state.lastHit.buffalo = 0;
  state.winReveal = 0;
  state.winPending = false;

  hudEl.classList.remove('hidden');
  hudEl.setAttribute('aria-hidden', 'false');
  annaBubble.classList.remove('show');
  updateHUD();
  updatePowerUI();
  resetHand();
  reticle.visible = false;
  trajectory.visible = false;
  setMode('aim');
  state.canThrow = true;
  setView('play');
  show(hudEl);
  showLaughs._t && clearTimeout(showLaughs._t);

  setTimeout(() => {
    if (state.mode === 'aim' || state.mode === 'charging') {
      updateAimVisuals(performance.now());
    }
  }, 80);

  toast(t('toast.targetStart', { name: targetName(targetId), need: def.required, total: def.total }), 2600);
  setTimeout(() => {
    if (state.targetId === targetId) annaSay(L.start[targetId]);
  }, 420);

  // a little camera settle bounce
  cameraShake(260, 0.25);
}

function attachItemSounds(item) {
  const sparkColors = {
    glass: 0xcff8ff, china: 0xffe6ba, clay: 0xffb27a, steel: 0xffcf8a,
  };
  item.body.addEventListener('collide', ev => {
    const v = Math.abs(ev.contact.getImpactVelocityAlongNormal());
    if (v < 0.9) return;
    const now = performance.now();
    if (now - item.lastSound > 85) {
      item.lastSound = now;
      audio.impact(item.kind, clamp(v / 7, 0.07, 1));
    }
    if (v > 3.0 && effects) {
      const p = item.body.position;
      _v2.set(p.x, p.y, p.z);
      effects.burst(_v2, sparkColors[item.kind] || 0xffc87a, Math.min(22, Math.round(4 + v * 1.8)), Math.min(1.6, v / 6));
    }
    if ((item.kind === 'glass' || item.kind === 'china') && v > 4.2) {
      audio.shatter(clamp(v / 9, 0.3, 1));
    }
  });
}

function throwBall(now) {
  if (!state.target || !['aim', 'charging'].includes(state.mode) || !state.canThrow) return;
  const charge = clamp((now - state.chargeStart) / 1250, 0, 1);
  state.charge = charge;
  // the arm's energy sets the speed; aim only sets the line
  const sway = 0.05 + state.distance * 0.02;
  const aim = drunkAim(now).clone();
  if (sway > 0.001) {
    aim.x += (Math.random() - 0.5) * sway;
    aim.y += (Math.random() - 0.5) * sway * 0.7;
  }
  const vel = launchVelocity(BALL_START, aim, charge);

  const visual = makeBallVisual();
  visual.position.copy(BALL_START);
  visual.castShadow = true;
  scene.add(visual);

  const body = new CANNON.Body({
    mass: 0.9,
    material: physicsMaterials.ball,
    position: new CANNON.Vec3(BALL_START.x, BALL_START.y, BALL_START.z),
    linearDamping: 0.006,
    angularDamping: 0.02,
    allowSleep: true,
    sleepSpeedLimit: 0.25,
    sleepTimeLimit: 0.5,
  });
  body.addShape(new CANNON.Sphere(0.115));
  body.userData = { isBall: true };
  body.velocity.set(vel.x, vel.y, vel.z);
  body.angularVelocity.set(-vel.z * 1.5, 0.4, vel.x * 1.5);
  body.addEventListener('collide', ev => {
    const v = Math.abs(ev.contact.getImpactVelocityAlongNormal());
    if (v > 2.2) audio.impact('wood', clamp(v / 8, 0.05, 0.4));
  });
  world.addBody(body);

  state.balls.push({ body, mesh: visual });
  state.activeBall = state.balls[state.balls.length - 1];
  state.throwsUsed++;
  state.buffaloShooed = false;
  state.toppledBeforeThrow = state.toppled;
  state.flightStart = now;
  state.flightStartSim = state.simTime;

  handRig.visible = false;
  handRig.userData.ball.visible = false;
  reticle.visible = false;
  trajectory.visible = false;
  setMode('flying');
  state.pointerDown = false;
  state.charge = 0;
  updateHUD();
  updatePowerUI();
  audio.whoosh();
  audio.stopCharge();

  if (worldScene) worldScene.organizerApi.talk(1300);
  toast(t('toast.ballN', { n: state.throwsUsed }), 1500);
}

function queueWin(delay = 620) {
  if (state.winPending || !state.target) return;
  state.winPending = true;
  state.canThrow = false;
  state.pointerDown = false;
  audio.stopCharge();
  reticle.visible = false;
  trajectory.visible = false;
  handRig.visible = false;
  setMode('resolving');
  updatePowerUI();
  setTimeout(() => {
    if (state.mode === 'resolving') winGame();
  }, delay);
}

function resolveThrow() {
  if (!state.target) return;
  setMode('resolving');
  const n = refreshTopples();
  const gained = n - state.toppledBeforeThrow;
  const success = n >= state.required;
  state.activeBall = null;
  reticle.visible = false;
  trajectory.visible = false;
  handRig.visible = false;
  updatePowerUI();

  if (success) {
    queueWin(620);
    return;
  }
  if (state.buffaloShooed && gained <= 0) {
    state.buffaloShooed = false;
    annaSay(pick(L.buffaloShooed));
    if (worldScene) worldScene.organizerApi.react('annoyed');
    toast(t('toast.buffaloShooed'), 2600);
    if (state.throwsUsed >= 3) {
      setTimeout(() => { if (state.mode === 'resolving') loseGame(); }, 900);
    } else {
      setTimeout(() => {
        if (state.mode === 'resolving') beginAim();
      }, 1250);
    }
    return;
  }
  if (state.throwsUsed >= 3) {
    setTimeout(() => { if (state.mode === 'resolving') loseGame(); }, 760);
    return;
  }

  if (gained <= 0) {
    annaSay(randomLine('miss'));
    if (worldScene) {
      worldScene.organizerApi.react('laugh');
      worldScene.organizerApi.talk(2400);
    }
    toast(t('toast.nothing', { used: state.throwsUsed }), 2200);
  } else {
    annaSay(randomLine('hit'));
    if (worldScene) {
      worldScene.organizerApi.react('annoyed');
      worldScene.organizerApi.talk(2600);
    }
    crowdCheer(1400);
    toast(t('toast.gained', { gained, n, need: state.required }), 2200);
  }

  setTimeout(() => {
    if (state.mode === 'resolving') beginAim();
  }, 1150);
}

function beginAim() {
  if (!state.target) return;
  state.charge = 0;
  state.pointerDown = false;
  state.canThrow = true;
  state.nextTaunt = performance.now() + 8200;
  if (state.throwsUsed < 3) {
    state.nextBuffalo = performance.now() +
      (state.throwsUsed >= 2 ? 1400 : 3200) + Math.random() * 5200;
  }
  setMode('aim');
  resetHand();
  updateHUD();
  updatePowerUI();

  if (state.throwsUsed === 1 && !state.offerShown) {
    openMadiraOffer();
    return;
  }

  toast(t('toast.ballNext', { n: state.throwsUsed + 1, need: Math.max(0, state.required - state.toppled) }), 1900);
}

/* Anna's free "medicine". He only offers it once, right after the first ball. */
function openMadiraOffer() {
  if (!state.target || state.offerShown || state.drunk) return;
  state.offerShown = true;
  state.pointerDown = false;
  state.canThrow = false;
  state.charge = 0;
  audio.stopCharge();
  reticle.visible = false;
  trajectory.visible = false;
  handRig.visible = false;
  clearTimeout(toast._t);
  toastEl.classList.remove('show');
  setMode('offer');
  updateHUD();
  updatePowerUI();
  show(offerEl);
  audio.taunt(pick(L.madiraOffer), state.lang);
  if (worldScene) worldScene.organizerApi.talk(2600);
  setTimeout(() => {
    if (state.mode === 'offer') $('offerRefuse').focus({ preventScroll: true });
  }, 140);
}

function closeMadiraOffer() {
  hide(offerEl);
  if (!state.target) return;
  if (document.activeElement) document.activeElement.blur();
  state.pointerDown = false;
  state.canThrow = true;
  state.charge = 0;
  setMode('aim');
  resetHand();
  updateHUD();
  updatePowerUI();
  state.nextTaunt = performance.now() + 6500;
  state.nextBuffalo = performance.now() + 9000 + Math.random() * 5000;
}

function acceptMadira() {
  if (state.mode !== 'offer') return;
  state.drunk = true;
  document.body.classList.add('drunk');
  audio.glug();
  closeMadiraOffer();
  toast(t('madira.accepted'), 2800);
  annaSay(pick(L.madiraAccept), { speak: true });
  cameraShake(700, 0.7);
}

function refuseMadira() {
  if (state.mode !== 'offer') return;
  audio.ui();
  closeMadiraOffer();
  toast(t('madira.refused'), 2400);
  annaSay(pick(L.madiraRefuse), { speak: true });
}

function clearMadira() {
  state.drunk = false;
  state.offerShown = false;
  document.body.classList.remove('drunk');
  hide(offerEl);
}

function winGame() {
  if (state.mode === 'win') return;
  setMode('win');
  state.canThrow = false;
  state.pointerDown = false;
  handRig.visible = false;
  reticle.visible = false;
  trajectory.visible = false;
  audio.stopCharge();
  setView('win');
  if (worldScene) {
    worldScene.winGroup.visible = true;
    worldScene.winGroup.scale.setScalar(0.01);
    worldScene.setWinLight(true);
    worldScene.organizerApi.react('sad');
    worldScene.organizerApi.talk(3200);
    worldScene.effects.confettiBurst(new THREE.Vector3(0.3, 3.4, 2.6));
  }
  audio.winJingle();
  state.winReveal = performance.now();
  stopBuffalo();
  crowdCheer(5200);
  cameraShake(280, 0.2);
  annaSay(randomLine('win'));
  toast(t('toast.teddy'), 2400);
  state.resultShown = false;
  setTimeout(() => {
    if (state.mode === 'win') showResult(true);
  }, 1600);
}

function loseGame() {
  if (state.mode === 'lose') return;
  setMode('lose');
  state.canThrow = false;
  state.pointerDown = false;
  handRig.visible = false;
  reticle.visible = false;
  trajectory.visible = false;
  audio.stopCharge();
  setView('play');
  if (worldScene) {
    worldScene.organizerApi.react('laugh');
    worldScene.organizerApi.talk(5000);
  }
  crowdLaugh(5200);
  setTimeout(() => audio.loseSting(), 800);
  cameraShake(750, 1);
  showLaughs();
  annaSay(randomLine('lose'));
  stopBuffalo();
  toast(t('toast.empty'), 2400);
  state.resultShown = false;
  setTimeout(() => {
    if (state.mode === 'lose') showResult(false);
  }, 1900);
}

function renderResult(win) {
  if (!state.def) return;
  resultEl.dataset.result = win ? 'win' : 'lose';
  const storyTarget = t(`result.target.${state.targetId}`);
  $('resultKicker').textContent = t(win ? 'result.winKicker' : 'result.loseKicker');
  $('resultTitle').textContent = t(win ? 'result.winTitle' : 'result.loseTitle');
  $('resultStory').textContent = t(win ? 'result.winStory' : 'result.loseStory', { target: storyTarget });
  $('statToppled').textContent = `${state.toppled}/${state.def.total}`;
  $('statThrows').textContent = state.throwsUsed;
  $('statTarget').textContent = t(`select.${state.targetId}.short`);
  $('resultQuote').textContent = t(win ? 'result.winQuote' : 'result.loseQuote');
  $('againBtn').innerHTML = `${t(win ? 'result.again' : 'result.tryAgain')} <span class="arrow">↻</span>`;
}

function showResult(win) {
  if (state.resultShown) return;
  state.resultShown = true;
  refreshTopples();
  renderResult(win);
  hide(hudEl);
  hudEl.setAttribute('aria-hidden', 'true');
  annaBubble.classList.remove('show');
  show(resultEl);
  audio.ui();
}

/* ── input ──────────────────────────────────────────────────── */
function pointerAim(e) {
  updateAimFromPointer(e.clientX, e.clientY);
}

function beginCharge(e) {
  audio.init();
  if (!(state.mode === 'aim' && state.canThrow)) return;
  if (e) pointerAim(e);
  state.pointerDown = true;
  state.chargeStart = performance.now();
  state.charge = 0;
  setMode('charging');
  audio.chargeStart();
  updatePowerUI();
}

function releaseCharge() {
  if (!state.pointerDown) return;
  const now = performance.now();
  const wasCharging = state.mode === 'charging';
  state.pointerDown = false;
  audio.stopCharge();
  if (wasCharging) throwBall(now);
  else if (state.mode === 'charging') setMode('aim');
}

canvas.addEventListener('pointermove', e => {
  if (state.mode === 'aim' || state.mode === 'charging') pointerAim(e);
});
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();
  audio.init();
  if (!(state.mode === 'aim' && state.canThrow)) return;
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  beginCharge(e);
});
window.addEventListener('pointerup', () => {
  if (state.pointerDown) releaseCharge();
});
window.addEventListener('pointercancel', () => {
  if (state.pointerDown) {
    state.pointerDown = false;
    audio.stopCharge();
    if (state.mode === 'charging') setMode('aim');
    updatePowerUI();
  }
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', e => {
  if (state.mode === 'offer') {
    if (e.key === 'Escape') { e.preventDefault(); refuseMadira(); }
    return;
  }
  if (e.code === 'Space') {
    if (state.mode === 'aim' && state.canThrow && !state.pointerDown) {
      e.preventDefault();
      beginCharge(null);
    }
  } else if (e.key === 'm' || e.key === 'M') {
    toggleMute();
  } else if ((e.key === '+' || e.key === '=') && ['aim', 'charging'].includes(state.mode)) {
    e.preventDefault();
    changeDistance(DIST_STEP);
  } else if ((e.key === '-' || e.key === '_') && ['aim', 'charging'].includes(state.mode)) {
    e.preventDefault();
    changeDistance(-DIST_STEP);
  } else if (e.key === 'Escape') {
    if (!helpEl.classList.contains('hidden')) closeHelp();
    else if (state.mode === 'aim') openHelp();
  }
});
window.addEventListener('keyup', e => {
  if (e.code === 'Space' && state.mode === 'charging') {
    e.preventDefault();
    releaseCharge();
  }
});

/* ── buttons ────────────────────────────────────────────────── */
function toggleMute() {
  const muted = !soundBtn.classList.contains('muted');
  soundBtn.classList.toggle('muted', muted);
  const label = t(muted ? 'hud.unmute' : 'hud.sound');
  soundBtn.setAttribute('aria-label', label);
  soundBtn.title = label;
  audio.init();
  audio.setMuted(muted);
  toast(t(muted ? 'toast.muted' : 'toast.unmuted'), 1500);
}

soundBtn.addEventListener('click', toggleMute);

/* language toggles (intro, select and HUD) */
for (const btn of document.querySelectorAll('[data-lang]')) {
  btn.addEventListener('click', () => {
    audio.init();
    audio.ui();
    setLanguage(btn.dataset.lang, true);
  });
}

/* distance controls */
stepBackBtn.addEventListener('click', () => {
  if (!['aim', 'charging'].includes(state.mode)) return;
  changeDistance(DIST_STEP);
});
stepInBtn.addEventListener('click', () => {
  if (!['aim', 'charging'].includes(state.mode)) return;
  changeDistance(-DIST_STEP);
});

$('enterBtn').addEventListener('click', () => {
  audio.init();
  audio.ui();
  hide(introEl);
  show(selectEl);
  setMode('select');
  setView('select');
});

$('introHelpBtn').addEventListener('click', openHelp);
$('backToIntro').addEventListener('click', () => {
  audio.init();
  audio.ui();
  hide(selectEl);
  show(introEl);
  hide(hudEl);
  hudEl.setAttribute('aria-hidden', 'true');
  clearMadira();
  cleanupTarget();
  clearBalls();
  stopBuffalo();
  if (worldScene) {
    worldScene.winGroup.visible = false;
    worldScene.setWinLight(false);
    worldScene.effects.clear();
  }
  state.def = null;
  state.targetId = null;
  setMode('intro');
  setView('intro');
  annaBubble.classList.remove('show');
  reticle.visible = false;
  trajectory.visible = false;
  handRig.visible = false;
});

for (const card of document.querySelectorAll('.target-card')) {
  card.addEventListener('click', () => {
    const id = card.dataset.target;
    if (!id || !TARGETS[id]) return;
    startRun(id);
  });
}

$('againBtn').addEventListener('click', () => {
  const id = state.targetId;
  hide(resultEl);
  if (worldScene) worldScene.effects.clear();
  startRun(id);
});

$('changeBtn').addEventListener('click', () => {
  hide(resultEl);
  hide(hudEl);
  hudEl.setAttribute('aria-hidden', 'true');
  clearMadira();
  cleanupTarget();
  clearBalls();
  stopBuffalo();
  if (worldScene) {
    worldScene.winGroup.visible = false;
    worldScene.setWinLight(false);
    worldScene.effects.clear();
  }
  show(selectEl);
  setMode('select');
  setView('select');
  annaBubble.classList.remove('show');
  reticle.visible = false;
  trajectory.visible = false;
  handRig.visible = false;
});

let helpReturnMode = null;
function openHelp() {
  if (!helpEl.classList.contains('hidden')) return;
  audio.init();
  audio.ui();
  if (!['aim', 'intro', 'select', 'paused'].includes(state.mode)) return;
  helpReturnMode = state.mode;
  state.pointerDown = false;
  audio.stopCharge();
  setMode('paused');
  reticle.visible = false;
  trajectory.visible = false;
  handRig.visible = false;
  updatePowerUI();
  show(helpEl);
}
function closeHelp() {
  hide(helpEl);
  audio.ui();
  if (helpReturnMode === 'aim') {
    setMode('aim');
    resetHand();
    updatePowerUI();
  } else if (helpReturnMode) {
    setMode(helpReturnMode);
  }
  helpReturnMode = null;
}
$('helpBtn').addEventListener('click', openHelp);
$('helpClose').addEventListener('click', closeHelp);

/* madira offer */
$('offerAccept').addEventListener('click', acceptMadira);
$('offerRefuse').addEventListener('click', refuseMadira);

/* ── laughs ─────────────────────────────────────────────────── */
(function buildLaughs() {
  const words = ['HA!', 'HA HA!', 'HEE HEE!', 'OHO!', 'HA HA HA!', 'AYYO!', 'HA!', 'HEE!'];
  for (let i = 0; i < 11; i++) {
    const s = document.createElement('span');
    s.textContent = words[i % words.length];
    s.style.left = `${8 + Math.random() * 78}%`;
    s.style.bottom = `${22 + Math.random() * 42}%`;
    s.style.fontSize = `${clamp(22 + Math.random() * 44, 22, 70)}px`;
    s.style.setProperty('--rot', `${(Math.random() - 0.5) * 18}deg`);
    s.style.setProperty('--delay', `${Math.random() * 0.55}s`);
    laughsEl.appendChild(s);
  }
})();

/* ── resize ─────────────────────────────────────────────────── */
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  const aspect = w / h;
  camera.aspect = aspect;
  // taller screens get a wider lens so the whole stall stays in frame
  camera.fov = aspect < 0.72 ? 68 : aspect < 0.95 ? 60 : aspect < 1.25 ? 52 : 47;
  camera.updateProjectionMatrix();
  const cap = isMobile ? 1.75 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
  renderer.setSize(w, h, false);
}
window.addEventListener('resize', onResize);

/* ── game loop ──────────────────────────────────────────────── */
let lastFrame = performance.now();
let started = false;

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.1, Math.max(0.001, (now - lastFrame) / 1000));
  lastFrame = now;

  // keep the buffalo's collider under the walking model
  if (state.buffaloActive && worldScene && buffaloBody) {
    const bp = worldScene.buffalo.position();
    buffaloBody.position.set(bp.x, 0, bp.z);
    buffaloBody.aabbNeedsUpdate = true;
  }

  world.step(1 / 180, dt, 18);
  state.simTime += dt;

  if (state.target) {
    syncItems(state.target.items);
    if (state.mode === 'flying' || state.mode === 'resolving' || state.mode === 'aim' || state.mode === 'charging') {
      refreshTopples();
    }
  }
  for (const b of state.balls) {
    b.mesh.position.set(b.body.position.x, b.body.position.y, b.body.position.z);
    b.mesh.quaternion.set(b.body.quaternion.x, b.body.quaternion.y, b.body.quaternion.z, b.body.quaternion.w);
  }

  if (state.mode === 'charging') {
    state.charge = clamp((now - state.chargeStart) / 1250, 0, 1);
    updatePowerUI();
    // pull the hand back as the throw charges
    handRig.position.z = HAND_BASE.z + state.charge * 0.1;
    handRig.rotation.x = -state.charge * 0.35;
    handRig.rotation.z = -state.charge * 0.12;
  }
  if ((state.mode === 'aim' || state.mode === 'charging') && state.target && state.toppled >= state.required) {
    queueWin(500);
  }

  if (state.mode === 'aim' || state.mode === 'charging') {
    updateAimVisuals(now);
    if (state.mode === 'aim' && now > state.nextTaunt) {
      annaSay(randomLine('idle'));
      state.nextTaunt = now + 9500 + Math.random() * 7000;
    }
    if (!state.buffaloActive && state.target && state.throwsUsed < 3 && now > state.nextBuffalo) {
      if (Math.random() < 0.8) spawnBuffalo();
      else state.nextBuffalo = now + 6500 + Math.random() * 6500;
    }
  }

  // a ball through the buffalo's patch counts as shooing it (and spends the ball)
  if (state.buffaloActive && state.mode === 'flying' && state.activeBall && worldScene) {
    const bp = worldScene.buffalo.position();
    const b = state.activeBall.body.position;
    if (Math.abs(b.x - bp.x) < 1.05 && Math.abs(b.z - bp.z) < 0.85 && b.y < 2.05) {
      shooBuffalo();
    }
  }

  // Once the required topples are locked in, cut to the win without waiting
  // for every last glass to stop rolling.
  if ((state.mode === 'flying' || state.mode === 'resolving') &&
      state.target && state.toppled >= state.required) {
    queueWin(900);
  }

  if (state.mode === 'flying' && state.activeBall) {
    const elapsed = state.simTime - state.flightStartSim;
    const ball = state.activeBall.body;
    let itemsMoving = false;
    if (state.target) {
      for (const item of state.target.items) {
        if (item.body.velocity.length() > 0.09 || item.body.angularVelocity.length() > 0.14) {
          itemsMoving = true; break;
        }
      }
    }
    // A miss should not wait for the ball to finish bouncing around the mela.
    const gained = state.toppled - state.toppledBeforeThrow;
    const ballPast = ball.position.z < -0.35;
    const ballGone = ball.position.y < 0.35 || ball.position.z < -2.2 || ball.position.z > 6.5;
    const ballSlow = ball.velocity.length() < 0.8;
    if (elapsed > 4.4 ||
        (elapsed > 2.4 && gained === 0) ||
        (elapsed > 1.9 && !itemsMoving && (ballSlow || ballPast || ballGone))) {
      resolveThrow();
    }
  }

  if (state.mode === 'win' && state.winReveal && worldScene) {
    const k = clamp((now - state.winReveal) / 850, 0, 1);
    worldScene.winGroup.scale.setScalar(Math.max(0.01, easeOutBack(k)));
  }

  // camera smoothing
  const boozy = state.drunk && ['aim', 'charging', 'flying', 'resolving', 'offer'].includes(state.mode);
  const lerpK = 1 - Math.exp(-dt * 2.1);
  camPos.lerp(targetPos, lerpK);
  camLook.lerp(targetLook, lerpK);
  camera.position.copy(camPos);
  if (now < state.shakeUntil) {
    const k = (state.shakeUntil - now) / 750;
    const amp = 0.035 * state.shakeStrength * Math.max(0, k);
    camera.position.x += (Math.random() - 0.5) * amp;
    camera.position.y += (Math.random() - 0.5) * amp;
    _v.copy(camLook);
    _v.x += (Math.random() - 0.5) * amp * 0.3;
    _v.y += (Math.random() - 0.5) * amp * 0.3;
    camera.lookAt(_v);
  } else {
    _v.copy(camLook);
    if (boozy) {
      _v.x += Math.sin(now / 640) * 0.045;
      _v.y += Math.sin(now / 470 + 0.9) * 0.03;
    }
    camera.lookAt(_v);
  }
  if (boozy) {
    camera.position.x += Math.sin(now / 520) * 0.03;
    camera.position.y += Math.sin(now / 410 + 1.1) * 0.022;
    camera.rotateZ(Math.sin(now / 610) * 0.018 + Math.sin(now / 263) * 0.006);
  }
  // tiny idle camera breathing
  if (state.mode === 'intro' || state.mode === 'select') {
    camera.position.y += Math.sin(now / 2400) * 0.015;
    camera.position.x += Math.sin(now / 3700) * 0.025;
  }

  if (worldScene) worldScene.update(dt, now);
  if (state.buffaloActive && worldScene && !worldScene.buffalo.isActive()) onBuffaloLeft();
  renderer.render(scene, camera);
}

/* ── boot ───────────────────────────────────────────────────── */
async function boot() {
  try {
    await Promise.all([
      document.fonts.load('400 100px "Yatra One"', 'काँच का मेला'),
      document.fonts.load('700 40px "Baloo 2"', 'Shetty Anna'),
      document.fonts.load('400 40px "Baloo 2"', 'Kaanch Ka Mela'),
    ]);
    await document.fonts.ready;
  } catch (_) { /* fonts are a bonus */ }

  worldScene = buildWorld(scene, renderer, { mobile: isMobile });
  effects = worldScene.effects;
  worldScene.setWinLight(false);
  setupHittables();
  audio.setLanguage(state.lang);
  applyLanguage();

  onResize();
  started = true;
  lastFrame = performance.now();
  requestAnimationFrame(animate);
}

boot();

// A small hook for the curious and for automated testing.
window.KaanchKaMela = {
  get state() { return state; },
  get lang() { return state.lang; },
  get damage() { return state.damage; },
  get buffaloActive() { return state.buffaloActive; },
  get drunk() { return state.drunk; },
  get offerOpen() { return state.mode === 'offer'; },
  wobble: () => aimWobble(performance.now()),
  acceptMadira,
  refuseMadira,
  startRun,
  setLanguage: lang => setLanguage(lang, false),
  stepBack: () => changeDistance(DIST_STEP),
  stepIn: () => changeDistance(-DIST_STEP),
  spawnBuffalo: () => spawnBuffalo(),
  shooBuffalo: () => shooBuffalo(),
  hit(kind) {
    const body = hittableBodies[kind];
    if (body) handleWorldHit(kind, body.position);
  },
  throwAt(x, y, power = 1) {
    if (!state.target || state.mode !== 'aim') return false;
    state.aim.set(x, y, 0.02);
    state.chargeStart = performance.now() - power * 1250;
    state.pointerDown = true;
    throwBall(performance.now());
    return true;
  },
  toppleCount() { return refreshTopples(false); },
};
