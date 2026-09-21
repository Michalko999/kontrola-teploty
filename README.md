# Ekvitermika

Mobilná aplikácia (PWA), ktorá povie, **akú teplotu vykurovacej vody nastaviť na kotli**
podľa aktuálneho počasia — aj keď kotol nemá vonkajšie čidlo.

Postavené na mieru pre: **Immergas Victrix Tera 28 1**, byt so štyrmi izbami
(A kuchyňa, B spálňa, C detská, D obývačka) a chodbou, termostatické hlavice
na radiátoroch, termostat na stene obývačky.

---

## Čo to rieši

Kotol bez vonkajšieho čidla kúri stále na rovnakú teplotu vody. V mraze je jej málo,
pri miernom počasí priveľa — kotol taktuje, prestáva kondenzovať a teplota v byte
kolíše. Aplikácia **nahradí chýbajúce čidlo predpoveďou počasia** pre tvoju obec,
spočíta ekvitermickú krivku a povie konkrétne číslo, ktoré máš navoliť.

## Čo appka vie

| | |
|---|---|
| **Prehľad** | veľké číslo „nastav na kotli X °C“, stav kondenzácie, riziko taktovania, plán na 3 dni |
| **Krivka** | graf, dve jednoduché páky (posun a strmosť), detailné parametre, tabuľka na vytlačenie |
| **Izby** | interaktívny pôdorys podľa nákresu, polohy termostatických hlavíc, kalibrácia termostatu |
| **Kotol** | údaje zo štítka, kontrolný zoznam nastavení, cesty k automatizácii |
| **Senzory** | príprava na WiFi teplomery (Shelly, Home Assistant, ľubovoľné HTTP/JSON) |
| **Denník** | história nastavení a hodnotení, podklad pre učenie krivky |

### Učenie krivky
Na Prehľade klikneš, ako je v byte („zima / akurát / horúco“). Po niekoľkých záznamoch
v rôznom počasí appka rozlíši, či treba **posunúť celú krivku** (chyba je rovnaká vždy)
alebo **zmeniť jej strmosť** (zima je len v mraze) — a navrhne úpravu aj s vysvetlením.
Zmenu vždy potvrdzuješ ty.

### Termostat v obývačke
Termostat je priamo v referenčnej izbe, takže žiadny prepočet netreba — čo chceš
v obývačke, to nastavíš na termostate. Kalibrácia slúži len na prípad, že by
termostat ukazoval inak než skutočnosť. Dôležité je nechať hlavicu na radiátore
v obývačke naplno otvorenú, aby si termostat a hlavica neprekážali.

## Čo appka nerobí

- **Nenastavuje kotol sama.** Victrix Tera 28 1 nemá sieťové pripojenie —
  teplotu prestavuješ ručne na jeho paneli podľa odporúčania.
- Nehovorí čísla parametrov servisného menu. Hovorí, **čo** nastaviť a **prečo**;
  konkrétne číslo si over v návode ku kotlu.

---

## Inštalácia

Rýchlo:

```bash
npm start          # http://localhost:8080
```

Na telefón cez GitHub Pages alebo z domácej siete — podrobne v
**[docs/instalacia.md](docs/instalacia.md)**.

## Dokumentácia

- **[Návod na nastavenie](docs/navod-nastavenie-kotla.md)** — krok za krokom, hlavice, termostat, ladenie
- **[Teória](docs/ekvitermika-teoria.md)** — vzorce, tlmenie, kondenzácia, ako funguje učenie
- **[WiFi senzory](docs/wifi-senzory.md)** — čo kúpiť, ako zapojiť, obmedzenia prehliadača
- **[Inštalácia](docs/instalacia.md)** — PWA na plochu, hosting, zálohy
- **[Poznámky: Home Assistant](docs/poznamky-home-assistant.md)** — odložený plán: čo kúpiť, prečo, a čo sa tým v appke doplní

## Technicky

Čistý JavaScript (ES moduly), **bez akýchkoľvek závislostí** — žiadny build,
žiadny framework. Grafy sú vlastné SVG, dáta v localStorage, offline cez service worker.
Vonkajšia teplota z [Open-Meteo](https://open-meteo.com) (bez API kľúča a bez registrácie).

```
js/equitherm.js   výpočet krivky (vzorce)
js/engine.js      stav + počasie → odporúčanie
js/tuning.js      učenie z denníka (lineárna regresia chyby)
js/weather.js     Open-Meteo
js/sensors.js     adaptéry na WiFi teplomery
js/boiler.js      profil kotla a odporúčania
js/views/         obrazovky
tests/            testy výpočtu (node --test)
```

```bash
npm test
```

## Súkromie

Všetko je v telefóne. Von ide jediná vec — dopyt na predpoveď pre tvoju obec.
Žiadny účet, žiadny cloud, žiadne sledovanie.

## Upozornenie

Aplikácia je pomôcka, nie náhrada odborného servisu. Do servisného menu kotla
zasahuj len ak vieš, čo robíš.
