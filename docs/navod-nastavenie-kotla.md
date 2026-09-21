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

Správna hodnota **nie je jedno číslo** — mení sa s počasím. Pri nastavení, ktoré máš
v appke, to vychádza takto: keď je vonku +8 °C, stačí okolo 43 °C, a keď je −10 °C,
treba okolo 64 °C. Tomuto vzťahu sa hovorí **ekvitermická krivka** a normálne ju
počíta kotol z vonkajšieho čidla.

**Ty čidlo nemáš** — takže ho nahrádza aplikácia: vezme vonkajšiu teplotu z predpovede
pre tvoju obec a povie ti číslo, ktoré máš navoliť na kotli.

Kotol sa dá nastaviť len po **celých stupňoch**, takže appka ti vždy povie celé
číslo. Vnútri si ale počíta s desatinami a pamätá si ich — keď doladí krivku
o pol stupňa, prejaví sa to na kotli až vtedy, keď sa to nazbiera na celý stupeň.

---

## 2. Prvé spustenie (10 minút)

1. **Nastavenia → Poloha**: predvyplnená je Dolná Krupá. Meniť netreba.
2. **Nastavenia → Budova**: predvyplnené je 75 m², nezateplená stavba z r. 1985
   a výpočtová vonkajšia teplota −11 °C (Dolná Krupá leží v nížine, 192 m n. m.).
3. **Izby**: skontroluj požadované teploty. Predvyplnené je
   kuchyňa 21 °C, spálňa 20 °C, detská 21,5 °C, obývačka 22 °C.
4. **Kotol**: zapíš, akú teplotu vykurovacej vody máš na kotli teraz.
5. **Prehľad**: appka ukáže odporúčanú hodnotu. Nastav ju na kotli a ťukni
   „Nastavil som …“.

---

## 3. Termostat v obývačke — dôležité

Termostat je na stene medzi obývačkou a chodbou, **zo strany obývačky** (izba D).
Je teda priamo v referenčnej izbe, čo je podstatne lepšie, než keby visel v chodbe:
meria vzduch tam, kde sa naozaj zdržiavate, a nie je oddelený dverami.

Prakticky to znamená:

1. **Žiadny prepočet netreba.** Chceš v obývačke 22 °C → na termostate nastavíš 22 °C.
   Políčko *Kalibrácia termostatu* nechaj na 0 a siahni naň, len ak zistíš, že
   termostat ukazuje inak než presný teplomer položený vedľa neho.
2. **Hlavica na radiátore v obývačke musí byť naplno otvorená.** Toto je teraz
   najdôležitejšie pravidlo celej sústavy. Termostat aj hlavica by inak riadili
   tú istú izbu proti sebe: hlavica priškrtí radiátor, termostat to vyhodnotí ako
   málo tepla a nechá kotol zbytočne bežať.
3. **Skontroluj, čo termostat „vidí".** Nemal by byť v priamom slnku, nad
   radiátorom, za záclonou, ani v prievane od balkónových dverí. Ideálna výška
   je okolo 1,5 m. Stena medzi obývačkou a chodbou je vnútorná, čiže z tejto
   stránky je poloha dobrá.
4. **Ostatné izby si riadia hlavice.** Obývačka určuje, kedy kotol kúri; kuchyňa,
   spálňa a detská si z toho tepla uberú toľko, koľko im dovolí ich hlavica.

### Orientácia bytu — a prečo na tom záleží

Pravý horný roh pôdorysu (spálňa, izba B) smeruje **presne na sever**. Byt je teda
natočený o 45° a svetové strany vychádzajú takto:

| Izba | Vonkajšie steny | Slnko |
|---|---|---|
| **B — spálňa** | severozápad + **severovýchod** | **severný roh, v zime prakticky žiadne** |
| C — detská | severozápad + juhozápad | poobede |
| A — kuchyňa | severovýchod + juhovýchod (balkón) | ráno |
| **D — obývačka** | juhozápad + juhovýchod (balkón) | **južný roh, cez deň najviac zo všetkých** |

Z toho plynú dve veci, ktoré ti reálne skomplikujú kúrenie:

**Spálňa je najchladnejšia izba v byte.** Má dve vonkajšie steny, je to severný roh
a nedostane ani lúč slnka. Ak niekde nebude dosť teplo, bude to tam — preto jej
hlavicu nastav vyššie než by si podľa teploty čakal.

**Termostat visí presne v tej izbe, ktorú najviac prehrieva slnko.** Na slnečný
zimný deň sa obývačka sama vyhreje, termostat vyhodnotí, že teplo netreba, a
**zastaví kotol — hoci v spálni je v tej chvíli zima.**

Riešenie je nastaviť to tak, aby termostat bol skôr poistka než hlavný regulátor:
daj naň **o pol stupňa až stupeň viac**, než naozaj chceš (teda 22,5–23 °C namiesto
22 °C), a nech teplotu v jednotlivých izbách riešia hlavice. Kotol potom drží
teplotu vody podľa krivky, obývačka sa o seba postará sama a spálňa neostane bez
tepla zakaždým, keď vysvitne slnko. Na veľmi slnečné dni pomôžu aj stiahnuté žalúzie
v obývačke.

## 4. Termostatické hlavice

Zlaté pravidlo: **v obývačke, kde visí termostat, nech je hlavica naplno otvorená.**
Inak si hlavica a termostat navzájom prekážajú — hlavica priškrtí radiátor,
termostat to vyhodnotí ako málo tepla a nechá kotol bežať dlhšie.

| Izba | Odporúčanie |
|---|---|
| D — obývačka (referenčná, je tu termostat) | **hlavica naplno otvorená** |
| C — detská 21,5 °C | približne poloha 3,4 |
| A — kuchyňa 21 °C | približne poloha 3,2 (kuchyňa má zisky od varenia) |
| B — spálňa 20 °C | približne poloha 3 — a pokojne viac, je to najchladnejšia izba |

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
