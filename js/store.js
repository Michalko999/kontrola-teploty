/**
 * store.js — stav aplikacie, ulozenie do localStorage, export/import.
 * Vsetko bezi lokalne v telefone, nic sa neposiela na ziadny server
 * (okrem volania predpovede pocasia a pripadnych WiFi senzorov, ktore si nastavis sam).
 */

const KEY = 'ekvitermika.v1';

/** Vychodzie nastavenie postavene na podklade od uzivatela: byt 4 izby + chodba,
 *  Immergas Victrix Tera 28 1, termostat na stene obyvacky (izba D). */
export const DEFAULTS = {
  version: 1,

  boiler: {
    model: 'Immergas Victrix Tera 28 1',
    // udaje zo stitka kotla
    minKw: 4.3,              // Pn min
    maxHeatingKw: 24.1,      // Pn max vykurovanie
    maxDhwKw: 28.1,          // Pn max TUV
    tFlowMaxAllowed: 85,     // max. nastavitelna teplota vykurovacej vody
    tFlowMinAllowed: 25,
    hasOutdoorProbe: false,  // vonkajsie cidlo zatial nie je
    hasOpenTherm: null,      // over v navode; rozhoduje o buducej automatizacii
    // co je nastavene na kotli teraz (aby appka vedela povedat "zmen z X na Y")
    currentFlowSet: 55,
    maxHeatingPowerPercent: 100,
    antiCycleMinutes: 3,
    pumpMode: 'auto',
  },

  building: {
    label: 'Byt',
    type: 'panelak',          // panelak | tehla | novostavba
    tOutDesign: -11,          // vypoctova vonkajsia teplota (SK nizina -11, vyssie polohy -13/-15)
    tIndoorDesign: 20,
    heatLossKw: 5.0,          // odhad tepelnej straty bytu pri navrhovom stave
    massHours: 12,            // tepelna zotrvacnost pre tlmenie vonkajsej teploty
    heatingLimit: 16,         // nad touto vonkajsou teplotou kurenie vypnut
    location: { name: '', lat: null, lon: null },
  },

  curve: {
    tFlowDesign: 55,          // teplota privodu pri -11 °C
    tReturnDesign: 45,
    exponent: 1.3,            // doskove/clankove radiatory
    shift: 0,                 // paralelny posun (rucny alebo z ucenia)
    tFlowMin: 28,
    tFlowMax: 70,
    nightShift: -4,           // nocny utlm (K)
    nightFrom: '22:00',
    nightTo: '05:30',
  },

  /** Termostat je na stene medzi obyvackou a chodbou, ale zo strany OBYVACKY
   *  (izba D) — teda priamo v referencnej izbe. To je podstatne lepsia poloha
   *  nez chodba: meria vzduch tam, kde sa naozaj zdrziavate, a nie je za dverami.
   *  Offset preto ostava 0 a sluzi uz len na kalibraciu, ak by termostat ukazoval
   *  inak nez skutocnost. */
  thermostat: {
    placement: 'D',                      // D | A | B | C | chodba
    placementNote: 'Stena medzi obývačkou a chodbou, zo strany obývačky — teda priamo v referenčnej izbe.',
    referenceRoom: 'D',
    offset: 0,                           // kalibracia: o kolko termostat ukazuje inak nez je v izbe
    offsetMeasuredAt: null,
    setpointDay: 22.0,                   // drzane v sulade s cielovou teplotou izby D
    setpointNight: 19.0,
  },

  /** Izby podla nakresu:
   *  A kuchyna (radiator vychod, balkonove dvere), B spalna (radiator vychod),
   *  C detska (radiator zapad), D obyvacka (radiator zapad, balkonove dvere),
   *  CHODBA bez radiatora. */
  rooms: [
    { id: 'A', name: 'Kuchyňa',  target: 21.0, hasTrv: true,  hasRadiator: true,
      wall: 'východ', extDoor: 'balkónové dvere', sensorId: null,
      note: 'Kuchyňa má tepelné zisky od varenia — hlavicu stačí nižšie.' },
    { id: 'B', name: 'Spálňa',   target: 19.0, hasTrv: true,  hasRadiator: true,
      wall: 'východ', extDoor: null, sensorId: null,
      note: 'V spálni je príjemnejšie chladnejšie, 18–19 °C.' },
    { id: 'C', name: 'Detská',   target: 21.5, hasTrv: true,  hasRadiator: true,
      wall: 'západ', extDoor: null, sensorId: null,
      note: 'Najteplejšia izba, hlavica najvyššie.' },
    { id: 'D', name: 'Obývačka', target: 22.0, hasTrv: true,  hasRadiator: true,
      wall: 'západ', extDoor: 'balkónové dvere', sensorId: null,
      note: 'Referenčná izba — je tu termostat, preto hlavicu nechaj naplno otvorenú.' },
    { id: 'H', name: 'Chodba',   target: 20.0, hasTrv: false, hasRadiator: false,
      wall: null, extDoor: 'vchodové dvere', sensorId: null,
      note: 'Bez radiátora — vykuruje sa otvorenými dverami z izieb.' },
  ],

  sensors: [],      // WiFi teplomery — viz sensors.js
  log: [],          // zaznamy: { ts, tOut, tOutDamped, flowSet, rooms:{}, feedback, note }

  settings: {
    autoTune: true,
    tuneMinHours: 8,          // minimalny odstup medzi automatickymi upravami
    weather: 'open-meteo',
    theme: 'auto',
    lastWeather: null,        // cache posledneho pocasia pre offline rezim
    onboarded: false,
  },
};

function deepMerge(base, patch) {
  if (Array.isArray(base)) return Array.isArray(patch) ? patch : base;
  if (base && typeof base === 'object' && patch && typeof patch === 'object') {
    const out = { ...base };
    for (const k of Object.keys(patch)) out[k] = deepMerge(base[k], patch[k]);
    return out;
  }
  return patch === undefined ? base : patch;
}

export const state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    return deepMerge(structuredClone(DEFAULTS), JSON.parse(raw));
  } catch (e) {
    console.warn('Nepodarilo sa načítať uložené nastavenia, použijem východzie.', e);
    return structuredClone(DEFAULTS);
  }
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Uloženie zlyhalo (plná pamäť prehliadača?)', e);
  }
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function room(id) {
  return state.rooms.find((r) => r.id === id);
}

export function addLog(entry) {
  state.log.unshift({ ts: Date.now(), ...entry });
  if (state.log.length > 2000) state.log.length = 2000;
  save();
}

export function exportJson() {
  return JSON.stringify(state, null, 2);
}

export function importJson(text) {
  const parsed = JSON.parse(text);
  const merged = deepMerge(structuredClone(DEFAULTS), parsed);
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, merged);
  save();
}

export function resetAll() {
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, structuredClone(DEFAULTS));
  save();
}
