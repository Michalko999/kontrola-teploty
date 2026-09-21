# Ako aplikácia počíta krivku

## Vzorec

Vychádza z klasického radiátorového vzťahu (Recknagel):

```
phi   = (t_izba − t_vonku) / (t_izba − t_vonku_návrh)     … relatívne zaťaženie 0…1
t_str = t_izba + (t_str_návrh − t_izba) · phi^(1/n)        … stredná teplota vody
t_prívod    = t_str + (Δt_návrh / 2) · phi
t_spiatočka = t_str − (Δt_návrh / 2) · phi
```

- `n` je **radiátorový exponent**: doskové a článkové radiátory ≈ 1,3, konvektory ≈ 1,4,
  podlahové kúrenie ≈ 1,1. Kvôli nemu nie je krivka priamka, ale je mierne vypuklá —
  radiátor odovzdáva teplo nelineárne k rozdielu teplôt.
- `Δt_návrh` je návrhový spád (prívod − spiatočka), typicky 10 K pri kondenzačnom kotli.
- Pri `phi = 0` (vonku je ako v izbe) vyjde prívod rovný teplote izby — teda kúriť netreba.
  Pri `phi = 1` (návrhový mráz) vyjde presne návrhová teplota prívodu.

Na koniec sa pripočíta **paralelný posun** a výsledok sa oreže medzi minimom a maximom.

## Tlmená vonkajšia teplota

Murovaná budova nereaguje na vonkajšiu teplotu okamžite. Keby sa krivka riadila
okamžitou teplotou, ráno by prekurovala a večer podkurovala.

Aplikácia preto počíta **exponenciálne vážený priemer** za posledných niekoľko hodín
(podľa nastavenej zotrvačnosti: panelák ~12 h, tehla ~18 h, novostavba ~10 h)
a výsledok mieša s aktuálnou teplotou v pomere 65 : 35. To isté robí aj kvalitný
ekvitermický regulátor s fyzickým čidlom.

Navyše sa pri vetre nad 20 km/h pripočíta korekcia až −2 K, lebo prievan zvyšuje
tepelnú stratu.

## Kondenzácia

Zemný plyn má rosný bod spalín okolo **55 °C**. Kondenzačný kotol získava bonus
k účinnosti len vtedy, keď je teplota **spiatočky** pod touto hranicou — nie prívodu.
Preto je v grafe čiarkovaná čiara na 55 °C a appka sleduje vypočítanú spiatočku.

| Spiatočka | Stav |
|---|---|
| ≤ 40 °C | plná kondenzácia, najvyššia účinnosť |
| ≤ 47 °C | dobrá kondenzácia |
| < 55 °C | čiastočná |
| ≥ 55 °C | kotol nekondenzuje, strata 10–15 % |

## Taktovanie

`potreba [kW] = tepelná strata × phi`

Keď je minimálny výkon kotla (4,3 kW pri Victrix Tera 28) výrazne vyšší ako
okamžitá potreba, kotol nevie modulovať dosť nízko a začne sa zapínať a vypínať.
Appka upozorní, keď pomer prekročí 1,2× (stredné riziko) a 2,5× (vysoké riziko).

## Automatické učenie krivky

Každý záznam v denníku nesie relatívne zaťaženie `phi` a chybu `e`
(rozdiel skutočnej a požadovanej teploty — z WiFi teplomera, alebo odhadnutý
zo spätnej väzby: „zima“ = −1,5 K, „chladnejšie“ = −0,7 K atď.).

Aplikácia preloží body priamkou `e ≈ a + b·phi`:

- **`a`** (chyba v miernom počasí) → opravuje **paralelný posun**,
- **`b`** (ako chyba rastie smerom k mrazu) → opravuje **strmosť**.

Ak záznamy pokrývajú len úzky rozsah počasia (`phi` sa mení málo), strmosť sa
nedá spoľahlivo určiť a appka mení len posun. Jedna úprava je vždy obmedzená
(max ±3 K posun, ±4 K strmosť) a medzi úpravami musí uplynúť nastavený čas,
aby sa byt stihol ustáliť. **Zmenu vždy potvrdzuješ ty.**
