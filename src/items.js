import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export const TABLE_TOP = 1.061;

export const physicsMaterials = {
  clay: new CANNON.Material('clay'),
  glass: new CANNON.Material('glass'),
  steel: new CANNON.Material('steel'),
  china: new CANNON.Material('china'),
  wood: new CANNON.Material('wood'),
  ball: new CANNON.Material('ball'),
};

/* ── shared materials ─────────────────────────────────────────── */
const M = {
  clay: new THREE.MeshStandardMaterial({ color: 0xa95b36, roughness: 0.92, metalness: 0 }),
  clayDark: new THREE.MeshStandardMaterial({ color: 0x4f2a1b, roughness: 0.95 }),
  clayLight: new THREE.MeshStandardMaterial({ color: 0xc8784d, roughness: 0.9 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xbfe9f2, metalness: 0, roughness: 0.06, transmission: 0.88,
    thickness: 0.32, ior: 1.48, transparent: true, opacity: 0.8,
    side: THREE.DoubleSide, clearcoat: 1, clearcoatRoughness: 0.05,
  }),
  glassEdge: new THREE.MeshPhysicalMaterial({
    color: 0xe7fbff, metalness: 0, roughness: 0.03, transparent: true,
    opacity: 0.75, side: THREE.DoubleSide,
  }),
  china: [
    new THREE.MeshStandardMaterial({ color: 0xf3e9d2, roughness: 0.34, metalness: 0.02 }),
    new THREE.MeshStandardMaterial({ color: 0xe8d9c7, roughness: 0.36 }),
    new THREE.MeshStandardMaterial({ color: 0xdce9e4, roughness: 0.34 }),
  ],
  chinaRim: new THREE.MeshStandardMaterial({ color: 0x8f2a2c, roughness: 0.4, metalness: 0.08 }),
  chinaGold: new THREE.MeshStandardMaterial({ color: 0xc59742, roughness: 0.35, metalness: 0.4 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xa9b0b2, metalness: 0.87, roughness: 0.3 }),
  steelDark: new THREE.MeshStandardMaterial({ color: 0x646e72, metalness: 0.8, roughness: 0.4 }),
  steelRed: new THREE.MeshStandardMaterial({ color: 0x9e2b22, metalness: 0.3, roughness: 0.5 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.82, metalness: 0 }),
};

const cylinderGeoCache = new Map();
function cylGeo(rt, rb, h, seg = 20, open = true) {
  const key = `${rt}-${rb}-${h}-${seg}-${open}`;
  if (!cylinderGeoCache.has(key)) {
    cylinderGeoCache.set(key, new THREE.CylinderGeometry(rt, rb, h, seg, 1, open));
  }
  return cylinderGeoCache.get(key);
}

function shadowify(obj) {
  obj.traverse(o => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  return obj;
}

/* ── individual vessels ───────────────────────────────────────── */
function cupMesh(rt = 0.15, rb = 0.1, h = 0.19) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(cylGeo(rt, rb, h, 18, true), M.clay);
  body.castShadow = true; g.add(body);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(rb * 0.97, 18), M.clayDark);
  bottom.rotation.x = Math.PI / 2; bottom.position.y = -h / 2 + 0.004; g.add(bottom);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(rt * 0.84, 18), M.clayDark);
  inner.rotation.x = -Math.PI / 2; inner.position.y = h / 2 - 0.014; g.add(inner);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(rt, 0.012, 5, 20), M.clayLight);
  rim.rotation.x = Math.PI / 2; rim.position.y = h / 2; g.add(rim);
  // little chai stain inside
  const stain = new THREE.Mesh(new THREE.CircleGeometry(rt * 0.55, 14), new THREE.MeshStandardMaterial({ color: 0x773c23, roughness: 1 }));
  stain.rotation.x = -Math.PI / 2; stain.position.y = h / 2 - 0.017; g.add(stain);
  // painted band
  const band = new THREE.Mesh(new THREE.TorusGeometry(rt * 0.93, 0.008, 4, 18), new THREE.MeshStandardMaterial({ color: 0xeee0bd, roughness: 0.8 }));
  band.rotation.x = Math.PI / 2; band.position.y = h * 0.12; g.add(band);
  return shadowify(g);
}

