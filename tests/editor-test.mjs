/**
 * Editor logic tests: heuristics for error highlighting and helpers.
 * Run as part of Node tests: node tests/run-tests.mjs
 */

import {
  parseErrorIndex,
  heuristicErrorPosition,
  findCharClassEnd,
  setEditorContent,
  invertTopLevelElements
} from '../tools/editor/app.js';
import { parseRegexPattern } from '../tools/converter/logic/regexParser.js';
import { convertLinkedBuilder } from '../tools/converter/logic/linkedBuilderConverter.js';

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

console.log('\n--- Editor logic tests ---\n');

// parseErrorIndex
console.log('parseErrorIndex');
try {
  const idx = parseErrorIndex('Invalid regular expression: /foo/: something at index 5');
  assert(idx === 5, 'parseErrorIndex extracts index 5');
} catch (e) {
  assert(false, 'parseErrorIndex exception: ' + e.message);
}

// findCharClassEnd
console.log('\nfindCharClassEnd');
try {
  const pat = '[ab\\]c]d';
  const end = findCharClassEnd(pat, 0);
  // Должен найти ЗАКРЫВАЮЩУЮ ] класса (последнюю, не экранированную)
  assert(end === pat.lastIndexOf(']'), 'findCharClassEnd finds closing ] of char class');
} catch (e) {
  assert(false, 'findCharClassEnd exception: ' + e.message);
}

// heuristicErrorPosition: Nothing to repeat
console.log('\nheuristicErrorPosition: Nothing to repeat');
try {
  const h1 = heuristicErrorPosition('*abc', 'Nothing to repeat');
  assert(h1 && h1.start === 0, 'Nothing to repeat at start');
} catch (e) {
  assert(false, 'heuristicErrorPosition Nothing to repeat exception: ' + e.message);
}

// heuristicErrorPosition: Unterminated group
console.log('\nheuristicErrorPosition: Unterminated group');
try {
  const h = heuristicErrorPosition('(abc', 'Unterminated group');
  assert(h && h.start === 0, 'Unterminated group highlights opening ( ');
} catch (e) {
  assert(false, 'heuristicErrorPosition Unterminated group exception: ' + e.message);
}

// heuristicErrorPosition: invalid group
console.log('\nheuristicErrorPosition: Invalid group');
try {
  const h = heuristicErrorPosition('(?xabc)', 'Invalid group');
  assert(h && h.start === 0 && h.end === 2, 'Invalid group highlights (?');
} catch (e) {
  assert(false, 'heuristicErrorPosition Invalid group exception: ' + e.message);
}

// heuristicErrorPosition: bad quantifier {
console.log('\nheuristicErrorPosition: invalid quantifier');
try {
  const h = heuristicErrorPosition('a{1,', 'Invalid quantifier');
  assert(h && h.start === 1, 'Invalid quantifier highlights {');
} catch (e) {
  assert(false, 'heuristicErrorPosition invalid quantifier exception: ' + e.message);
}

// setEditorContent: exists and is function (replacement behavior tested in browser)
console.log('\nsetEditorContent');
try {
  assert(typeof setEditorContent === 'function', 'setEditorContent is a function');
} catch (e) {
  assert(false, 'setEditorContent exception: ' + e.message);
}

// Инвертировать выделенное: parse + invertTopLevelElements + convertLinkedBuilder
console.log('\nInvert selection pipeline (parse + invert + convert)');
try {
  // Простая альтернация a|b -> b|a
  const r1 = parseRegexPattern('a|b');
  assert(r1.success && r1.elements && r1.elements.length === 2, 'parse a|b');
  const inv1 = invertTopLevelElements(r1.elements);
  const conv1 = convertLinkedBuilder(inv1);
  assert(conv1.success && conv1.result === 'b|a', 'invert a|b -> b|a');

  // Один элемент — инверсия даёт тот же regex
  const r2 = parseRegexPattern('(мама|папа)');
  assert(r2.success && r2.elements && r2.elements.length === 1, 'parse single group');
  const inv2 = invertTopLevelElements(r2.elements);
  const conv2 = convertLinkedBuilder(inv2);
  assert(conv2.success && conv2.result.includes('мама') && conv2.result.includes('папа'), 'invert single group unchanged');

  // Референсный паттерн: (мама[\s\S]+папа)[^\n]+брат.{0,10}сестра -> сестра.{0,10}брат[^\n]+(мама[\s\S]+папа)
  const pattern = '(мама[\\s\\S]+папа)[^\\n]+брат.{0,10}сестра';
  const r3 = parseRegexPattern(pattern);
  assert(r3.success && r3.elements && r3.elements.length >= 2, 'parse reference pattern');
  const inv3 = invertTopLevelElements(r3.elements);
  const conv3 = convertLinkedBuilder(inv3);
  assert(conv3.success && conv3.result.length > 0, 'invert reference pattern success');
  assert(conv3.result.includes('сестра') && conv3.result.includes('брат'), 'inverted order: сестра...брат');
  assert(conv3.result.includes('(мама[\\s\\S]+папа)'), 'inverted contains group');
  assert(conv3.result.includes('.{0,10}') && conv3.result.includes('[^\\n]+'), 'inverted contains connectors');
} catch (e) {
  assert(false, 'Invert selection pipeline exception: ' + e.message);
}

console.log(`\nEditor logic tests: passed=${passed}, failed=${failed}\n`);
if (failed > 0) {
  process.exitCode = 1;
}

