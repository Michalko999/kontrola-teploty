/** Izby — interaktivny podorys podla nakresu + nastavenie hlavic a termostatu. */

import { el, card, button, row, numberField, slider, select, toast, fmtTemp } from '../ui.js';
import { state, save, room } from '../store.js';
import { computeThermostatOffset } from '../tuning.js';
import { readSensor, friendlyError } from '../sensors.js';

/** Poloha termostatickej hlavice pre pozadovanu teplotu (bezne stupnice 1–5). */
export function trvPosition(targetC) {
  const pos = 1 + (targetC - 12) / 4;      // 1≈12 °C, 3≈20 °C, 5≈28 °C
  const clamped = Math.max(0.5, Math.min(5, pos));
  const whole = Math.floor(clamped);
  const frac = clamped - whole;
  if (frac < 0.2) return `${whole}`;
  if (frac < 0.4) return `${whole} · (tesne nad ${whole})`;
  if (frac < 0.7) return `${whole}–${whole + 1} (v polovici)`;
  return `tesne pod ${whole + 1}`;
}

export function render(ctx) {
  const wrap = el('div', { class: 'view' });
  const rerender = ctx.rerender;
  let selected = ctx.param || null;

  wrap.append(card('Pôdorys', floorPlan((id) => { ctx.go('rooms', id); }, selected),
    el('p', { class: 'hint' },
      'Ťukni na izbu a nastav jej teplotu. Červená značka = nové miesto termostatu v chodbe.')));

  // ---- termostat ----------------------------------------------------------
  const ref = room(state.thermostat.referenceRoom);
  wrap.append(card('Termostat v chodbe',
    el('p', { class: 'hint' }, state.thermostat.placementNote),
    row('Referenčná izba', select({
      value: state.thermostat.referenceRoom,
      options: state.rooms.filter((r) => r.hasRadiator).map((r) => ({ value: r.id, label: `${r.id} — ${r.name}` })),
      onChange: (v) => { state.thermostat.referenceRoom = v; save(); rerender(); },
    }), 'Izba, ktorej teplotu chceš v skutočnosti riadiť.'),
    row('Chcem v referenčnej izbe', numberField({
      value: state.thermostat.setpointDay, min: 16, max: 26, step: 0.5, suffix: '°C',
      onChange: (v) => { state.thermostat.setpointDay = v; save(); rerender(); },
    })),
    row('Rozdiel chodba − izba', slider({
      value: state.thermostat.offset, min: -4, max: 2, step: 0.1,
      format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} K`,
      onInput: (v) => { state.thermostat.offset = Math.round(v * 10) / 10; save(); rerender(); },
    }), 'Chodba nemá radiátor, býva v nej chladnejšie.'),
    el('div', { class: 'setpoint-box' },
      el('div', {}, 'Na termostate nastav'),
      el('strong', {}, `${round1(state.thermostat.setpointDay + state.thermostat.offset)} °C`),
      el('small', {}, `aby bolo v izbe ${ref?.name || '—'} ${state.thermostat.setpointDay} °C`)),
    offsetHelper(rerender),
    row('Nočná teplota', numberField({
      value: state.thermostat.setpointNight, min: 14, max: 24, step: 0.5, suffix: '°C',
      onChange: (v) => { state.thermostat.setpointNight = v; save(); rerender(); },
    }))));

  // ---- zoznam izieb --------------------------------------------------------
  wrap.append(card('Izby',
    el('div', { class: 'rooms-list' },
      state.rooms.map((r) => roomCard(r, selected === r.id, ctx)))));

  wrap.append(card('Ako nastaviť hlavice',
    el('ol', { class: 'howto' },
      el('li', {}, `V referenčnej izbe (${ref?.name || '—'}) nechaj hlavicu naplno otvorenú. Inak si hlavica a termostat "lezú do cesty".`),
      el('li', {}, 'V ostatných izbách nastav polohu podľa tabuľky vyššie a ďalej ju nediraj — hlavica si teplotu drží sama.'),
      el('li', {}, 'Nezatváraj naraz všetky hlavice. Kotol má minimálny výkon 4,3 kW a potreboval by teplo niekam dať — inak začne taktovať.'),
      el('li', {}, 'Hlavicu nezakrývaj záclonou ani nábytkom, meria vzduch okolo seba.'),
      el('li', {}, 'Po zmene počkaj 4–6 hodín. Radiátory a steny reagujú pomaly.'))));

  return wrap;
}

function roomCard(r, isOpen, ctx) {
  const isRef = r.id === state.thermostat.referenceRoom;
  const head = el('button', {
    class: `room-head ${isOpen ? 'open' : ''}`, type: 'button',
    onclick: () => ctx.go('rooms', isOpen ? null : r.id),
  },
    el('span', { class: 'room-id' }, r.id),
    el('span', { class: 'room-name' }, r.name, isRef ? el('em', {}, ' · referenčná') : null),
    el('span', { class: 'room-temp' }, `${r.target} °C`));

  if (!isOpen) return el('div', { class: 'room' }, head);

  const body = el('div', { class: 'room-body' },
    row('Požadovaná teplota', numberField({
      value: r.target, min: 14, max: 26, step: 0.5, suffix: '°C',
      onChange: (v) => { r.target = v; save(); ctx.rerender(); },
    })),
    r.hasTrv
      ? row('Poloha hlavice', el('strong', {}, isRef ? 'naplno otvorená' : trvPosition(r.target)),
          isRef ? 'Referenčná izba — riadi ju termostat.' : 'Orientačne, stupnice sa líšia podľa výrobcu.')
      : el('p', { class: 'hint' }, 'Bez radiátora a bez hlavice.'),
    r.wall ? el('p', { class: 'hint' }, `Radiátor na ${r.wall}nej stene${r.extDoor ? `, ${r.extDoor}` : ''}.`) : null,
    r.note ? el('p', { class: 'hint' }, r.note) : null,
    sensorPicker(r, ctx));

  return el('div', { class: 'room' }, head, body);
}

function sensorPicker(r, ctx) {
  const options = [{ value: '', label: 'Žiadny senzor' },
    ...state.sensors.map((s) => ({ value: s.id, label: s.label || s.id }))];
  const readout = el('span', { class: 'readout' }, r.sensorId ? '…' : '—');

  if (r.sensorId) {
    const s = state.sensors.find((x) => x.id === r.sensorId);
    if (s) {
      readSensor(s)
        .then((v) => { readout.textContent = fmtTemp(v.temp); })
        .catch((e) => { readout.textContent = friendlyError(e, s); readout.classList.add('err'); });
    }
  }

  return row('WiFi teplomer', el('div', { class: 'inline' },
    select({
      value: r.sensorId || '',
      options,
      onChange: (v) => { r.sensorId = v || null; save(); ctx.rerender(); },
    }), readout),
  state.sensors.length ? null : 'Zatiaľ žiadne — pridáš ich v záložke Senzory.');
}

function offsetHelper(rerender) {
  let tHall = '', tRoom = '';
  const inputHall = el('input', { type: 'number', inputmode: 'decimal', step: '0.1', placeholder: 'chodba',
    oninput: (e) => { tHall = e.target.value; } });
  const inputRoom = el('input', { type: 'number', inputmode: 'decimal', step: '0.1', placeholder: 'izba',
    oninput: (e) => { tRoom = e.target.value; } });

  return el('details', { class: 'helper' },
    el('summary', {}, 'Zmerať rozdiel presne'),
    el('p', { class: 'hint' },
      'Polož teplomer na chvíľu k termostatu a potom do referenčnej izby (obe merania v rovnakom čase dňa, dvere ako obvykle).'),
    el('div', { class: 'inline' }, inputHall, inputRoom,
      button('Spočítať', {
        onClick: () => {
          const a = Number(tHall), b = Number(tRoom);
          if (!Number.isFinite(a) || !Number.isFinite(b)) return toast('Zadaj obe teploty', 'warn');
          state.thermostat.offset = computeThermostatOffset(a, b);
          state.thermostat.offsetMeasuredAt = Date.now();
          save(); toast(`Rozdiel ${state.thermostat.offset} K uložený`, 'ok'); rerender();
        },
      })));
}

/** SVG podorys presne podla nakresu: C a B hore, D a A dole, chodba v strede. */
export function floorPlan(onPick, selected) {
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (n, a = {}) => {
    const e = document.createElementNS(NS, n);
    for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v));
    return e;
  };
  const svg = mk('svg', { viewBox: '0 0 300 262', class: 'plan', role: 'img', 'aria-label': 'Pôdorys bytu' });

  const rooms = [
    { id: 'C', x: 20,  y: 20,  w: 130, h: 110 },
    { id: 'B', x: 190, y: 20,  w: 90,  h: 100 },
    { id: 'H', x: 150, y: 20,  w: 40,  h: 200 },
    { id: 'D', x: 20,  y: 130, w: 130, h: 90  },
    { id: 'A', x: 190, y: 120, w: 90,  h: 100 },
  ];

  for (const r of rooms) {
    const data = state.rooms.find((x) => x.id === r.id);
    const g = mk('g', { class: `plan-room ${selected === r.id ? 'sel' : ''}`, tabindex: '0', role: 'button',
      'aria-label': `${data?.name || r.id}, ${data?.target} °C` });
    g.appendChild(mk('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 2 }));
    const label = mk('text', { x: r.x + r.w / 2, y: r.y + r.h / 2 - 4, class: 'plan-id', 'text-anchor': 'middle' });
    label.textContent = r.id === 'H' ? '' : r.id;
    g.appendChild(label);
    const name = mk('text', { x: r.x + r.w / 2, y: r.y + r.h / 2 + 12, class: 'plan-name', 'text-anchor': 'middle' });
    name.textContent = data?.name || '';
    if (r.id === 'H') { name.setAttribute('transform', `rotate(-90 ${r.x + r.w / 2} ${r.y + r.h / 2 + 12})`); }
    g.appendChild(name);
    const temp = mk('text', { x: r.x + r.w / 2, y: r.y + r.h / 2 + 27, class: 'plan-temp', 'text-anchor': 'middle' });
    if (r.id !== 'H') temp.textContent = `${data?.target} °C`;
    g.appendChild(temp);
    g.addEventListener('click', () => onPick(r.id));
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(r.id); } });
    svg.appendChild(g);
  }

  // radiatory (podla nakresu: C a D na zapadnej stene, B a A na vychodnej)
  const rad = (x, y, h) => svg.appendChild(mk('rect', { x, y, width: 5, height: h, class: 'plan-rad', rx: 1 }));
  rad(21, 45, 55);    // C — zapad
  rad(21, 150, 50);   // D — zapad
  rad(274, 38, 60);   // B — vychod
  rad(274, 140, 55);  // A — vychod

  // balkonove dvere a vchod
  const door = (x, y, w, label, lx, ly, anchor = 'middle') => {
    svg.appendChild(mk('rect', { x, y, width: w, height: 4, class: 'plan-door' }));
    const t = mk('text', { x: lx, y: ly, class: 'plan-note', 'text-anchor': anchor });
    t.textContent = label;
    svg.appendChild(t);
  };
  door(28, 218, 26, 'balkón', 41, 234);
  door(240, 218, 28, 'balkón', 254, 234);
  door(158, 218, 24, 'vchod', 170, 234);

  // termostat — cervena znacka na stene chodby pri obyvacke
  svg.appendChild(mk('rect', { x: 146, y: 158, width: 8, height: 24, rx: 4, class: 'plan-thermo' }));
  const tl = mk('text', { x: 140, y: 152, class: 'plan-note thermo', 'text-anchor': 'end' });
  tl.textContent = 'termostat';
  svg.appendChild(tl);

  return svg;
}

const round1 = (v) => Math.round(v * 10) / 10;