function glassMesh(rt = 0.094, rb = 0.079, h = 0.27) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(cylGeo(rt, rb, h, 20, true), M.glass);
  body.castShadow = true; g.add(body);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(rb, rb * 0.92, 0.018, 20), M.glassEdge);
  base.position.y = -h / 2 + 0.009; g.add(base);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(rt, 0.006, 4, 20), M.glassEdge);
  rim.rotation.x = Math.PI / 2; rim.position.y = h / 2; g.add(rim);
  // etched decorative line
  const line = new THREE.Mesh(new THREE.TorusGeometry(rt * 0.96, 0.004, 4, 20), M.glassEdge);
  line.rotation.x = Math.PI / 2; line.position.y = -h * 0.16; g.add(line);
  return shadowify(g);
}

function plateMesh(r = 0.35, h = 0.052, variant = 0) {
  const g = new THREE.Group();
  const mat = M.china[variant % 3];
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, h, 30), mat);
  body.castShadow = true; g.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.96, 0.012, 4, 30), M.chinaRim);
  rim.rotation.x = Math.PI / 2; rim.position.y = h / 2 - 0.002; g.add(rim);
  const line = new THREE.Mesh(new THREE.TorusGeometry(r * 0.84, 0.006, 4, 28), M.chinaGold);
  line.rotation.x = Math.PI / 2; line.position.y = h / 2 + 0.002; g.add(line);
  return shadowify(g);
}

function bowlMesh(rt = 0.22, rb = 0.12, h = 0.12, variant = 0) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(cylGeo(rt, rb, h, 22, true), M.china[variant % 3]);
  g.add(body);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(rb * 0.95, 20), M.china[(variant + 1) % 3]);
  bottom.rotation.x = Math.PI / 2; bottom.position.y = -h / 2 + 0.003; g.add(bottom);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(rt * 0.82, 20), M.china[(variant + 1) % 3]);
  inner.rotation.x = -Math.PI / 2; inner.position.y = h / 2 - 0.012; g.add(inner);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(rt, 0.009, 4, 22), M.chinaRim);
  rim.rotation.x = Math.PI / 2; rim.position.y = h / 2; g.add(rim);
  return shadowify(g);
}

function bucketMesh(rt = 0.245, rb = 0.19, h = 0.43) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(cylGeo(rt, rb, h, 22, true), M.steel);
  body.castShadow = true; g.add(body);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(rb * 0.98, 22), M.steelDark);
  bottom.rotation.x = Math.PI / 2; bottom.position.y = -h / 2 + 0.006; g.add(bottom);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(rt, 0.024, 6, 22), M.steelDark);
  rim.rotation.x = Math.PI / 2; rim.position.y = h / 2; g.add(rim);
  const baseRim = new THREE.Mesh(new THREE.TorusGeometry(rb, 0.022, 6, 22), M.steelDark);
  baseRim.rotation.x = Math.PI / 2; baseRim.position.y = -h / 2 + 0.01; g.add(baseRim);
  // painted red stripe
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(rt * 0.94, 0.012, 4, 24), M.steelRed);
  stripe.rotation.x = Math.PI / 2; stripe.position.y = h * 0.18; g.add(stripe);
  // handle
  const handle = new THREE.Mesh(new THREE.TorusGeometry(rt * 0.92, 0.014, 5, 16, Math.PI), M.steelDark);
  handle.position.y = h / 2; handle.rotation.z = 0.08; g.add(handle);
  // little painted marking
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.06), new THREE.MeshBasicMaterial({ color: 0x7a1f18 }));
  mark.position.set(0, 0.02, rt + 0.003); mark.scale.set(1, 1, 1); g.add(mark);
  return shadowify(g);
}

