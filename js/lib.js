// =========================================================
//  lib.js — współdzielone narzędzia dla wszystkich tematów
// =========================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ---------- Pomocniki DOM ---------- */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

/* ---------- Wzory KaTeX ---------- */
export function renderMath(root) {
  if (window.renderMathInElement) {
    window.renderMathInElement(root, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
      throwOnError: false,
    });
  }
}

export function formula(label, tex) {
  return el('div', { class: 'formula' },
    label ? el('span', { class: 'label', text: label }) : null,
    el('div', { html: `$$${tex}$$` })
  );
}

/* ---------- Suwak ---------- */
export function slider({ label, unit = '', min, max, step, value, format, onInput }) {
  const valEl = el('span', { class: 'val' });
  const fmt = format || ((v) => `${v}${unit ? ' ' + unit : ''}`);
  const input = el('input', { type: 'range', min, max, step, value });
  const update = () => { valEl.textContent = fmt(parseFloat(input.value)); };
  input.addEventListener('input', () => { update(); onInput(parseFloat(input.value)); });
  update();
  const wrap = el('div', { class: 'ctrl' },
    el('label', {}, document.createTextNode(label), valEl),
    input
  );
  wrap.input = input;
  wrap.setValue = (v) => { input.value = v; update(); };
  return wrap;
}

/* ---------- Odczyt wartości ---------- */
export function readout(key, unit = '') {
  const v = el('span', { class: 'v', text: '—' });
  const box = el('div', { class: 'readout' },
    el('div', { class: 'k', text: key }),
    el('div', {}, v, unit ? el('span', { class: 'u', text: ' ' + unit }) : null)
  );
  box.set = (val) => { v.textContent = val; };
  return box;
}

/* ---------- Sekcja / karta ---------- */
export function section(icon, title, ...content) {
  return el('div', { class: 'section' },
    el('h2', {}, el('span', { class: 's-ico', text: icon }), document.createTextNode(title)),
    ...content
  );
}
export function card(...content) { return el('div', { class: 'card' }, ...content); }
export function def(title, htmlBody) {
  return el('div', { class: 'def' },
    el('strong', { text: title + ': ' }),
    el('span', { html: htmlBody })
  );
}

/* =========================================================
   Three.js — gotowa scena 3D z kamerą, światłem i podłożem
   ========================================================= */
export function makeScene(canvas, { grid = true, ground = 20, camera = [8, 6, 12] } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x070a12, 40, 120);

  const cam = new THREE.PerspectiveCamera(50, 16 / 10, 0.1, 1000);
  cam.position.set(...camera);

  const controls = new OrbitControls(cam, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3;
  controls.maxDistance = 90;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 1, 0);

  // Światła
  const hemi = new THREE.HemisphereLight(0x88aaff, 0x223355, 0.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(10, 18, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -ground; sun.shadow.camera.right = ground;
  sun.shadow.camera.top = ground; sun.shadow.camera.bottom = -ground;
  sun.shadow.camera.far = 80;
  scene.add(sun);
  const rim = new THREE.PointLight(0x7c5cff, 0.6, 100);
  rim.position.set(-12, 8, -10);
  scene.add(rim);

  // Podłoże
  if (ground) {
    const gMat = new THREE.MeshStandardMaterial({ color: 0x0e1526, roughness: 0.95, metalness: 0.0 });
    const gMesh = new THREE.Mesh(new THREE.PlaneGeometry(ground * 2, ground * 2), gMat);
    gMesh.rotation.x = -Math.PI / 2;
    gMesh.receiveShadow = true;
    scene.add(gMesh);
  }
  if (grid) {
    const g = new THREE.GridHelper(ground * 2, ground * 2, 0x2b3a5c, 0x18233b);
    g.position.y = 0.001;
    scene.add(g);
  }

  // Osie XYZ z podpisami-strzałkami
  const axes = new THREE.Group();
  scene.add(axes);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h, false);
      cam.aspect = w / h; cam.updateProjectionMatrix();
    }
  }

  let raf = null, onFrame = null, alive = true;
  function loop() {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    resize();
    controls.update();
    if (onFrame) onFrame();
    renderer.render(scene, cam);
  }
  loop();

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  return {
    THREE, scene, cam, controls, renderer, sun,
    setFrame(fn) { onFrame = fn; },
    dispose() {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
    },
  };
}

/* Rejestr aktywnych scen — sprzątane przy zmianie tematu */
const _scenes = [];
export function registerScene(s) { _scenes.push(s); return s; }
export function disposeScenes() { while (_scenes.length) _scenes.pop().dispose(); }

/* Wykres Plotly z ciemnym motywem */
export function plot(node, data, layout = {}, config = {}) {
  const base = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#9aa6c2', family: 'system-ui, sans-serif', size: 12 },
    margin: { l: 55, r: 20, t: 30, b: 45 },
    xaxis: { gridcolor: '#1e2740', zerolinecolor: '#263149' },
    yaxis: { gridcolor: '#1e2740', zerolinecolor: '#263149' },
    legend: { orientation: 'h', y: -0.2 },
  };
  const merged = deepMerge(base, layout);
  window.Plotly.react(node, data, merged, { responsive: true, displayModeBar: false, ...config });
}

function deepMerge(a, b) {
  const out = { ...a };
  for (const k in b) {
    out[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) ? deepMerge(a[k] || {}, b[k]) : b[k];
  }
  return out;
}
