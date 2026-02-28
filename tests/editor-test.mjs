/**
 * Editor logic tests: heuristics for error highlighting and helpers.
 * Run as part of Node tests: node tests/run-tests.mjs
 */

import {
  parseErrorIndex,
  heuristicErrorPosition,
  findCharClassEnd,
  setEditorContent
} from '../tools/editor/app.js';

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

console.log(`\nEditor logic tests: passed=${passed}, failed=${failed}\n`);
if (failed > 0) {
  process.exitCode = 1;
}

