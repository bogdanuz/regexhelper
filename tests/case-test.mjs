/**
 * Тесты инструмента «Регистр» (логика конвертера регистра).
 * Запуск: node tests/case-test.mjs
 */

import { toUpper, toLower, toTitleCase, toSentenceCase, toInverted, applyCase, CASE_MODES } from '../tools/case/logic/caseConverter.js';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log('  ✅', msg);
    return true;
  }
  failed++;
  console.error('  ❌', msg);
  return false;
}

console.log('\n--- Регистр: caseConverter logic ---\n');

// toUpper
assert(toUpper('hello World') === 'HELLO WORLD', 'toUpper: латиница');
assert(toUpper('привет мир') === 'ПРИВЕТ МИР', 'toUpper: кириллица');

// toLower
assert(toLower('Привет МИР') === 'привет мир', 'toLower: латиница и кириллица');

// toTitleCase
assert(toTitleCase('hello world') === 'Hello World', 'toTitleCase: каждое слово с заглавной');
assert(toTitleCase('привет мир') === 'Привет Мир', 'toTitleCase: кириллица');

// toSentenceCase
assert(toSentenceCase('hello. world') === 'Hello. World', 'toSentenceCase: первая буква и после точки');
assert(toSentenceCase('first. second! third?') === 'First. Second! Third?', 'toSentenceCase: несколько предложений');

// toInverted
assert(toInverted('Привет') === 'пРИВЕТ', 'toInverted: кириллица');
assert(toInverted('Hello') === 'hELLO', 'toInverted: латиница');

// applyCase
assert(applyCase('TeSt', CASE_MODES.UPPER) === 'TEST', 'applyCase UPPER');
assert(applyCase('TeSt', CASE_MODES.LOWER) === 'test', 'applyCase LOWER');
assert(applyCase('ab cd', CASE_MODES.TITLE) === 'Ab Cd', 'applyCase TITLE');
assert(applyCase('Ab', CASE_MODES.INVERTED) === 'aB', 'applyCase INVERTED');
assert(applyCase('', CASE_MODES.UPPER) === '', 'applyCase: пустая строка');

// CASE_MODES
const expected = ['upper', 'lower', 'title', 'sentence', 'inverted'];
const hasAll = expected.every((k) => Object.values(CASE_MODES).includes(k));
assert(hasAll && Object.keys(CASE_MODES).length === 5, 'CASE_MODES: все пять режимов');

console.log('\n--- Итого:', passed, 'passed,', failed, 'failed ---\n');
process.exit(failed > 0 ? 1 : 0);