/* ── object + physics body helper ─────────────────────────────── */
function makeItem(ctx, mesh, shape, pos, opts) {
  const { group, world } = ctx;
  mesh.position.set(pos.x, pos.y, pos.z);
  if (opts.rotation) mesh.rotation.set(opts.rotation.x || 0, opts.rotation.y || 0, opts.rotation.z || 0);
  group.add(mesh);

  const body = new CANNON.Body({
    mass: opts.mass,
    material: opts.material,
    position: new CANNON.Vec3(pos.x, pos.y, pos.z),
    linearDamping: opts.linearDamping ?? 0.04,
    angularDamping: opts.angularDamping ?? 0.22,
    allowSleep: true,
    sleepSpeedLimit: 0.14,
    sleepTimeLimit: 0.45,
  });
  body.addShape(shape);
  if (opts.rotation) {
    body.quaternion.setFromEuler(opts.rotation.x || 0, opts.rotation.y || 0, opts.rotation.z || 0);
  }
  world.addBody(body);

  const item = {
    mesh, body, sound: opts.sound, kind: opts.kind, name: opts.name,
    lastSound: 0, start: null, fallen: false, isPlate: !!opts.isPlate,
    radius: opts.radius || 0.2,
  };
  body.userData = item;
  return item;
}

/* ── stack builders ───────────────────────────────────────────── */
function buildCups(ctx) {
  const items = [];
  const h = 0.19;
  // three five-cup towers: one ball can only wreck one tower
  const towers = [-0.85, 0, 0.85];
  for (const tx of towers) {
    for (let row = 0; row < 5; row++) {
      const x = tx;
      const y = TABLE_TOP + h / 2 + row * h + 0.002;
      const mesh = cupMesh(0.15, 0.1, h);
      items.push(makeItem(ctx, mesh, new CANNON.Cylinder(0.15, 0.1, h, 10),
        { x, y, z: 0 }, {
          mass: 0.32, material: physicsMaterials.clay, sound: 'clay', kind: 'clay',
          name: `Kulhad ${items.length + 1}`, radius: 0.15,
        }));
    }
  }
  return items;
}

function buildGlasses(ctx) {
  const items = [];
  const h = 0.27;
  // three five-glass towers, deliberately out of reach of a single hit
  const towers = [-0.85, 0, 0.85];
  for (const tx of towers) {
    for (let row = 0; row < 5; row++) {
      const x = tx;
      const y = TABLE_TOP + h / 2 + row * h + 0.003;
      const mesh = glassMesh(0.094, 0.079, h);
      items.push(makeItem(ctx, mesh, new CANNON.Cylinder(0.094, 0.079, h, 10),
        { x, y, z: 0 }, {
          mass: 0.3, material: physicsMaterials.glass, sound: 'glass', kind: 'glass',
          name: `Glass ${items.length + 1}`, radius: 0.1,
        }));
    }
  }
  return items;
}

