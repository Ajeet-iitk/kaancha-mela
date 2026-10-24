import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/* ── tiny helpers ─────────────────────────────────────────────── */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function randFactory(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function dirtTexture() {
  const tex = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#7c5238';
    ctx.fillRect(0, 0, w, h);
    const rand = randFactory(8);
    for (let i = 0; i < 2600; i++) {
      const x = rand() * w, y = rand() * h;
      const r = rand() * 2.4 + 0.4;
      const shade = rand();
      ctx.fillStyle = shade < 0.5
        ? `rgba(48,27,17,${0.05 + rand() * 0.16})`
        : `rgba(196,148,97,${0.035 + rand() * 0.1})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    // dry straw scratches
    ctx.strokeStyle = 'rgba(210,173,112,.13)';
    for (let i = 0; i < 90; i++) {
      const x = rand() * w, y = rand() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 14, y + (rand() - 0.5) * 14);
      ctx.stroke();
    }
    // broad scuffed patches
    for (let i = 0; i < 8; i++) {
      const x = rand() * w, y = rand() * h;
      const g = ctx.createRadialGradient(x, y, 4, x, y, 80 + rand() * 70);
      g.addColorStop(0, 'rgba(58,34,21,.09)');
      g.addColorStop(1, 'rgba(58,34,21,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 7);
  return tex;
}

function woodTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#5c3721'; ctx.fillRect(0, 0, w, h);
    const rand = randFactory(12);
    for (let i = 0; i < 40; i++) {
      const y = rand() * h;
      ctx.strokeStyle = `rgba(${30 + rand() * 35},${16 + rand() * 20},${8 + rand() * 12},${0.12 + rand() * 0.25})`;
      ctx.lineWidth = 1 + rand() * 3;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const yy = y + Math.sin(x * 0.035 + i) * (2 + rand() * 2);
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const x = rand() * w, y = rand() * h, r = 5 + rand() * 12;
      ctx.strokeStyle = 'rgba(28,14,7,.4)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, 0, 0, TAU); ctx.stroke();
    }
  });
}

function stripeTexture(colors, vertical = true, count = 10) {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const band = (vertical ? w : h) / count;
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = colors[i % colors.length];
      if (vertical) ctx.fillRect(i * band, 0, band + 1, h);
      else ctx.fillRect(0, i * band, w, band + 1);
    }
    // cloth grain / shading
    const rand = randFactory(3);
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = rand() > 0.5 ? '#000' : '#fff';
      ctx.fillRect(rand() * w, rand() * h, 1.5, 1.5);
    }
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,.18)');
    g.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(0,0,0,.22)');
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
}

function drawSpaced(ctx, text, x, y, spacing = 4) {
  const chars = [...text];
  const widths = chars.map(ch => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
  let cx = x - total / 2;
  chars.forEach((ch, i) => {
    ctx.fillText(ch, cx + widths[i] / 2, y);
    cx += widths[i] + spacing;
  });
}

function makeSignTexture() {
  return canvasTexture(1200, 320, (ctx, w, h) => {
    ctx.fillStyle = '#f0dbb2'; ctx.fillRect(0, 0, w, h);
    const rand = randFactory(7);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(120,64,34,${rand() * 0.06})`;
      ctx.fillRect(rand() * w, rand() * h, 2, 1);
    }
    // painted border
    ctx.strokeStyle = '#6e2019'; ctx.lineWidth = 24; ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.strokeStyle = '#c68a2e'; ctx.lineWidth = 4; ctx.strokeRect(36, 36, w - 72, h - 72);
    // corner motifs
    [[62, 62], [w - 62, 62], [62, h - 62], [w - 62, h - 62]].forEach(([x, y]) => {
      ctx.fillStyle = '#a35a1c';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU;
        const r = i % 2 ? 5 : 16;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e9b84f'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
    });

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '400 132px "Yatra One", "Nirmala UI", serif';
    ctx.fillStyle = 'rgba(71,21,15,.25)';
    ctx.fillText('काँच का मेला', w / 2 + 6, 128 + 7);
    ctx.fillStyle = '#7a241a';
    ctx.fillText('काँच का मेला', w / 2, 128);
    ctx.font = '700 44px "Baloo 2", sans-serif';
    ctx.fillStyle = '#136b5d';
    drawSpaced(ctx, 'KAANCH KA MELA', w / 2, 222, 11);
    ctx.font = '700 24px "Baloo 2", sans-serif';
    ctx.fillStyle = '#8d542b';
    drawSpaced(ctx, 'SHETTY ANNA  ·  EST. 1978  ·  3 BALLS, 1 TEDDY', w / 2, 272, 4);
  });
}

function makeFabricTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#6d211b'; ctx.fillRect(0, 0, w, h);
    const panel = w / 4;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#efe0bd' : '#7d2a20';
      ctx.fillRect(i * panel + 8, 0, panel - 16, h);
      ctx.fillStyle = 'rgba(198,138,46,.5)';
      ctx.fillRect(i * panel + 16, 0, 3, h);
      ctx.fillRect((i + 1) * panel - 19, 0, 3, h);
    }
    const rand = randFactory(21);
    for (let i = 0; i < 650; i++) {
      ctx.fillStyle = `rgba(0,0,0,${rand() * 0.06})`;
      ctx.fillRect(rand() * w, rand() * h, 2, 4);
    }
    // gold paisley dots
    ctx.fillStyle = 'rgba(233,184,79,.62)';
    for (let y = 30; y < h; y += 84) {
      for (let x = 34; x < w; x += 84) {
        ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 42, y + 42, 2.5, 0, TAU); ctx.fill();
      }
    }
  });
}

function makeGlowTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,246,205,1)');
    g.addColorStop(0.25, 'rgba(255,204,105,.65)');
    g.addColorStop(0.7, 'rgba(255,152,50,.12)');
    g.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
}

/* ── teddy bear ───────────────────────────────────────────────── */
export function createTeddy(scale = 1) {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0x8b5a32, roughness: 0.92 });
  const furDark = new THREE.MeshStandardMaterial({ color: 0x6d4122, roughness: 0.95 });
  const muzzle = new THREE.MeshStandardMaterial({ color: 0xd7ae79, roughness: 0.9 });
  const black = new THREE.MeshStandardMaterial({ color: 0x1c110b, roughness: 0.5 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc63a3a, roughness: 0.65 });
  const white = new THREE.MeshStandardMaterial({ color: 0xfff6e6, roughness: 0.7 });

  const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m); return m;
  };

  const sphere = new THREE.SphereGeometry(1, 22, 16);

  // body + belly
  add(sphere, fur, 0, 0.02, 0, 0.46, 0.58, 0.4);
  add(sphere, muzzle, 0, -0.02, 0.34, 0.26, 0.34, 0.1);

  // head
  const head = new THREE.Group();
  head.position.set(0, 0.72, 0.02);
  g.add(head);
  const headMesh = new THREE.Mesh(sphere, fur);
  headMesh.scale.set(0.39, 0.36, 0.35); headMesh.castShadow = true;
  head.add(headMesh);
  const snout = new THREE.Mesh(sphere, muzzle);
  snout.scale.set(0.18, 0.14, 0.13); snout.position.set(0, -0.055, 0.33); snout.castShadow = true;
  head.add(snout);
  const nose = new THREE.Mesh(sphere, black);
  nose.scale.set(0.062, 0.05, 0.045); nose.position.set(0, -0.005, 0.445);
  head.add(nose);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.009, 5, 12, Math.PI), black);
  mouth.position.set(0, -0.105, 0.42); mouth.rotation.x = Math.PI / 2; mouth.rotation.z = Math.PI;
  head.add(mouth);

  // ears
  [-1, 1].forEach(s => {
    const ear = new THREE.Mesh(sphere, fur);
    ear.scale.set(0.145, 0.145, 0.09);
    ear.position.set(s * 0.285, 0.24, -0.01);
    ear.castShadow = true; head.add(ear);
    const inner = new THREE.Mesh(sphere, muzzle);
    inner.scale.set(0.077, 0.077, 0.035);
    inner.position.set(s * 0.285, 0.24, 0.06);
    head.add(inner);
  });

  // eyes
  [-1, 1].forEach(s => {
    const eye = new THREE.Mesh(sphere, black);
    eye.scale.set(0.045, 0.055, 0.03);
    eye.position.set(s * 0.135, 0.075, 0.32);
    head.add(eye);
    const glint = new THREE.Mesh(sphere, white);
    glint.scale.set(0.012, 0.014, 0.01);
    glint.position.set(s * 0.135 + 0.012, 0.093, 0.345);
    head.add(glint);
  });

  // cheeks
  [-1, 1].forEach(s => {
    const cheek = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ color: 0xd98c6d, roughness: 1 }));
    cheek.scale.set(0.06, 0.038, 0.02);
    cheek.position.set(s * 0.21, -0.055, 0.315);
    head.add(cheek);
  });

  // arms
  [-1, 1].forEach(s => {
    const arm = add(sphere, fur, s * 0.41, -0.06, 0.07, 0.14, 0.25, 0.14);
    arm.rotation.z = s * 0.5;
  });
  // legs + paw pads
  [-1, 1].forEach(s => {
    add(sphere, fur, s * 0.24, -0.5, 0.12, 0.2, 0.23, 0.24);
    add(sphere, muzzle, s * 0.24, -0.5, 0.31, 0.12, 0.13, 0.05);
  });

  // bow
  const bow = new THREE.Group();
  bow.position.set(0, 0.36, 0.35);
  [-1, 1].forEach(s => {
    const loop = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), red);
    loop.scale.set(1, 0.7, 0.45); loop.position.x = s * 0.075; loop.castShadow = true;
    bow.add(loop);
  });
  const knot = new THREE.Mesh(sphere, red); knot.scale.setScalar(0.04); bow.add(knot);
  g.add(bow);

  // tiny embroidered heart on belly
  const heart = new THREE.Mesh(new THREE.ShapeGeometry((() => {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0.04);
    sh.bezierCurveTo(-0.05, 0.1, -0.11, 0.02, 0, -0.07);
    sh.bezierCurveTo(0.11, 0.02, 0.05, 0.1, 0, 0.04);
    return sh;
  })()), new THREE.MeshStandardMaterial({ color: 0xe8b24a, roughness: 0.7 }));
  heart.position.set(0, 0.08, 0.395); heart.rotation.z = Math.PI;
  g.add(heart);

  g.scale.setScalar(scale);
  g.userData.head = head;
  g.userData.bow = bow;
  return g;
}

