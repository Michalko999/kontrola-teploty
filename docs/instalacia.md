# Inštalácia do telefónu

Aplikácia je **PWA** — webová stránka, ktorá sa dá pridať na plochu telefónu
a potom sa správa ako bežná appka (vlastná ikona, celá obrazovka, funguje offline).
Netreba Google Play ani App Store.

## Možnosť A — GitHub Pages (najrýchlejšie)

1. V repozitári na GitHube: **Settings → Pages**
2. *Source*: `Deploy from a branch`, vetva `claude/mobile-equithermic-app-7za8ii`, priečinok `/ (root)`
3. Po chvíli dostaneš adresu `https://<účet>.github.io/kontrola-teploty/`
4. Otvor ju v telefóne a pridaj na plochu (návod nižšie)

> Pozor: cez https nebude appka vedieť čítať WiFi senzory v domácej sieti.
> Pozri `docs/wifi-senzory.md`.

## Možnosť B — z vlastnej siete (funguje aj so senzormi)

Na počítači, NAS alebo Raspberry v domácej sieti:

```bash
git clone <adresa-repozitára>
cd kontrola-teploty
node server.js
```

Vypíše adresy typu `http://192.168.1.10:8080`. Tú otvor na telefóne.

Na Synology NAS sa dá priečinok nakopírovať do Web Station, alebo spustiť
`server.js` cez Node.js balíček a Naplánované úlohy (pri štarte).

## Možnosť C — lokálne na počítači

```bash
npm start
# http://localhost:8080
```

---

## Pridanie na plochu

**Android (Chrome):** menu ⋮ → *Pridať na plochu* / *Inštalovať aplikáciu*

**iPhone (Safari):** tlačidlo Zdieľať → *Pridať na plochu domovskej obrazovky*
(na iPhone to musí byť Safari, iné prehliadače to nevedia)

Po pridaní sa appka otvára na celú obrazovku, bez adresného riadku.

---

## Údaje a súkromie

- Všetky nastavenia aj denník sú uložené **len v telefóne** (localStorage prehliadača).
- Von z telefónu ide jediná vec: dopyt na predpoveď počasia pre tvoju obec
  (Open-Meteo, bez registrácie a bez účtu).
- Zálohu si sprav cez **Nastavenia → Exportovať** (uloží JSON súbor).
- Vymazanie dát prehliadača = strata nastavení. Rovnako pri preinštalovaní.

## Vývoj

```bash
npm test        # testy výpočtu krivky a učenia
npm start       # lokálny server
```
