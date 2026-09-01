// =========================================================
//  Dynamika → Równia pochyła
// =========================================================
import { makeScene, registerScene, el, section, card, formula, def, slider, readout, plot } from '../lib.js';

export function render(root) {
  const S = { beta: 30, m: 2, mu: 0.15, g: 9.81 };

  function physics({ beta, m, mu, g }) {
    const b = (beta * Math.PI) / 180;
    const N = m * g * Math.cos(b);
    const Fg = m * g * Math.sin(b);          // składowa styczna grawitacji
    const Ffmax = mu * N;                     // maks. tarcie
    const slides = Fg > Ffmax + 1e-9;
    const a = slides ? g * (Math.sin(b) - mu * Math.cos(b)) : 0;
    const Ff = slides ? Ffmax : Fg;           // gdy stoi, tarcie równoważy grawitację
    return { b, N, Fg, Ff, Ffmax, a, slides };
  }

  let P = physics(S);

  // ---- Scena 3D ----
  const canvas = el('canvas', { class: 'sim-canvas' });
  const simWrap = el('div', { class: 'sim-wrap' }, canvas, el('div', { class: 'sim-hint', text: '🖱️ obróć · 🤏 przybliż' }));
  const scene3d = registerScene(makeScene(canvas, { ground: 16, camera: [10, 8, 18] }));
  const { THREE, scene, controls } = scene3d;
  controls.target.set(2, 3, 0);

  const L = 13;            // długość równi (świat)
  const ramp = new THREE.Group();
  scene.add(ramp);

  // Klin równi
  const rampMesh = new THREE.Mesh(
    new THREE.BoxGeometry(L, 0.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x223052, roughness: 0.8, metalness: 0.1 })
  );
  rampMesh.position.set(L / 2, -0.25, 0);
  rampMesh.castShadow = true; rampMesh.receiveShadow = true;
  ramp.add(rampMesh);

  // Blok
  const block = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.4, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x4da3ff, emissive: 0x0a2f5a, roughness: 0.35, metalness: 0.2 })
  );
  block.castShadow = true;
  ramp.add(block);

  // Wektory sił (w świecie, nie w grupie równi)
  function mkArrow(color) {
    const a = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(), 2, color, 0.7, 0.45);
    scene.add(a); return a;
  }
  const arrG = mkArrow(0xff6b6b);   // grawitacja
  const arrN = mkArrow(0x2fe6c0);   // normalna
  const arrF = mkArrow(0xffcc66);   // tarcie

  function orient() {
    P = physics(S);
    ramp.rotation.z = P.b;
  }

  // ---- Animacja bloku ----
  const anim = { s: L, v: 0, speed: 1 };  // s: odległość od dołu równi (local x)
  scene3d.setFrame(() => {
    const dt = (1 / 60) * anim.speed;
    if (P.slides) {
      // fizyczne przyspieszenie skalowane do sceny (równia ma stałą długość świata)
      anim.v += P.a * dt * 0.35;
      anim.s -= anim.v * dt;
      if (anim.s <= 0.9) { anim.s = L; anim.v = 0; }   // reset u dołu
    } else {
      anim.s = Math.min(anim.s, L); anim.v = 0;
    }
    // pozycja bloku w układzie równi
    block.position.set(anim.s, 0.95, 0);

    // pozycja bloku w świecie do wektorów sił
    const wx = anim.s * Math.cos(P.b);
    const wy = anim.s * Math.sin(P.b) + 0.95 * Math.cos(P.b);
    const origin = new THREE.Vector3(wx - 0.95 * Math.sin(P.b), wy, 0);
    const sc = 0.12; // skala długości strzałek
    // grawitacja (w dół)
    arrG.position.copy(origin); arrG.setDirection(new THREE.Vector3(0, -1, 0)); arrG.setLength(P.m * S.g * sc, 0.6, 0.4);
    // normalna (prostopadła do równi)
    const nrm = new THREE.Vector3(-Math.sin(P.b), Math.cos(P.b), 0);
    arrN.position.copy(origin); arrN.setDirection(nrm); arrN.setLength(P.N * sc, 0.6, 0.4);
    // tarcie (w górę równi, gdy się zsuwa)
    const up = new THREE.Vector3(Math.cos(P.b), Math.sin(P.b), 0);
    arrF.position.copy(origin); arrF.setDirection(up); arrF.setLength(Math.max(P.Ff * sc, 0.001), 0.6, 0.4);
    arrF.visible = P.Ff > 0.05;
  });

  // ---- Odczyty ----
  const roA = readout('Przyspieszenie a', 'm/s²');
  const roN = readout('Siła nacisku N', 'N');
  const roFg = readout('Grawitacja (stycz.)', 'N');
  const roFf = readout('Siła tarcia', 'N');
  const roState = readout('Stan', '');

  // ---- Wykresy ----
  const chartA = el('div', { class: 'chart' });
  const chartBars = el('div', { class: 'chart' });

  function refreshCharts() {
    const bs = [], as = [];
    for (let deg = 0; deg <= 90; deg++) {
      const p = physics({ ...S, beta: deg });
      bs.push(deg); as.push(p.a);
    }
    plot(chartA, [
      { x: bs, y: as, mode: 'lines', line: { color: '#4da3ff', width: 3 }, name: 'a(β)' },
      { x: [S.beta], y: [P.a], mode: 'markers', marker: { color: '#ffcc66', size: 12 }, name: 'teraz', showlegend: false },
    ], {
      title: { text: `Przyspieszenie a w funkcji kąta β  (μ = ${S.mu})`, font: { size: 14, color: '#e8ecf6' } },
      xaxis: { title: 'β [°]' }, yaxis: { title: 'a [m/s²]' },
    });
    plot(chartBars, [{
      type: 'bar', orientation: 'h',
      y: ['Grawitacja Fₓ', 'Maks. tarcie', 'Nacisk N', 'Wypadkowa'],
      x: [P.Fg, P.Ffmax, P.N, P.m * P.a],
      marker: { color: ['#ff6b6b', '#ffcc66', '#2fe6c0', '#7c5cff'] },
    }], {
      title: { text: 'Siły działające na blok [N]', font: { size: 14, color: '#e8ecf6' } },
      xaxis: { title: 'wartość [N]' }, margin: { l: 110, r: 20, t: 30, b: 45 },
    });
  }

  function recompute() {
    orient();
    roA.set(P.a.toFixed(2));
    roN.set(P.N.toFixed(1));
    roFg.set(P.Fg.toFixed(1));
    roFf.set(P.Ff.toFixed(1));
    roState.set(P.slides ? '🟢 zsuwa się' : '🔴 spoczynek');
    refreshCharts();
  }

  // ---- Kontrolki ----
  const sBeta = slider({ label: 'Kąt nachylenia β', unit: '°', min: 0, max: 80, step: 1, value: S.beta, onInput: (v) => { S.beta = v; anim.s = L; anim.v = 0; recompute(); } });
  const sM = slider({ label: 'Masa m', unit: 'kg', min: 0.5, max: 10, step: 0.1, value: S.m, format: (v) => v.toFixed(1), onInput: (v) => { S.m = v; recompute(); } });
  const sMu = slider({ label: 'Współczynnik tarcia μ', unit: '', min: 0, max: 1, step: 0.01, value: S.mu, format: (v) => v.toFixed(2), onInput: (v) => { S.mu = v; anim.s = L; anim.v = 0; recompute(); } });
  const sSpeed = slider({ label: 'Tempo animacji', unit: '×', min: 0.2, max: 3, step: 0.1, value: 1, format: (v) => v.toFixed(1), onInput: (v) => { anim.speed = v; } });

  root.appendChild(el('p', { class: 'lead', text: 'Blok na równi pochyłej pod wpływem grawitacji, siły nacisku (normalnej) i tarcia. Zobacz, kiedy ciało rusza z miejsca i jak kąt oraz tarcie wpływają na przyspieszenie.' }));

  root.appendChild(section('🔬', 'Symulacja 3D — siły i ruch',
    card(
      simWrap,
      el('div', { class: 'controls cols-2', style: 'margin-top:16px' }, sBeta, sM, sMu, sSpeed),
      el('div', { class: 'readouts' }, roState, roA, roN, roFg, roFf),
      el('p', { style: 'margin-top:12px;font-size:13px', html: '<span style="color:#ff6b6b">■</span> grawitacja &nbsp; <span style="color:#2fe6c0">■</span> siła nacisku (normalna) &nbsp; <span style="color:#ffcc66">■</span> tarcie' }),
    )
  ));

  root.appendChild(section('📈', 'Wykresy',
    el('div', { class: 'grid cols-2' }, card(chartA), card(chartBars))
  ));

  root.appendChild(section('📖', 'Teoria i wzory',
    el('p', { text: 'Rozkładamy siłę ciężkości na składową styczną (wzdłuż równi) i normalną (prostopadłą do równi).' }),
    el('div', { class: 'grid cols-2' },
      formula('Składowa styczna (zsuwa)', 'F_{\\parallel} = m g \\sin\\beta'),
      formula('Siła nacisku (normalna)', 'N = m g \\cos\\beta'),
      formula('Maksymalna siła tarcia', 'T_{max} = \\mu N = \\mu m g \\cos\\beta'),
      formula('Przyspieszenie (gdy się zsuwa)', 'a = g(\\sin\\beta - \\mu \\cos\\beta)'),
    ),
    def('Warunek ruchu', 'Blok zaczyna się zsuwać, gdy składowa styczna pokona tarcie: <br>$$m g \\sin\\beta > \\mu m g \\cos\\beta \\;\\Rightarrow\\; \\tan\\beta > \\mu$$'),
    def('Ciekawostka', 'Przyspieszenie <strong>nie zależy od masy</strong> — masa skraca się w równaniu. Cięższy i lżejszy blok zjadą z tym samym przyspieszeniem (przy tym samym μ i β).'),
  ));
  root.appendChild(section('🧭', 'Pojęcia kluczowe',
    el('div', {},
      el('span', { class: 'pill', text: 'II zasada dynamiki' }),
      el('span', { class: 'pill', text: 'rozkład sił' }),
      el('span', { class: 'pill', text: 'siła tarcia' }),
      el('span', { class: 'pill', text: 'siła normalna' }),
    )
  ));

  recompute();
}
