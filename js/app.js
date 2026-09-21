/** app.js — router, nacitanie pocasia, zostavenie obrazovky. */

import { el, clear, card, button, toast } from './ui.js';
import { state, save } from './store.js';
import { fetchWeather } from './weather.js';
import * as overview from './views/overview.js';
import * as curve from './views/curve.js';
import * as rooms from './views/rooms.js';
import * as boilerView from './views/boiler.js';
import * as sensorsView from './views/sensors.js';
import * as logView from './views/log.js';
import * as settingsView from './views/settings.js';
import { applyTheme } from './views/settings.js';

const VIEWS = {
  overview: { title: 'Prehľad', icon: '🌡️', render: overview.render, nav: true },
  curve: { title: 'Krivka', icon: '📈', render: curve.render, nav: true },
  rooms: { title: 'Izby', icon: '🏠', render: rooms.render, nav: true },
  boiler: { title: 'Kotol', icon: '🔥', render: boilerView.render, nav: true },
  more: { title: 'Viac', icon: '⋯', render: renderMore, nav: true },
  sensors: { title: 'Senzory', icon: '📶', render: sensorsView.render },
  log: { title: 'Denník', icon: '📓', render: logView.render },
  settings: { title: 'Nastavenia', icon: '⚙️', render: settingsView.render },
};

const WEATHER_MAX_AGE = 20 * 60e3;   // 20 minut

let current = 'overview';
let param = null;
let weather = state.settings.lastWeather || null;
let loadingWeather = false;

const ctx = {
  get weather() { return weather; },
  go, rerender, refreshWeather,
};

function go(view, p = null) {
  if (!VIEWS[view]) view = 'overview';
  current = view;
  param = p;
  location.hash = p ? `#${view}/${p}` : `#${view}`;
  rerender();
  document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
}

function readHash() {
  const [v, p] = location.hash.replace(/^#/, '').split('/');
  if (v && VIEWS[v]) { current = v; param = p || null; }
}

function rerender() {
  const main = document.querySelector('main');
  if (!main) return;
  const view = VIEWS[current];
  document.querySelector('.topbar-title').textContent = view.title;
  clear(main).append(view.render({ ...ctx, weather, param, rerender, go, refreshWeather }));
  document.querySelectorAll('.nav-item').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === current
      || (current in VIEWS && !VIEWS[current].nav && b.dataset.view === 'more'));
  });
  renderWeatherStatus();
}

function renderWeatherStatus() {
  const badge = document.querySelector('.topbar-status');
  if (!badge) return;
  if (loadingWeather) { badge.textContent = '⟳'; badge.title = 'Načítavam počasie'; return; }
  if (!navigator.onLine) { badge.textContent = '⚡'; badge.title = 'Offline — počítam z uloženej predpovede'; return; }
  if (!weather) { badge.textContent = '!'; badge.title = 'Počasie nie je načítané'; return; }
  const age = Math.round((Date.now() - weather.fetchedAt) / 60e3);
  badge.textContent = '●';
  badge.title = age < 1 ? 'Počasie aktuálne' : `Počasie spred ${age} min`;
}

async function refreshWeather(force = false) {
  const loc = state.building.location;
  if (!loc.lat || !loc.lon) return;
  if (!force && weather && Date.now() - weather.fetchedAt < WEATHER_MAX_AGE) return;
  if (!navigator.onLine) {
    if (force) toast('Si offline — používam poslednú predpoveď', 'warn');
    return;
  }
  loadingWeather = true;
  renderWeatherStatus();
  try {
    weather = await fetchWeather(loc.lat, loc.lon);
    state.settings.lastWeather = weather;
    save();
    if (force) toast('Počasie aktualizované', 'ok');
  } catch (e) {
    console.warn(e);
    if (force) toast(`Počasie sa nepodarilo načítať: ${e.message}`, 'warn');
  } finally {
    loadingWeather = false;
    rerender();
  }
}

function renderMore(c) {
  const wrap = el('div', { class: 'view' });
  wrap.append(card(null,
    el('div', { class: 'menu' },
      ['sensors', 'log', 'settings'].map((k) => el('button', {
        class: 'menu-item', type: 'button', onclick: () => c.go(k),
      },
        el('span', { class: 'menu-icon' }, VIEWS[k].icon),
        el('span', {}, VIEWS[k].title),
        el('span', { class: 'menu-arrow' }, '›'))))));

  wrap.append(card('Rýchla pomoc',
    el('details', {}, el('summary', {}, 'V byte je zima aj v mraze aj na jeseň'),
      el('p', { class: 'hint' }, 'Posuň celú krivku hore (Krivka → Posun, +1 až +2 K).')),
    el('details', {}, el('summary', {}, 'Zima je len keď je vonku mráz'),
      el('p', { class: 'hint' }, 'Krivka je príliš plochá — zvýš návrhový prívod (Krivka → Strmosť).')),
    el('details', {}, el('summary', {}, 'Cez deň je prekúrené, ráno zima'),
      el('p', { class: 'hint' }, 'Zmenši nočný útlm a skontroluj, či nie je zotrvačnosť budovy nastavená príliš nízko.')),
    el('details', {}, el('summary', {}, 'Kotol sa stále zapína a vypína'),
      el('p', { class: 'hint' }, 'Zníž maximálny výkon kúrenia, predĺž anti-cycle a otvor viac hlavíc. Pozri záložku Kotol.')),
    el('details', {}, el('summary', {}, 'Radiátor je hore studený'),
      el('p', { class: 'hint' }, 'Odvzdušni ho a skontroluj tlak v systéme (obvykle 1,2–1,8 bar za studena).'))));

  wrap.append(card(null, button('Návod ku kotlu a k hlaviciam', {
    variant: 'ghost',
    onClick: () => window.open('docs/navod-nastavenie-kotla.md', '_blank'),
  })));
  return wrap;
}

function buildShell() {
  document.body.append(
    el('header', { class: 'topbar' },
      el('span', { class: 'topbar-title' }, 'Prehľad'),
      el('span', { class: 'topbar-status', title: '' }, '●')),
    el('main', {}),
    el('nav', { class: 'nav' },
      Object.entries(VIEWS).filter(([, v]) => v.nav).map(([k, v]) =>
        el('button', {
          class: 'nav-item', type: 'button', dataset: { view: k }, onclick: () => go(k),
        }, el('span', { class: 'nav-icon' }, v.icon), el('span', { class: 'nav-label' }, v.title)))));
}

function init() {
  applyTheme();
  buildShell();
  readHash();
  rerender();
  refreshWeather();

  window.addEventListener('hashchange', () => { readHash(); rerender(); });
  window.addEventListener('online', () => { renderWeatherStatus(); refreshWeather(); });
  window.addEventListener('offline', renderWeatherStatus);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshWeather();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW:', e));
  }
}

init();