/* ── world builder ────────────────────────────────────────────── */
export function buildWorld(scene, renderer, opts = {}) {
  const mobile = !!opts.mobile;
  const rand = randFactory(42);
  const animated = [];
  const crowd = [];
  const lights = [];

  scene.fog = new THREE.FogExp2(0x3d2018, 0.0155);

  /* sky */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(90, 32, 18),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: {
        cTop: { value: new THREE.Color(0x17153f) },
        cMid: { value: new THREE.Color(0x7b3047) },
        cLow: { value: new THREE.Color(0xe48252) },
        cHorizon: { value: new THREE.Color(0xffc27a) },
      },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec3 vP; uniform vec3 cTop,cMid,cLow,cHorizon;
        void main(){
          float h = normalize(vP).y;
          vec3 col = mix(cHorizon, cLow, smoothstep(-0.02, 0.12, h));
          col = mix(col, cMid, smoothstep(0.1, 0.45, h));
          col = mix(col, cTop, smoothstep(0.35, 0.92, h));
          float glow = pow(max(0.0, 1.0 - abs(h - 0.055) * 6.0), 3.0);
          col += vec3(0.25, 0.1, 0.02) * glow;
          gl_FragColor = vec4(col, 1.0);
        }`,
    })
  );
  scene.add(sky);

  const stars = (() => {
    const n = 220;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rand() * TAU;
      const y = 0.25 + rand() * 0.75;
      const r = Math.sqrt(1 - y * y) * 82;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = y * 80;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffe9bd, size: 0.22, transparent: true, opacity: 0.72,
      sizeAttenuation: true, depthWrite: false,
    }));
    scene.add(pts);
    return pts;
  })();

  /* environment reflections */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envTex = pmrem.fromScene(room, 0.03).texture;
  scene.environment = envTex;
  if ('environmentIntensity' in scene) scene.environmentIntensity = 0.22;
  pmrem.dispose();

  /* lights */
  const hemi = new THREE.HemisphereLight(0xffc79a, 0x2a1712, 0.85);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffd3a0, 2.0);
  key.position.set(7, 13, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  key.shadow.camera.left = -10; key.shadow.camera.right = 10;
  key.shadow.camera.top = 12; key.shadow.camera.bottom = -4;
  key.shadow.camera.near = 1; key.shadow.camera.far = 32;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xff7d4c, 0.85);
  rim.position.set(-8, 6, -10);
  scene.add(rim);

  const canopySpot = new THREE.SpotLight(0xffd39a, 130, 15, 0.62, 0.55, 1.8);
  canopySpot.position.set(0.2, 5.2, 2.6);
  canopySpot.target.position.set(0, 1.1, 0);
  canopySpot.castShadow = true;
  canopySpot.shadow.mapSize.set(mobile ? 512 : 1024, mobile ? 512 : 1024);
  canopySpot.shadow.bias = -0.001;
  scene.add(canopySpot, canopySpot.target);

  const warmFill = new THREE.PointLight(0xff9d58, 24, 11, 1.7);
  warmFill.position.set(3.2, 2.2, 1.2);
  scene.add(warmFill);

  /* ground */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshStandardMaterial({ map: dirtTexture(), roughness: 1, metalness: 0, color: 0xcfae8a })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // chalk rangoli rings
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xf3d9a4, transparent: true, opacity: 0.27, side: THREE.DoubleSide });
  [2.15, 2.5, 3.05].forEach((r, i) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + (i === 2 ? 0.015 : 0.035), 72), ringMat);
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.012 + i * 0.001;
    scene.add(ring);
  });
  const petalGeo = new THREE.SphereGeometry(0.035, 5, 4);
  const petalMats = [0xf4a41e, 0xe8741c, 0xffd058].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
  for (let i = 0; i < 52; i++) {
    const a = rand() * TAU, r = 2.3 + (rand() - 0.5) * 0.55;
    const petal = new THREE.Mesh(petalGeo, petalMats[i % 3]);
    petal.position.set(Math.cos(a) * r, 0.018, Math.sin(a) * r);
    petal.scale.set(1.6, 0.35, 0.9); petal.rotation.y = rand() * TAU;
    scene.add(petal);
  }

  /* stall */
  const stall = new THREE.Group();
  scene.add(stall);
  const woodTex = woodTexture();
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, color: 0xbf936a, roughness: 0.8 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x4d2c1b, roughness: 0.85 });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0x7a241b, roughness: 0.92 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc58d36, metalness: 0.65, roughness: 0.4 });
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0xb58a4e, roughness: 0.8 });

  // table top + cloth
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.09, 1.45), woodMat);
  top.position.set(0, 0.995, 0); top.castShadow = true; top.receiveShadow = true;
  stall.add(top);
  const tableCloth = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.018, 1.52), clothMat);
  tableCloth.position.set(0, 1.052, 0); tableCloth.receiveShadow = true;
  stall.add(tableCloth);
  // gold edge trim
  [-1, 1].forEach(s => {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.84, 0.02, 0.035), brassMat);
    trim.position.set(0, 1.058, s * 0.755);
    stall.add(trim);
  });
  // legs
  [[-1.18, -0.55], [1.18, -0.55], [-1.18, 0.55], [1.18, 0.55]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.97, 0.12), woodDark);
    leg.position.set(x, 0.485, z); leg.castShadow = true; leg.receiveShadow = true;
    stall.add(leg);
  });
  const frontPanel = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.62, 0.055), clothMat);
  frontPanel.position.set(0, 0.69, 0.735); frontPanel.castShadow = true;
  stall.add(frontPanel);
  const frontTrim = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.035, 0.06), brassMat);
  frontTrim.position.set(0, 0.96, 0.74);
  stall.add(frontTrim);

  // backdrop cloth
  const fabricTex = makeFabricTexture();
  fabricTex.wrapS = fabricTex.wrapT = THREE.RepeatWrapping;
  fabricTex.repeat.set(1.6, 1);
  const fabGeo = new THREE.PlaneGeometry(5.6, 3.35, 24, 3);
  {
    const p = fabGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      p.setZ(i, Math.sin(x * 5.2) * 0.055 + Math.cos(x * 2.1) * 0.02);
    }
    fabGeo.computeVertexNormals();
  }
  const backdrop = new THREE.Mesh(fabGeo, new THREE.MeshStandardMaterial({ map: fabricTex, side: THREE.DoubleSide, roughness: 0.94 }));
  backdrop.position.set(0, 2.04, -1.58);
  backdrop.receiveShadow = true; backdrop.castShadow = true;
  stall.add(backdrop);
  // wooden frame around backdrop
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.12, 0.12), woodDark);
  frameTop.position.set(0, 3.66, -1.58); stall.add(frameTop);
  [-1, 1].forEach(s => {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.75, 0.12), woodDark);
    side.position.set(s * 2.9, 1.86, -1.58); side.castShadow = true; stall.add(side);
  });

  // canopy (sloped fabric)
  const stripeTex = stripeTexture(['#c8412e', '#f4e4c4', '#df8e26', '#f4e4c4'], true, 12);
  stripeTex.wrapS = stripeTex.wrapT = THREE.RepeatWrapping;
  stripeTex.repeat.set(1.2, 1);
  const canopy = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.1), new THREE.MeshStandardMaterial({
    map: stripeTex, side: THREE.DoubleSide, roughness: 0.92,
  }));
  canopy.rotation.x = -Math.PI / 2 + 0.16;
  canopy.position.set(0, 4.38, -0.25);
  canopy.castShadow = true;
  stall.add(canopy);
  // valance
  const valance = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 0.38), new THREE.MeshStandardMaterial({
    map: stripeTexture(['#c8412e', '#f4e4c4', '#df8e26', '#f4e4c4'], true, 24), side: THREE.DoubleSide, roughness: 0.9,
  }));
  valance.position.set(0, 4.09, 1.3); valance.rotation.x = 0.03;
  stall.add(valance);
  // canopy poles
  [[-3.08, 1.32], [3.08, 1.32], [-3.08, -1.4], [3.08, -1.4]].forEach(([x, z]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 4.4, 8), bambooMat);
    pole.position.set(x, 2.2, z); pole.castShadow = true; stall.add(pole);
    const knot = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.012, 5, 10), woodDark);
    knot.rotation.x = Math.PI / 2; knot.position.set(x, 1.1, z); stall.add(knot);
  });

  // sign
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.65, 1.24),
    new THREE.MeshBasicMaterial({ map: makeSignTexture() })
  );
  sign.position.set(0, 3.78, -1.47);
  stall.add(sign);
  const signBack = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.36, 0.08), woodDark);
  signBack.position.set(0, 3.78, -1.53); signBack.castShadow = true;
  stall.add(signBack);
  // hanging ropes
  [-1, 1].forEach(s => {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 4), new THREE.MeshBasicMaterial({ color: 0x3b2413 }));
    rope.position.set(s * 1.8, 4.45, -1.5); stall.add(rope);
  });

  // prize shelf + teddy
  const shelf = new THREE.Group();
  shelf.position.set(2.25, 0, -1.1);
  stall.add(shelf);
  const plank = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.07, 0.5), woodMat);
  plank.position.set(0, 1.46, 0); plank.castShadow = true; plank.receiveShadow = true; shelf.add(plank);
  [-0.42, 0.42].forEach(x => {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 0.38), woodDark);
    bracket.position.set(x, 1.23, -0.02); shelf.add(bracket);
  });
  const prizeTeddy = createTeddy(0.52);
  prizeTeddy.position.set(0.05, 1.53, 0.03);
  prizeTeddy.rotation.y = -0.45;
  shelf.add(prizeTeddy);
  // tiny prize placard
  const placardTex = canvasTexture(256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#f2ddb2'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#7a241a'; ctx.lineWidth = 6; ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#7a241a'; ctx.font = '700 30px "Baloo 2", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('TONIGHT\'S PRIZE', w / 2, 42);
    ctx.font = '400 26px "Yatra One", serif'; ctx.fillStyle = '#136b5d';
    ctx.fillText('EK TEDDY BEAR', w / 2, 76);
  });
  const placard = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.255), new THREE.MeshBasicMaterial({ map: placardTex }));
  placard.position.set(0.05, 1.16, 0.26); placard.rotation.x = -0.1; shelf.add(placard);

  /* string lights */
  const bulbMats = [0xffd27a, 0xff9e56, 0xffeab0, 0xff7e5c].map(c => new THREE.MeshBasicMaterial({ color: c }));
  const glowTex = makeGlowTexture();
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffbd6b, transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending });
  const sphereGeo = new THREE.SphereGeometry(0.035, 6, 5);
  function lightString(a, b, sag, count, offset = 0) {
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    mid.y -= sag;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x2b1a11, transparent: true, opacity: 0.75 }));
    scene.add(line);
    for (let i = 0; i <= count; i++) {
      const p = curve.getPoint(i / count);
      const bulb = new THREE.Mesh(sphereGeo, bulbMats[(i + offset) % bulbMats.length]);
      bulb.position.copy(p); bulb.position.y -= 0.055;
      scene.add(bulb);
      const glow = new THREE.Sprite(glowMat);
      glow.position.copy(bulb.position);
      glow.scale.setScalar(0.36 + rand() * 0.12);
      scene.add(glow);
      lights.push({ bulb, glow, phase: rand() * TAU });
    }
  }
  lightString(new THREE.Vector3(-3.05, 4.02, 1.32), new THREE.Vector3(3.05, 4.02, 1.32), 0.33, 12, 0);
  lightString(new THREE.Vector3(-3.05, 4.65, -1.35), new THREE.Vector3(3.05, 4.65, -1.35), 0.28, 11, 2);
  lightString(new THREE.Vector3(-3.05, 3.2, 1.3), new THREE.Vector3(-3.05, 3.2, -1.3), 0.2, 5, 1);
  lightString(new THREE.Vector3(3.05, 3.2, 1.3), new THREE.Vector3(3.05, 3.2, -1.3), 0.2, 5, 3);

  /* marigold garlands */
  const marigoldGeo = new THREE.SphereGeometry(0.048, 7, 5);
  const marigoldMats = [0xf2a01c, 0xe8781b, 0xffc44d, 0xd95a12].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
  const marigolds = [];
  function garland(a, b, sag, count) {
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5); mid.y -= sag;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    for (let i = 0; i <= count; i++) {
      const p = curve.getPoint(i / count);
      const m = new THREE.Mesh(marigoldGeo, marigoldMats[i % 4]);
      m.position.copy(p);
      m.scale.setScalar(0.85 + rand() * 0.4);
      scene.add(m);
      marigolds.push({
        mesh: m, dropped: false, vy: 0, vx: 0, vz: 0, spin: 0,
        home: { x: p.x, y: p.y, z: p.z },
      });
      if (i % 2 === 0) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), new THREE.MeshStandardMaterial({ color: 0x335d2d, roughness: 0.9 }));
        leaf.position.copy(p).add(new THREE.Vector3(0.02, 0.03, 0.02)); leaf.scale.set(1.6, 0.4, 0.8); scene.add(leaf);
      }
    }
  }
  garland(new THREE.Vector3(-2.35, 3.12, 0.8), new THREE.Vector3(2.35, 3.12, 0.8), 0.2, 34);
  garland(new THREE.Vector3(-2.5, 4.55, 0.9), new THREE.Vector3(2.5, 4.55, 0.9), 0.3, 36);
  garland(new THREE.Vector3(-0.95, 4.35, -1.42), new THREE.Vector3(0.95, 4.35, -1.42), 0.18, 18);

  /* bunting */
  const flagColors = [0xe9a72c, 0xd94f46, 0x16796b, 0xf1ddb4, 0xe58a3a];
  function buntingLine(a, b, sag, count) {
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5); mid.y -= sag;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)), new THREE.LineBasicMaterial({ color: 0x3a2416 })));
    for (let i = 1; i < count; i++) {
      const p = curve.getPoint(i / count);
      const w = 0.25, h = 0.34;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([
        -w / 2, 0, 0, w / 2, 0, 0, 0, -h, 0,
      ], 3));
      geo.computeVertexNormals();
      const flag = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: flagColors[i % flagColors.length], side: THREE.DoubleSide, roughness: 0.9,
      }));
      flag.position.copy(p);
      flag.rotation.z = (rand() - 0.5) * 0.16;
      flag.castShadow = true;
      scene.add(flag);
    }
  }
  buntingLine(new THREE.Vector3(-8, 6.3, 3.5), new THREE.Vector3(8, 6.5, 2.2), 1.3, 22);
  buntingLine(new THREE.Vector3(-9, 5.7, -3.5), new THREE.Vector3(9, 5.9, -3.2), 1.1, 24);

  /* background side stall (right) */
  (function sideStall() {
    const x = 7.2, z = -4.8;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -0.5; scene.add(g);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 1.5), woodMat); counter.position.y = 0.45; counter.castShadow = true; g.add(counter);
    [[-1.4, 0.8], [1.4, 0.8], [-1.4, -0.8], [1.4, -0.8]].forEach(([px, pz]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.5, 7), bambooMat);
      pole.position.set(px, 1.75, pz); g.add(pole);
    });
    const canopy2 = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.2), new THREE.MeshStandardMaterial({
      map: stripeTexture(['#1b7666', '#f2dfbc', '#e0a02a', '#f2dfbc'], true, 10), side: THREE.DoubleSide, roughness: 0.9,
    }));
    canopy2.rotation.x = -Math.PI / 2 + 0.2; canopy2.position.set(0, 3.4, 0.2); g.add(canopy2);
    for (let i = 0; i < 8; i++) {
      const jar = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 7), new THREE.MeshStandardMaterial({
        color: [0xd49a32, 0xa63a25, 0xd5c38a][i % 3], roughness: 0.55,
      }));
      jar.position.set(-1.1 + (i % 4) * 0.7, 1.0, -0.3 + Math.floor(i / 4) * 0.5); g.add(jar);
    }
  })();

  /* background side stall (left) */
  (function jalebiCart() {
    const g = new THREE.Group(); g.position.set(-6.3, 0, -2.2); g.rotation.y = 0.45; scene.add(g);
    const cart = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.75, 1.2), woodMat); cart.position.y = 0.72; cart.castShadow = true; g.add(cart);
    [-0.75, 0.75].forEach(px => {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.07, 7, 16), woodDark);
      wheel.position.set(px, 0.36, 0.62); wheel.rotation.y = Math.PI / 2; g.add(wheel);
      const spokes = new THREE.Group(); spokes.position.copy(wheel.position);
      for (let i = 0; i < 4; i++) {
        const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.68, 4), bambooMat);
        sp.rotation.z = i * Math.PI / 4; spokes.add(sp);
      }
      g.add(spokes);
    });
    const kadhai = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.38, 0.32, 18), new THREE.MeshStandardMaterial({ color: 0x27211d, metalness: 0.7, roughness: 0.4 }));
    kadhai.position.set(0, 1.3, 0); g.add(kadhai);
    const oil = new THREE.Mesh(new THREE.CircleGeometry(0.5, 18), new THREE.MeshStandardMaterial({ color: 0xd9851c, roughness: 0.25, metalness: 0.2 }));
    oil.rotation.x = -Math.PI / 2; oil.position.set(0, 1.465, 0); g.add(oil);
    for (let i = 0; i < 7; i++) {
      const jalebi = new THREE.Mesh(new THREE.TorusGeometry(0.08 + rand() * 0.04, 0.02, 5, 10), new THREE.MeshStandardMaterial({ color: 0xd96c1c, roughness: 0.5 }));
      jalebi.rotation.x = Math.PI / 2; jalebi.rotation.z = rand() * TAU;
      jalebi.position.set((rand() - 0.5) * 0.7, 1.48, (rand() - 0.5) * 0.7); g.add(jalebi);
    }
    // red parasol
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.2, 6), bambooMat);
    pole.position.set(0.5, 2.2, -0.2); g.add(pole);
    const parasol = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.48, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0xc5432f, side: THREE.DoubleSide, roughness: 0.85 }));
    parasol.position.set(0.5, 3.35, -0.2); g.add(parasol);
  })();

  /* balloons */
  (function balloons() {
    const g = new THREE.Group(); g.position.set(5.3, 0, -0.3); scene.add(g);
    const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.3, 6), woodDark);
    tie.position.y = 0.65; g.add(tie);
    const colors = [0xe1584e, 0xf1b234, 0x2c8c7d, 0xe987a4, 0x6e9bd4];
    colors.forEach((c, i) => {
      const a = i / colors.length * TAU;
      const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshStandardMaterial({ color: c, roughness: 0.35 }));
      balloon.position.set(Math.cos(a) * 0.18, 1.55 + i * 0.08 + (i % 2) * 0.12, Math.sin(a) * 0.18);
      balloon.scale.set(1, 1.18, 1); balloon.castShadow = true; g.add(balloon);
      const string = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(balloon.position.x, balloon.position.y - 0.2, balloon.position.z),
        new THREE.Vector3(0, 1.35, 0),
      ]), new THREE.LineBasicMaterial({ color: 0xd8c7a5, transparent: true, opacity: 0.7 }));
      g.add(string);
    });
  })();

  /* ferris wheel */
  const ferris = new THREE.Group();
  ferris.position.set(-12.5, 6.8, -21);
  scene.add(ferris);
  const metal = new THREE.MeshStandardMaterial({ color: 0x6f4a35, metalness: 0.4, roughness: 0.65 });
  const wheel = new THREE.Group();
  ferris.add(wheel);
  const rim1 = new THREE.Mesh(new THREE.TorusGeometry(5.1, 0.11, 7, 48), metal);
  wheel.add(rim1);
  const rim2 = rim1.clone(); rim2.position.z = 0.55; wheel.add(rim2);
  const cabinColors = [0xc94835, 0xe0a12b, 0x257c6d, 0xda7b8e, 0x7e9dc9];
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;
    const x = Math.cos(a) * 5.1, y = Math.sin(a) * 5.1;
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 5.1, 4), metal);
    spoke.position.set(x / 2, y / 2, 0.27);
    spoke.rotation.z = a - Math.PI / 2;
    wheel.add(spoke);
    for (let zz = 0; zz < 2; zz++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 5, 4), bulbMats[(i + zz) % 4]);
      bulb.position.set(x, y, 0.3 + zz * 0.55); wheel.add(bulb);
      const glow = new THREE.Sprite(glowMat); glow.position.copy(bulb.position); glow.scale.setScalar(0.55); wheel.add(glow);
    }
    if (i % 2 === 0) {
      const cabin = new THREE.Group();
      cabin.position.set(x, y, 0.3);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.48, 0.35), new THREE.MeshStandardMaterial({ color: cabinColors[(i / 2) % 5], roughness: 0.6 }));
      cabin.add(box);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.3, 4), metal);
      roof.position.y = 0.38; roof.rotation.y = Math.PI / 4; cabin.add(roof);
      wheel.add(cabin);
    }
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.1, 10), metal);
  hub.rotation.x = Math.PI / 2; wheel.add(hub);
  // support legs
  [[-3.3, -1], [3.3, -1]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 8.8, 6), metal);
    leg.position.set(x / 2, -3.1, z * 0.24); leg.rotation.z = x > 0 ? -0.37 : 0.37;
    ferris.add(leg);
  });

  /* low rope fence around play area */
  const postMat = bambooMat;
  const ropeMat = new THREE.LineBasicMaterial({ color: 0x5a3a22, transparent: true, opacity: 0.8 });
  function fenceArc(radius, y, start, end, posts) {
    const positions = [];
    for (let i = 0; i <= posts; i++) {
      const a = start + (end - start) * (i / posts);
      const x = Math.cos(a) * radius, z = Math.sin(a) * radius;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.55, 5), postMat);
      post.position.set(x, y + 0.28, z); scene.add(post);
      positions.push(new THREE.Vector3(x, y + 0.46, z));
    }
    for (let i = 0; i < positions.length - 1; i++) {
      const a = positions[i], b = positions[i + 1];
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5); mid.y -= 0.12;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(10)), ropeMat));
    }
  }
  fenceArc(4.6, 0, 0.22, Math.PI - 0.22, 10);

  /* crowd */
  const skinTones = [0x8b5a3c, 0xa96d49, 0x6f422b, 0xc58d64, 0x7b4a30];
  const clothes = [0x2c7a6b, 0xb64237, 0xd39a2b, 0x6d4b7a, 0xd57976, 0x3f6e9a, 0xefe0bd, 0x8d5d9c, 0xc1653b];
  const hairTones = [0x1b1410, 0x2c1a12, 0x3a2418];
  const personGeo = {
    head: new THREE.SphereGeometry(0.145, 10, 8),
    body: new THREE.CylinderGeometry(0.19, 0.24, 0.62, 8),
    skirt: new THREE.ConeGeometry(0.34, 0.66, 8, 1, true),
    arm: new THREE.CapsuleGeometry(0.045, 0.32, 3, 6),
    leg: new THREE.CylinderGeometry(0.055, 0.06, 0.5, 5),
    hair: new THREE.SphereGeometry(0.15, 8, 6),
  };
  const materials = new Map();
  const mat = (c, rough = 0.9) => {
    const key = `${c}-${rough}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color: c, roughness: rough }));
    return materials.get(key);
  };

  function makePerson(x, z, female, scale = 1) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const skin = skinTones[Math.floor(rand() * skinTones.length)];
    const cloth = clothes[Math.floor(rand() * clothes.length)];
    const hair = hairTones[Math.floor(rand() * hairTones.length)];
    const s = scale;
    if (female) {
      const skirt = new THREE.Mesh(personGeo.skirt, mat(cloth));
      skirt.position.y = 0.55; skirt.scale.set(1, 1, 1); skirt.castShadow = true; g.add(skirt);
      const top = new THREE.Mesh(personGeo.body, mat(clothes[Math.floor(rand() * clothes.length)]));
      top.position.y = 0.92; top.scale.set(0.9, 0.72, 0.9); top.castShadow = true; g.add(top);
      const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 5, 12), mat(clothes[Math.floor(rand() * clothes.length)]));
      scarf.rotation.x = Math.PI / 2; scarf.position.y = 1.17; g.add(scarf);
    } else {
      [-1, 1].forEach(side => {
        const leg = new THREE.Mesh(personGeo.leg, mat(0x3b3328));
        leg.position.set(side * 0.1, 0.28, 0); leg.castShadow = true; g.add(leg);
      });
      const body = new THREE.Mesh(personGeo.body, mat(cloth));
      body.position.y = 0.78; body.castShadow = true; g.add(body);
    }
    const head = new THREE.Mesh(personGeo.head, mat(skin, 0.85));
    head.position.y = 1.22; head.castShadow = true; g.add(head);
    const hairMesh = new THREE.Mesh(personGeo.hair, mat(hair));
    hairMesh.position.set(0, 1.27, -0.025); hairMesh.scale.set(1.02, 0.72, 1.02); g.add(hairMesh);
    // eyes
    [-1, 1].forEach(side => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 5, 4), mat(0x1a110c));
      eye.position.set(side * 0.055, 1.235, 0.135); g.add(eye);
    });
    // arms
    [-1, 1].forEach(side => {
      const arm = new THREE.Mesh(personGeo.arm, mat(skin, 0.85));
      arm.position.set(side * 0.255, 0.82, 0); arm.rotation.z = side * 0.14; arm.castShadow = true; g.add(arm);
    });
    // a few accessories: topi / bindi / spectacles
    if (!female && rand() > 0.6) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.155, 0.08, 10), mat(0xe5d3ad));
      cap.position.y = 1.35; g.add(cap);
    }
    if (female && rand() > 0.5) {
      const bindi = new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 4), mat(0xb42020));
      bindi.position.set(0, 1.255, 0.143); g.add(bindi);
    }
    if (rand() > 0.7) {
      const glassL = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.006, 4, 8), mat(0x1a110c));
      glassL.position.set(-0.055, 1.235, 0.142); g.add(glassL);
      const glassR = glassL.clone(); glassR.position.x = 0.055; g.add(glassR);
    }
    g.scale.setScalar(s);
    g.position.y = 0;
    g.lookAt(new THREE.Vector3(0, 0, 6));
    scene.add(g);
    crowd.push({
      g, phase: rand() * TAU, speed: 0.6 + rand() * 0.6, amp: 0.008 + rand() * 0.012,
      jump: 0, jumpV: 0, scale: s,
    });
    return g;
  }

  // arc of onlookers behind the stall
  for (let i = 0; i < 17; i++) {
    const a = 0.28 + (i / 16) * (Math.PI - 0.56);
    const r = 7.3 + rand() * 3.4;
    const x = Math.cos(a) * r * (rand() > 0.5 ? 1 : 1);
    const z = -Math.sin(a) * r - 0.8;
    if (Math.abs(x) < 3.2 && z > -4) continue;
    makePerson(x, z, rand() > 0.48, 0.82 + rand() * 0.26);
  }
  // a few close spectators at the sides
  [[-4.4, 0.4], [-5.2, 1.8], [4.4, 1.2], [5.1, 2.4], [3.9, 3.0], [-3.8, 3.3]].forEach(([x, z]) => {
    makePerson(x + (rand() - 0.5) * 0.5, z, rand() > 0.5, 0.85 + rand() * 0.2);
  });
  // kids in front of the back rope
  makePerson(-2.4, -2.1, false, 0.6);
  makePerson(-1.6, -2.35, false, 0.56);
  makePerson(2.35, -2.15, true, 0.6);

  /* cow in the distance */
  (function cow() {
    const g = new THREE.Group(); g.position.set(-6.8, 0, -6.2); g.rotation.y = 0.7; scene.add(g);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 0.95, 5, 10), new THREE.MeshStandardMaterial({ color: 0xe9dfcb, roughness: 0.95 }));
    body.rotation.z = Math.PI / 2; body.position.y = 1.05; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf1e8d8, roughness: 0.9 }));
    head.position.set(0.8, 1.25, 0); head.scale.set(1.2, 1, 0.9); g.add(head);
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), new THREE.MeshStandardMaterial({ color: 0xd9b39a, roughness: 0.9 }));
    snout.position.set(1.03, 1.15, 0); snout.scale.set(1, 0.8, 1); g.add(snout);
    [-1, 1].forEach(side => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.3, 5), new THREE.MeshStandardMaterial({ color: 0xd8c8a5, roughness: 0.7 }));
      horn.position.set(0.78, 1.5, side * 0.19); horn.rotation.z = -0.3; g.add(horn);
    });
    [[-0.35, -0.22], [-0.35, 0.22], [0.35, -0.22], [0.35, 0.22]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.7, 5), new THREE.MeshStandardMaterial({ color: 0xded1b8, roughness: 1 }));
      leg.position.set(x, 0.35, z); g.add(leg);
    });
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.65, 4), new THREE.MeshStandardMaterial({ color: 0xd8ccb3 }));
    tail.position.set(-0.65, 1.2, 0); tail.rotation.z = 0.3; g.add(tail);
    // marigold garland around the cow, because India
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(marigoldGeo, marigoldMats[i % 4]);
      const a = (i / 10) * Math.PI;
      m.position.set(0.8, 1.3 + Math.sin(a) * 0.1, Math.cos(a) * 0.3); g.add(m);
    }
  })();

  /* organizer */
  const organizer = createOrganizer(scene, { mat, rand });

  /* the uninvited buffalo */
  const buffalo = createBuffalo(scene);

  /* dust particles */
  const dustCount = mobile ? 160 : 280;
  const dustPos = new Float32Array(dustCount * 3);
  const dustSeed = [];
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (rand() - 0.5) * 18;
    dustPos[i * 3 + 1] = rand() * 5.5;
    dustPos[i * 3 + 2] = -7 + rand() * 14;
    dustSeed.push({ speed: 0.03 + rand() * 0.08, phase: rand() * TAU });
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xffd9a0, size: 0.12, map: glowTex, transparent: true, opacity: 0.32,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));
  scene.add(dust);

  /* win display (hidden until win) */
  const winGroup = new THREE.Group();
  winGroup.position.set(0.2, 0, 2.05);
  winGroup.visible = false;
  scene.add(winGroup);
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.58, 0.95), woodMat);
  crate.position.y = 0.29; crate.castShadow = true; crate.receiveShadow = true; winGroup.add(crate);
  const crateTrim = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.08, 1.02), brassMat);
  crateTrim.position.y = 0.6; winGroup.add(crateTrim);
  const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.13, 20), new THREE.MeshStandardMaterial({ color: 0x8f1f25, roughness: 0.66 }));
  cushion.position.y = 0.7; cushion.castShadow = true; winGroup.add(cushion);
  const winTeddy = createTeddy(0.82);
  winTeddy.position.set(0, 0.78, 0);
  winTeddy.rotation.y = 0.2;
  winGroup.add(winTeddy);

  const winLight = new THREE.PointLight(0xffd18a, 0, 5, 1.4);
  winLight.position.set(0.2, 2.4, 3.1);
  scene.add(winLight);

  /* effects */
  const effects = createEffects(scene, rand);

  /* stall damage state */
  let signWobble = 0, signWobbleV = 0;
  let teddyFall = -1;
  const TEDDY_HOME = { x: 0.05, y: 1.53, z: 0.03, ry: -0.45, rz: 0 };

  function dropGarland(n = 5) {
    let dropped = 0;
    // prefer flowers near the front / top garlands, they read best on camera
    for (let pass = 0; pass < 2 && dropped < n; pass++) {
      for (const m of marigolds) {
        if (m.dropped) continue;
        if (pass === 0 && m.home.y < 3.4) continue;
        m.dropped = true;
        m.vy = 0.35 + rand() * 0.9;
        m.vx = (rand() - 0.5) * 1.7;
        m.vz = (rand() - 0.5) * 1.1;
        m.spin = (rand() - 0.5) * 9;
        if (++dropped >= n) break;
      }
    }
  }

  function damageStall(kind = 'anna') {
    if (kind === 'anna') {
      organizerApi.hit();
      signWobbleV += 2.2;
      dropGarland(7);
    } else if (kind === 'teddy') {
      if (teddyFall < 0) teddyFall = 0;
      signWobbleV += 1.1;
      dropGarland(4);
    } else if (kind === 'sign') {
      signWobbleV += 3.6;
      dropGarland(3);
    }
  }

  function resetStall() {
    signWobble = 0; signWobbleV = 0;
    sign.rotation.z = 0; signBack.rotation.z = 0;
    organizerApi.reset();
    teddyFall = -1;
    prizeTeddy.position.set(TEDDY_HOME.x, TEDDY_HOME.y, TEDDY_HOME.z);
    prizeTeddy.rotation.set(0, TEDDY_HOME.ry, TEDDY_HOME.rz);
    for (const m of marigolds) {
      m.dropped = false; m.vy = 0; m.vx = 0; m.vz = 0; m.spin = 0;
      m.mesh.position.set(m.home.x, m.home.y, m.home.z);
      m.mesh.rotation.set(0, 0, 0);
    }
  }

  /* animation API */
  let crowdMode = 'idle', crowdUntil = 0;
  const crowdMood = (mode, ms = 2500) => {
    crowdMode = mode;
    crowdUntil = performance.now() + ms;
    if (mode === 'cheer') {
      crowd.forEach(p => { if (rand() > 0.25) p.jumpV = 1.5 + rand() * 2.2; });
    }
  };

  let lastTime = performance.now();
  let talkUntil = 0, organizerMood = 'idle', organizerModeUntil = 0;

  function update(dt, timeMs) {
    const now = performance.now();
    const t = timeMs / 1000;

    // light twinkle
    for (const l of lights) {
      const s = 0.82 + Math.sin(t * 2.1 + l.phase) * 0.18;
      l.glow.scale.setScalar(0.34 * s + 0.05);
      l.bulb.material.opacity = 1;
    }

    // crowd idle / cheer / laugh
    if (crowdMode !== 'idle' && now > crowdUntil) crowdMode = 'idle';
    for (const p of crowd) {
      let y = Math.sin(t * p.speed + p.phase) * p.amp;
      let sway = Math.sin(t * p.speed * 0.7 + p.phase) * 0.004;
      if (crowdMode === 'cheer') {
        p.jumpV -= dt * 8.5;
        p.jump += p.jumpV * dt;
        if (p.jump < 0) { p.jump = 0; p.jumpV = 0; }
        y += p.jump;
        sway += Math.sin(t * 5 + p.phase) * 0.035;
      } else if (crowdMode === 'laugh') {
        y += Math.abs(Math.sin(t * 8 + p.phase)) * 0.045;
        sway += Math.sin(t * 12 + p.phase) * 0.025;
      }
      p.g.position.y = y;
      p.g.rotation.z = sway;
    }

    // organizer
    organizer.update(now, dt);

    // ferris wheel
    wheel.rotation.z += dt * 0.06;

    // stars twinkle
    stars.material.opacity = 0.6 + Math.sin(t * 0.7) * 0.1;

    // dust drift
    const arr = dustGeo.attributes.position.array;
    for (let i = 0; i < dustCount; i++) {
      arr[i * 3 + 1] += dustSeed[i].speed * dt;
      arr[i * 3] += Math.sin(t * 0.3 + dustSeed[i].phase) * dt * 0.05;
      if (arr[i * 3 + 1] > 5.8) arr[i * 3 + 1] = 0.1;
    }
    dustGeo.attributes.position.needsUpdate = true;

    // sign damage wobble
    signWobbleV += -signWobble * 70 * dt;
    signWobbleV *= Math.exp(-dt * 2.6);
    signWobble += signWobbleV * dt;
    sign.rotation.z = signWobble * 0.11;
    signBack.rotation.z = sign.rotation.z;

    // prize teddy idle, or tumbling after a direct hit
    if (teddyFall >= 0) {
      teddyFall = Math.min(1, teddyFall + dt / 0.95);
      const k = teddyFall;
      const arc = Math.sin(Math.min(1, k * 1.35) * Math.PI);
      prizeTeddy.position.y = TEDDY_HOME.y + arc * 0.55 - k * 1.22;
      prizeTeddy.position.z = TEDDY_HOME.z + k * 0.62;
      prizeTeddy.position.x = TEDDY_HOME.x + k * 0.12;
      prizeTeddy.rotation.y = TEDDY_HOME.ry + k * 2.4;
      prizeTeddy.rotation.z = k * 1.9;
      prizeTeddy.rotation.x = k * 0.5;
    } else {
      prizeTeddy.position.set(TEDDY_HOME.x, TEDDY_HOME.y + Math.sin(t * 1.6) * 0.01, TEDDY_HOME.z);
      prizeTeddy.rotation.y = TEDDY_HOME.ry + Math.sin(t * 0.9) * 0.12;
      prizeTeddy.rotation.x = 0;
      prizeTeddy.rotation.z = 0;
    }

    // marigolds knocked loose by stall damage
    for (const m of marigolds) {
      if (!m.dropped) continue;
      m.vy -= 8.5 * dt;
      const p = m.mesh.position;
      p.x += m.vx * dt; p.y += m.vy * dt; p.z += m.vz * dt;
      m.mesh.rotation.z += m.spin * dt;
      m.mesh.rotation.x += m.spin * 0.4 * dt;
      if (p.y < 0.05) {
        p.y = 0.05;
        m.vy *= -0.22; m.vx *= 0.55; m.vz *= 0.55; m.spin *= 0.55;
        if (Math.abs(m.vy) < 0.12) m.vy = 0;
      }
    }

    buffalo.update(dt, t);

    if (winGroup.visible) {
      winTeddy.rotation.y = 0.2 + Math.sin(t * 0.65) * 0.3;
      winTeddy.position.y = 0.78 + Math.sin(t * 1.8) * 0.035;
      winTeddy.rotation.z = Math.sin(t * 0.9) * 0.03;
      winLight.intensity = 18 + Math.sin(t * 2.2) * 3;
    }

    effects.update(dt);
  }

  const organizerApi = organizer.api;
  organizerApi.setCrowdMood = crowdMood;
  organizerApi.setWinLight = (on) => { winLight.intensity = on ? 18 : 0; };
  organizerApi.effects = effects;

  return {
    organizer: organizer.root,
    organizerApi,
    crowd,
    prizeTeddy,
    winGroup,
    winTeddy,
    effects,
    crowdMood,
    update,
    sign,
    buffalo,
    damageStall,
    resetStall,
    setWinLight: organizerApi.setWinLight,
  };
}

