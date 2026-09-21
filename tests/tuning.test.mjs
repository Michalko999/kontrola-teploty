import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestAdjustment, linreg, entryError, computeThermostatOffset } from '../js/tuning.js';

const state = {
  thermostat: { setpointDay: 21 },
  settings: { tuneMinHours: 8 },
};

const entry = (feedback, phi, ageH = 1) => ({
  ts: Date.now() - ageH * 3600e3, type: 'spatna-vazba', feedback, phi,
});

test('linearna regresia najde priamku', () => {
  const fit = linreg([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }]);
  assert.ok(Math.abs(fit.a - 1) < 1e-9);
  assert.ok(Math.abs(fit.b - 2) < 1e-9);
});

test('chyba sa berie z merania, inak zo spatnej vazby', () => {
  assert.equal(entryError({ roomTemp: 19.5 }, 21), -1.5);
  assert.equal(entryError({ feedback: 'zima' }, 21), -1.5);
  assert.equal(entryError({ feedback: 'akurat' }, 21), 0);
  assert.equal(entryError({}, 21), null);
});

test('malo zaznamov = ziadna uprava', () => {
  const s = suggestAdjustment([entry('zima', 0.5)], state);
  assert.equal(s.shiftDelta, 0);
  assert.equal(s.confidence, 'nizka');
});

test('rovnomerna zima pri kazdom pocasi zvysi posun', () => {
  const log = [entry('zima', 0.2), entry('zima', 0.5), entry('zima', 0.8), entry('zima', 0.6)];
  const s = suggestAdjustment(log, state);
  assert.ok(s.shiftDelta > 0.5, `cakal kladny posun, dostal ${s.shiftDelta}`);
});

test('prekurene pri kazdom pocasi znizi posun', () => {
  const log = [entry('horuco', 0.2), entry('horuco', 0.6), entry('teplo', 0.9), entry('horuco', 0.4)];
  const s = suggestAdjustment(log, state);
  assert.ok(s.shiftDelta < 0, `cakal zaporny posun, dostal ${s.shiftDelta}`);
});

test('zima len v mraze zvysi strmost, nie posun', () => {
  const log = [
    entry('zima', 0.9), entry('zima', 0.85), entry('akurat', 0.3),
    entry('akurat', 0.25), entry('akurat', 0.2), entry('zima', 0.95),
  ];
  const s = suggestAdjustment(log, state);
  assert.ok(s.flowDesignDelta > 0, `cakal strmsiu krivku, dostal ${s.flowDesignDelta}`);
  assert.ok(Math.abs(s.shiftDelta) < Math.abs(s.flowDesignDelta));
});

test('uprava je vzdy obmedzena', () => {
  const log = new Array(12).fill(0).map((_, i) => entry('zima', 0.1 + i * 0.07));
  const s = suggestAdjustment(log, state);
  assert.ok(Math.abs(s.shiftDelta) <= 3);
  assert.ok(Math.abs(s.flowDesignDelta) <= 4);
});

test('stare zaznamy sa ignoruju', () => {
  const log = [entry('zima', 0.5, 24 * 40), entry('zima', 0.6, 24 * 50)];
  const s = suggestAdjustment(log, state);
  assert.equal(s.samples, 0);
});

test('offset termostatu = chodba minus izba', () => {
  assert.equal(computeThermostatOffset(19.4, 21.0), -1.6);
});
