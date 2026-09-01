# ⚛ Baza Wiedzy — Fizyka

Interaktywna baza wiedzy z fizyki: teoria, wzory, obliczenia na żywo, wykresy i realistyczne symulacje 3D. Wszystko działa w przeglądarce — bez serwera, bez instalacji.

## 🔗 Strona na żywo

Po włączeniu GitHub Pages strona będzie pod adresem:
`https://valerkaworkspace.github.io/fizyka/`

## ✨ Co jest w środku

- **Menu działów** (Kinematyka, Dynamika, Drgania, Grawitacja…)
- Każdy temat = **teoria + wzory** (KaTeX) · **symulacja 3D** (Three.js) · **wykresy na żywo** (Plotly) · **kalkulator z suwakami**
- Ciemny, responsywny motyw — działa świetnie na telefonie

### Gotowe tematy
- 🎯 Kinematyka → **Rzut ukośny** (pełna symulacja 3D + wykresy)
- ⚙️ Dynamika → **Równia pochyła** (siły, tarcie, przyspieszenie)

### W przygotowaniu
- 🌊 Drgania → Wahadło matematyczne
- 🪐 Grawitacja → Ruch orbitalny

## 🛠 Technologie

Czysty HTML/CSS/JavaScript (moduły ES), biblioteki z CDN:
- [Three.js](https://threejs.org/) — grafika i symulacje 3D
- [Plotly.js](https://plotly.com/javascript/) — wykresy naukowe
- [KaTeX](https://katex.org/) — wzory matematyczne

## 🚀 Uruchomienie lokalne

```bash
# dowolny statyczny serwer, np.:
python3 -m http.server 8000
# potem otwórz http://localhost:8000
```

## ➕ Jak dodać nowy temat

1. Utwórz plik `js/topics/nazwa.js` z funkcją `export function render(root) { … }`
2. Dodaj wpis w `js/topics.js` (w odpowiedniej kategorii) z `load: () => import('./topics/nazwa.js')`
3. Gotowe — pojawi się w menu i routingu (`#/nazwa`)

Pomocniki do budowy tematu znajdziesz w `js/lib.js` (`section`, `card`, `formula`, `slider`, `readout`, `plot`, `makeScene`).

## 📁 Struktura

```
index.html          # wejście, importmap Three.js, biblioteki CDN
css/style.css       # motyw
js/
  app.js            # router + nawigacja
  lib.js            # narzędzia (UI, wzory, sceny 3D, wykresy)
  topics.js         # rejestr działów i tematów
  topics/           # pojedyncze tematy
.github/workflows/  # automatyczny deploy na GitHub Pages
```
