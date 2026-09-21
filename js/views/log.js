/** Dennik — historia nastaveni a spatnej vazby. */

import { el, card, button, badge, toast, fmtDateTime } from '../ui.js';
import { state, save } from '../store.js';
import { FEEDBACK_OPTIONS } from '../tuning.js';
import { lineChart } from '../chart.js';

const LABELS = {
  'nastavenie': 'Prestavenie kotla',
  'spatna-vazba': 'Spätná väzba',
  'ladenie': 'Úprava krivky',
  'poznamka': 'Poznámka',
};

export function render(ctx) {
  const wrap = el('div', { class: 'view' });
  const rerender = ctx.rerender;

  const noteInput = el('input', { type: 'text', placeholder: 'napr. vetrali sme celé doobedie' });
  wrap.append(card('Pridať poznámku',
    el('div', { class: 'inline' }, noteInput,
      button('Uložiť', {
        onClick: () => {
          const v = noteInput.value.trim();
          if (!v) return toast('Napíš najprv poznámku', 'warn');
          state.log.unshift({ ts: Date.now(), type: 'poznamka', note: v, ignoreForTuning: true });
          save(); noteInput.value = ''; toast('Uložené', 'ok'); rerender();
        },
      }))));

  const fbPoints = state.log
    .filter((e) => e.type === 'spatna-vazba' && typeof e.tOut === 'number')
    .slice(0, 60).reverse()
    .map((e) => ({ x: e.ts, y: e.tOut }));
  if (fbPoints.length > 1) {
    wrap.append(card('Vonkajšia teplota pri spätnej väzbe',
      lineChart({ series: [{ points: fbPoints }], yLabel: 'Vonkajšia teplota pri hodnoteniach' }),
      el('p', { class: 'hint' }, 'Čím rôznejšie počasie pokryjú tvoje hodnotenia, tým presnejšie vie appka nastaviť strmosť krivky.')));
  }

  const entries = state.log.slice(0, 200);
  wrap.append(card(`Záznamy (${state.log.length})`,
    entries.length
      ? el('ul', { class: 'log' }, entries.map((e) => logItem(e, rerender)))
      : el('p', { class: 'hint' }, 'Zatiaľ prázdne. Každé hodnotenie na prehľade sa zapíše sem.'),
    state.log.length
      ? button('Vymazať denník', {
          variant: 'danger',
          onClick: () => {
            if (!confirm('Naozaj vymazať celý denník? Appka stratí podklady na učenie krivky.')) return;
            state.log = []; save(); rerender();
          },
        })
      : null));

  return wrap;
}

function logItem(e, rerender) {
  const fb = FEEDBACK_OPTIONS.find((o) => o.id === e.feedback);
  return el('li', { class: `log-item ${e.type}` },
    el('div', { class: 'log-head' },
      el('strong', {}, LABELS[e.type] || e.type),
      el('small', {}, fmtDateTime(e.ts))),
    el('div', { class: 'log-body' },
      fb ? badge(`${fb.emoji} ${fb.label}`, 'tip') : null,
      typeof e.tOut === 'number' ? badge(`vonku ${e.tOut} °C`, 'info') : null,
      typeof e.flowSet === 'number' ? badge(`prívod ${e.flowSet} °C`, 'info') : null,
      e.note ? el('span', { class: 'log-note' }, e.note) : null),
    el('button', {
      class: 'log-del', type: 'button', title: 'Zmazať záznam',
      onclick: () => {
        const i = state.log.indexOf(e);
        if (i >= 0) state.log.splice(i, 1);
        save(); rerender();
      },
    }, '×'));
}
