/**
 * store.js — stav aplikacie, ulozenie do localStorage, export/import.
 * Vsetko bezi lokalne v telefone, nic sa neposiela na ziadny server
 * (okrem volania predpovede pocasia a pripadnych WiFi senzorov, ktore si nastavis sam).
 */

/** Ulozisko. Verziu zvysujeme, ked sa zmenia vychodzie hodnoty tak, ze by ich
 *  stare ulozene nastavenie prekrylo (napr. pole izieb sa pri zlucovani nahradza
 *  cele). Stary kluc sa necha lezat, aby sa dalo v konzole dostat k povodnym datam. */
const KEY = 'ekvitermika.v2';

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
    label: 'Byt 75 m², 1985, nezateplený',
    type: 'panelak',          // panelak | tehla | novostavba
    area: 75,
    // Dolna Krupa, okres Trnava, 192 m n. m. — nizina, preto -11 °C.
    tOutDesign: -11,
    tIndoorDesign: 22,        // zhodne s cielom referencnej izby D
    heatLossKw: 6.0,          // 75 m^2, nezateplena stavba z r. 1985, rohovy byt
    massHours: 15,            // 30 cm murivo bez zateplenia drzi teplo dlho
    heatingLimit: 16,         // nad touto vonkajsou teplotou kurenie vypnut
    /** Orientacia: pravy horny roh podorysu (izba B) smeruje presne na SEVER.
     *  Byt je teda natoceny o 45° — horna hrana podorysu smeruje na SZ,
     *  prava na SV, spodna na JV a lava na JZ. */
    northCornerRoom: 'B',
    location: { name: 'Dolná Krupá', lat: 48.48266, lon: 17.55112 },
  },

  curve: {
    /** Teplota privodu pri -11 °C. Stavba z r. 1985 bez zateplenia ma povodne
     *  clankove radiatory dimenzovane na vysoke teploty — pri 55 °C by dodali
     *  len zlomok menoviteho vykonu. Zaciname vyssie a v priebehu sezony
     *  znizujeme; 50 °C na spiatocke stale kondenzuje. */
    tFlowDesign: 65,
    tReturnDesign: 50,
    exponent: 1.3,            // doskove/clankove radiatory
    shift: 0,                 // paralelny posun (rucny alebo z ucenia)
    tFlowMin: 28,
    tFlowMax: 75,          // rezerva nad 65 °C, kotol dovoli az 85 °C
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

  /** Izby podla nakresu. Svetove strany vychadzaju z toho, ze pravy horny roh
   *  podorysu (izba B) je presne sever — byt je natoceny o 45°.
   *  A kuchyna (SV stena, balkon na JV), B spalna (SZ + SV = severny roh),
   *  C detska (SZ + JZ), D obyvacka (JZ + balkon na JV = juzny roh),
   *  CHODBA bez radiatora. */
  rooms: [
    { id: 'A', name: 'Kuchyňa',  target: 21.0, hasTrv: true,  hasRadiator: true,
      wall: 'severovýchod', extDoor: 'balkónové dvere na juhovýchod', sensorId: null,
      note: 'Ráno ju prisvieti slnko od juhovýchodu a má zisky od varenia — hlavicu stačí nižšie.' },
    { id: 'B', name: 'Spálňa',   target: 20.0, hasTrv: true,  hasRadiator: true,
      wall: 'severovýchod', extDoor: null, sensorId: null,
      note: 'Severný roh bytu — dve vonkajšie steny a v zime prakticky žiadne slnko. '
          + 'Najchladnejšia izba v byte, hlavicu tu daj najvyššie.' },
    { id: 'C', name: 'Detská',   target: 21.5, hasTrv: true,  hasRadiator: true,
      wall: 'juhozápad', extDoor: null, sensorId: null,
      note: 'Poobede ju prehreje slnko od juhozápadu, ráno býva chladnejšia.' },
    { id: 'D', name: 'Obývačka', target: 22.0, hasTrv: true,  hasRadiator: true,
      wall: 'juhozápad', extDoor: 'balkónové dvere na juhovýchod', sensorId: null,
      note: 'Referenčná izba — je tu termostat, preto hlavicu nechaj naplno otvorenú. '
          + 'Pozor: je to južný roh, cez deň ju prehrieva slnko a termostat potom '
          + 'zastaví kotol, aj keď je v spálni ešte chladno.' },
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
