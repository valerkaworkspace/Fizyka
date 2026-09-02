// =========================================================
//  Gazy i termodynamika → Model gazu 3D (teoria kinetyczna)
//  Prawdziwe zderzenia sprężyste (ściany + cząstka-cząstka),
//  ciśnienie z pędu, temperatura z <v^2>, rozkład Maxwella.
// =========================================================
import { makeScene, registerScene, el, section, card, formula, def, slider, readout, plot } from '../lib.js';

export function render(root) {
  const H = 4.5;            // połowa boku pudełka (pudełko: -H..H w każdej osi)
  const RAD = 0.14;         // promień cząsteczki (mały — jak w rzeczywistości)
  const SPEED0 = 3.2;       // bazowa prędkość przy T = 1
  const S = { N: 80, T: 1.0 };

  // Stan cząsteczek
  let pos, vel;             // Float32Array (N*3)
  function initParticles(n, monoSpeed = true) {
    pos = new Float32Array(n * 3);
    vel = new Float32Array(n * 3);
    const speed = SPEED0 * Math.sqrt(S.T);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * (H - RAD);
      pos[i * 3 + 1] = (Math.random() * 2 - 1) * (H - RAD);
      pos[i * 3 + 2] = (Math.random() * 2 - 1) * (H - RAD);
      // kierunek losowy, jednakowa prędkość -> termalizacja pokaże rozkład Maxwella
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const sp = monoSpeed ? speed : speed * (0.3 + Math.random() * 1.4);
      vel[i * 3] = sp * r * Math.cos(th);
      vel[i * 3 + 1] = sp * r * Math.sin(th);
      vel[i * 3 + 2] = sp * u;
    }
  }
  initParticles(S.N);

  // ---- Scena 3D ----
  const canvas = el('canvas', { class: 'sim-canvas' });
  const simWrap = el('div', { class: 'sim-wrap' }, canvas, el('div', { class: 'sim-hint', text: '🖱️ obróć · 🤏 przybliż · kolor = prędkość' }));
  const scene3d = registerScene(makeScene(canvas, { grid: false, ground: 0, camera: [11, 8, 13] }));
  const { THREE, scene, controls } = scene3d;
  scene3d.sun.castShadow = false;
  controls.target.set(0, 0, 0);
  controls.minDistance = 8; controls.maxDistance = 40;
  controls.maxPolarAngle = Math.PI;

  // Pudełko: krawędzie + delikatne szklane ściany
  const boxGeo = new THREE.BoxGeometry(2 * H, 2 * H, 2 * H);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), new THREE.LineBasicMaterial({ color: 0x4da3ff, transparent: true, opacity: 0.55 }));
  scene.add(edges);
  const glass = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0x4da3ff, transparent: true, opacity: 0.04, side: THREE.BackSide, roughness: 0.1, metalness: 0 }));
  scene.add(glass);

  // Cząsteczki jako InstancedMesh (wydajnie, ostro, z kolorem wg prędkości)
  const sphereGeo = new THREE.SphereGeometry(RAD, 12, 12);
  const sphereMat = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.15 });
  let mesh = null;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  function buildMesh(n) {
    if (mesh) { scene.remove(mesh); mesh.dispose(); }
    mesh = new THREE.InstancedMesh(sphereGeo, sphereMat, n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);
  }
  buildMesh(S.N);

  // barwa wg prędkości (niebieski -> czerwony)
  function speedColor(sp, vmax) {
    const t = Math.min(sp / (vmax || 1), 1);
    // HSL: 240° (nieb.) -> 0° (czerw.)
    color.setHSL((1 - t) * 0.66, 0.85, 0.55);
    return color;
  }

  // ---- Statystyki ----
  let wallMomentum = 0;      // suma |Δp| na ściany w oknie
  let hitsCount = 0;
  const stats = { P: 0, hitsPerSec: 0, vmean: 0, Tmeas: 0, vmax: 1 };
  const area = 6 * (2 * H) * (2 * H);

  function collideWalls(i) {
    for (let a = 0; a < 3; a++) {
      const k = i * 3 + a;
      if (pos[k] < -H + RAD && vel[k] < 0) { pos[k] = -H + RAD; wallMomentum += 2 * Math.abs(vel[k]); vel[k] = -vel[k]; hitsCount++; }
      else if (pos[k] > H - RAD && vel[k] > 0) { pos[k] = H - RAD; wallMomentum += 2 * Math.abs(vel[k]); vel[k] = -vel[k]; hitsCount++; }
    }
  }

  // Zderzenia sprężyste cząstka-cząstka (równe masy): wymiana składowej wzdłuż normalnej
  function collidePairs(n) {
    const d2 = (2 * RAD) * (2 * RAD);
    for (let i = 0; i < n; i++) {
      const ix = i * 3;
      for (let j = i + 1; j < n; j++) {
        const jx = j * 3;
        const dx = pos[jx] - pos[ix], dy = pos[jx + 1] - pos[ix + 1], dz = pos[jx + 2] - pos[ix + 2];
        const dist2 = dx * dx + dy * dy + dz * dz;
        if (dist2 > d2 || dist2 < 1e-9) continue;
        const dist = Math.sqrt(dist2);
        const nx = dx / dist, ny = dy / dist, nz = dz / dist;
        // prędkość względna wzdłuż normalnej
        const dvx = vel[jx] - vel[ix], dvy = vel[jx + 1] - vel[ix + 1], dvz = vel[jx + 2] - vel[ix + 2];
        const vn = dvx * nx + dvy * ny + dvz * nz;
        if (vn > 0) continue;          // oddalają się — nie zderzają
        // równe masy: wymiana składowej normalnej
        vel[ix] += vn * nx; vel[ix + 1] += vn * ny; vel[ix + 2] += vn * nz;
        vel[jx] -= vn * nx; vel[jx + 1] -= vn * ny; vel[jx + 2] -= vn * nz;
        // rozsuń, żeby się nie zlepiały
        const overlap = (2 * RAD - dist) / 2;
        pos[ix] -= nx * overlap; pos[ix + 1] -= ny * overlap; pos[ix + 2] -= nz * overlap;
        pos[jx] += nx * overlap; pos[jx + 1] += ny * overlap; pos[jx + 2] += nz * overlap;
      }
    }
  }

  const anim = { playing: true, speed: 1 };
  let statTimer = 0, chartTimer = 0;

  scene3d.setFrame(() => {
    const n = S.N;
    let dt = (1 / 60) * anim.speed;
    if (anim.playing) {
      // podkroki dla stabilności przy dużych prędkościach
      const sub = 2, sdt = dt / sub;
      for (let s = 0; s < sub; s++) {
        for (let i = 0; i < n * 3; i++) pos[i] += vel[i] * sdt;
        for (let i = 0; i < n; i++) collideWalls(i);
        collidePairs(n);
      }
    }

    // aktualizacja instancji + kolor
    let sumSp = 0, sumSp2 = 0, vmax = 0;
    for (let i = 0; i < n; i++) {
      const ix = i * 3;
      dummy.position.set(pos[ix], pos[ix + 1], pos[ix + 2]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      const sp = Math.hypot(vel[ix], vel[ix + 1], vel[ix + 2]);
      sumSp += sp; sumSp2 += sp * sp; if (sp > vmax) vmax = sp;
    }
    stats.vmax = vmax || 1;
    for (let i = 0; i < n; i++) {
      const ix = i * 3;
      const sp = Math.hypot(vel[ix], vel[ix + 1], vel[ix + 2]);
      mesh.setColorAt(i, speedColor(sp, stats.vmax));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    stats.vmean = sumSp / n;
    stats.Tmeas = sumSp2 / n / 3;   // <v^2>/3  (m = k = 1)

    // ciśnienie w oknie ~0.4 s
    statTimer += dt;
    if (statTimer >= 0.4) {
      stats.P = wallMomentum / (statTimer * area);
      stats.hitsPerSec = hitsCount / statTimer;
      wallMomentum = 0; hitsCount = 0; statTimer = 0;
      refreshReadouts();
    }
    chartTimer += dt;
    if (chartTimer >= 0.25) { chartTimer = 0; refreshChart(); }
  });

  // ---- Odczyty ----
  const roT = readout('Temperatura ∝ ⟨v²⟩', '');
  const roP = readout('Ciśnienie (wzgl.)', '');
  const roV = readout('Średnia prędkość', '');
  const roHits = readout('Uderzenia w ściany/s', '');
  const roLaw = readout('PV / (N·T)', '');
  function refreshReadouts() {
    roT.set(stats.Tmeas.toFixed(2));
    roP.set(stats.P.toFixed(2));
    roV.set(stats.vmean.toFixed(2));
    roHits.set(Math.round(stats.hitsPerSec).toString());
    const V = (2 * H) ** 3;
    const law = stats.Tmeas > 0.001 ? (stats.P * V) / (S.N * stats.Tmeas) : 0;
    roLaw.set(law.toFixed(2));
  }

  // ---- Wykres: rozkład prędkości + krzywa Maxwella ----
  const chart = el('div', { class: 'chart' });
  function refreshChart() {
    const n = S.N, speeds = [];
    for (let i = 0; i < n; i++) speeds.push(Math.hypot(vel[i * 3], vel[i * 3 + 1], vel[i * 3 + 2]));
    const vmaxHist = Math.max(stats.vmax * 1.05, 0.5);
    const bins = 22, hist = new Array(bins).fill(0), bw = vmaxHist / bins;
    for (const sp of speeds) { const b = Math.min(bins - 1, Math.floor(sp / bw)); hist[b]++; }
    const xh = hist.map((_, i) => (i + 0.5) * bw);
    const yh = hist.map((c) => c / (n * bw));   // gęstość znormalizowana
    // teoretyczny Maxwell-Boltzmann dla zmierzonej T (m=k=1): f(v)=sqrt(2/pi) v^2 / T^{3/2} exp(-v^2/2T)
    const T = Math.max(stats.Tmeas, 1e-3);
    const xc = [], yc = [];
    for (let i = 0; i <= 100; i++) {
      const v = (i / 100) * vmaxHist;
      xc.push(v);
      yc.push(Math.sqrt(2 / Math.PI) * (v * v) / Math.pow(T, 1.5) * Math.exp(-(v * v) / (2 * T)));
    }
    plot(chart, [
      { x: xh, y: yh, type: 'bar', name: 'symulacja', marker: { color: 'rgba(77,163,255,.45)' } },
      { x: xc, y: yc, mode: 'lines', name: 'Maxwell-Boltzmann', line: { color: '#ff6b6b', width: 3 } },
    ], {
      title: { text: 'Rozkład prędkości cząsteczek', font: { size: 14, color: '#e8ecf6' } },
      xaxis: { title: 'prędkość v' }, yaxis: { title: 'gęstość' }, bargap: 0.05,
    });
  }

  // ---- Kontrolki ----
  const sT = slider({ label: 'Temperatura', unit: '', min: 0.2, max: 3, step: 0.05, value: S.T, format: (v) => v.toFixed(2), onInput: (v) => {
    const factor = Math.sqrt(v / S.T); S.T = v;
    for (let i = 0; i < vel.length; i++) vel[i] *= factor;   // przeskaluj prędkości
  } });
  const sN = slider({ label: 'Liczba cząsteczek N', unit: '', min: 10, max: 150, step: 1, value: S.N, onInput: (v) => {
    S.N = v; initParticles(v); buildMesh(v);
  } });
  const sSpeed = slider({ label: 'Tempo animacji', unit: '×', min: 0.2, max: 2, step: 0.1, value: 1, format: (v) => v.toFixed(1), onInput: (v) => { anim.speed = v; } });

  const btnPlay = el('button', { class: 'btn primary', onclick: () => { anim.playing = !anim.playing; btnPlay.textContent = anim.playing ? '⏸ Pauza' : '▶ Odtwórz'; } }, '⏸ Pauza');
  const btnReset = el('button', { class: 'btn', onclick: () => { initParticles(S.N, true); } }, '↺ Reset (jednakowe prędkości)');

  // ---- Składanie strony ----
  root.appendChild(el('p', { class: 'lead', text: 'Gaz to mnóstwo maleńkich cząsteczek w nieustannym, chaotycznym ruchu. Zderzają się sprężyście ze ścianami i między sobą. Uśrednienie tych zderzeń daje ciśnienie i temperaturę — to jest teoria kinetyczna gazów.' }));

  root.appendChild(section('🔬', 'Symulacja 3D — cząsteczki w pudełku',
    card(
      simWrap,
      el('div', { class: 'btn-row' }, btnPlay, btnReset),
      el('div', { class: 'controls cols-2', style: 'margin-top:16px' }, sT, sN, sSpeed),
      el('div', { class: 'readouts' }, roT, roP, roV, roHits, roLaw),
      el('p', { style: 'margin-top:12px;font-size:13px', html: '💡 Kliknij <strong>Reset</strong> — wszystkie cząsteczki startują z tą samą prędkością, a po chwili zderzenia „rozmywają" prędkości do <strong>rozkładu Maxwella-Boltzmanna</strong> (czerwona krzywa na wykresie). To prawdziwa termalizacja.' }),
    )
  ));

  root.appendChild(section('📈', 'Rozkład prędkości (na żywo)',
    card(chart)
  ));

  root.appendChild(section('📖', 'Teoria i wzory',
    el('div', { class: 'grid cols-2' },
      formula('Równanie stanu gazu doskonałego', 'pV = N k_B T'),
      formula('Średnia energia kinetyczna', '\\langle E_k \\rangle = \\tfrac{3}{2} k_B T'),
      formula('Ciśnienie (teoria kinetyczna)', 'p = \\tfrac{1}{3}\\, n\\, m\\, \\langle v^2 \\rangle'),
      formula('Prędkość średnia kwadratowa', 'v_{rms} = \\sqrt{\\langle v^2 \\rangle} = \\sqrt{\\dfrac{3 k_B T}{m}}'),
    ),
    formula('Rozkład prędkości Maxwella-Boltzmanna', 'f(v) = 4\\pi \\left(\\dfrac{m}{2\\pi k_B T}\\right)^{3/2} v^2 \\, e^{-\\frac{m v^2}{2 k_B T}}'),
    def('Skąd bierze się ciśnienie', 'Każde odbicie cząsteczki od ściany to przekazanie pędu $\\Delta p = 2 m v_\\perp$. Suma tych pchnięć na jednostkę powierzchni i czasu to właśnie ciśnienie. Więcej cząsteczek lub większa prędkość (temperatura) = więcej i mocniejszych uderzeń = wyższe ciśnienie.'),
    def('Temperatura', 'Temperatura to miara średniej energii kinetycznej cząsteczek. Podnosząc suwak temperatury, przyspieszasz cząsteczki (przeskalowanie prędkości) — rośnie ⟨v²⟩, ciśnienie i liczba uderzeń.'),
  ));
  root.appendChild(section('🧭', 'Pojęcia kluczowe',
    el('div', {},
      el('span', { class: 'pill', text: 'teoria kinetyczna' }),
      el('span', { class: 'pill', text: 'zderzenia sprężyste' }),
      el('span', { class: 'pill', text: 'rozkład Maxwella-Boltzmanna' }),
      el('span', { class: 'pill', text: 'prawo gazowe pV=NkT' }),
      el('span', { class: 'pill', text: 'ciśnienie z pędu' }),
    )
  ));

  refreshReadouts();
  refreshChart();
}
