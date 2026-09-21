/** Krivka — rucne doladenie a automaticke ucenie z dennika. */

import { el, card, button, row, slider, numberField, badge, toast } from '../ui.js';
import { state, save } from '../store.js';
import { table, evaluate } from '../engine.js';
import { curveSlope, flowDesignFromSlope } from '../equitherm.js';
import { curveChart } from '../chart.js';
import { suggestAdjustment, canTuneNow } from '../tuning.js';

export function render(ctx) {
  const wrap = el('div', { class: 'view' });
  const rerender = ctx.rerender;

  const ev = evaluate(state, ctx.weather);
  const rows = table(state);
  const slope = curveSlope({
    tIndoorDesign: state.thermostat.setpointDay,
    tOutdoorDesign: state.building.tOutDesign,
    tFlowDesign: state.curve.tFlowDesign,
  });

  wrap.append(card(null,
    curveChart({ rows, current: { tOutdoor: ev.tOutdoor, flow: ev.result.flow } }),
    el('div', { class: 'legend' },
      el('span', { class: 'k flow' }, 'prívod'),
      el('span', { class: 'k ret' }, 'spiatočka'),
      el('span', { class: 'k now' }, 'teraz')),
    el('p', { class: 'hint' }, `Strmosť krivky ≈ ${slope}. Pri ${state.building.tOutDesign} °C vonku dá krivka `
      + `${state.curve.tFlowDesign} °C do radiátorov.`)));

  // ---- dve najdolezitejsie paky ------------------------------------------
  wrap.append(card('Dve páky, ktoré stačia',
    row('Posun krivky',
      slider({
        value: state.curve.shift, min: -10, max: 10, step: 0.5,
        format: (v) => `${v > 0 ? '+' : ''}${v} K`,
        onInput: (v) => { state.curve.shift = v; save(); rerender(); },
      }),
      'Zdvihne či zníži celú krivku. Použi, keď je rovnako chladno v mraze aj na jeseň.'),
    row('Strmosť krivky',
      slider({
        value: state.curve.tFlowDesign, min: 35, max: 80, step: 1,
        format: (v) => `${v} °C`,
        onInput: (v) => {
          state.curve.tFlowDesign = v;
          if (state.curve.tReturnDesign > v - 3) state.curve.tReturnDesign = v - 10;
          save(); rerender();
        },
      }),
      `Teplota prívodu pri ${state.building.tOutDesign} °C vonku. Použi, keď je zima len v mraze.`),
    el('p', { class: 'hint' },
      'Pravidlo: meň vždy len jednu vec a počkaj aspoň pol dňa, kým sa byt ustáli.')));

  // ---- automaticke ucenie -------------------------------------------------
  const sug = suggestAdjustment(state.log, state);
  const canTune = canTuneNow(state);
  wrap.append(card('Automatické doladenie',
    el('p', { class: 'hint' }, sug.reason),
    el('div', { class: 'sug-row' },
      badge(`${sug.samples} záznamov`, 'info'),
      badge(`spoľahlivosť: ${sug.confidence}`, sug.confidence === 'vysoka' ? 'ok' : 'info'),
      sug.shiftDelta ? badge(`posun ${sug.shiftDelta > 0 ? '+' : ''}${sug.shiftDelta} K`, 'tip') : null,
      sug.flowDesignDelta ? badge(`strmosť ${sug.flowDesignDelta > 0 ? '+' : ''}${sug.flowDesignDelta} K`, 'tip') : null),
    button(canTune ? 'Použiť návrh' : 'Počkaj, byt sa ešte ustaľuje', {
      disabled: !canTune || (!sug.shiftDelta && !sug.flowDesignDelta),
      onClick: () => {
        state.curve.shift = round1(state.curve.shift + sug.shiftDelta);
        state.curve.tFlowDesign = round1(state.curve.tFlowDesign + sug.flowDesignDelta);
        state.settings.lastTuneAt = Date.now();
        state.log.unshift({ ts: Date.now(), type: 'ladenie', note: sug.reason });
        save(); toast('Krivka upravená', 'ok'); rerender();
      },
    }),
    !canTune ? el('p', { class: 'hint' },
      `Poslednú úpravu som robil nedávno. Budova reaguje pomaly — ďalšia úprava o ${state.settings.tuneMinHours} h.`) : null));

  // ---- detailne parametre -------------------------------------------------
  wrap.append(card('Detailné parametre',
    row('Návrhová spiatočka', numberField({
      value: state.curve.tReturnDesign, min: 25, max: 75, step: 1, suffix: '°C',
      onChange: (v) => { state.curve.tReturnDesign = Math.min(v, state.curve.tFlowDesign - 2); save(); rerender(); },
    }), 'Rozdiel prívod–spiatočka; menší spád = vyšší prietok.'),
    row('Typ vykurovacích telies', el('div', { class: 'seg' },
      [['1.1', 'Podlahové'], ['1.3', 'Radiátory'], ['1.4', 'Konvektory']].map(([v, label]) =>
        button(label, {
          variant: String(state.curve.exponent) === v ? 'seg active' : 'seg',
          onClick: () => { state.curve.exponent = Number(v); save(); rerender(); },
        }))), 'Ovplyvňuje tvar (zakrivenie) krivky.'),
    row('Minimálny prívod', numberField({
      value: state.curve.tFlowMin, min: 20, max: 45, step: 1, suffix: '°C',
      onChange: (v) => { state.curve.tFlowMin = v; save(); rerender(); },
    }), 'Pod touto hodnotou by kotol len taktoval.'),
    row('Maximálny prívod', numberField({
      value: state.curve.tFlowMax, min: 40, max: state.boiler.tFlowMaxAllowed, step: 1, suffix: '°C',
      onChange: (v) => { state.curve.tFlowMax = v; save(); rerender(); },
    }), `Kotol dovolí najviac ${state.boiler.tFlowMaxAllowed} °C.`),
    row('Nočný útlm', slider({
      value: state.curve.nightShift, min: -12, max: 0, step: 1,
      format: (v) => `${v} K`,
      onInput: (v) => { state.curve.nightShift = v; save(); rerender(); },
    }), `${state.curve.nightFrom} – ${state.curve.nightTo}. V paneláku nemá zmysel prehnaný útlm.`),
    row('Prepočet zo strmosti', el('div', { class: 'inline' },
      numberField({
        value: slope, min: 0.2, max: 3, step: 0.05, suffix: 'k',
        onChange: (v) => {
          state.curve.tFlowDesign = flowDesignFromSlope({
            tIndoorDesign: state.thermostat.setpointDay,
            tOutdoorDesign: state.building.tOutDesign,
            slope: v,
          });
          save(); rerender();
        },
      })), 'Ak budeš niekedy zadávať krivku priamo do kotla s vonkajšou sondou.')));

  // ---- tabulka ------------------------------------------------------------
  wrap.append(card('Tabuľka (vytlač si ju ku kotlu)',
    el('table', { class: 'curve-table' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Vonku'), el('th', {}, 'Prívod'), el('th', {}, 'Spiatočka'))),
      el('tbody', {}, rows.map((r) => el('tr', { class: r.heatingNeeded ? '' : 'off' },
        el('td', {}, `${r.tOutdoor} °C`),
        el('td', {}, r.heatingNeeded ? `${r.flow} °C` : '—'),
        el('td', {}, r.heatingNeeded ? `${r.return} °C` : '—')))))));

  return wrap;
}

const round1 = (v) => Math.round(v * 10) / 10;
