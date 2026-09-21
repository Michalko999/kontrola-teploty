/* Service worker — appka funguje aj bez signalu (offline-first pre vlastne subory). */

const CACHE = 'ekvitermika-v2';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/styles.css',
  './assets/icon.svg',
  './js/app.js', './js/store.js', './js/ui.js', './js/chart.js',
  './js/engine.js', './js/equitherm.js', './js/weather.js', './js/boiler.js',
  './js/sensors.js', './js/tuning.js',
  './js/views/overview.js', './js/views/curve.js', './js/views/rooms.js',
  './js/views/boiler.js', './js/views/sensors.js', './js/views/log.js', './js/views/settings.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Pocasie a senzory nikdy necachujeme natvrdo — appka si stare data drzi sama.
  if (url.hostname.endsWith('open-meteo.com') || url.origin !== location.origin) return;

  // Vlastne subory: najprv cache (rychly start), na pozadi obnovime.
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => hit || caches.match('./index.html'));
      return hit || net;
    }));
});