function buildCrockery(ctx) {
  const items = [];
  // a small wooden pedestal lifts the plates clear of the table, so even
  // the bottom plate can be knocked off and count as toppled
  const standH = 0.1;
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, standH, 18), M.wood);
  items.push(makeItem(ctx, stand, new CANNON.Cylinder(0.14, 0.17, standH, 14),
    { x: -0.9, y: TABLE_TOP + standH / 2, z: 0 }, {
      mass: 0, material: physicsMaterials.wood, sound: 'wood', kind: 'wood',
      name: 'Plate stand', radius: 0.17,
    }));
  // wedding plates on the left...
  const ph = 0.052;
  for (let i = 0; i < 5; i++) {
    const y = TABLE_TOP + standH + ph / 2 + i * ph + 0.002;
    const mesh = plateMesh(0.35, ph, i);
    items.push(makeItem(ctx, mesh, new CANNON.Cylinder(0.35, 0.35, ph, 16),
      { x: -0.9, y, z: 0 }, {
        mass: 0.3, material: physicsMaterials.china, sound: 'china', kind: 'china',
        name: `Plate ${i + 1}`, radius: 0.35, isPlate: true,
        rotation: { y: (i % 2) * 0.2 },
        angularDamping: 0.12,
      }));
  }
  // ...a middle tower of little katoris...
  const kh = 0.11;
  for (let i = 0; i < 5; i++) {
    const y = TABLE_TOP + kh / 2 + i * (kh + 0.002);
    const mesh = bowlMesh(0.2, 0.11, kh, i + 1);
    items.push(makeItem(ctx, mesh, new CANNON.Cylinder(0.2, 0.11, kh, 14),
      { x: 0, y, z: 0 }, {
        mass: 0.2, material: physicsMaterials.china, sound: 'china', kind: 'china',
        name: `Katori ${i + 1}`, radius: 0.2,
        rotation: { y: i * 0.5 },
        angularDamping: 0.12,
      }));
  }
  // ...and the big bowls on the right, too far apart to share a hit
  const bh = 0.12;
  for (let i = 0; i < 6; i++) {
    const y = TABLE_TOP + bh / 2 + i * (bh + 0.002);
    const mesh = bowlMesh(0.22, 0.12, bh, i);
    items.push(makeItem(ctx, mesh, new CANNON.Cylinder(0.22, 0.12, bh, 12),
      { x: 0.9, y, z: 0 }, {
        mass: 0.26, material: physicsMaterials.china, sound: 'china', kind: 'china',
        name: `Bowl ${i + 1}`, radius: 0.22,
        rotation: { y: i * 0.7 },
        angularDamping: 0.14,
      }));
  }
  return items;
}

function buildBuckets(ctx) {
  const items = [];
  const h = 0.43;
  // three separate two-bucket columns: one ball can clear one column, but
  // never all three, so every throw has to count
  const columns = [
    { x: -1.05, tag: 'L' },
    { x: 0, tag: 'M' },
    { x: 1.05, tag: 'R' },
  ];
  for (const col of columns) {
    for (let row = 0; row < 2; row++) {
      const y = TABLE_TOP + h / 2 + row * (h + 0.004) + 0.002;
      const mesh = bucketMesh(0.245, 0.19, h);
      const yaw = row === 0 ? (col.x < 0 ? 0.5 : col.x > 0 ? -0.4 : 0.15) : 0.9;
      mesh.rotation.y = yaw;
      items.push(makeItem(ctx, mesh, new CANNON.Cylinder(0.245, 0.19, h, 14),
        { x: col.x, y, z: 0 }, {
          mass: 1.55, material: physicsMaterials.steel, sound: 'steel', kind: 'steel',
          name: row === 0 ? `Bucket ${col.tag}` : row === 1 ? `Upper Bucket ${col.tag}` : `Top Bucket ${col.tag}`,
          radius: 0.245,
          angularDamping: 0.34, linearDamping: 0.14,
          rotation: { y: yaw },
        }));
    }
  }
  return items;
}

