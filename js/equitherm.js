/**
 * equitherm.js — vypocet ekvitermickej (pocasim riadenej) krivky.
 *
 * Model vychadza z klasickeho radiatoroveho vztahu (Recknagel):
 *   phi  = relativne tepelne zatazenie = (t_in - t_out) / (t_in - t_out_navrh)
 *   t_m  = t_in + (t_m_navrh - t_in) * phi^(1/n)      ... stredna teplota vody
 *   t_pr = t_m + (dt_navrh / 2) * phi                  ... privod (flow)
 *   t_sp = t_m - (dt_navrh / 2) * phi                  ... spiatocka (return)
 *
 * n = radiatorovy exponent (clankove/doskove radiatory ~1.30, konvektory ~1.4,
 * podlahove kurenie ~1.1). Pri phi -> 0 vychadza t_pr -> t_in, co je fyzikalne
 * spravne: pri vonkajsej teplote rovnej vnutornej nie je potrebne kurit.
 */

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const round1 = (v) => Math.round(v * 10) / 10;

/** Relativne tepelne zatazenie budovy (0 = bez potreby tepla, 1 = navrhovy stav). */
export function relativeLoad(tIndoor, tOutdoor, tOutdoorDesign, maxPhi = 1.15) {
  const span = tIndoor - tOutdoorDesign;
  if (span <= 0) return 0;
  return clamp((tIndoor - tOutdoor) / span, 0, maxPhi);
}

/**
 * Hlavny vypocet. Vracia teplotu privodu, ktoru ma mat kotol nastavenu.
 * @param {object} p
 * @param {number} p.tIndoor       pozadovana vnutorna teplota (°C)
 * @param {number} p.tOutdoor      vonkajsia teplota (°C) — idealne tlmena, viz damping()
 * @param {number} p.tOutdoorDesign vypoctova vonkajsia teplota lokality (°C, SK zvycajne -11)
 * @param {number} p.tFlowDesign   navrhova teplota privodu pri t_out_navrh (°C)
 * @param {number} p.tReturnDesign navrhova teplota spiatocky pri t_out_navrh (°C)
 * @param {number} [p.exponent]    radiatorovy exponent n
 * @param {number} [p.shift]       paralelny posun krivky (K)
 * @param {number} [p.tFlowMin]    dolne orezanie (°C)
 * @param {number} [p.tFlowMax]    horne orezanie (°C)
 * @param {number} [p.heatingLimit] medza vykurovania — nad touto vonkajsou teplotou sa nekuri
 */
export function computeFlow(p) {
  const {
    tIndoor, tOutdoor, tOutdoorDesign,
    tFlowDesign, tReturnDesign,
    exponent = 1.3, shift = 0,
    tFlowMin = 25, tFlowMax = 80,
    heatingLimit = 16,
  } = p;

  const phi = relativeLoad(tIndoor, tOutdoor, tOutdoorDesign);
  const tmDesign = (tFlowDesign + tReturnDesign) / 2;
  const dtDesign = Math.max(2, tFlowDesign - tReturnDesign);

  const tMean = tIndoor + (tmDesign - tIndoor) * Math.pow(phi, 1 / exponent);
  const flowRaw = tMean + (dtDesign / 2) * phi + shift;
  const returnRaw = tMean - (dtDesign / 2) * phi + shift;

  const flow = clamp(flowRaw, tFlowMin, tFlowMax);
  // spiatocku posunieme o rovnaky rozdiel, aby ostal zachovany spad
  const ret = returnRaw + (flow - flowRaw);

  return {
    phi,
    flow: round1(flow),
    return: round1(ret),
    mean: round1((flow + ret) / 2),
    spread: round1(flow - ret),
    clampedLow: flowRaw < tFlowMin,
    clampedHigh: flowRaw > tFlowMax,
    heatingNeeded: tOutdoor < heatingLimit && phi > 0.02,
  };
}

