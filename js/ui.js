/** ui.js — male pomocky na skladanie DOM (bez frameworku, aby bola appka lahka). */

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const card = (title, ...body) =>
  el('section', { class: 'card' }, title ? el('h2', {}, title) : null, ...body);

export function row(label, valueNode, hint) {
  return el('div', { class: 'row' },
    el('div', { class: 'row-label' }, label, hint ? el('small', {}, hint) : null),
    el('div', { class: 'row-value' }, valueNode));
}

export function numberField({ value, min, max, step = 1, suffix, onChange, id }) {
  const input = el('input', {
    type: 'number', inputmode: 'decimal', value: String(value),
    min: min ?? '', max: max ?? '', step: String(step), id: id ?? '',
    onchange: (e) => {
      const v = Number(e.target.value);
      if (Number.isFinite(v)) onChange(clampVal(v, min, max));
    },
  });
  return el('div', { class: 'numfield' }, input, suffix ? el('span', { class: 'suffix' }, suffix) : null);
}

export function slider({ value, min, max, step = 0.5, onInput, format = (v) => v }) {
  const out = el('output', {}, format(value));
  const input = el('input', {
    type: 'range', min: String(min), max: String(max), step: String(step), value: String(value),
    oninput: (e) => { out.textContent = format(Number(e.target.value)); },
    onchange: (e) => onInput(Number(e.target.value)),
  });
  return el('div', { class: 'slider' }, input, out);
}

export function toggle({ checked, onChange, label }) {
  return el('label', { class: 'toggle' },
    el('input', { type: 'checkbox', checked: !!checked, onchange: (e) => onChange(e.target.checked) }),
    el('span', { class: 'track' }, el('span', { class: 'knob' })),
    label ? el('span', { class: 'toggle-label' }, label) : null);
}

export function select({ value, options, onChange }) {
  return el('select', { onchange: (e) => onChange(e.target.value) },
    options.map((o) => el('option', { value: o.value, selected: o.value === value }, o.label)));
}

export function button(label, opts = {}) {
  return el('button', { class: `btn ${opts.variant || ''}`.trim(), type: 'button', onclick: opts.onClick, disabled: opts.disabled }, label);
}

export function badge(text, level = 'info') {
  return el('span', { class: `badge ${level}` }, text);
}

let toastTimer;
export function toast(message, level = 'info') {
  let t = document.getElementById('toast');
  if (!t) {
    t = el('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(t);
  }
  t.textContent = message;
  t.className = `toast show ${level}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 3800);
}

export const clampVal = (v, min, max) => {
  let out = v;
  if (Number.isFinite(min)) out = Math.max(min, out);
  if (Number.isFinite(max)) out = Math.min(max, out);
  return out;
};

export const fmtTemp = (v, digits = 1) =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : `${Number(v).toFixed(digits)} °C`;

export function fmtDateTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function fmtDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const diff = Math.round((d - today) / 86400e3);
  if (diff === 0) return 'Dnes';
  if (diff === 1) return 'Zajtra';
  return d.toLocaleDateString('sk-SK', { weekday: 'short', day: 'numeric', month: 'numeric' });
}

/** Vyprazdni prvok. replaceChildren() je atomicke — pri mazani po jednom dieti
 *  sa stihne spustit blur prave odstranovaneho policka a prekreslenie sa zacykli. */
export function clear(node) {
  if (typeof node.replaceChildren === 'function') node.replaceChildren();
  else while (node.firstChild) node.firstChild.remove();
  return node;
}
