/**
 * boiler.js — co konkretne nastavit na kotli.
 *
 * DOLEZITE: presne nazvy a cisla parametrov v servisnom menu sa lisia podla
 * modelu a verzie firmveru. Appka preto hovori, CO nastavit a preco; cislo
 * parametra si over v navode ku kotlu. Nic sa neposiela do kotla — kotol nema
 * pripojenie, nastavuje sa rucne.
 */

import { computeFlow, condensingInfo, cyclingRisk, curveSlope } from './equitherm.js';
import { num, temp as fmtTemp } from './format.js';

/**
 * Cislo, ktore sa da naozaj navolit na kotli.
 *
 * Victrix Tera ma na displeji len cele stupne, takze nema zmysel pytat
 * 54,9 °C. Vypocet krivky aj jej ucenie vnutri pracuju s desatinami —
 * zaokruhluje sa az tu, pri zobrazeni, aby sa chyba nehromadila.
 */
export const boilerSetpoint = (flow) => Math.round(flow);

/** Profil konkretneho kotla zo stitka na fotke. */
export const VICTRIX_TERA_28 = {
  model: 'Immergas Victrix Tera 28 1',
  minKw: 4.3,
  maxHeatingKw: 24.1,
  maxDhwKw: 28.1,
  tFlowMaxAllowed: 85,   // TM 90 °C je bezpecnostna hranica, nie prevadzkova
  condensing: true,
  notes: [
    'Kondenzačný kotol — najviac ušetrí, keď je teplota spiatočky pod 55 °C.',
    'Minimálny výkon 4,3 kW je pre bežný byt dosť vysoký: pri miernom počasí hrozí taktovanie (časté zapínanie a vypínanie).',
    'Kotol podľa štítka nemá pripojené vonkajšie čidlo — ekvitermiku preto zatiaľ nahrádza táto appka a ručné prestavenie teploty vykurovacej vody.',
  ],
};

/**
 * Zostavi zoznam odporucani "co teraz spravit".
 * @returns {Array<{level:'info'|'tip'|'warn', title:string, text:string}>}
 */
export function advise({ state, tOutdoor, result }) {
  const out = [];
  const { boiler, building, curve, thermostat } = state;

  // 1) hlavna akcia — teplota vykurovacej vody
  // Kotol sa da prestavit len po celych stupnoch, takze aj rozdiel
  // pocitame z toho, co sa da naozaj navolit.
  const flowSet = boilerSetpoint(result.flow);
  const diff = flowSet - boiler.currentFlowSet;
  if (!result.heatingNeeded) {
    out.push({
      level: 'info',
      title: 'Kúrenie netreba',
      text: `Vonku je ${fmtTemp(tOutdoor)}, čo je nad medzou vykurovania (${fmtTemp(building.heatingLimit, 0)}). Kotol môžeš prepnúť len na ohrev vody (režim leto).`,
    });
  } else if (Math.abs(diff) >= 2) {
    out.push({
      level: 'tip',
      title: `Prestav teplotu vykurovacej vody na ${flowSet} °C`,
      text: `Teraz máš nastavené ${fmtTemp(boiler.currentFlowSet, 0)}, čo je o ${num(Math.abs(diff), 0)} K ${diff > 0 ? 'málo' : 'veľa'}. Nastav sa otočným ovládačom/tlačidlami kúrenia na kotli.`,
    });
  } else {
    out.push({
      level: 'info',
      title: 'Nastavenie kotla sedí',
      text: `Vypočítaných ${flowSet} °C je prakticky to, čo máš nastavené (${fmtTemp(boiler.currentFlowSet, 0)}). Nič neprestavuj.`,
    });
  }

  // Ked sa nekuri, rady o kondenzacii a taktovani nedavaju zmysel — kotol stoji.
  if (!result.heatingNeeded) {
    out.push({
      level: 'info',
      title: 'Nastavenie sa oplatí skontrolovať pred sezónou',
      text: `Keď vonku klesne pod ${fmtTemp(building.heatingLimit, 0)}, appka ti povie konkrétnu teplotu vykurovacej vody. Dovtedy stačí mať kotol v režime ohrevu vody.`,
    });
    return out;
  }

  // 2) kondenzacia
  const cond = condensingInfo(result.return);
  out.push({
    level: cond.ok ? 'info' : 'warn',
    title: `${cond.label} (spiatočka ~${fmtTemp(result.return)})`,
    text: cond.hint,
  });

  // 3) taktovanie
  const cyc = cyclingRisk({
    heatLossKw: building.heatLossKw,
    phi: result.phi,
    boilerMinKw: boiler.minKw,
  });
  if (cyc.level === 'vysoke') {
    out.push({
      level: 'warn',
      title: 'Vysoké riziko taktovania kotla',
      text: `Byt teraz potrebuje ~${num(cyc.demandKw)} kW, ale kotol nevie ísť nižšie ako ${num(cyc.boilerMinKw)} kW. V servisnom menu zníž maximálny výkon kúrenia (skús ~${suggestPowerPercent(cyc)} %) a predĺž oneskorenie opätovného zápalu (anti-cycle) na 5–10 minút. Pomôže aj otvorenie viacerých hlavíc naraz.`,
    });
  } else if (cyc.level === 'stredne') {
    out.push({
      level: 'tip',
      title: 'Kotol môže taktovať',
      text: `Potreba ~${num(cyc.demandKw)} kW vs. minimum kotla ${num(cyc.boilerMinKw)} kW. Nechaj otvorené hlavice vo viacerých izbách, aby mal kotol kam teplo dávať.`,
    });
  }

  // 4) orezanie krivky
  if (result.clampedLow) {
    out.push({
      level: 'info',
      title: 'Krivka je orezaná zdola',
      text: `Výpočet dal menej ako minimum ${fmtTemp(curve.tFlowMin, 0)}. Nižšie teploty už radiátory nestihnú odovzdať a kotol by len taktoval.`,
    });
  }
  if (result.clampedHigh) {
    out.push({
      level: 'warn',
      title: 'Krivka je orezaná zhora',
      text: `Výpočet žiada viac ako ${fmtTemp(curve.tFlowMax, 0)}. Ak je zima, zvýš strop v nastavení krivky — ale najprv skontroluj, či nie sú hlavice privreté a radiátory odvzdušnené.`,
    });
  }

  // 5) termostat — dorovnanie, len ked naozaj ukazuje inak nez je v izbe
  if (thermostat.offset !== 0) {
    const set = num(thermostat.setpointDay + thermostat.offset);
    const where = thermostat.placement === thermostat.referenceRoom
      ? 'termostat ukazuje'
      : 'tam, kde termostat visí, býva';
    out.push({
      level: 'tip',
      title: `Na termostate nastav ${set} °C`,
      text: `Chceš ${fmtTemp(thermostat.setpointDay)} v izbe ${thermostat.referenceRoom}, ale ${where} o ${num(Math.abs(thermostat.offset))} K ${thermostat.offset < 0 ? 'menej' : 'viac'}.`,
    });
  }

  return out;
}

