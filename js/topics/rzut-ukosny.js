// =========================================================
//  Kinematyka → Rzut ukośny
// =========================================================
import { makeScene, registerScene, el, section, card, formula, def, slider, readout, plot } from '../lib.js';

const G = { ziemia: 9.81, ksiezyc: 1.62, mars: 3.71 };

export function render(root) {
  // Stan
  const S = { v0: 20, angle: 45, g: 9.81, h0: 0 };

  // ---- Fizyka rzutu ukośnego (bez oporu powietrza) ----
  function physics({ v0, angle, g, h0 }) {
    const th = (angle * Math.PI) / 180;
    const vx = v0 * Math.cos(th);
    const vy0 = v0 * Math.sin(th);
    // czas lotu z uwzględnieniem wysokości startu h0
    const T = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * h0)) / g;
    const H = h0 + (vy0 * vy0) / (2 * g);
    const R = vx * T;
    return { th, vx, vy0, T, H, R };
  }
  function posAt(t, p) {
    return {
      x: p.vx * t,
      y: S.h0 + p.vy0 * t - 0.5 * S.g * t * t,
      vy: p.vy0 - S.g * t,
    };
  }

  // ---- Scena 3D ----
  const canvas = el('canvas', { class: 'sim-canvas' });
  const simWrap = el('div', { class: 'sim-wrap' }, canvas, el('div', { class: 'sim-hint', text: '🖱️ obróć · 🤏 przybliż · przeciągnij palcem' }));

  const scene3d = registerScene(makeScene(canvas, { ground: 16, camera: [4, 9, 26] }));
  const { THREE, scene, controls } = scene3d;
  controls.target.set(0, 3, 0);

  // Grupa świata (skalowanie metrów -> jednostki sceny)
  const world = new THREE.Group();
  scene.add(world);
  const LAUNCH_X = -12;      // świat: punkt startu
  const SPAN = 24;           // świat: rozpiętość toru w X

  // Tor (linia)
  const trajMat = new THREE.LineBasicMaterial({ color: 0x4da3ff, transparent: true, opacity: 0.9 });
  let trajLine = new THREE.Line(new THREE.BufferGeometry(), trajMat);
  world.add(trajLine);

  // Wypełniona "wstęga" pod torem dla realizmu
  const ribbonMat = new THREE.MeshBasicMaterial({ color: 0x4da3ff, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
  let ribbon = new THREE.Mesh(new THREE.BufferGeometry(), ribbonMat);
  world.add(ribbon);

  // Pocisk
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xff8a00, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.1 })
  );
  ball.castShadow = true;
  world.add(ball);

  // Wektor prędkości
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 3, 0x2fe6c0, 0.9, 0.5);
  world.add(arrow);

  // Znacznik startu i lądowania
  const startMark = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 24), new THREE.MeshStandardMaterial({ color: 0x7c5cff }));
  world.add(startMark);
  const landMark = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.75, 32), new THREE.MeshBasicMaterial({ color: 0x2fe6c0, side: THREE.DoubleSide }));
  landMark.rotation.x = -Math.PI / 2; landMark.position.y = 0.02;
  world.add(landMark);

  let P = physics(S);
  let scaleW = SPAN / Math.max(P.R, 1e-3);

  function rebuildTrajectory() {
    P = physics(S);
    scaleW = SPAN / Math.max(P.R, 1e-3);
    const N = 120;
    const pts = [], ribbonPts = [];
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * P.T;
      const p = posAt(t, P);
      const wx = LAUNCH_X + p.x * scaleW;
      const wy = Math.max(p.y, 0) * scaleW;
      pts.push(new THREE.Vector3(wx, wy, 0));
      ribbonPts.push(new THREE.Vector3(wx, wy, 0), new THREE.Vector3(wx, 0, 0));
    }
    trajLine.geometry.dispose();
    trajLine.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    ribbon.geometry.dispose();
    const rg = new THREE.BufferGeometry().setFromPoints(ribbonPts);
    const idx = [];
    for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    rg.setIndex(idx);
    ribbon.geometry = rg;

    startMark.position.set(LAUNCH_X, S.h0 * scaleW + 0.08, 0);
    landMark.position.set(LAUNCH_X + P.R * scaleW, 0.02, 0);
    controls.target.set(0, Math.min(P.H * scaleW * 0.6, 8), 0);
  }

  // ---- Animacja ----
  let anim = { t: 0, playing: true, speed: 1 };
  scene3d.setFrame(() => {
    if (anim.playing) {
      anim.t += (1 / 60) * (P.T / 2.6) * anim.speed; // pełny lot ~2.6 s
      if (anim.t > P.T) anim.t = 0;
    }
    const p = posAt(anim.t, P);
    const wx = LAUNCH_X + p.x * scaleW;
    const wy = Math.max(p.y, 0) * scaleW;
    ball.position.set(wx, wy + 0.001, 0);
    // wektor prędkości
    const spd = Math.hypot(P.vx, p.vy);
    arrow.position.set(wx, wy, 0);
    arrow.setDirection(new THREE.Vector3(P.vx, p.vy, 0).normalize());
    arrow.setLength(Math.min(spd * scaleW * 0.25, 6), 0.9, 0.5);
    updateMarker(anim.t, p);
  });

  // ---- Odczyty ----
  const roR = readout('Zasięg', 'm');
  const roH = readout('Maks. wysokość', 'm');
  const roT = readout('Czas lotu', 's');
  const roV = readout('Prędkość teraz', 'm/s');
  function refreshReadouts() {
    roR.set(P.R.toFixed(1));
    roH.set(P.H.toFixed(1));
    roT.set(P.T.toFixed(2));
  }

  // ---- Wykresy ----
  const chartTraj = el('div', { class: 'chart' });
  const chartVel = el('div', { class: 'chart' });

  function refreshCharts() {
    const N = 100, xs = [], ys = [], ts = [], vys = [], vs = [];
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * P.T;
      const p = posAt(t, P);
      if (p.y < -0.001) continue;
      xs.push(p.x); ys.push(p.y);
      ts.push(t); vys.push(p.vy); vs.push(Math.hypot(P.vx, p.vy));
    }
    plot(chartTraj, [
      { x: xs, y: ys, mode: 'lines', line: { color: '#4da3ff', width: 3 }, name: 'tor', fill: 'tozeroy', fillcolor: 'rgba(77,163,255,.08)' },
      { x: [0], y: [S.h0], mode: 'markers', marker: { color: '#ffcc66', size: 12 }, name: 'pocisk', showlegend: false },
    ], {
      title: { text: 'Tor ruchu  y(x)', font: { size: 14, color: '#e8ecf6' } },
      xaxis: { title: 'x [m]' }, yaxis: { title: 'y [m]', scaleanchor: 'x', scaleratio: 1 },
    });
    plot(chartVel, [
      { x: ts, y: vys, mode: 'lines', name: 'v_y (pion.)', line: { color: '#2fe6c0', width: 2.5 } },
      { x: ts, y: vs, mode: 'lines', name: '|v| (całk.)', line: { color: '#7c5cff', width: 2.5 } },
      { x: ts, y: ts.map(() => P.vx), mode: 'lines', name: 'v_x (poz.)', line: { color: '#ffcc66', width: 2, dash: 'dot' } },
    ], {
      title: { text: 'Prędkość w czasie', font: { size: 14, color: '#e8ecf6' } },
      xaxis: { title: 't [s]' }, yaxis: { title: 'v [m/s]' },
    });
  }

  let markerThrottle = 0;
  function updateMarker(t, p) {
    if (++markerThrottle % 3 !== 0) return;
    roV.set(Math.hypot(P.vx, p.vy).toFixed(1));
    if (window.Plotly && chartTraj.data) {
      window.Plotly.restyle(chartTraj, { x: [[p.x]], y: [[p.y]] }, [1]);
    }
  }

  function recompute() {
    rebuildTrajectory();
    refreshReadouts();
    refreshCharts();
  }

  // ---- Kontrolki ----
  const sV0 = slider({ label: 'Prędkość początkowa v₀', unit: 'm/s', min: 1, max: 60, step: 1, value: S.v0, onInput: (v) => { S.v0 = v; recompute(); } });
  const sAng = slider({ label: 'Kąt wyrzutu α', unit: '°', min: 0, max: 90, step: 1, value: S.angle, onInput: (v) => { S.angle = v; recompute(); } });
  const sH0 = slider({ label: 'Wysokość startu h₀', unit: 'm', min: 0, max: 40, step: 1, value: S.h0, onInput: (v) => { S.h0 = v; recompute(); } });
  const sG = slider({ label: 'Przyspieszenie g', unit: 'm/s²', min: 1, max: 25, step: 0.01, value: S.g, format: (v) => v.toFixed(2), onInput: (v) => { S.g = v; recompute(); } });

  const gBtns = el('div', { class: 'btn-row' },
    el('button', { class: 'btn', onclick: () => { S.g = G.ziemia; sG.setValue(G.ziemia); recompute(); } }, '🌍 Ziemia'),
    el('button', { class: 'btn', onclick: () => { S.g = G.ksiezyc; sG.setValue(G.ksiezyc); recompute(); } }, '🌙 Księżyc'),
    el('button', { class: 'btn', onclick: () => { S.g = G.mars; sG.setValue(G.mars); recompute(); } }, '🔴 Mars'),
  );

  const btnPlay = el('button', { class: 'btn primary', onclick: () => { anim.playing = !anim.playing; btnPlay.textContent = anim.playing ? '⏸ Pauza' : '▶ Odtwórz'; } }, '⏸ Pauza');
  const btnReset = el('button', { class: 'btn', onclick: () => { anim.t = 0; } }, '↺ Od nowa');
  const sSpeed = slider({ label: 'Tempo animacji', unit: '×', min: 0.1, max: 3, step: 0.1, value: 1, format: (v) => v.toFixed(1), onInput: (v) => { anim.speed = v; } });

  // ---- Składanie strony ----
  root.appendChild(el('p', { class: 'lead', text: 'Ruch ciała rzuconego pod kątem do poziomu w jednorodnym polu grawitacyjnym (pomijamy opór powietrza). To złożenie dwóch ruchów: jednostajnego w poziomie i jednostajnie zmiennego w pionie.' }));

  root.appendChild(section('🔬', 'Symulacja 3D',
    card(
      simWrap,
      el('div', { class: 'btn-row' }, btnPlay, btnReset),
      el('div', { class: 'controls cols-2', style: 'margin-top:16px' }, sV0, sAng, sH0, sG),
      gBtns,
      el('div', { style: 'margin-top:10px' }, sSpeed),
      el('div', { class: 'readouts' }, roR, roH, roT, roV),
    )
  ));

  root.appendChild(section('📈', 'Wykresy na żywo',
    el('div', { class: 'grid cols-2' }, card(chartTraj), card(chartVel))
  ));

  root.appendChild(section('📖', 'Teoria i wzory',
    el('p', { text: 'Przyjmujemy oś x poziomo, oś y pionowo w górę. Ruch rozkładamy na dwie niezależne składowe:' }),
    el('div', { class: 'grid cols-2' },
      formula('Składowa pozioma (jednostajna)', 'x(t) = v_0 \\cos\\alpha \\cdot t'),
      formula('Składowa pionowa (jedn. zmienna)', 'y(t) = h_0 + v_0 \\sin\\alpha \\cdot t - \\tfrac{1}{2} g t^2'),
    ),
    el('div', { class: 'grid cols-2' },
      formula('Prędkość pozioma', 'v_x = v_0\\cos\\alpha = \\text{const}'),
      formula('Prędkość pionowa', 'v_y(t) = v_0\\sin\\alpha - g t'),
    ),
    el('h3', { text: 'Wielkości charakterystyczne (dla h₀ = 0)' }),
    el('div', { class: 'grid cols-2' },
      formula('Czas lotu', 'T = \\dfrac{2 v_0 \\sin\\alpha}{g}'),
      formula('Zasięg', 'R = \\dfrac{v_0^2 \\sin 2\\alpha}{g}'),
      formula('Maksymalna wysokość', 'H = \\dfrac{v_0^2 \\sin^2\\alpha}{2g}'),
      formula('Równanie toru (parabola)', 'y = x\\tan\\alpha - \\dfrac{g x^2}{2 v_0^2 \\cos^2\\alpha}'),
    ),
    def('Wniosek', 'Największy zasięg (przy h₀ = 0) uzyskujemy dla kąta <strong>α = 45°</strong>, bo wtedy sin 2α = 1. Kąty dopełniające do 90° (np. 30° i 60°) dają ten sam zasięg.'),
  ));
  root.appendChild(section('🧭', 'Pojęcia kluczowe',
    el('div', {},
      el('span', { class: 'pill', text: 'niezależność ruchów składowych' }),
      el('span', { class: 'pill', text: 'parabola' }),
      el('span', { class: 'pill', text: 'wektor prędkości' }),
      el('span', { class: 'pill', text: 'jednorodne pole grawitacyjne' }),
    )
  ));

  recompute();
}