/* ── organizer ────────────────────────────────────────────────── */
function createOrganizer(scene, { mat, rand }) {
  const root = new THREE.Group();
  root.position.set(2.62, 0, 1.02);
  root.rotation.y = -0.48;
  scene.add(root);

  const skin = new THREE.MeshStandardMaterial({ color: 0x8f5a35, roughness: 0.8 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xefe0bd, roughness: 0.92 });
  const maroon = new THREE.MeshStandardMaterial({ color: 0x6f1f1a, roughness: 0.86 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a640, metalness: 0.7, roughness: 0.35 });
  const black = new THREE.MeshStandardMaterial({ color: 0x18110d, roughness: 0.45 });
  const turbanMat = new THREE.MeshStandardMaterial({ color: 0xdd7c25, roughness: 0.85 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf6efe0, roughness: 0.7 });

  // legs / mundu
  [-1, 1].forEach(s => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.72, 8), cream);
    leg.position.set(s * 0.16, 0.36, 0); leg.castShadow = true; root.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.36), new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: 0.8 }));
    foot.position.set(s * 0.16, 0.045, 0.1); root.add(foot);
  });
  const dhoti = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.55, 10), cream);
  dhoti.position.y = 0.63; dhoti.castShadow = true; root.add(dhoti);
  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 5, 18), maroon);
  sash.rotation.x = Math.PI / 2; sash.position.y = 0.83; root.add(sash);

  // torso / kurta + vest
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.76, 10), cream);
  torso.position.y = 1.3; torso.castShadow = true; root.add(torso);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), cream);
  belly.position.set(0, 1.12, 0.03); belly.scale.set(1, 0.82, 0.9); root.add(belly);
  const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.355, 0.41, 0.64, 10, 1, true), maroon);
  vest.position.y = 1.36; vest.scale.z = 0.96; vest.castShadow = true; root.add(vest);
  // vest opening stripe
  const vestOpening = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.62, 0.01), gold);
  vestOpening.position.set(0, 1.36, 0.355); root.add(vestOpening);
  // buttons
  [1.17, 1.3, 1.43].forEach(y => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 4), gold);
    b.position.set(0, y, 0.37); root.add(b);
  });
  // gold chain + pendant
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 5, 20), gold);
  chain.position.set(0, 1.58, 0.31); chain.rotation.x = -0.25; root.add(chain);
  const pendant = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 8), gold);
  pendant.position.set(0, 1.46, 0.375); pendant.rotation.x = Math.PI / 2; root.add(pendant);

  // head
  const headPivot = new THREE.Group();
  headPivot.position.y = 1.88;
  root.add(headPivot);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 13), skin);
  head.scale.set(1, 1.06, 0.96); head.castShadow = true; headPivot.add(head);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 9), skin);
  jaw.position.set(0, -0.1, 0.05); jaw.scale.set(1, 0.72, 0.88); headPivot.add(jaw);
  // ears
  [-1, 1].forEach(s => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), skin);
    ear.position.set(s * 0.265, -0.01, 0); ear.scale.set(0.5, 1, 0.8); headPivot.add(ear);
  });
  // hair
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.272, 14, 10), black);
  hair.position.set(0, 0.03, -0.03); hair.scale.set(1.01, 0.88, 0.98);
  hair.geometry = hair.geometry.clone();
  headPivot.add(hair);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.267, 16, 12), skin);
  face.position.set(0, -0.02, 0.012); face.scale.set(1, 1.02, 0.95); headPivot.add(face);
  // turban
  const turban = new THREE.Mesh(new THREE.SphereGeometry(0.29, 14, 10), turbanMat);
  turban.position.set(0, 0.2, -0.01); turban.scale.set(1.02, 0.58, 1); turban.castShadow = true; headPivot.add(turban);
  const turbanBand = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 5, 20), gold);
  turbanBand.rotation.x = Math.PI / 2; turbanBand.position.y = 0.1; turbanBand.scale.z = 0.8; headPivot.add(turbanBand);
  // sunglasses
  const glasses = new THREE.Group(); glasses.position.set(0, 0.04, 0.235); headPivot.add(glasses);
  [-1, 1].forEach(s => {
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.085, 0.03), black);
    lens.position.set(s * 0.091, 0, 0); glasses.add(lens);
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.012), new THREE.MeshBasicMaterial({ color: 0x8bd3dc, transparent: true, opacity: 0.55 }));
    glint.position.set(s * 0.091 + 0.018, 0.026, 0.018); glint.rotation.z = -0.25; glasses.add(glint);
  });
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.018, 0.02), black);
  glasses.add(bridge);
  // nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), skin);
  nose.position.set(0, -0.035, 0.27); nose.scale.set(1.05, 0.9, 1.2); headPivot.add(nose);
  // big mustache
  [-1, 1].forEach(s => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.033, 0.13, 4, 6), black);
    m.position.set(s * 0.09, -0.12, 0.245);
    m.rotation.z = s * -1.02; m.rotation.x = 0.1;
    headPivot.add(m);
  });
  // smile
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 4, 10, Math.PI), new THREE.MeshStandardMaterial({ color: 0x4a1c16 }));
  smile.position.set(0, -0.17, 0.255); smile.rotation.z = Math.PI; headPivot.add(smile);

  // arms
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.43, 1.62, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.25, 3, 6), cream);
    upper.position.y = -0.17; upper.castShadow = true; pivot.add(upper);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.2, 7), maroon);
    sleeve.position.y = -0.02; pivot.add(sleeve);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), skin);
    hand.position.y = -0.36; pivot.add(hand);
    pivot.rotation.z = side * 0.08;
    root.add(pivot);
    return pivot;
  }
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  let talkUntil = 0, mode = 'idle', modeUntil = 0, lastNow = performance.now();
  let baseRotY = root.rotation.y;
  let bodyTwist = 0;
  let hitUntil = 0, turbanTouched = false;

  const api = {
    talk(ms = 2400) { talkUntil = performance.now() + ms; },
    react(kind) {
      const now = performance.now();
      if (kind === 'annoyed') { mode = 'annoyed'; modeUntil = now + 1600; }
      else if (kind === 'happy') { mode = 'happy'; modeUntil = now + 2500; }
      else if (kind === 'laugh') { mode = 'laugh'; modeUntil = now + 4000; }
      else if (kind === 'sad') { mode = 'sad'; modeUntil = now + 6000; }
    },
    hit() {
      const now = performance.now();
      hitUntil = now + 1500;
      turbanTouched = true;
      mode = 'stunned';
      modeUntil = now + 1500;
    },
    reset() {
      hitUntil = 0;
      turbanTouched = false;
      turban.position.set(0, 0.2, -0.01);
      turban.rotation.set(0, 0, 0);
      glasses.position.set(0, 0.04, 0.235);
      glasses.rotation.set(0, 0, 0);
      mode = 'idle';
      modeUntil = 0;
    },
  };

  function update(now, dt) {
    const t = now / 1000;
    const talking = now < talkUntil;
    if (mode !== 'idle' && now > modeUntil) mode = 'idle';

    let rTarget = baseRotY + Math.sin(t * 0.7) * 0.02;
    let lz = -0.08, rz = 0.08, lx = 0, rx = 0;
    let headX = 0, headZ = 0;
    let bounce = Math.sin(t * 1.5) * 0.008;

    if (talking) {
      rz = 1.65 + Math.sin(t * 10.5) * 0.35;
      rx = -0.35;
      lz = -0.25;
      headZ = Math.sin(t * 8) * 0.05;
      headX = -0.06;
      bounce += Math.abs(Math.sin(t * 7)) * 0.02;
    }
    if (mode === 'stunned') {
      lz = -2.5; rz = 2.5; lx = -0.9; rx = -0.9;
      headX = -0.28; headZ = Math.sin(t * 19) * 0.16;
      bounce += Math.abs(Math.sin(t * 17)) * 0.045;
    } else if (mode === 'annoyed') {
      lz = -1.9; rz = 1.9; lx = -0.4; rx = -0.4;
      headZ = Math.sin(t * 9) * 0.08;
      bounce += Math.abs(Math.sin(t * 8)) * 0.03;
    } else if (mode === 'happy') {
      lz = -2.35; rz = 2.35; headX = -0.12;
      bounce += Math.abs(Math.sin(t * 7)) * 0.05;
    } else if (mode === 'laugh') {
      lz = -1.35; rz = 1.35; lx = 0.55; rx = 0.55;
      headX = 0.18; headZ = Math.sin(t * 14) * 0.12;
      bounce += Math.abs(Math.sin(t * 12)) * 0.045;
    } else if (mode === 'sad') {
      lz = -0.02; rz = 0.02; headX = 0.4; headZ = 0.05;
      bounce -= 0.06;
    }

    const ease = 1 - Math.exp(-dt * 8);
    leftArm.rotation.z += (lz - leftArm.rotation.z) * ease;
    rightArm.rotation.z += (rz - rightArm.rotation.z) * ease;
    leftArm.rotation.x += (lx - leftArm.rotation.x) * ease;
    rightArm.rotation.x += (rx - rightArm.rotation.x) * ease;
    headPivot.rotation.x += (headX - headPivot.rotation.x) * ease;
    headPivot.rotation.z += (headZ - headPivot.rotation.z) * ease;
    root.rotation.y += (rTarget - root.rotation.y) * (1 - Math.exp(-dt * 2));
    root.position.y = bounce;
    // subtle weight shift
    root.rotation.z = Math.sin(t * 0.9) * 0.012;
    void lastNow; void bodyTwist;

    // turban pop and sunglasses jolt after a direct hit
    if (now < hitUntil) {
      const k = clamp(1 - (hitUntil - now) / 1500, 0, 1);
      const wave = Math.sin(Math.min(1, k * 1.6) * Math.PI);
      turban.position.y = 0.2 + wave * 0.5;
      turban.position.x = Math.sin(k * Math.PI * 2.4) * 0.16 * (1 - k);
      turban.rotation.z = Math.sin(k * Math.PI * 3.2) * 0.55 * (1 - k * 0.4);
      turban.rotation.y = Math.sin(k * Math.PI * 2.1) * 0.35 * (1 - k * 0.4);
      glasses.rotation.z = Math.sin(k * Math.PI * 4) * 0.22 * (1 - k * 0.5);
      glasses.position.x = Math.sin(k * Math.PI * 3) * 0.06 * (1 - k * 0.5);
    } else if (turbanTouched) {
      turbanTouched = false;
      turban.position.set(0, 0.2, -0.01);
      turban.rotation.set(0, 0, 0);
      glasses.position.set(0, 0.04, 0.235);
      glasses.rotation.set(0, 0, 0);
    }

    // pointing gesture toward player while talking
    if (talking) {
      rightArm.rotation.x = -0.9 + Math.sin(t * 7) * 0.12;
    }
  }

  return { root, api, update };
}

