import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFlow, relativeLoad, curveSlope, flowDesignFromSlope,
  condensingInfo, cyclingRisk, dampedOutdoor, curveTable,
} from '../js/equitherm.js';

const BASE = {
  tIndoor: 21, tOutdoorDesign: -11,
  tFlowDesign: 55, tReturnDesign: 45,
  exponent: 1.3, shift: 0, tFlowMin: 28, tFlowMax: 70,
};

test('relativna zataz: 0 pri vonkajsej = vnutornej, 1 pri navrhovej', () => {
  assert.equal(relativeLoad(21, 21, -11), 0);
  assert.equal(relativeLoad(21, -11, -11), 1);
  assert.ok(Math.abs(relativeLoad(21, 5, -11) - 0.5) < 0.001);
});

test('pri navrhovej vonkajsej teplote vyjde navrhovy privod', () => {
  const r = computeFlow({ ...BASE, tOutdoor: -11 });
  assert.ok(Math.abs(r.flow - 55) < 0.2, `cakal 55, dostal ${r.flow}`);
  assert.ok(Math.abs(r.return - 45) < 0.2, `cakal 45, dostal ${r.return}`);
});

test('krivka je monotonna — chladnejsie vonku znamena teplejsiu vodu', () => {
  const rows = curveTable(BASE, 15, -15, -1);
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i].flow >= rows[i - 1].flow,
      `pri ${rows[i].tOutdoor} °C klesol privod z ${rows[i - 1].flow} na ${rows[i].flow}`);
  }
});

test('krivka je konkavna (radiatorovy exponent), nie priamka', () => {
  const at5 = computeFlow({ ...BASE, tOutdoor: 5 }).flow;
  const linear = 21 + (55 - 21) * relativeLoad(21, 5, -11);
  assert.ok(at5 > linear, `pri phi=0,5 ma byt privod nad priamkou: ${at5} vs ${linear}`);
});

test('paralelny posun zdvihne celu krivku', () => {
  const a = computeFlow({ ...BASE, tOutdoor: 0 });
  const b = computeFlow({ ...BASE, tOutdoor: 0, shift: 3 });
  assert.ok(Math.abs((b.flow - a.flow) - 3) < 0.15);
  assert.ok(Math.abs((b.return - a.return) - 3) < 0.15);
});

test('orezanie zhora aj zdola funguje a je oznacene', () => {
  const hot = computeFlow({ ...BASE, tOutdoor: -25, tFlowMax: 55 });
  assert.equal(hot.flow, 55);
  assert.equal(hot.clampedHigh, true);
  // bez orezania ide krivka pri -25 °C na ~59 °C (relativna zataz je zhora obmedzena)
  const free = computeFlow({ ...BASE, tOutdoor: -25, tFlowMax: 80 });
  assert.ok(free.flow > 58 && free.flow < 60, `cakal ~59, dostal ${free.flow}`);
  assert.equal(free.clampedHigh, false);
  // pri +14 °C vonku chce krivka len ~31 °C, spodne orezanie ju zdvihne na 35
  const cold = computeFlow({ ...BASE, tOutdoor: 14, tFlowMin: 35 });
  assert.equal(cold.flow, 35);
  assert.equal(cold.clampedLow, true);
});

test('nad medzou vykurovania sa nekuri', () => {
  assert.equal(computeFlow({ ...BASE, tOutdoor: 18, heatingLimit: 16 }).heatingNeeded, false);
  assert.equal(computeFlow({ ...BASE, tOutdoor: 8, heatingLimit: 16 }).heatingNeeded, true);
});

test('spad privod-spiatocka sa s klesajucou zatazou zmensuje', () => {
  const cold = computeFlow({ ...BASE, tOutdoor: -11 });
  const mild = computeFlow({ ...BASE, tOutdoor: 10 });
  assert.ok(cold.spread > mild.spread);
});

test('strmost a jej inverzia si zodpovedaju', () => {
  const k = curveSlope({ tIndoorDesign: 21, tOutdoorDesign: -11, tFlowDesign: 55 });
  assert.ok(Math.abs(k - 34 / 32) < 0.01);
  const back = flowDesignFromSlope({ tIndoorDesign: 21, tOutdoorDesign: -11, slope: k });
  assert.ok(Math.abs(back - 55) < 0.2);
});

test('kondenzacia sa vyhodnocuje podla spiatocky', () => {
  assert.equal(condensingInfo(35).ok, true);
  assert.equal(condensingInfo(58).ok, false);
  assert.equal(condensingInfo(58).level, 'ziadna');
});

test('taktovanie: predimenzovany kotol pri miernom pocasi', () => {
  const mild = cyclingRisk({ heatLossKw: 5, phi: 0.2, boilerMinKw: 4.3 });
  assert.equal(mild.level, 'vysoke');
  const cold = cyclingRisk({ heatLossKw: 5, phi: 1, boilerMinKw: 4.3 });
  assert.equal(cold.level, 'ok');
});

test('tlmenie vonkajsej teploty zohladnuje historiu', () => {
  const history = new Array(12).fill(-5);
  const damped = dampedOutdoor(5, history, 12);
  assert.ok(damped > -5 && damped < 5, `tlmena teplota ${damped} ma lezat medzi historiou a aktualnou`);
  assert.equal(dampedOutdoor(3, [], 12), 3);
});
