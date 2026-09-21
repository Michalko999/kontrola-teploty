/**
 * format.js — cisla tak, ako sa citaju po slovensky.
 *
 * Zamerne bez akejkolvek prace s DOM, aby sa to dalo importovat aj z ciste
 * vypoctovych modulov (boiler.js, tuning.js) a z testov v Node.
 */

/**
 * Cislo s desatinnou ciarkou. Zbytocna nula za ciarkou sa zahadzuje,
 * takze 22,0 je "22" a 22,5 ostane "22,5".
 *
 * POZOR: toto nikdy nedavaj do hodnoty input[type=number]. Prehliadac tam
 * desatinnu ciarku neprijme a policko ostane prazdne — hodnoty policok
 * musia zostat s bodkou. Tato funkcia je vyhradne na text na citanie.
 *
 * @param {number|null|undefined} v
 * @param {number} [digits] pocet desatinnych miest pred orezanim nul
 * @returns {string} naformatovane cislo alebo pomlcka
 */
export function num(v, digits = 1) {
  const n = Number(v);
  if (v === null || v === undefined || v === '' || !Number.isFinite(n)) return '—';
  let s = n.toFixed(digits);
  if (s.includes('.')) s = s.replace(/\.?0+$/, '');
  return s.replace('.', ',');
}

/** Teplota aj s jednotkou: 54,5 °C */
export function temp(v, digits = 1) {
  const s = num(v, digits);
  return s === '—' ? '—' : `${s} °C`;
}

/** Cislo so znamienkom aj ked je kladne — na rozdiely a posuny: +2,5 */
export function signed(v, digits = 1) {
  const s = num(v, digits);
  if (s === '—') return '—';
  return Number(v) > 0 ? `+${s}` : s;
}
