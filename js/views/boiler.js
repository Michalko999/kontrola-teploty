/** Kotol — co nastavit, preco, a co by sa dalo zautomatizovat. */

import { el, card, row, numberField, toggle, select, button } from '../ui.js';
import { state, save } from '../store.js';
import { VICTRIX_TERA_28, checklist } from '../boiler.js';
import { evaluate } from '../engine.js';

export function render(ctx) {
  const wrap = el('div', { class: 'view' });
  const rerender = ctx.rerender;
  const ev = evaluate(state, ctx.weather);

  wrap.append(card(VICTRIX_TERA_28.model,
    el('dl', { class: 'spec' },
      spec('Minimálny výkon', `${VICTRIX_TERA_28.minKw} kW`),
      spec('Max. výkon kúrenie', `${VICTRIX_TERA_28.maxHeatingKw} kW`),
      spec('Max. výkon TÚV', `${VICTRIX_TERA_28.maxDhwKw} kW`),
      spec('Max. teplota vody', `${VICTRIX_TERA_28.tFlowMaxAllowed} °C`),
      spec('Typ', 'kondenzačný, kombinovaný')),
    el('ul', { class: 'tips' }, VICTRIX_TERA_28.notes.map((n) => el('li', { class: 'tip lvl-info' }, n)))));

  wrap.append(card('Čo máš nastavené teraz',
    row('Teplota vykurovacej vody', numberField({
      value: state.boiler.currentFlowSet, min: 25, max: state.boiler.tFlowMaxAllowed, step: 1, suffix: '°C',
      onChange: (v) => { state.boiler.currentFlowSet = v; save(); rerender(); },
    }), `Appka dnes odporúča ${ev.result.heatingNeeded ? ev.result.flow + ' °C' : 'kúrenie vypnúť'}.`),
    row('Max. výkon kúrenia', numberField({
      value: state.boiler.maxHeatingPowerPercent, min: 30, max: 100, step: 5, suffix: '%',
      onChange: (v) => { state.boiler.maxHeatingPowerPercent = v; save(); rerender(); },
    }), 'Servisné menu. Zníženie pomáha proti taktovaniu.'),
    row('Anti-cycle (oneskorenie zápalu)', numberField({
      value: state.boiler.antiCycleMinutes, min: 0, max: 15, step: 1, suffix: 'min',
      onChange: (v) => { state.boiler.antiCycleMinutes = v; save(); rerender(); },
    })),
    row('Vonkajšia sonda pripojená', toggle({
      checked: state.boiler.hasOutdoorProbe,
      onChange: (v) => { state.boiler.hasOutdoorProbe = v; save(); rerender(); },
    }), 'Ak ju raz dokúpiš, appka prepne na kontrolný režim.'),
    row('Podpora OpenTherm', select({
      value: String(state.boiler.hasOpenTherm),
      options: [{ value: 'null', label: 'Neviem / neoverené' }, { value: 'true', label: 'Áno' }, { value: 'false', label: 'Nie' }],
      onChange: (v) => { state.boiler.hasOpenTherm = v === 'null' ? null : v === 'true'; save(); rerender(); },
    }), 'Over v návode — rozhoduje o tom, či sa dá kotol raz riadiť automaticky.')));

  // Hodnoty su cele vety, nie kratke cisla — v dvoch stlpcoch by na telefone
  // rozdrvili nazov a vytiekli mimo obrazovku. Preto kazda polozka ako blok.
  wrap.append(card('Odporúčané nastavenie',
    el('ul', { class: 'check' },
      checklist(state, ev.result.heatingNeeded ? ev.result.flow : null).map((c) => el('li', {},
        el('div', { class: 'check-item' }, c.item),
        el('div', { class: 'check-val' }, c.value),
        el('small', {}, c.why))))));

  wrap.append(card('Dôležité upozornenie',
    el('p', { class: 'hint' },
      'Presné názvy a čísla parametrov v servisnom menu sa líšia podľa verzie kotla. '
      + 'Appka hovorí, ČO nastaviť a prečo — číslo parametra si over v návode alebo nechaj na servisného technika. '
      + 'Do kotla sa nič neposiela, všetko nastavuješ ručne na jeho paneli.')));

  wrap.append(card('Ak by si to chcel raz plne automaticky',
    el('ol', { class: 'howto' },
      el('li', {}, el('strong', {}, 'Najlacnejšie: '), 'vonkajšia sonda ku kotlu. Kotol si ekvitermiku počíta sám, appka zostane na kontrolu a ladenie krivky.'),
      el('li', {}, el('strong', {}, 'Najflexibilnejšie: '), 'OpenTherm termostat alebo OpenTherm gateway. Vtedy sa dá požadovaná teplota vody posielať do kotla po zbernici — appka by vedela zapisovať číslo priamo.'),
      el('li', {}, el('strong', {}, 'Bez zásahu do kotla: '), 'WiFi teplomery v izbách (záložka Senzory). Appka bude vedieť, ako reálne kúriš, a doladí krivku sama — prestavenie na kotli ostane ručné.')),
    button('Nastaviť senzory', { variant: 'ghost', onClick: () => ctx.go('sensors') })));

  return wrap;
}

const spec = (k, v) => el('div', { class: 'spec-item' }, el('dt', {}, k), el('dd', {}, v));
