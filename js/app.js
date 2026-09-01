// =========================================================
//  app.js — router, nawigacja, ładowanie tematów
// =========================================================
import { CATEGORIES, TOPICS } from './topics.js';
import { el, renderMath, disposeScenes } from './lib.js';

const content = document.getElementById('content');
const sidebar = document.getElementById('sidebar');
const backdrop = document.getElementById('backdrop');
const menuToggle = document.getElementById('menuToggle');
const searchInput = document.getElementById('search');

/* ---------- Nawigacja boczna ---------- */
function buildSidebar() {
  sidebar.innerHTML = '';
  for (const cat of CATEGORIES) {
    const items = cat.topics.map((t) => {
      const item = el('a', {
        class: 'nav-item' + (t.soon ? ' soon' : ''),
        href: t.soon ? 'javascript:void 0' : `#/${t.id}`,
        'data-id': t.id,
      },
        el('span', { class: 'dot' }),
        el('span', { text: t.title }),
        t.soon ? el('span', { class: 'tag', text: 'wkrótce' }) : null
      );
      return item;
    });
    sidebar.appendChild(
      el('div', { class: 'cat' },
        el('div', { class: 'cat-head' }, el('span', { class: 'cat-ico', text: cat.icon }), document.createTextNode(cat.title)),
        ...items
      )
    );
  }
}

function setActive(id) {
  sidebar.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.id === id));
}

/* ---------- Menu mobilne ---------- */
function toggleMenu(open) {
  const isOpen = open ?? !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', isOpen);
  backdrop.hidden = !isOpen;
  menuToggle.setAttribute('aria-expanded', String(isOpen));
}
menuToggle.addEventListener('click', () => toggleMenu());
backdrop.addEventListener('click', () => toggleMenu(false));

/* ---------- Strona startowa ---------- */
function renderHome() {
  const tiles = CATEGORIES.map((cat) => {
    const ready = cat.topics.filter((t) => !t.soon).length;
    const first = cat.topics.find((t) => !t.soon);
    return el('a', { class: 'tile', href: first ? `#/${first.id}` : 'javascript:void 0' },
      el('div', { class: 't-ico', text: cat.icon }),
      el('h3', { text: cat.title }),
      el('p', { text: cat.desc }),
      el('div', { class: 'count', text: ready ? `${ready} temat(y) gotowe · ${cat.topics.length} zaplanowane` : `${cat.topics.length} w przygotowaniu` })
    );
  });

  content.innerHTML = '';
  content.appendChild(
    el('div', {},
      el('div', { class: 'hero' },
        el('h1', {}, document.createTextNode('Interaktywna '), el('span', { class: 'grad', text: 'baza wiedzy z fizyki' })),
        el('p', { class: 'lead', text: 'Teoria, wzory, obliczenia na żywo, wykresy i realistyczne symulacje 3D. Wybierz dział, ruszaj suwakami i obserwuj fizykę w akcji.' })
      ),
      el('div', { class: 'tiles' }, ...tiles)
    )
  );
}

/* ---------- Ładowanie tematu ---------- */
async function renderTopic(id) {
  const meta = TOPICS[id];
  if (!meta || meta.soon || !meta.load) { renderNotFound(id); return; }

  content.innerHTML = '';
  content.appendChild(el('div', { class: 'empty', text: 'Ładowanie…' }));

  try {
    const mod = await meta.load();
    content.innerHTML = '';
    const head = el('div', { class: 'page-head' },
      el('div', { class: 'crumbs' }, el('span', { text: meta.catIcon + ' ' + meta.catTitle }), document.createTextNode('  ›  ' + meta.title)),
      el('h1', { class: 'page-title', text: meta.title })
    );
    content.appendChild(head);
    const body = el('div', {});
    content.appendChild(body);
    // Każdy temat eksportuje: render(container) -> element/void
    await mod.render(body, { el });
    renderMath(content);
  } catch (err) {
    console.error(err);
    content.innerHTML = '';
    content.appendChild(el('div', { class: 'empty', html: `Nie udało się załadować tematu.<br><small>${err.message}</small>` }));
  }
}

function renderNotFound(id) {
  content.innerHTML = '';
  content.appendChild(el('div', { class: 'empty', html: `Temat „<strong>${id}</strong>" jeszcze nie istnieje albo jest w przygotowaniu.<br><a href="#/">← wróć do strony głównej</a>` }));
}

/* ---------- Router (hash) ---------- */
function route() {
  disposeScenes(); // sprzątanie scen 3D poprzedniego tematu
  const hash = location.hash.replace(/^#\/?/, '');
  content.scrollTo?.(0, 0);
  window.scrollTo(0, 0);
  toggleMenu(false);

  if (!hash) { setActive(null); renderHome(); return; }
  setActive(hash);
  renderTopic(hash);
}

window.addEventListener('hashchange', route);

/* ---------- Wyszukiwarka ---------- */
searchInput?.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  sidebar.querySelectorAll('.nav-item').forEach((n) => {
    const match = n.textContent.toLowerCase().includes(q);
    n.style.display = match ? '' : 'none';
  });
});

/* ---------- Start ---------- */
buildSidebar();
route();
