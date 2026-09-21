# WiFi teplomery — čo kúpiť a ako to zapojiť

Aplikácia funguje aj bez nich. Sú to **dobrovoľné vylepšenie**: keď ich pridáš,
appka prestane potrebovať tvoju spätnú väzbu a krivku si doladí sama
z nameraných teplôt.

---

## Čo by som kúpil

### 1. Shelly H&T Gen3 — najjednoduchšie
- batériový (vydrží roky), meria teplotu aj vlhkosť
- **má lokálne HTTP API** → appka ho číta priamo, bez cloudu a bez účtu
- v appke: typ *Shelly H&T*, zadáš len IP adresu zariadenia

### 2. Zigbee čidlá + Home Assistant — najlacnejšie na kus
- čidlá Aqara / Sonoff stoja pár eur
- treba krabičku, čo beží nonstop, s Home Assistantom, a Zigbee kľúč
  (čo presne kúpiť je v `docs/poznamky-home-assistant.md`)
- v appke: typ *Home Assistant*, zadáš adresu, token a entitu
- dáva zmysel, ak plánuješ aj ďalšie smart veci

### 3. Čokoľvek s HTTP/JSON
- typ *Iné zariadenie*, zadáš URL a cestu k hodnote (napr. `temperature:0.tC`)

### Koľko kusov stačí
**Dva až tri.** Prvý do obývačky vedľa termostatu — overíš ním, či termostat
neukazuje vedľa, a appka bude mať skutočnú teplotu referenčnej izby. Ďalšie do
detskej a spálne ukážu, či tam hlavice držia, čo majú — to sú izby, o ktorých
inak nevieš nič.

---

## Dôležité obmedzenie prehliadača

Ak appku otvoríš cez **https://** (napr. z GitHub Pages), prehliadač jej
**zakáže** spojiť sa s **http://** zariadením v domácej sieti. Volá sa to
*mixed content* a nedá sa to obísť nastavením v aplikácii — je to bezpečnostné
pravidlo prehliadača.

Riešenia, od najjednoduchšieho:

1. **Spusti appku z domácej siete cez http://** (odporúčané)
   ```bash
   node server.js
   ```
   Vypíše adresy typu `http://192.168.1.10:8080`. Tú otvor na telefóne
   (musíš byť na rovnakej WiFi) a pridaj na plochu. Senzory v LAN budú fungovať.
   Nevýhoda: počítač musí byť zapnutý. Trvalé riešenie je malá krabička,
   čo beží nonstop — a keď na nej pobeží Home Assistant, appka môže bývať
   priamo v ňom (`config/www`) a `server.js` netreba vôbec.

2. **Home Assistant s HTTPS** — ak má HA platný certifikát a povolené CORS,
   appka ho vie čítať aj z https stránky.

3. **Kombinácia** — appku používaj z internetu (bez senzorov), a keď si doma,
   otvor si lokálnu verziu. Nastavenia si každá verzia drží zvlášť,
   preniesť sa dajú cez Nastavenia → Export/Import.

### CORS
Niektoré zariadenia neodpovedajú na požiadavky z inej stránky, kým nepovolia
hlavičku `Access-Control-Allow-Origin`. Shelly ju posiela, Home Assistant sa
nastavuje v `configuration.yaml`:

```yaml
http:
  cors_allowed_origins:
    - http://192.168.1.10:8080
```

---

## Ako appka senzory použije

1. **Izby** → rozbalíš izbu → priradíš jej senzor.
2. Na Prehľade sa ukáže pás s nameranými teplotami.
3. Pri učení krivky sa namiesto hrubého odhadu zo spätnej väzby použije
   **skutočná odchýlka** teploty referenčnej izby od požadovanej —
   výrazne presnejšie.
4. Teplomer vedľa termostatu odhalí, či termostat ukazuje správne — appka
   z toho nastaví kalibráciu sama.

---

## Čo appka (zatiaľ) nerobí

- **Nezapisuje nič do kotla.** Victrix Tera 28 1 nemá sieťové pripojenie.
  Teplotu vykurovacej vody prestavuješ ručne podľa odporúčania.
- Neovláda termostatické hlavice. Ak by si niekedy kúpil elektronické hlavice,
  dá sa to doplniť rovnakým adaptérovým princípom ako senzory.

## Cesty k plnej automatizácii

| Riešenie | Čo to dá | Náročnosť |
|---|---|---|
| Vonkajšia sonda ku kotlu | kotol si ekvitermiku počíta sám, appka zostane na ladenie krivky | nízka, lacné |
| OpenTherm termostat / gateway | požadovaná teplota vody ide do kotla po zbernici, plná modulácia | stredná |
| WiFi teplomery (táto appka) | appka vie, ako reálne kúriš, a ladí krivku sama | nízka |

Či tvoj kotol podporuje OpenTherm, si over v návode — v appke je na to
prepínač v záložke Kotol.