/* ── buffalo intruder ─────────────────────────────────────────── */
function createBuffalo(scene) {
  const root = new THREE.Group();
  root.visible = false;
  root.position.set(-6, 0, 2.05);
  scene.add(root);

  const hide = new THREE.MeshStandardMaterial({ color: 0x2b2420, roughness: 0.94 });
  const hideLight = new THREE.MeshStandardMaterial({ color: 0x3c332c, roughness: 0.9 });
  const hornMat = new THREE.MeshStandardMaterial({ color: 0xcfc0a0, roughness: 0.7 });
  const snoutMat = new THREE.MeshStandardMaterial({ color: 0x4b3a31, roughness: 0.92 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x0d0907, roughness: 0.5 });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0x8d2a22, roughness: 0.88 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd3a03e, metalness: 0.55, roughness: 0.4 });

  // barrel body, long axis on X
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.25, 6, 14), hide);
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 1.16, 0);
  body.scale.set(1, 0.94, 1);
  body.castShadow = true;
  root.add(body);
  // shoulder hump
  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 9), hideLight);
  hump.position.set(-0.1, 1.55, 0); hump.scale.set(1.05, 0.66, 0.92);
  hump.castShadow = true;
  root.add(hump);

  // saddle blanket, because every buffalo at a mela is dressed for the occasion
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.045, 0.92), clothMat);
  blanket.position.set(-0.1, 1.6, 0);
  blanket.rotation.z = -0.02;
  root.add(blanket);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.05, 0.06), goldMat);
  trim.position.set(-0.1, 1.6, 0.46);
  root.add(trim);
  const trim2 = trim.clone(); trim2.position.z = -0.46; root.add(trim2);

  // neck + head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.5, 10), hide);
  neck.position.set(0.74, 1.32, 0);
  neck.rotation.z = -0.72;
  root.add(neck);
  const headPivot = new THREE.Group();
  headPivot.position.set(1.0, 1.2, 0);
  root.add(headPivot);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 14, 11), hide);
  head.scale.set(1.2, 1, 0.92);
  head.castShadow = true;
  headPivot.add(head);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 9), snoutMat);
  snout.position.set(0.3, -0.13, 0);
  snout.scale.set(1.35, 0.85, 1);
  headPivot.add(snout);
  // nostrils
  [-1, 1].forEach(s => {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 5), blackMat);
    n.position.set(0.56, -0.08, s * 0.1);
    headPivot.add(n);
  });
  // nose ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 5, 14), goldMat);
  ring.position.set(0.58, -0.24, 0);
  ring.rotation.x = Math.PI / 2;
  headPivot.add(ring);
  // eyes
  [-1, 1].forEach(s => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 7, 6), blackMat);
    eye.position.set(0.22, 0.1, s * 0.27);
    headPivot.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.011, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    glint.position.set(0.245, 0.115, s * 0.29);
    headPivot.add(glint);
  });
  // ears
  [-1, 1].forEach(s => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), hideLight);
    ear.position.set(0.02, 0.11, s * 0.38);
    ear.scale.set(1.2, 0.45, 0.8);
    ear.rotation.z = s * 0.3;
    headPivot.add(ear);
  });
  // horns, swept back and out
  [-1, 1].forEach(s => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.46, 7), hornMat);
    horn.position.set(0.08, 0.31, s * 0.25);
    horn.rotation.z = 1.15;
    horn.rotation.x = -s * 0.5;
    horn.castShadow = true;
    headPivot.add(horn);
  });

  // legs
  const legs = [];
  [[0.42, 0.29], [0.42, -0.29], [-0.5, 0.29], [-0.5, -0.29]].forEach(([x, z], i) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.82, 7), hideLight);
    leg.position.set(x, 0.41, z);
    leg.castShadow = true;
    root.add(leg);
    legs.push({ mesh: leg, phase: (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0) });
  });
  // tail + tuft
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.045, 0.78, 5), hideLight);
  tail.position.set(-0.86, 1.18, 0);
  tail.rotation.z = 0.45;
  root.add(tail);
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 5), blackMat);
  tuft.position.set(-1.02, 0.82, 0);
  root.add(tuft);

  // little neck bell
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 5), goldMat);
  bell.position.set(0.65, 0.95, 0.18);
  root.add(bell);

  let active = false, mode = 'off', x = -6, z = 2.05, speed = 1.15, wait = 0, dir = 1;
  let targetRot = 0, legPhase = 0;

  function enter() {
    active = true;
    mode = 'walk';
    x = -5.6; z = 2.05; speed = 1.15; wait = 0; dir = 1; targetRot = 0;
    root.visible = true;
    root.position.set(x, 0, z);
    root.rotation.set(0, 0, 0);
  }

  function hit() {
    if (!active) return false;
    mode = 'flee';
    dir = x <= 0 ? -1 : 1;
    targetRot = dir > 0 ? 0 : Math.PI;
    speed = 4.8;
    return true;
  }

  function reset() {
    active = false; mode = 'off';
    x = -6; root.visible = false;
  }

  function update(dt, t) {
    if (!active) return;
    const fast = mode === 'flee';
    legPhase += dt * (fast ? 19 : 9.5);

    if (mode === 'walk') {
      x += speed * dt;
      if (x >= -1.75) { x = -1.75; mode = 'pause'; wait = 0; }
    } else if (mode === 'pause') {
      wait += dt;
      if (wait > 4.4) { mode = 'leave'; dir = -1; targetRot = Math.PI; }
    } else if (mode === 'leave') {
      x += dir * speed * dt;
    } else if (mode === 'flee') {
      x += dir * speed * dt;
    }

    const moving = mode === 'walk' || mode === 'leave' || mode === 'flee';
    root.position.x = x;
    root.position.z = z + (mode === 'pause' ? Math.sin(t * 0.8) * 0.025 : 0);
    root.position.y = moving ? Math.abs(Math.sin(legPhase)) * (fast ? 0.1 : 0.045) : Math.sin(t * 1.7) * 0.012;
    root.rotation.y += (targetRot - root.rotation.y) * (1 - Math.exp(-dt * 6));
    root.rotation.z = fast ? Math.sin(t * 13) * 0.055 : Math.sin(t * 1.9) * 0.008;

    for (const l of legs) {
      l.mesh.rotation.x = moving ? Math.sin(legPhase + l.phase) * (fast ? 0.72 : 0.42) : 0;
    }
    headPivot.rotation.x = Math.sin(t * 2.2) * 0.045 + (fast ? -0.18 : 0);
    headPivot.rotation.y = mode === 'pause' ? Math.sin(t * 1.1) * 0.18 : 0;
    tail.rotation.z = 0.45 + Math.sin(t * (fast ? 12 : 3.2)) * (fast ? 0.55 : 0.22);
    tuft.position.x = -1.02 + Math.sin(t * (fast ? 12 : 3.2)) * 0.06;

    if (x > 7 || x < -7) {
      active = false; mode = 'off'; root.visible = false;
    }
  }

  return {
    root, enter, hit, reset, update,
    isActive: () => active,
    getMode: () => mode,
    position: () => root.position,
  };
}

