/**
 * tuning.js — automaticke doladenie krivky z realnych dat.
 *
 * Princip: kazdy zaznam v denniku ma vonkajsiu teplotu (teda relativne
 * zatazenie phi) a chybu e = skutocna teplota v izbe - pozadovana.
 * Preloz chybu priamkou  e ≈ a + b·phi:
 *   a  ... konstantna cast chyby   -> opravuje PARALELNY POSUN krivky
 *   b  ... cast rastuca so zimou   -> opravuje STRMOST (navrhovu teplotu privodu)
 *
 * Ked nie su WiFi teplomery, chyba sa berie zo spatnej vazby tlacidlami
 * (zima / trochu zima / akurat / teplo), prepocitanej na priblizne K.
 */

const FEEDBACK_TO_K = {
  zima: -1.5,
  chladno: -0.7,
  akurat: 0,
  teplo: 0.7,
  horuco: 1.5,
};

export const FEEDBACK_OPTIONS = [
  { id: 'zima', label: 'Zima', emoji: '🥶' },
  { id: 'chladno', label: 'Chladnejšie', emoji: '🙂' },
  { id: 'akurat', label: 'Akurát', emoji: '👌' },
  { id: 'teplo', label: 'Teplejšie', emoji: '🙂' },
  { id: 'horuco', label: 'Horúco', emoji: '🥵' },
];

/** Chyba jedneho zaznamu v kelvinoch, alebo null ak sa neda urcit. */
export function entryError(entry, targetTemp) {
  if (typeof entry.roomTemp === 'number' && typeof targetTemp === 'number') {
    return entry.roomTemp - targetTemp;
  }
  if (entry.feedback && entry.feedback in FEEDBACK_TO_K) {
    return FEEDBACK_TO_K[entry.feedback];
  }
  return null;
}

/** Jednoducha linearna regresia y = a + b·x. */
export function linreg(points) {
  const n = points.length;
  if (n < 2) return null;
  const sx = points.reduce((s, p) => s + p.x, 0);
  const sy = points.reduce((s, p) => s + p.y, 0);
  const sxx = points.reduce((s, p) => s + p.x * p.x, 0);
  const sxy = points.reduce((s, p) => s + p.x * p.y, 0);
  const den = n * sxx - sx * sx;
  if (Math.abs(den) < 1e-9) return { a: sy / n, b: 0, n };
  const b = (n * sxy - sx * sy) / den;
  const a = (sy - b * sx) / n;
  return { a, b, n };
}

/**
 * Navrhne upravu krivky.
 * @param {object[]} log zaznamy (najnovsie prve)
 * @param {object} state cely stav
 * @param {object} [opts]
 * @returns {{shiftDelta:number, flowDesignDelta:number, confidence:'nizka'|'stredna'|'vysoka', reason:string, samples:number}|null}
 */
export function suggestAdjustment(log, state, opts = {}) {
  const maxAgeDays = opts.maxAgeDays ?? 21;
  const minSamples = opts.minSamples ?? 3;
  const cutoff = Date.now() - maxAgeDays * 86400e3;
  const target = state.thermostat.setpointDay;

  const points = [];
  for (const e of log) {
    if (e.ts < cutoff) break;
    if (e.ignoreForTuning) continue;
    const err = entryError(e, target);
    if (err === null || typeof e.phi !== 'number') continue;
    points.push({ x: e.phi, y: err, ts: e.ts });
  }

  if (points.length < minSamples) {
    return {
      shiftDelta: 0, flowDesignDelta: 0, confidence: 'nizka', samples: points.length,
      reason: `Zatiaľ mám ${points.length} ${points.length === 1 ? 'záznam' : 'záznamy'}. Na spoľahlivý návrh treba aspoň ${minSamples} — klikaj spätnú väzbu na prehľade.`,
    };
  }

  const fit = linreg(points);
  const meanErr = points.reduce((s, p) => s + p.y, 0) / points.length;
  const phiSpread = Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x));

  // Bez dostatocneho rozsahu pocasia sa strmost urcit neda — meň len posun.
  let shiftDelta, flowDesignDelta, reason;
  if (phiSpread < 0.25 || !fit) {
    shiftDelta = clampAdj(-meanErr * 0.8);
    flowDesignDelta = 0;
    reason = meanErr < 0
      ? `V priemere je chladnejšie o ${fmt(-meanErr)} K — posúvam celú krivku hore o ${fmt(shiftDelta)} K.`
      : `V priemere je teplejšie o ${fmt(meanErr)} K — posúvam celú krivku dole o ${fmt(-shiftDelta)} K.`;
    if (Math.abs(meanErr) < 0.25) reason = 'Teplota sedí, krivku netreba meniť.';
  } else {
    // a = chyba pri phi=0 (mierne pocasie), b = prirastok chyby smerom k mrazom
    const errMild = fit.a;
    const errCold = fit.a + fit.b * 1.0;
    shiftDelta = clampAdj(-errMild * 0.8);
    flowDesignDelta = clampAdj(-(errCold - errMild) * 1.2, 4);
    if (Math.abs(fit.b) < 0.4) {
      flowDesignDelta = 0;
      reason = `Chyba je rovnaká v miernom aj mrazivom počasí → stačí paralelný posun o ${fmt(shiftDelta)} K.`;
    } else if (fit.b < 0) {
      reason = `Keď je vonku chladno, je v byte zima, ale v miernom počasí je to v poriadku → krivka je plochá. Zvyšujem návrhovú teplotu prívodu o ${fmt(flowDesignDelta)} K (strmšia krivka).`;
    } else {
      reason = `V mraze je prekúrené, v miernom počasí nie → krivka je príliš strmá. Znižujem návrhovú teplotu prívodu o ${fmt(-flowDesignDelta)} K.`;
    }
  }

  const confidence = points.length >= 10 && phiSpread >= 0.35 ? 'vysoka'
    : points.length >= 5 ? 'stredna' : 'nizka';

  return {
    shiftDelta: round1(shiftDelta),
    flowDesignDelta: round1(flowDesignDelta),
    confidence,
    samples: points.length,
    reason,
  };
}

/** Bezpecnostne obmedzenie jednej upravy, aby appka neskakala hore-dole. */
function clampAdj(v, max = 3) {
  return Math.max(-max, Math.min(max, v));
}
const round1 = (v) => Math.round(v * 10) / 10;
const fmt = (v) => (Math.round(Math.abs(v) * 10) / 10).toFixed(1);

/** Mozno uz aplikovat dalsiu upravu? (necháva dom ustalit sa) */
export function canTuneNow(state) {
  const last = state.settings.lastTuneAt || 0;
  const hours = (Date.now() - last) / 3600e3;
  return hours >= (state.settings.tuneMinHours ?? 8);
}

/** Vypocet offsetu termostatu z dvoch nameranych teplot. */
export function computeThermostatOffset(tAtThermostat, tInReferenceRoom) {
  return Math.round((tAtThermostat - tInReferenceRoom) * 10) / 10;
}
