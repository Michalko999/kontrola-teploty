# Návod: ako to nastaviť u teba doma

Tento návod je konkrétne na tvoju situáciu: **Immergas Victrix Tera 28 1**, byt so štyrmi
izbami a chodbou, termostatické hlavice na radiátoroch, **bez vonkajšieho čidla**.

---

## 1. Prečo to celé robíme

Kotol má jednu hodnotu, ktorá rozhoduje o komforte aj o účte za plyn:
**teplotu vykurovacej vody** (prívod do radiátorov).

- Nastavená **privysoko** → radiátory sálajú prudko, izba rýchlo prekúri, termostat
  vypne, kotol sa vypne, všetko vychladne, kotol znova naskočí. Kolísanie teploty,
  taktovanie a kotol prestane kondenzovať (stráca 10–15 % účinnosti).
- Nastavená **akurát** → radiátory sú vlažné a hrejú takmer nepretržite. Teplota v izbe
  stojí ako zapichnutá, kotol modeluje výkon a kondenzuje.

Správna hodnota **nie je jedno číslo** — mení sa s počasím. Keď je vonku +8 °C, stačí
okolo 35 °C. Keď je −10 °C, treba okolo 55 °C. Tomuto vzťahu sa hovorí **ekvitermická
krivka** a normálne ju počíta kotol z vonkajšieho čidla.

**Ty čidlo nemáš** — takže ho nahrádza aplikácia: vezme vonkajšiu teplotu z predpovede
pre tvoju obec a povie ti číslo, ktoré máš navoliť na kotli.

---

## 2. Prvé spustenie (10 minút)

1. **Nastavenia → Poloha**: nájdi svoju obec. Bez toho appka nevie, aká je vonku teplota.
2. **Nastavenia → Budova**: typ stavby a výpočtová vonkajšia teplota
   (na Slovensku zvyčajne −11 °C, vo vyšších polohách −13 až −15 °C).
3. **Izby**: skontroluj požadované teploty. Predvyplnené je
   kuchyňa 21 °C, spálňa 19 °C, detská 21,5 °C, obývačka 22 °C.
4. **Kotol**: zapíš, akú teplotu vykurovacej vody máš na kotli teraz.
5. **Prehľad**: appka ukáže odporúčanú hodnotu. Nastav ju na kotli a ťukni
   „Nastavil som …“.

---

## 3. Termostat v chodbe — dôležité

Podľa nákresu ide termostat na stenu chodby pri obývačke. **Chodba nemá vlastný
radiátor.** To má dva dôsledky:

1. **V chodbe je chladnejšie ako v obývačke** — zvyčajne o 0,5 až 2 K. Ak na
   termostate navolíš 22 °C, v obývačke bude 23 °C a viac. Preto má appka
   políčko „Rozdiel chodba − izba“: zmeraj ho raz poriadne
   (Izby → *Zmerať rozdiel presne*) a appka ti povie, koľko naozaj navoliť.
2. **Chodba sa vykuruje len otvorenými dverami.** Keď zatvoríš dvere do izieb,
   termostat začne merať vlastný mikrosvet a kúrenie sa rozhodí. Ak dvere bežne
   zatvárate, treba rozdiel premerať v tomto stave.

Alternatíva, ak to pôjde: dať termostat priamo do obývačky, na vnútornú stenu,
do výšky ~1,5 m, mimo priameho slnka, mimo radiátora a mimo prievanu od
balkónových dverí. Riadenie bude o dosť priamejšie.

---

## 4. Termostatické hlavice

Zlaté pravidlo: **v izbe, kde „velí“ termostat, nech je hlavica naplno otvorená.**
Inak si hlavica a termostat navzájom prekážajú — hlavica priškrtí radiátor,
termostat to vyhodnotí ako málo tepla a nechá kotol bežať dlhšie.

| Izba | Odporúčanie |
|---|---|
| D — obývačka (referenčná) | hlavica naplno otvorená |
| C — detská 21,5 °C | približne poloha 3,5 |
| A — kuchyňa 21 °C | približne poloha 3,2 (kuchyňa má zisky od varenia) |
| B — spálňa 19 °C | približne poloha 2,7 |

Čísla na hlaviciach sú orientačné a líšia sa podľa výrobcu (zvyčajne 1 ≈ 12 °C,
3 ≈ 20 °C, 5 ≈ 28 °C). Appka ich prepočíta v záložke Izby.

**Nezatváraj naraz všetky hlavice.** Kotol má minimálny výkon 4,3 kW a musí
teplo niekam dať. Ak sú všetky radiátory zavreté, začne taktovať.

---

## 5. Čo nastaviť na samotnom kotli

> Presné názvy a čísla parametrov v servisnom menu sa líšia podľa verzie kotla
> a firmvéru. Nižšie je uvedené, **čo** nastaviť a **prečo** — číslo parametra si
> over v návode ku kotlu, prípadne to nechaj na servisného technika.
> Do kotla sa z aplikácie nič neposiela.

| Čo | Hodnota | Prečo |
|---|---|---|
| Teplota vykurovacej vody | podľa aplikácie | jediné, čo meníš s počasím |
| Teplota TÚV | 45–50 °C | vyššie len zanáša výmenník vodným kameňom |
| Max. výkon kúrenia | znížiť, ak kotol taktuje | byt má ~5 kW stratu, kotol vie 24 kW |
| Oneskorenie zápalu (anti-cycle) | 5–10 min | menej štartov horáka |
| Čerpadlo | s dobehom / premenlivé otáčky | rozvedie zvyškové teplo |

---

## 6. Ako doladiť krivku (týždeň–dva)

Meň **vždy len jednu vec** a počkaj aspoň pol dňa. Byt reaguje pomaly.

| Čo pozoruješ | Čo urobiť |
|---|---|
| Zima rovnako v mraze aj na jeseň | Krivka → **Posun** hore o +1 až +2 K |
| Prekúrené rovnako vždy | Krivka → **Posun** dole |
| Zima **len** keď je vonku mráz | Krivka → **Strmosť** hore |
| V mraze fajn, ale na jeseň prekúrené | Krivka → **Strmosť** dole |
| Ráno zima, cez deň prekúrené | zmenši nočný útlm |

Namiesto ručného ladenia stačí na Prehľade klikať, ako je v byte. Po niekoľkých
záznamoch v rôznom počasí ti appka v záložke Krivka sama navrhne úpravu aj s
vysvetlením, prečo ju navrhuje.

---

## 7. Keď kotol taktuje (často štartuje a hneď zhasne)

Typické pri miernom počasí, lebo byt potrebuje ~2 kW a kotol nevie ísť pod 4,3 kW.

1. Zníž teplotu vykurovacej vody (nižšia krivka = pomalší odber = dlhší beh).
2. Zníž maximálny výkon kúrenia v servisnom menu.
3. Predĺž anti-cycle na 5–10 minút.
4. Otvor hlavice vo viacerých izbách naraz.

---

## 8. Bezpečnosť a hranice

- Aplikácia **nič nenastavuje sama** — je to radca, nastavenie robíš ručne.
- Do servisného menu kotla zasahuj len ak vieš, čo robíš. Pri pochybnostiach
  zavolaj servisného technika; nesprávne nastavenie spaľovania je nebezpečné.
- Aplikácia nenahrádza revíziu kotla ani kontrolu komína.