function suggestPowerPercent(cyc) {
  const target = Math.max(cyc.demandKw * 1.3, cyc.boilerMinKw);
  return Math.max(30, Math.min(100, Math.round((target / 24.1) * 100 / 5) * 5));
}

/** Kontrolny zoznam nastaveni kotla, ktory appka odporuca pre tento byt. */
/** @param {object} state
 *  @param {number|null} [flowNow] teplota, ktoru appka odporuca prave teraz.
 *         Bez nej by hodnota zavisela od toho, ci sa predtym vykreslil Prehlad. */
export function checklist(state, flowNow = null) {
  const { boiler, curve, building } = state;
  const slope = curveSlope({
    tIndoorDesign: building.tIndoorDesign,
    tOutdoorDesign: building.tOutDesign,
    tFlowDesign: curve.tFlowDesign,
  });
  return [
    {
      item: 'Teplota vykurovacej vody (kúrenie)',
      value: flowNow == null ? 'podľa appky — pozri Prehľad' : `podľa appky teraz ${num(flowNow, 0)} °C`,
      why: 'Toto je jediné, čo treba meniť pri zmene počasia — appka ti povie číslo.',
    },
    {
      item: 'Teplota TÚV (teplá voda)',
      value: '45–50 °C',
      why: 'Vyššie nemá zmysel, len to zanáša výmenník vodným kameňom.',
    },
    {
      item: 'Max. výkon kúrenia',
      value: `${boiler.maxHeatingPowerPercent} % (odporúčam znížiť, ak kotol taktuje)`,
      why: `Byt má odhadom ${num(building.heatLossKw)} kW stratu, kotol vie až ${num(boiler.maxHeatingKw)} kW.`,
    },
    {
      item: 'Oneskorenie opätovného zápalu (anti-cycle)',
      value: `${boiler.antiCycleMinutes} min (pokojne 5–10 min)`,
      why: 'Menej štartov horáka = dlhšia životnosť a vyššia účinnosť.',
    },
    {
      item: 'Čerpadlo',
      value: 'premenlivé otáčky, s dobehom po vypnutí horáka',
      why: 'Rozvedie zvyškové teplo a zníži taktovanie.',
    },
    {
      item: 'Ekvitermická krivka v kotli',
      value: boiler.hasOutdoorProbe ? `strmosť ~${num(slope, 2)}` : 'neaktívna (chýba vonkajšie čidlo)',
      why: boiler.hasOutdoorProbe
        ? 'Kotol si teplotu dopočíta sám, appka slúži na kontrolu.'
        : `Ak niekedy dokúpiš vonkajšiu sondu, nastav strmosť ~${num(slope, 2)} a appka bude už len kontrolná.`,
    },
  ];
}

export { computeFlow };
