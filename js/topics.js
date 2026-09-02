// =========================================================
//  topics.js — rejestr działów i tematów
//  Aby dodać temat: dopisz wpis + utwórz plik w js/topics/
// =========================================================
export const CATEGORIES = [
  {
    id: 'kinematyka',
    title: 'Kinematyka',
    icon: '🎯',
    desc: 'Opis ruchu: położenie, prędkość, przyspieszenie — bez pytania o przyczyny.',
    topics: [
      { id: 'rzut-ukosny', title: 'Rzut ukośny', icon: '🏹', load: () => import('./topics/rzut-ukosny.js') },
    ],
  },
  {
    id: 'dynamika',
    title: 'Dynamika',
    icon: '⚙️',
    desc: 'Przyczyny ruchu: siły, masa, zasady dynamiki Newtona.',
    topics: [
      { id: 'rownia-pochyla', title: 'Równia pochyła', icon: '📐', load: () => import('./topics/rownia-pochyla.js') },
    ],
  },
  {
    id: 'termodynamika',
    title: 'Gazy i termodynamika',
    icon: '🌡️',
    desc: 'Teoria kinetyczna, ciśnienie, temperatura, prawo gazowe.',
    topics: [
      { id: 'model-gazu', title: 'Model gazu 3D (teoria kinetyczna)', icon: '💨', load: () => import('./topics/model-gazu.js') },
    ],
  },
  {
    id: 'drgania',
    title: 'Drgania i fale',
    icon: '🌊',
    desc: 'Ruch drgający, wahadła, rezonans, fale.',
    topics: [
      { id: 'wahadlo', title: 'Wahadło matematyczne', icon: '🕰️', soon: true },
    ],
  },
  {
    id: 'pole-grawitacyjne',
    title: 'Grawitacja',
    icon: '🪐',
    desc: 'Pole grawitacyjne, ruch orbitalny, prawa Keplera.',
    topics: [
      { id: 'orbity', title: 'Ruch orbitalny', icon: '🛰️', soon: true },
    ],
  },
];

// Płaska mapa id -> temat (z odniesieniem do kategorii)
export const TOPICS = {};
for (const cat of CATEGORIES) {
  for (const t of cat.topics) {
    TOPICS[t.id] = { ...t, catId: cat.id, catTitle: cat.title, catIcon: cat.icon };
  }
}
