/** Prehlad — hlavna obrazovka: co nastavit na kotli prave teraz. */

import { el, card, button, badge, toast, fmtTemp, fmtDay, fmtDateTime, num } from '../ui.js';
import { state, save, addLog } from '../store.js';
import { evaluate, table, plan } from '../engine.js';
import { advise } from '../boiler.js';
import { curveChart, lineChart } from '../chart.js';
import { FEEDBACK_OPTIONS } from '../tuning.js';
import { readAll } from '../sensors.js';

export function render(ctx) {
  const { weather, refreshWeather, go } = ctx;
  const ev = evaluate(state, weather);

  const wrap = el('div', { class: 'view' });

  // ---- vonkajsia teplota -------------------------------------------------
  const w = weather?.current;
  wrap.append(card(null,
    el('div', { class: 'weather' },
      el('div', { class: 'big-temp' }, w ? `${num(w.temp)}°` : '—'),
      el('div', { class: 'weather-meta' },
        el('div', { class: 'weather-place' }, state.building.location.name || 'Poloha nenastavená'),
        el('small', {}, weather
          ? `pre výpočet ${fmtTemp(ev.tOutdoor)}${ev.windAdj ? ' (s vetrom)' : ''}`
          : 'Bez pripojenia — posledná známa hodnota')),
      button('Obnoviť', { variant: 'ghost', onClick: () => refreshWeather(true) })),
    !state.building.location.lat
      ? el('p', { class: 'hint warn-text' },
          'Nemáš vonkajšie čidlo, preto appka berie teplotu z predpovede. ',
          button('Nastaviť polohu', { variant: 'link', onClick: () => go('settings') }))
      : null));

  // ---- hlavne cislo ------------------------------------------------------
  // Porovnavame cele stupne — kotol jemnejsie ani nastavit nejde.
  const diff = (ev.flowSet ?? 0) - state.boiler.currentFlowSet;
  wrap.append(card(null,
    el('div', { class: 'headline' },
      el('div', { class: 'headline-label' }, ev.result.heatingNeeded ? 'Nastav na kotli' : 'Kúrenie netreba'),
      el('div', { class: 'headline-value' },
        ev.result.heatingNeeded ? `${ev.flowSet}` : 'OFF',
        ev.result.heatingNeeded ? el('span', { class: 'unit' }, '°C') : null),
      el('div', { class: 'headline-sub' },
        ev.result.heatingNeeded
          ? `teplota vykurovacej vody${ev.night ? ' · nočný útlm' : ''}`
          : `vonku je ${fmtTemp(ev.tOutdoor)}, nad medzou ${fmtTemp(state.building.heatingLimit)}`)),
    ev.result.heatingNeeded
      ? el('div', { class: 'headline-extra' },
          badge(`spiatočka ~${fmtTemp(ev.result.return)}`, ev.condensing.ok ? 'ok' : 'warn'),
          badge(`záťaž ${Math.round(ev.result.phi * 100)} %`, 'info'),
          badge(`~${num(ev.cycling.demandKw)} kW`, ev.cycling.level === 'vysoke' ? 'warn' : 'info'))
      : null,
    Math.abs(diff) >= 0.5 && ev.result.heatingNeeded
      ? el('div', { class: 'action-strip' },
          el('span', {}, `Na kotli máš ${fmtTemp(state.boiler.currentFlowSet, 0)}`),
          button(`Nastavil som ${ev.flowSet} °C`, {
            onClick: () => {
              state.boiler.currentFlowSet = ev.flowSet;
              addLog({ type: 'nastavenie', tOut: ev.tOutdoor, phi: ev.result.phi, flowSet: ev.flowSet });
              save();
              toast('Zapísané do denníka 👍', 'ok');
            },
          }))
      : null));

  // ---- spatna vazba ------------------------------------------------------
  wrap.append(card('Ako je teraz v byte?',
    el('p', { class: 'hint' },
      `Referenčná izba: ${state.rooms.find((r) => r.id === state.thermostat.referenceRoom)?.name || '—'}. `
      + 'Klikaj raz za čas — appka sa z toho naučí krivku doladiť.'),
    el('div', { class: 'feedback' },
      FEEDBACK_OPTIONS.map((o) => button(`${o.emoji} ${o.label}`, {
        variant: 'chip',
        onClick: () => {
          addLog({
            type: 'spatna-vazba', feedback: o.id, tOut: ev.tOutdoor,
            phi: ev.result.phi, flowSet: state.boiler.currentFlowSet,
          });
          toast(`Zapísané: ${o.label}`, 'ok');
        },
      })))));

  // ---- odporucania -------------------------------------------------------
  const tips = advise({ state, tOutdoor: ev.tOutdoor, result: ev.result });
  wrap.append(card('Čo s tým',
    el('ul', { class: 'tips' },
      tips.map((t) => el('li', { class: `tip lvl-${t.level}` },
        el('strong', {}, t.title), el('p', {}, t.text))))));

  // ---- graf krivky -------------------------------------------------------
  const rows = table(state, { night: ev.night });
  wrap.append(card('Krivka',
    curveChart({ rows, current: { tOutdoor: ev.tOutdoor, flow: ev.result.flow } }),
    el('div', { class: 'legend' },
      el('span', { class: 'k flow' }, 'prívod'),
      el('span', { class: 'k ret' }, 'spiatočka'),
      el('span', { class: 'k now' }, 'teraz')),
    button('Upraviť krivku', { variant: 'ghost', onClick: () => go('curve') })));

  // ---- plan na dalsie dni ------------------------------------------------
  const days = plan(state, weather, 3);
  if (days.length) {
    wrap.append(card('Najbližšie dni',
      el('table', { class: 'dayplan' },
        el('thead', {}, el('tr', {},
          el('th', {}, 'Deň'), el('th', {}, 'Vonku'), el('th', {}, 'Nastav'))),
        el('tbody', {}, days.map((d) => el('tr', {},
          el('td', {}, fmtDay(d.date)),
          el('td', {}, `${num(d.min)}° … ${num(d.max)}°`),
          el('td', {}, d.heating ? el('strong', {}, `${d.flowSet} °C`) : 'kúriť netreba'))))),
      el('p', { class: 'hint' }, 'Hodnota platí pre priemer dňa. Ak ide silný mráz, v najchladnejšej hodine by krivka chcela až '
        + `${Math.max(...days.map((d) => d.flowColdSet))} °C — netreba prestavovať, termostat to dorovná.`)));

    const fc = weather.forecast.slice(0, 48);
    wrap.append(card('Vonkajšia teplota (48 h)',
      lineChart({
        series: [{ points: fc.map((p) => ({ x: p.ts, y: p.temp })) }],
        yLabel: 'Predpoveď vonkajšej teploty',
      })));
  }

  // ---- WiFi senzory (ak su) ---------------------------------------------
  if (state.sensors.length) {
    const box = el('div', { class: 'sensor-strip' }, el('small', {}, 'Načítavam senzory…'));
    wrap.append(card('Teploty v izbách', box));
    readAll(state.sensors).then((reads) => {
      box.replaceChildren(...reads.map((r) => {
        const s = state.sensors.find((x) => x.id === r.id);
        const roomName = state.rooms.find((rm) => rm.sensorId === r.id)?.name || s?.label || '—';
        return el('div', { class: `sensor-pill ${r.ok ? '' : 'err'}` },
          el('span', { class: 'sensor-room' }, roomName),
          el('strong', {}, r.ok ? fmtTemp(r.temp) : 'chyba'),
          r.ok && r.ts ? el('small', {}, fmtDateTime(r.ts)) : null);
      }));
    });
  }

  return wrap;
}
