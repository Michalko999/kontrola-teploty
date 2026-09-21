/** Senzory — WiFi teplomery. Funguje aj bez nich, appka je na ne len pripravena. */

import { el, card, button, row, select, toast, fmtTemp, fmtDateTime } from '../ui.js';
import { state, save } from '../store.js';
import { SENSOR_TYPES, readSensor, friendlyError, newSensorId } from '../sensors.js';

export function render(ctx) {
  const wrap = el('div', { class: 'view' });
  const rerender = ctx.rerender;

  wrap.append(card('WiFi teplomery',
    el('p', { class: 'hint' },
      'Zatiaľ ich nemáš — nič sa nedeje, appka funguje aj bez nich. Keď ich kúpiš, pridaj ich sem, '
      + 'priraď k izbám a appka prestane potrebovať tvoju spätnú väzbu: krivku si doladí z nameraných teplôt.'),
    button('+ Pridať senzor', {
      onClick: () => {
        state.sensors.push({
          id: newSensorId(), type: 'manual', label: `Teplomer ${state.sensors.length + 1}`,
          host: '', url: '', path: '', entity: '', token: '', manualTemp: null,
        });
        save(); rerender();
      },
    })));

  state.sensors.forEach((s) => wrap.append(sensorCard(s, rerender)));

  if (!state.sensors.length) {
    wrap.append(card('Čo sa oplatí kúpiť',
      el('ul', { class: 'tips' },
        el('li', { class: 'tip lvl-info' }, el('strong', {}, 'Shelly H&T Gen3'),
          el('p', {}, 'Batériový, meria teplotu aj vlhkosť, má lokálne HTTP API — appka ho vie čítať priamo, bez cloudu.')),
        el('li', { class: 'tip lvl-info' }, el('strong', {}, 'Zigbee teplomer + Home Assistant'),
          el('p', {}, 'Lacné čidlá (Aqara, Sonoff) cez HA. Appka číta z HA cez token. Najlepšie, ak plánuješ viac smart vecí.')),
        el('li', { class: 'tip lvl-info' }, el('strong', {}, 'Čokoľvek s HTTP/JSON'),
          el('p', {}, 'Ak zariadenie vie vrátiť JSON s teplotou, stačí zadať adresu a cestu k hodnote.'))),
      el('p', { class: 'hint' },
        'Minimum: jeden teplomer do obývačky vedľa termostatu — appka si overí, či termostat '
        + 'neukazuje vedľa. Ďalšie do detskej a spálne ukážu, či tam hlavice držia, čo majú.')));
  }

  wrap.append(card('Prečo senzor niekedy nejde načítať',
    el('p', { class: 'hint' },
      'Ak appku otvoríš cez https:// (napr. z internetu), prehliadač jej zakáže spojiť sa s http:// zariadením '
      + 'v domácej sieti. Vtedy appku spusti priamo z domácej siete cez http:// — návod je v docs/wifi-senzory.md.')));

  return wrap;
}

function sensorCard(s, rerender) {
  const readout = el('div', { class: 'readout' }, '—');
  const typeDef = SENSOR_TYPES.find((t) => t.id === s.type);
  const assigned = state.rooms.find((r) => r.sensorId === s.id);

  const fields = [];
  if (typeDef.needs.includes('host')) fields.push(textRow('Adresa v sieti', s, 'host', '192.168.1.50', rerender));
  if (typeDef.needs.includes('url')) fields.push(textRow('URL', s, 'url', 'http://192.168.1.50/status', rerender));
  if (typeDef.needs.includes('path')) fields.push(textRow('Cesta k teplote', s, 'path', 'napr. temperature:0.tC', rerender));
  if (typeDef.needs.includes('entity')) fields.push(textRow('Entita', s, 'entity', 'sensor.obyvacka_temperature', rerender));
  if (typeDef.needs.includes('token')) fields.push(textRow('Token', s, 'token', 'dlhodobý prístupový token', rerender, 'password'));
  if (s.type === 'manual') {
    fields.push(row('Teplota', el('input', {
      type: 'number', inputmode: 'decimal', step: '0.1', value: s.manualTemp ?? '',
      onchange: (e) => {
        const v = Number(e.target.value);
        s.manualTemp = Number.isFinite(v) ? v : null;
        s.manualAt = Date.now(); save(); rerender();
      },
    }), s.manualAt ? `Zadané ${fmtDateTime(s.manualAt)}` : 'Zadaj odčítanú teplotu.'));
  }

  return card(null,
    row('Názov', el('input', {
      type: 'text', value: s.label,
      onchange: (e) => { s.label = e.target.value; save(); },
    }), assigned ? `Priradený k izbe ${assigned.name}` : 'Zatiaľ nepriradený k izbe'),
    row('Typ', select({
      value: s.type,
      options: SENSOR_TYPES.map((t) => ({ value: t.id, label: t.label })),
      onChange: (v) => { s.type = v; save(); rerender(); },
    })),
    ...fields,
    el('div', { class: 'inline' },
      button('Vyskúšať', {
        variant: 'ghost',
        onClick: async () => {
          readout.textContent = 'Čítam…';
          readout.classList.remove('err');
          try {
            const v = await readSensor(s);
            readout.textContent = `${fmtTemp(v.temp)}${v.humidity != null ? ` · ${v.humidity} %` : ''}${v.battery != null ? ` · batéria ${v.battery} %` : ''}`;
            toast('Senzor odpovedal', 'ok');
          } catch (e) {
            readout.textContent = friendlyError(e, s);
            readout.classList.add('err');
          }
        },
      }),
      button('Zmazať', {
        variant: 'danger',
        onClick: () => {
          state.sensors = state.sensors.filter((x) => x.id !== s.id);
          state.rooms.forEach((r) => { if (r.sensorId === s.id) r.sensorId = null; });
          save(); rerender();
        },
      })),
    readout);
}

function textRow(label, obj, key, placeholder, rerender, type = 'text') {
  return row(label, el('input', {
    type, value: obj[key] || '', placeholder, autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false',
    onchange: (e) => { obj[key] = e.target.value.trim(); save(); },
  }));
}
