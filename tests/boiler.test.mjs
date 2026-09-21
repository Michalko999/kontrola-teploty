import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advise, checklist } from '../js/boiler.js';
import { computeFlow } from '../js/equitherm.js';

const state = {
  boiler: { minKw: 4.3, maxHeatingKw: 24.1, currentFlowSet: 55, maxHeatingPowerPercent: 100,
            antiCycleMinutes: 3, hasOutdoorProbe: false, tFlowMaxAllowed: 85 },
  building: { tOutDesign: -11, tIndoorDesign: 20, heatLossKw: 5, heatingLimit: 16 },
  curve: { tFlowMin: 28, tFlowMax: 70, tFlowDesign: 55, tReturnDesign: 45 },
  thermostat: { placement: 'chodba', offset: -1, setpointDay: 21.5, referenceRoom: 'D' },
  settings: {},
};

const flowAt = (tOutdoor) => computeFlow({
  tIndoor: 21.5, tOutdoor, tOutdoorDesign: -11, tFlowDesign: 55, tReturnDesign: 45,
  exponent: 1.3, shift: 0, tFlowMin: 28, tFlowMax: 70, heatingLimit: 16,
});

test('ked sa nekuri, appka neradi o kondenzacii ani taktovani', () => {
  const tips = advise({ state, tOutdoor: 18, result: flowAt(18) });
  const titles = tips.map((t) => t.title).join(' | ');
  assert.match(titles, /Kúrenie netreba/);
  assert.doesNotMatch(titles, /kondenzácia|Kondenzácia/);
  assert.doesNotMatch(titles, /taktovani|taktovania/);
});

test('v mraze appka poradi prestavit kotol a zhodnoti kondenzaciu', () => {
  const tips = advise({ state, tOutdoor: -8, result: flowAt(-8) });
  const titles = tips.map((t) => t.title).join(' | ');
  assert.match(titles, /Prestav teplotu vykurovacej vody/);
  assert.match(titles, /kondenzácia/i);
});

test('pri miernom pocasi varuje pred taktovanim predimenzovaneho kotla', () => {
  const tips = advise({ state, tOutdoor: 12, result: flowAt(12) });
  assert.match(tips.map((t) => t.title).join(' | '), /taktovani|taktovania/);
});

test('radi prepocitanu hodnotu na termostat kvoli chodbe bez radiatora', () => {
  const tip = advise({ state, tOutdoor: -8, result: flowAt(-8) })
    .find((t) => t.title.includes('termostate'));
  assert.ok(tip, 'chyba rada pre termostat');
  assert.match(tip.title, /20\.5 °C/);   // 21,5 pozadovanych - 1 K rozdiel chodby
});

test('kontrolny zoznam spomina chybajucu vonkajsiu sondu', () => {
  assert.match(checklist(state).map((c) => c.value).join(' | '), /neaktívna/);
});
