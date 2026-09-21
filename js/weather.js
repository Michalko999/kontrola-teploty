/**
 * weather.js — vonkajsia teplota z internetu namiesto fyzickeho cidla.
 *
 * Pouziva Open-Meteo (https://open-meteo.com) — zadarmo, bez registracie a bez
 * API kluca, takze v aplikacii nie su ziadne tajne udaje. Okrem aktualnej
 * teploty stahujeme aj poslednych 24 h (na tlmenie) a predpoved na 3 dni
 * (na plan nastavenia kotla dopredu).
 */

const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST = 'https://api.open-meteo.com/v1/forecast';

export async function geocode(name) {
  const url = `${GEO}?name=${encodeURIComponent(name)}&count=5&language=sk&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Vyhľadávanie obce zlyhalo (HTTP ${res.status})`);
  const data = await res.json();
  return (data.results || []).map((r) => ({
    name: [r.name, r.admin1, r.country_code].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
    elevation: r.elevation,
  }));
}

export async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,is_day',
    hourly: 'temperature_2m,apparent_temperature,wind_speed_10m',
    past_days: '1',
    forecast_days: '4',
    timezone: 'auto',
  });
  const res = await fetch(`${FORECAST}?${params}`);
  if (!res.ok) throw new Error(`Počasie sa nepodarilo načítať (HTTP ${res.status})`);
  const d = await res.json();

  const times = d.hourly.time.map((t) => new Date(t));
  const temps = d.hourly.temperature_2m;
  const now = Date.now();
  const nowIdx = times.findIndex((t) => t.getTime() > now);
  const cut = nowIdx === -1 ? times.length : nowIdx;

  return {
    fetchedAt: now,
    current: {
      temp: d.current.temperature_2m,
      apparent: d.current.apparent_temperature,
      humidity: d.current.relative_humidity_2m,
      wind: d.current.wind_speed_10m,
      isDay: !!d.current.is_day,
    },
    /** poslednych 24 h — vstup pre tlmenie vonkajsej teploty */
    past24: temps.slice(Math.max(0, cut - 24), cut),
    /** predpoved dopredu: [{ ts, temp, wind }] */
    forecast: times.slice(cut).map((t, i) => ({
      ts: t.getTime(),
      temp: temps[cut + i],
      apparent: d.hourly.apparent_temperature[cut + i],
      wind: d.hourly.wind_speed_10m[cut + i],
    })),
    units: d.current_units?.temperature_2m || '°C',
  };
}

/** Denne minima/maxima/priemery z predpovede — podklad pre "co nastavit zajtra". */
export function dailySummary(forecast, days = 3) {
  const byDay = new Map();
  for (const p of forecast) {
    const d = new Date(p.ts);
    const key = d.toISOString().slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(p.temp);
  }
  return [...byDay.entries()].slice(0, days).map(([date, temps]) => ({
    date,
    min: Math.min(...temps),
    max: Math.max(...temps),
    avg: Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10,
  }));
}

/** Korekcia na vietor — silny vietor zvysuje tepelnu stratu (infiltracia). */
export function windCorrection(tOutdoor, windKmh) {
  if (!windKmh || windKmh < 20) return 0;
  const excess = Math.min(windKmh, 70) - 20;
  return -Math.round((excess / 50) * 2 * 10) / 10; // max -2 K "zdanlivo chladnejsie"
}