export const TARGETS = {
  cups: {
    id: 'cups', name: 'Kulhad Cups', hindi: 'कुल्हड़', icon: 'cups',
    desc: 'Fifteen clay chai cups in three tall towers. One clean hit only wrecks one tower, so make every ball count.',
    tag: '15 cups · topple all', diff: 1, total: 15, required: 15, aimY: 1.26, aimX: 0,
    accent: '#e38a4d', accentText: '#f2ae70', sound: 'clay',
    winLine: 'Kulhad khatam, chai baaki!',
    build: buildCups,
    threshold: 0.3,
  },
  glasses: {
    id: 'glasses', name: 'Kaanch Ke Glass', hindi: 'काँच के गिलास', icon: 'glass',
    desc: 'Fifteen proud glass tumblers in three towers. Beautiful, loud, and absolutely not insured.',
    tag: '15 glasses · topple all', diff: 2, total: 15, required: 15, aimY: 1.26, aimX: 0,
    accent: '#9edbe4', accentText: '#bfeef4', sound: 'glass',
    winLine: 'Kaanch gaya, kaanch gaya!',
    build: buildGlasses,
    threshold: 0.3,
  },
  crockery: {
    id: 'crockery', name: 'Crockery Tower', hindi: 'शादी का बर्तन', icon: 'plates',
    desc: 'Five wedding plates on the left, five katoris in the middle, six big bowls on the right. Amma said not to touch it. Amma is not here.',
    tag: '16 pieces · topple all', diff: 3, total: 16, required: 16, aimY: 1.26, aimX: -1.18,
    accent: '#f0c46b', accentText: '#f6d48e', sound: 'china',
    winLine: 'Amma ki thali, Shetty ki tension!',
    build: buildCrockery,
    threshold: 0.26,
  },
  buckets: {
    id: 'buckets', name: 'Steel Buckets', hindi: 'लोहे की बाल्टियाँ', icon: 'bucket',
    desc: 'Six heavy steel buckets in three tall columns. Every single one has to hit the dirt, and they do not fall politely.',
    tag: '6 buckets · topple all', diff: 4, total: 6, required: 6, aimY: 1.45, aimX: -1.05,
    accent: '#aeb7ba', accentText: '#ced6d8', sound: 'steel',
    winLine: 'Balte gir gaye? Arre wah!',
    build: buildBuckets,
    threshold: 0.22,
  },
};

export const TARGET_ORDER = ['cups', 'glasses', 'crockery', 'buckets'];

export function buildTarget(id, scene, world) {
  const def = TARGETS[id];
  if (!def) throw new Error(`Unknown target ${id}`);
  const group = new THREE.Group();
  group.name = `target-${id}`;
  scene.add(group);
  const ctx = { group, world };
  const items = def.build(ctx);
  return { def, group, items };
}

export function settleStack(items, world, steps = 110) {
  for (let i = 0; i < steps; i++) world.step(1 / 120);
  syncItems(items);
  recordStarts(items);
}

export function recordStarts(items) {
  for (const item of items) {
    item.start = {
      x: item.body.position.x,
      y: item.body.position.y,
      z: item.body.position.z,
      qx: item.body.quaternion.x,
      qy: item.body.quaternion.y,
      qz: item.body.quaternion.z,
      qw: item.body.quaternion.w,
    };
    item.fallen = false;
  }
}

const _q = new THREE.Quaternion();
const _up = new THREE.Vector3();
export function isToppled(item, threshold = 0.3) {
  if (!item.start) return false;
  const p = item.body.position;
  const dx = p.x - item.start.x;
  const dz = p.z - item.start.z;
  const horiz = Math.hypot(dx, dz);
  _q.set(item.body.quaternion.x, item.body.quaternion.y, item.body.quaternion.z, item.body.quaternion.w);
  _up.set(0, 1, 0).applyQuaternion(_q);
  const tilted = _up.y < 0.62;
  const dropped = p.y < item.start.y - 0.1;
  const shoved = horiz > threshold;
  return tilted || dropped || shoved;
}

export function countToppled(items, threshold = 0.3) {
  let n = 0;
  for (const item of items) {
    if (item.fallen || isToppled(item, threshold)) {
      item.fallen = true;
      n++;
    }
  }
  return n;
}

export function syncItems(items) {
  for (const item of items) {
    item.mesh.position.set(item.body.position.x, item.body.position.y, item.body.position.z);
    item.mesh.quaternion.set(item.body.quaternion.x, item.body.quaternion.y, item.body.quaternion.z, item.body.quaternion.w);
  }
}

export function disposeTarget(target, scene, world) {
  if (!target) return;
  for (const item of target.items) {
    world.removeBody(item.body);
  }
  scene.remove(target.group);
  target.group.traverse(o => {
    if (o.isMesh) {
      if (o.geometry && !cylinderGeoCache.has(o.geometry.uuid)) {
        // geometries are cheap and shared by material cache; dispose only unique ones
        const used = Object.values(cylinderGeoCache).includes(o.geometry);
        if (!used) o.geometry.dispose();
      }
    }
  });
}
