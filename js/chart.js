/** chart.js — male SVG grafy bez externych kniznic (appka funguje aj offline). */

import { num } from './format.js';

const NS = 'http://www.w3.org/2000/svg';

function svgEl(name, attrs = {}) {
  const el = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

/**
 * Graf ekvitermickej krivky: os X = vonkajsia teplota (zlava teplo, sprava mraz),
 * os Y = teplota privodu. Zvyrazni aktualny bod.
 */
export function curveChart({ rows, current, width = 320, height = 200 }) {
  const pad = { l: 34, r: 10, t: 12, b: 26 };
  const xs = rows.map((r) => r.tOutdoor);
  const ysFlow = rows.map((r) => r.flow);
  const ysRet = rows.map((r) => r.return);

  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.max(15, Math.floor(Math.min(...ysRet) / 5) * 5 - 5);
  const yMax = Math.ceil(Math.max(...ysFlow) / 5) * 5 + 5;

  // os X obratime: vlavo teplo (+16), vpravo mraz (-15)
  const X = (t) => pad.l + ((xMax - t) / (xMax - xMin)) * (width - pad.l - pad.r);
  const Y = (v) => height - pad.b - ((v - yMin) / (yMax - yMin)) * (height - pad.t - pad.b);

  const svg = svgEl('svg', {
    viewBox: `0 0 ${width} ${height}`, class: 'chart', role: 'img',
    'aria-label': 'Graf ekvitermickej krivky',
  });

  // mriezka + popisky Y
  for (let v = yMin; v <= yMax; v += 10) {
    svg.appendChild(svgEl('line', { x1: pad.l, y1: Y(v), x2: width - pad.r, y2: Y(v), class: 'grid' }));
    const tx = svgEl('text', { x: pad.l - 5, y: Y(v) + 3.5, class: 'axis', 'text-anchor': 'end' });
    tx.textContent = String(v);
    svg.appendChild(tx);
  }
  // popisky X
  for (const t of [15, 10, 5, 0, -5, -10, -15].filter((t) => t <= xMax && t >= xMin)) {
    svg.appendChild(svgEl('line', { x1: X(t), y1: pad.t, x2: X(t), y2: height - pad.b, class: 'grid faint' }));
    const tx = svgEl('text', { x: X(t), y: height - pad.b + 14, class: 'axis', 'text-anchor': 'middle' });
    tx.textContent = `${t}°`;
    svg.appendChild(tx);
  }

  // hranica kondenzacie
  if (55 > yMin && 55 < yMax) {
    svg.appendChild(svgEl('line', { x1: pad.l, y1: Y(55), x2: width - pad.r, y2: Y(55), class: 'dewline' }));
    const lbl = svgEl('text', { x: pad.l + 3, y: Y(55) - 4, class: 'axis dew', 'text-anchor': 'start' });
    lbl.textContent = 'pod čiarou kotol kondenzuje';
    svg.appendChild(lbl);
  }

  const path = (ys, cls) => {
    const d = rows.map((r, i) => `${i ? 'L' : 'M'}${X(r.tOutdoor).toFixed(1)},${Y(ys[i]).toFixed(1)}`).join(' ');
    svg.appendChild(svgEl('path', { d, class: cls, fill: 'none' }));
  };
  path(ysRet, 'line line-return');
  path(ysFlow, 'line line-flow');

  if (current && Number.isFinite(current.tOutdoor)) {
    const cx = X(Math.max(xMin, Math.min(xMax, current.tOutdoor)));
    const cy = Y(Math.max(yMin, Math.min(yMax, current.flow)));
    svg.appendChild(svgEl('line', { x1: cx, y1: pad.t, x2: cx, y2: height - pad.b, class: 'nowline' }));
    svg.appendChild(svgEl('circle', { cx, cy, r: 5, class: 'nowdot' }));
    const lbl = svgEl('text', {
      x: Math.min(cx + 8, width - pad.r - 30), y: Math.max(cy - 9, pad.t + 10), class: 'nowlabel',
    });
    lbl.textContent = `${num(current.flow, 0)} °C`;
    svg.appendChild(lbl);
  }
  return svg;
}

/** Jednoduchy spojnicovy graf casovych radov (predpoved, historia izieb). */
export function lineChart({ series, width = 320, height = 150, yLabel = '°C' }) {
  const pad = { l: 30, r: 8, t: 10, b: 22 };
  const all = series.flatMap((s) => s.points);
  if (!all.length) return svgEl('svg');
  const xMin = Math.min(...all.map((p) => p.x)), xMax = Math.max(...all.map((p) => p.x));
  const yMin = Math.floor(Math.min(...all.map((p) => p.y)) - 1);
  const yMax = Math.ceil(Math.max(...all.map((p) => p.y)) + 1);
  const X = (v) => pad.l + ((v - xMin) / Math.max(1, xMax - xMin)) * (width - pad.l - pad.r);
  const Y = (v) => height - pad.b - ((v - yMin) / Math.max(1, yMax - yMin)) * (height - pad.t - pad.b);

  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, class: 'chart', role: 'img', 'aria-label': yLabel });
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = yMin + ((yMax - yMin) * i) / ticks;
    svg.appendChild(svgEl('line', { x1: pad.l, y1: Y(v), x2: width - pad.r, y2: Y(v), class: 'grid' }));
    const tx = svgEl('text', { x: pad.l - 4, y: Y(v) + 3.5, class: 'axis', 'text-anchor': 'end' });
    tx.textContent = String(Math.round(v));
    svg.appendChild(tx);
  }
  if (0 > yMin && 0 < yMax) {
    svg.appendChild(svgEl('line', { x1: pad.l, y1: Y(0), x2: width - pad.r, y2: Y(0), class: 'zeroline' }));
  }
  series.forEach((s, i) => {
    const d = s.points.map((p, j) => `${j ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
    svg.appendChild(svgEl('path', { d, class: `line series-${i % 4}`, fill: 'none' }));
  });
  series.forEach((s) => {
    (s.labels || []).forEach((l) => {
      const tx = svgEl('text', { x: X(l.x), y: height - 6, class: 'axis', 'text-anchor': 'middle' });
      tx.textContent = l.text;
      svg.appendChild(tx);
    });
  });
  return svg;
}
