# Dziennik projektu — Baza Wiedzy Fizyka

> Ten plik to „pamięć" projektu między sesjami. Przeczytaj go na początku każdej
> nowej sesji, żeby wiedzieć, na czym stanęliśmy. Aktualizuj go przy większych zmianach.

## Cel projektu
Interaktywna baza wiedzy z fizyki dla użytkowniczki (nauka/notatki). Ma zawierać:
działy tematyczne (kinematyka, dynamika, …), teorię z zależnościami i wzorami,
obliczenia na żywo, oraz **realistyczne, dokładne symulacje/wizualizacje 3D**.
Hostowana za darmo na **GitHub Pages** (strona statyczna, cała fizyka liczona w JS).

## Architektura
- Czysty HTML/CSS/JS, moduły ES, biblioteki z CDN (bez kroku budowania).
- `index.html` — importmap dla Three.js + CDN KaTeX/Plotly.
- `js/app.js` — router (hash `#/temat`), nawigacja boczna, ładowanie tematów.
- `js/lib.js` — współdzielone narzędzia: `el`, `section`, `card`, `formula`,
  `slider`, `readout`, `plot` (Plotly ciemny motyw), `makeScene` (gotowa scena
  Three.js z kamerą OrbitControls, światłem, cieniami, podłożem, siatką).
  Sceny rejestrują się przez `registerScene` i są sprzątane przy zmianie tematu (`disposeScenes`).
- `js/topics.js` — rejestr działów/tematów. **Tu dodajemy nowe tematy.**
- `js/topics/*.js` — pojedyncze tematy, każdy eksportuje `render(root)`.

## Wzorzec tematu
Każdy temat: `<p class="lead">` opis → sekcja Symulacja 3D (karta z canvas +
suwaki + odczyty) → sekcja Wykresy (Plotly) → sekcja Teoria i wzory (KaTeX) →
Pojęcia kluczowe. Fizyka liczona w czystych funkcjach, `recompute()` odświeża
scenę/odczyty/wykresy przy zmianie suwaka.

## Status
- [x] Fundament: layout, motyw, router, nawigacja, wyszukiwarka, strona główna
- [x] Kinematyka → Rzut ukośny (3D + wykresy tor/prędkość + presety g Ziemia/Księżyc/Mars)
- [x] Dynamika → Równia pochyła (siły 3D, tarcie, a(β), wykres sił)
- [x] Auto-deploy GitHub Pages (`.github/workflows/deploy.yml`)
- [ ] Drgania → Wahadło matematyczne (placeholder „wkrótce")
- [ ] Grawitacja → Ruch orbitalny (placeholder „wkrótce")

## Do zrobienia / pomysły na później
- Dokończyć wahadło i orbity (Keplera).
- Kolejne tematy: rzut pionowy/poziomy, ruch jednostajny po okręgu, pęd i zderzenia,
  energia (praca, moc), pole elektryczne, obwody.
- Ewentualnie tryb jasny/ciemny, eksport wykresów, quizy sprawdzające.

## Uwagi techniczne
- GitHub Pages musi być włączony w ustawieniach repo (Source: GitHub Actions),
  żeby workflow deploy zadziałał. Adres: https://valerkaworkspace.github.io/fizyka/
- Gałąź robocza: `claude/android-localhost-dev-wxgvbo`.
- Testowanie lokalne: `python3 -m http.server 8000`.
