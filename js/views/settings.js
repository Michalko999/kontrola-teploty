/** Nastavenia — poloha, budova, zaloha dat. */

import { el, card, row, numberField, select, toggle, button, toast } from '../ui.js';
import { state, save, exportJson, importJson, resetAll } from '../store.js';
import { geocode } from '../weather.js';

export function render(ctx) {
  const wrap = el('div', { class: 'view' });
  const rerender = ctx.rerender;

  // ---- poloha (nahrada za vonkajsie cidlo) --------------------------------
  const results = el('div', { class: 'geo-results' });
  const search = el('input', { type: 'search', placeholder: 'Zadaj mesto alebo obec', value: state.building.location.name || '' });

  wrap.append(card('Poloha — náhrada za vonkajšie čidlo',
    el('p', { class: 'hint' },
      'Vonkajšiu teplotu berie appka z predpovede pre tvoju obec (služba Open-Meteo, bez registrácie). '
      + 'Je to dosť presné na ekvitermiku, lebo tú aj tak riadi tlmený niekoľkohodinový priemer.'),
    el('div', { class: 'inline' }, search,
      button('Hľadať', {
        onClick: async () => {
          const q = search.value.trim();
          if (!q) return toast('Zadaj názov obce', 'warn');
          results.replaceChildren(el('small', {}, 'Hľadám…'));
          try {
            const list = await geocode(q);
            if (!list.length) return results.replaceChildren(el('small', {}, 'Nič sa nenašlo.'));
            results.replaceChildren(...list.map((r) => button(r.name, {
              variant: 'ghost',
              onClick: () => {
                state.building.location = { name: r.name, lat: r.lat, lon: r.lon };
                save(); toast('Poloha uložená', 'ok'); ctx.refreshWeather(true); rerender();
              },
            })));
          } catch (e) {
            results.replaceChildren(el('small', { class: 'err' }, e.message));
          }
        },
      })),
    results,
    button('Použiť polohu telefónu', {
      variant: 'ghost',
      onClick: () => {
        if (!navigator.geolocation) return toast('Telefón polohu neposkytuje', 'warn');
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            state.building.location = {
              name: `GPS ${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`,
              lat: pos.coords.latitude, lon: pos.coords.longitude,
            };
            save(); toast('Poloha uložená', 'ok'); ctx.refreshWeather(true); rerender();
          },
          () => toast('Poloha sa nepodarila získať', 'warn'));
      },
    }),
    state.building.location.lat
      ? el('p', { class: 'hint' }, `Aktuálne: ${state.building.location.name}`)
      : null));

  // ---- budova ---------------------------------------------------------------
  wrap.append(card('Budova',
    row('Typ stavby', select({
      value: state.building.type,
      options: [
        { value: 'panelak', label: 'Panelák / bytovka' },
        { value: 'tehla', label: 'Tehlový dom' },
        { value: 'novostavba', label: 'Novostavba / zateplené' },
      ],
      onChange: (v) => {
        state.building.type = v;
        state.building.massHours = v === 'tehla' ? 18 : v === 'novostavba' ? 10 : 15;
        save(); rerender();
      },
    }), 'Nastaví zotrvačnosť — ako dlho budova drží teplo.'),
    row('Výpočtová vonkajšia teplota', numberField({
      value: state.building.tOutDesign, min: -22, max: -5, step: 1, suffix: '°C',
      onChange: (v) => { state.building.tOutDesign = v; save(); rerender(); },
    }), 'Na Slovensku zvyčajne −11 °C, vo vyšších polohách −13 až −15 °C.'),
    row('Odhad tepelnej straty', numberField({
      value: state.building.heatLossKw, min: 1, max: 30, step: 0.5, suffix: 'kW',
      onChange: (v) => { state.building.heatLossKw = v; save(); rerender(); },
    }), 'Byt v paneláku zvyčajne 3–7 kW. Slúži na varovanie pred taktovaním.'),
    row('Zotrvačnosť', numberField({
      value: state.building.massHours, min: 3, max: 30, step: 1, suffix: 'h',
      onChange: (v) => { state.building.massHours = v; save(); rerender(); },
    }), 'Koľko hodín dozadu sa priemeruje vonkajšia teplota.'),
    row('Medza vykurovania', numberField({
      value: state.building.heatingLimit, min: 10, max: 22, step: 0.5, suffix: '°C',
      onChange: (v) => { state.building.heatingLimit = v; save(); rerender(); },
    }), 'Nad touto vonkajšou teplotou už kúriť netreba.')));

  // ---- appka ---------------------------------------------------------------
  wrap.append(card('Aplikácia',
    row('Automatické doladenie krivky', toggle({
      checked: state.settings.autoTune,
      onChange: (v) => { state.settings.autoTune = v; save(); },
    }), 'Návrhy podľa spätnej väzby. Zmenu vždy potvrdzuješ ty.'),
    row('Odstup medzi úpravami', numberField({
      value: state.settings.tuneMinHours, min: 2, max: 72, step: 1, suffix: 'h',
      onChange: (v) => { state.settings.tuneMinHours = v; save(); },
    })),
    row('Vzhľad', select({
      value: state.settings.theme,
      options: [{ value: 'auto', label: 'Podľa telefónu' }, { value: 'dark', label: 'Tmavý' }, { value: 'light', label: 'Svetlý' }],
      onChange: (v) => { state.settings.theme = v; save(); applyTheme(); },
    }))));

  // ---- zaloha ---------------------------------------------------------------
  const fileInput = el('input', { type: 'file', accept: 'application/json', class: 'hidden',
    onchange: (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { importJson(reader.result); toast('Načítané', 'ok'); rerender(); }
        catch (err) { toast(`Súbor sa nepodarilo načítať: ${err.message}`, 'warn'); }
      };
      reader.readAsText(f);
    } });

  wrap.append(card('Záloha',
    el('p', { class: 'hint' }, 'Všetko je uložené len v tomto telefóne. Pred preinštalovaním si sprav zálohu.'),
    el('div', { class: 'inline' },
      button('Exportovať', {
        onClick: () => {
          const blob = new Blob([exportJson()], { type: 'application/json' });
          const a = el('a', { href: URL.createObjectURL(blob), download: `ekvitermika-${new Date().toISOString().slice(0, 10)}.json` });
          a.click(); URL.revokeObjectURL(a.href);
        },
      }),
      button('Importovať', { variant: 'ghost', onClick: () => fileInput.click() }),
      fileInput),
    button('Obnoviť východzie nastavenia', {
      variant: 'danger',
      onClick: () => {
        if (!confirm('Naozaj zmazať všetky nastavenia aj denník?')) return;
        resetAll(); toast('Obnovené', 'ok'); rerender();
      },
    })));

  wrap.append(card('O aplikácii',
    el('p', { class: 'hint' },
      'Ekvitermika v1.0 — počíta teplotu vykurovacej vody podľa vonkajšej teploty. '
      + 'Nepripája sa ku kotlu, nastavenie robíš ručne podľa jej odporúčania. '
      + 'Žiadne dáta neodchádzajú z telefónu okrem dopytu na predpoveď počasia.')));

  return wrap;
}

export function applyTheme() {
  const t = state.settings.theme;
  document.documentElement.dataset.theme = t === 'auto' ? '' : t;
}
