/** engine.js — spaja stav, pocasie a matematiku do jedneho vysledku pre vsetky obrazovky. */

import { computeFlow, dampedOutdoor, curveTable, cyclingRisk, condensingInfo } from './equitherm.js';
import { windCorrection } from './weather.js';

/** Je teraz nocny utlm? */
export function isNight(curve, date = new Date()) {
  const [fh, fm] = (curve.nightFrom || '22:00').split(':').map(Number);
  const [th, tm] = (curve.nightTo || '05:30').split(':').map(Number);
  const mins = date.getHours() * 60 + date.getMinutes();
  const from = fh * 60 + fm, to = th * 60 + tm;
  return from > to ? mins >= from || mins < to : mins >= from && mins < to;
}

/** Parametre krivky pre computeFlow() zo stavu appky. */
export function curveParams(state, { night = false } = {}) {
  const { curve, building, thermostat } = state;
  return {
    tIndoor: night
      ? thermostat.setpointNight ?? building.tIndoorDesign
      : thermostat.setpointDay ?? building.tIndoorDesign,
    tOutdoorDesign: building.tOutDesign,
    tFlowDesign: curve.tFlowDesign,
    tReturnDesign: curve.tReturnDesign,
    exponent: curve.exponent,
    shift: curve.shift + (night ? curve.nightShift : 0),
    tFlowMin: curve.tFlowMin,
    tFlowMax: Math.min(curve.tFlowMax, state.boiler.tFlowMaxAllowed),
    heatingLimit: building.heatingLimit,
  };
}

/**
 * Hlavny vypocet pre aktualnu chvilu.
 * @param {object} state
 * @param {object|null} weather vysledok fetchWeather()
 */
export function evaluate(state, weather) {
  const night = isNight(state.curve);
  const params = curveParams(state, { night });

  const raw = weather?.current?.temp ?? null;
  const wind = weather?.current?.wind ?? 0;
  const damped = raw === null
    ? null
    : dampedOutdoor(raw, weather?.past24 || [], state.building.massHours);
  const windAdj = raw === null ? 0 : windCorrection(raw, wind);
  const effective = damped === null ? null : Math.round((damped + windAdj) * 10) / 10;

  const tOutdoor = effective ?? state.settings.manualOutdoor ?? 5;
  const result = computeFlow({ ...params, tOutdoor });

  return {
    night,
    tOutdoorRaw: raw,
    tOutdoorDamped: damped,
    windAdj,
    tOutdoor,
    usingManualOutdoor: effective === null,
    result,
    cycling: cyclingRisk({
      heatLossKw: state.building.heatLossKw,
      phi: result.phi,
      boilerMinKw: state.boiler.minKw,
    }),
    condensing: condensingInfo(result.return),
    params,
  };
}

/** Tabulka krivky pre graf a tlac. */
export function table(state, opts) {
  return curveTable(curveParams(state, opts));
}

/** Plan na najblizsie dni: pre kazdy den odporucana teplota privodu. */
export function plan(state, weather, days = 3) {
  if (!weather?.forecast?.length) return [];
  const params = curveParams(state);
  const byDay = new Map();
  for (const p of weather.forecast) {
    const key = new Date(p.ts).toISOString().slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(p);
  }
  return [...byDay.entries()].slice(0, days).map(([date, points]) => {
    const temps = points.map((p) => p.temp);
    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
    const min = Math.min(...temps);
    const dayRes = computeFlow({ ...params, tOutdoor: Math.round(avg * 10) / 10 });
    const coldRes = computeFlow({ ...params, tOutdoor: min });
    return {
      date,
      avg: Math.round(avg * 10) / 10,
      min: Math.round(min * 10) / 10,
      max: Math.round(Math.max(...temps) * 10) / 10,
      flow: dayRes.flow,
      flowCold: coldRes.flow,
      heating: dayRes.heatingNeeded,
    };
  });
}