/** Strmost krivky tak, ako ju uvadza vacsina regulatorov: k = dt_privod / dt_vonku. */
export function curveSlope({ tIndoorDesign, tOutdoorDesign, tFlowDesign }) {
  const dOut = tIndoorDesign - tOutdoorDesign;
  if (dOut <= 0) return 0;
  return Math.round(((tFlowDesign - tIndoorDesign) / dOut) * 100) / 100;
}

/** Inverzia: aka navrhova teplota privodu zodpoveda zvolenej strmosti k. */
export function flowDesignFromSlope({ tIndoorDesign, tOutdoorDesign, slope }) {
  return round1(tIndoorDesign + slope * (tIndoorDesign - tOutdoorDesign));
}

/** Tabulka krivky pre tlac / rychly pohlad. */
export function curveTable(p, from = 16, to = -15, step = -2) {
  const rows = [];
  for (let t = from; t >= to; t += step) {
    rows.push({ tOutdoor: t, ...computeFlow({ ...p, tOutdoor: t }) });
  }
  return rows;
}

/**
 * Kondenzacny rezim: zemny plyn ma rosny bod spalin cca 55 °C. Kotol realne
 * kondenzuje (a ma vyssiu ucinnost) az ked je teplota SPIATOCKY pod touto hranicou.
 */
export function condensingInfo(tReturn) {
  const DEW_POINT = 55;
  if (tReturn <= 40) return { level: 'plna', label: 'Plná kondenzácia', hint: 'Najvyššia účinnosť (~108 % výhrevnosti).', ok: true };
  if (tReturn <= 47) return { level: 'dobra', label: 'Dobrá kondenzácia', hint: 'Kotol kondenzuje väčšinu času.', ok: true };
  if (tReturn < DEW_POINT) return { level: 'ciastocna', label: 'Čiastočná kondenzácia', hint: 'Skúste znížiť krivku alebo zväčšiť prietok radiátormi.', ok: true };
  return { level: 'ziadna', label: 'Bez kondenzácie', hint: 'Spiatočka nad 55 °C — kotol pracuje ako bežný, strácate 10–15 % účinnosti.', ok: false };
}

/**
 * Odhad okamziteho tepelneho vykonu a riziko taktovania (cyklovania) kotla.
 * Kondenzacny kotol s min. vykonom vyssim ako je potreba domu sa zapina a vypina
 * prilis casto, co znizuje zivotnost a ucinnost.
 */
export function cyclingRisk({ heatLossKw, phi, boilerMinKw }) {
  const demandKw = heatLossKw * phi;
  const ratio = demandKw > 0 ? boilerMinKw / demandKw : Infinity;
  let level = 'ok';
  if (ratio > 2.5) level = 'vysoke';
  else if (ratio > 1.2) level = 'stredne';
  return {
    demandKw: round1(demandKw),
    boilerMinKw,
    ratio: Number.isFinite(ratio) ? Math.round(ratio * 10) / 10 : null,
    level,
  };
}

/**
 * Tlmena (klzavo priemerovana) vonkajsia teplota. Murovana budova reaguje na
 * zmenu vonkajsej teploty s oneskorenim niekolkych hodin — regulovat podla
 * okamzitej teploty by znamenalo zbytocne prekurovanie rano a podkurovanie vecer.
 * @param {number} current aktualna vonkajsia teplota
 * @param {number[]} history hodinove teploty (najnovsia posledna)
 * @param {number} massHours casova konstanta budovy v hodinach (panelak ~12, tehla ~18)
 */
export function dampedOutdoor(current, history = [], massHours = 12) {
  if (!history.length || massHours <= 0) return current;
  const hours = Math.min(history.length, Math.round(massHours));
  const window = history.slice(-hours);
  // exponencialne vahy — novsie hodiny vazia viac
  let sum = 0, wsum = 0;
  window.forEach((t, i) => {
    const age = window.length - 1 - i;
    const w = Math.exp(-age / (massHours / 2));
    sum += t * w; wsum += w;
  });
  const avg = wsum > 0 ? sum / wsum : current;
  return round1(0.35 * current + 0.65 * avg);
}
