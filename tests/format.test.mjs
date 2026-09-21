import test from 'node:test';
import assert from 'node:assert/strict';
import { num, temp, signed } from '../js/format.js';
import { boilerSetpoint } from '../js/boiler.js';

test('desatinna ciarka namiesto bodky', () => {
  assert.equal(num(54.9), '54,9');
  assert.equal(num(-3.4), '-3,4');
  assert.equal(num(1.25, 2), '1,25');
});

test('zbytocna nula za ciarkou sa zahadzuje', () => {
  assert.equal(num(22.0), '22', 'z 22,0 ma byt 22');
  assert.equal(num(20), '20');
  assert.equal(num(22.5), '22,5', 'polovicna hodnota ma zostat');
  assert.equal(num(1.30, 2), '1,3');
});

test('cele cisla sa neorezavaju zvnutra', () => {
  assert.equal(num(100, 0), '100', 'nuly v samotnom cisle nie su desatinne');
  assert.equal(num(1000.0), '1000');
  assert.equal(num(70.0, 0), '70');
});

test('chybajuca hodnota je pomlcka, nie NaN', () => {
  for (const v of [null, undefined, '', NaN, Infinity]) assert.equal(num(v), '—');
  assert.equal(temp(null), '—');
});

test('teplota ma jednotku, znamienko sa ukaze aj pri kladnom cisle', () => {
  assert.equal(temp(54.9), '54,9 °C');
  assert.equal(temp(65, 0), '65 °C');
  assert.equal(signed(2.5), '+2,5');
  assert.equal(signed(-2.5), '-2,5');
  assert.equal(signed(0), '0', 'nula znamienko nepotrebuje');
});

test('na kotli sa daju navolit len cele stupne', () => {
  assert.equal(boilerSetpoint(54.9), 55);
  assert.equal(boilerSetpoint(54.4), 54);
  assert.equal(boilerSetpoint(31.5), 32);
  assert.equal(boilerSetpoint(65), 65, 'cele cislo ostava cele');
});
