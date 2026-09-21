# Poznámky: Home Assistant a smart senzory

> **Stav: odložené.** Appka funguje a je hotová aj bez tohto. Tento súbor je tu
> preto, aby sa k téme dalo vrátiť bez vysvetľovania odznova.

---

## Východiská (fakty, z ktorých vychádzame)

- **Doma nebeží nič nonstop.** Žiadny NAS, žiadny server, žiadne Raspberry.
  (NAS je v práci — na domáce riešenie sa naň nedá spoliehať.)
- Termostat je **v obývačke (izba D)**, na stene do chodby, zo strany obývačky.
  Meria teda priamo referenčnú izbu — netreba žiadny prepočet.
- V izbách sú **klasické termostatické hlavice**, nie smart.
- Kotol **nemá vonkajšie čidlo** — appka ho nahrádza predpoveďou z Open-Meteo.
- Appka beží na GitHub Pages cez **https**, repozitár je **verejný**
  (preto v ňom nesmú byť žiadne osobné údaje).

---

## Čo by sa kúpilo

### 1. Krabička, čo bude bežať 24/7

**Odporúčanie: mini PC s Intel N100** (alebo nástupca N150, prípadne N97).
Nie je to o konkrétnom čipe, ale o kategórii: lacný, tichý, úsporný x86.

Hľadať: 8–16 GB RAM, NVMe SSD 256 GB+, Gigabit Ethernet, 2× USB-A.
Ideálne bez ventilátora. Nekupovať s Windowsom za príplatok — aj tak sa zmaže.

Nainštalovať **Home Assistant OS** (nie HA v Dockeri) — len tak je k dispozícii
obchod s doplnkami, z ktorého sa Zigbee2MQTT a Mosquitto inštalujú na pár klikov.

**Alternatíva: Home Assistant Green.** Zapojíš a ide. Ale (overené na
home-assistant.io/green):

| | HA Green | Mini PC N100 |
|---|---|---|
| Úložisko | 32 GB eMMC, **napájkované** | M.2 SSD, vymeniteľné |
| RAM | 4 GB | 8–16 GB |
| Sieť | **len Ethernet**, žiadna WiFi | Ethernet + WiFi |
| USB | 2× USB 2.0 | viac, aj USB 3 |
| Rádio | **žiadne** (Zigbee kľúč treba tak či tak) | žiadne |
| Spotreba | ~2–3 W (~6 €/rok) | ~8–12 W (~25 €/rok) |

Green je teda **úspornejší** — to treba priznať. Rozdiel je ale ~20 €/rok a
mini PC za to dá vymeniteľný disk, rezervu a možnosť pustiť tam aj iné veci.

Pre porovnanie, prečo nie odložený starý desktop: 50 W+ = 110 €/rok. Pri
nonstop prevádzke je spotreba hlavné kritérium, nie obstarávacia cena.

### 2. Zigbee koordinátor

**Obyčajný USB kľúč stačí** (Sonoff ZBDongle-P / -E a podobné).

> Pôvodne bol v hre koordinátor cez Ethernet (SLZB-06) — ale **len preto**, aby
> sa obišlo prepúšťanie USB do Dockera na Synology. Keď doma NAS nie je, tento
> dôvod padá a netreba priplácať.

Z praxe: zapojiť cez krátky USB predlžovák, nie priamo do krabičky —
USB 3.0 porty rušia Zigbee na 2,4 GHz.

### 3. Senzory a hlavice

- **Zigbee teplomery** — obývačka (vedľa termostatu, na overenie kalibrácie),
  detská, spálňa
- **Zigbee termostatické hlavice** — pred kúpou overiť závit na existujúcich
  ventiloch (štandard je M30 × 1,5) a odfotiť si súčasnú hlavicu

**Poradie nákupu:** najprv len krabička + Zigbee kľúč + **jeden** teplomer do
obývačky. Na tom sa overí, že celý reťazec funguje a appka teplotu prečíta.
Hlavice až potom — sú najdrahšie a najhoršie sa vracajú.

---

## Čo sa tým vyrieši navyše

Appka môže bývať **priamo v Home Assistante**: obsah priečinka `config/www`
sa servíruje na `/local/…`, čiže na `http://<adresa-HA>:8123/local/ekvitermika/`.

Tým naraz zmizne:
- **mixed content** — stránka beží cez `http://`, takže smie čítať LAN zariadenia
- **CORS** — appka je na rovnakej adrese ako HA
- **potreba `server.js`** — netreba nič spúšťať navyše

Verzia na GitHub Pages zostane ako prístup z mobilu mimo domu (bez senzorov).

**Po rozbehnutí hneď zapnúť automatické zálohy HA** (vie ich posielať na Google
Drive alebo na sieťový disk). Párovanie dvadsiatich Zigbee zariadení sa nechce
robiť druhýkrát.

---

## Čo sa NEodporúča

**Aqara Hub M100.** Je to Zigbee 3.0 + Thread + Matter most (20 Zigbee + 20
Thread zariadení), ale:

- prepojenie hlavíc Aqara E1 s externým teplomerom funguje **len v appke Aqara**,
  nie cez Home Assistant
- cez Zigbee2MQTT to ide (existuje komunitný blueprint), ale to už rovno stačí
  obyčajný USB koordinátor
- **nepodarilo sa overiť**, či cez Matter most vôbec vidno polohu ventilu — a
  práve tá je pre doladenie krivky najcennejšia

Čiže: generický Zigbee koordinátor + Zigbee2MQTT + Home Assistant.

---

## Čo sa dorobí v appke, keď HA pobeží

Adaptér na senzory je **už napísaný** (`js/sensors.js`, typ *Home Assistant* —
adresa, token, entita). Chýba to zaujímavejšie:

1. **Čítať polohu ventilov** zo Zigbee hlavíc a doladiť krivku z nej
   (*load compensation*) — nahradí to manuálne tlačidlá spätnej väzby
   v denníku. Keď sú všetky ventily pritvorené, krivka je privysoká.
2. **Počítať potrebnú teplotu vody podľa najnáročnejšej izby**, nie podľa
   jedinej referenčnej. Dnes je referenčná izba D, lebo tam visí termostat.
3. Pri tom prepísať `docs/wifi-senzory.md` a `docs/instalacia.md` na variant
   s Home Assistantom.