/* ── particles ────────────────────────────────────────────────── */
function createEffects(scene, rand) {
  const sparkCount = 240;
  const sparkGeo = new THREE.BufferGeometry();
  const sparkPos = new Float32Array(sparkCount * 3);
  const sparkCol = new Float32Array(sparkCount * 3);
  for (let i = 0; i < sparkCount; i++) {
    sparkPos[i * 3] = 0; sparkPos[i * 3 + 1] = -999; sparkPos[i * 3 + 2] = 0;
    sparkCol[i * 3] = 1; sparkCol[i * 3 + 1] = 0.7; sparkCol[i * 3 + 2] = 0.35;
  }
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3));
  const sparkMat = new THREE.PointsMaterial({
    size: 0.07, vertexColors: true, transparent: true, opacity: 0.95,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
  sparkPoints.frustumCulled = false;
  scene.add(sparkPoints);
  const sparks = [];

  function burst(position, color = 0xffc87a, count = 14, power = 1) {
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      if (sparks.length >= sparkCount) sparks.shift();
      sparks.push({
        x: position.x, y: position.y, z: position.z,
        vx: (rand() - 0.5) * 2.8 * power,
        vy: rand() * 3.2 * power + 0.7,
        vz: (rand() - 0.5) * 2.8 * power,
        life: 0.35 + rand() * 0.45,
        maxLife: 0.8,
        r: c.r, g: c.g, b: c.b,
      });
    }
  }

  // confetti
  const confCount = 160;
  const confGeo = new THREE.PlaneGeometry(0.045, 0.085);
  const confMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const confetti = new THREE.InstancedMesh(confGeo, confMat, confCount);
  confetti.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  confetti.visible = false;
  confetti.frustumCulled = false;
  scene.add(confetti);
  const conf = [];
  const dummy = new THREE.Object3D();
  const confColors = [0xf4a41e, 0xe3524a, 0x1a8071, 0xf3dcaa, 0xe99ab0, 0xe8b84f];
  for (let i = 0; i < confCount; i++) {
    confetti.setColorAt(i, new THREE.Color(confColors[i % confColors.length]));
    conf.push({ x: 0, y: -20, z: 0, vx: 0, vy: 0, vz: 0, rot: 0, spin: 0, sway: rand() * TAU, life: 0 });
    dummy.position.set(0, -50, 0); dummy.updateMatrix(); confetti.setMatrixAt(i, dummy.matrix);
  }
  confetti.instanceColor.needsUpdate = true;

  function confettiBurst(center = new THREE.Vector3(0, 3, 2)) {
    confetti.visible = true;
    for (let i = 0; i < confCount; i++) {
      const c = conf[i];
      c.x = center.x + (rand() - 0.5) * 5.5;
      c.y = center.y + rand() * 3.8;
      c.z = center.z + (rand() - 0.5) * 2.5;
      c.vx = (rand() - 0.5) * 1.1;
      c.vy = 0.15 + rand() * 1.4;
      c.vz = (rand() - 0.5) * 0.9;
      c.rot = rand() * TAU;
      c.spin = (rand() - 0.5) * 8;
      c.sway = rand() * TAU;
      c.life = 5 + rand() * 3;
    }
  }

  function clear() {
    confetti.visible = false;
    sparks.length = 0;
    const pos = sparkGeo.attributes.position.array;
    for (let i = 0; i < sparkCount; i++) pos[i * 3 + 1] = -999;
    sparkGeo.attributes.position.needsUpdate = true;
    for (let i = 0; i < confCount; i++) {
      dummy.position.set(0, -50, 0); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(0.01);
      dummy.updateMatrix(); confetti.setMatrixAt(i, dummy.matrix);
    }
    confetti.instanceMatrix.needsUpdate = true;
  }

  function update(dt) {
    // spark update
    const pos = sparkGeo.attributes.position.array;
    const col = sparkGeo.attributes.color.array;
    for (let i = 0; i < sparkCount; i++) {
      const s = sparks[i];
      if (!s || s.life <= 0) {
        pos[i * 3 + 1] = -999;
        continue;
      }
      s.life -= dt;
      s.vy -= 7.5 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      if (s.y < 0.03) { s.y = 0.03; s.vy *= -0.25; s.vx *= 0.7; s.vz *= 0.7; }
      pos[i * 3] = s.x; pos[i * 3 + 1] = s.y; pos[i * 3 + 2] = s.z;
      const a = clamp(s.life / s.maxLife, 0, 1);
      col[i * 3] = s.r * a; col[i * 3 + 1] = s.g * a; col[i * 3 + 2] = s.b * a;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparkGeo.attributes.color.needsUpdate = true;

    if (!confetti.visible) return;
    let alive = false;
    for (let i = 0; i < confCount; i++) {
      const c = conf[i];
      c.life -= dt;
      if (c.life <= 0) {
        dummy.position.set(0, -50, 0); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(0.01);
        dummy.updateMatrix(); confetti.setMatrixAt(i, dummy.matrix);
        continue;
      }
      alive = true;
      c.vy -= 1.5 * dt;
      c.vy = Math.max(c.vy, -1.2);
      c.x += (c.vx + Math.sin((performance.now() / 1000 + c.sway) * 1.7) * 0.15) * dt;
      c.y += c.vy * dt;
      c.z += c.vz * dt;
      c.rot += c.spin * dt;
      if (c.y < 0.06) { c.y = 0.06; c.vy = 0; c.spin *= 0.9; }
      dummy.position.set(c.x, c.y, c.z);
      dummy.rotation.set(c.rot * 0.8, c.rot * 0.5, c.rot);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      confetti.setMatrixAt(i, dummy.matrix);
    }
    confetti.instanceMatrix.needsUpdate = true;
    if (!alive) confetti.visible = false;
  }

  return { burst, confettiBurst, clear, update };
}
