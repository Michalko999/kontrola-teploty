/**
 * sensors.js — WiFi teplomery (pripravene do buducna).
 *
 * Appka ich zatial nepotrebuje, ale cely zvysok je navrhnuty tak, aby sa
 * po ich pridani len "rozsvietili": kazda izba ma pole sensorId a ked senzor
 * hlasi teplotu, pouzije sa namiesto rucnej spatnej vazby pri uceni krivky.
 *
 * Podporovane typy:
 *   manual        — zadas teplotu rucne (funguje vzdy)
 *   shelly-gen2   — Shelly H&T Gen2/Gen3 v lokalnej sieti (/rpc/Shelly.GetStatus)
 *   homeassistant — Home Assistant REST API (entita sensor.xxx_temperature)
 *   http-json     — lubovolne zariadenie vracajuce JSON + cesta k hodnote
 *
 * POZOR na prehliadac: stranka otvorena cez https:// NESMIE citat http://
 * adresy v domacej sieti (mixed content). Riesenia su v docs/wifi-senzory.md —
 * najjednoduchsie je pustit appku z domacej siete cez http (napr. z NAS).
 */

export const SENSOR_TYPES = [
  { id: 'manual', label: 'Ručné zadávanie', needs: [] },
  { id: 'shelly-gen2', label: 'Shelly H&T (Gen2/Gen3)', needs: ['host'] },
  { id: 'homeassistant', label: 'Home Assistant', needs: ['host', 'token', 'entity'] },
  { id: 'http-json', label: 'Iné zariadenie (HTTP + JSON)', needs: ['url', 'path'] },
];

/** Bezpecne vytiahnutie hodnoty z JSON podla cesty typu "temperature:0.tC" alebo "a.b[0].c". */
export function pickPath(obj, path) {
  if (!path) return undefined;
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let cur = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

async function fetchJson(url, options = {}, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Precita jeden senzor. Vracia { temp, humidity, battery, ts } alebo hodi chybu. */
export async function readSensor(sensor) {
  switch (sensor.type) {
    case 'manual':
      return {
        temp: typeof sensor.manualTemp === 'number' ? sensor.manualTemp : null,
        humidity: null,
        ts: sensor.manualAt || null,
        source: 'ručne',
      };

    case 'shelly-gen2': {
      const base = normalizeHost(sensor.host);
      const data = await fetchJson(`${base}/rpc/Shelly.GetStatus`);
      const t = pickPath(data, 'temperature:0.tC') ?? pickPath(data, 'temperature.tC');
      const h = pickPath(data, 'humidity:0.rh') ?? pickPath(data, 'humidity.rh');
      const bat = pickPath(data, 'devicepower:0.battery.percent');
      if (typeof t !== 'number') throw new Error('Odpoveď neobsahuje teplotu (temperature:0.tC)');
      return { temp: t, humidity: h ?? null, battery: bat ?? null, ts: Date.now(), source: 'Shelly' };
    }

    case 'homeassistant': {
      const base = normalizeHost(sensor.host);
      const data = await fetchJson(`${base}/api/states/${encodeURIComponent(sensor.entity)}`, {
        headers: { Authorization: `Bearer ${sensor.token}`, 'Content-Type': 'application/json' },
      });
      const t = Number(data.state);
      if (!Number.isFinite(t)) throw new Error(`Entita vrátila "${data.state}" namiesto čísla`);
      return {
        temp: t,
        humidity: data.attributes?.humidity ?? null,
        battery: data.attributes?.battery_level ?? null,
        ts: Date.now(),
        source: 'Home Assistant',
      };
    }

    case 'http-json': {
      const data = await fetchJson(sensor.url, sensor.token
        ? { headers: { Authorization: `Bearer ${sensor.token}` } }
        : {});
      const raw = pickPath(data, sensor.path);
      const t = Number(raw);
      if (!Number.isFinite(t)) throw new Error(`Na ceste "${sensor.path}" nie je číslo (${JSON.stringify(raw)?.slice(0, 40)})`);
      const h = sensor.humidityPath ? Number(pickPath(data, sensor.humidityPath)) : null;
      return { temp: t, humidity: Number.isFinite(h) ? h : null, ts: Date.now(), source: 'HTTP' };
    }

    default:
      throw new Error(`Neznámy typ senzora: ${sensor.type}`);
  }
}

function normalizeHost(host) {
  if (!host) throw new Error('Chýba adresa zariadenia');
  let h = host.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(h)) h = `http://${h}`;
  return h;
}

/** Precita vsetky senzory naraz; chyby nezhodia celok. */
export async function readAll(sensors) {
  const results = await Promise.allSettled(sensors.map(readSensor));
  return sensors.map((s, i) => {
    const r = results[i];
    return r.status === 'fulfilled'
      ? { id: s.id, ok: true, ...r.value }
      : { id: s.id, ok: false, error: friendlyError(r.reason, s) };
  });
}

/** Zrozumitelna hlaska namiesto "Failed to fetch". */
export function friendlyError(err, sensor) {
  const msg = String(err?.message || err);
  const page = typeof location !== 'undefined' ? location.protocol : 'https:';
  const target = sensor?.host || sensor?.url || '';
  if (/abort/i.test(msg)) return 'Zariadenie neodpovedalo do 6 sekúnd — je zapnuté a v rovnakej WiFi sieti?';
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    if (page === 'https:' && /^http:\/\//i.test(target)) {
      return 'Prehliadač zablokoval spojenie: stránka beží cez HTTPS, ale senzor je na HTTP v domácej sieti. Spusti appku z domácej siete cez http:// (návod v docs/wifi-senzory.md).';
    }
    return 'Nepodarilo sa spojiť. Skontroluj adresu, WiFi sieť a či zariadenie povoľuje CORS.';
  }
  if (/401|403/.test(msg)) return 'Zariadenie odmietlo prístup — skontroluj token.';
  if (/404/.test(msg)) return 'Adresa alebo entita neexistuje (HTTP 404).';
  return msg;
}

export function newSensorId() {
  return 's' + Math.random().toString(36).slice(2, 8);
}
