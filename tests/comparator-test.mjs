/**
 * Сравнитель: diff и HTML без браузера.
 * Запуск: node tests/comparator-test.mjs
 */
import diff from '../tools/comparator/vendor/fastDiff.js';
import {
  getDiffTuples,
  buildMergedPlain,
  buildBeforeHtml,
  buildAfterHtml,
  buildClipboardUnifiedFragment,
  buildMergedClipboardInnerHtml,
  escapeHtml
} from '../tools/comparator/logic/diffRender.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  OK ${name}`);
  } catch (e) {
    failed++;
    console.error(`  FAIL ${name}: ${e.message || e}`);
  }
}

test('getDiffTuples: равные строки', () => {
  const t = getDiffTuples('ab', 'ab');
  if (t.length !== 1 || t[0][0] !== diff.EQUAL || t[0][1] !== 'ab') throw new Error(String(t));
});

test('getDiffTuples: вставка хвоста', () => {
  const t = getDiffTuples('a|b', 'a|b|c');
  if (!t.some((x) => x[0] === diff.INSERT && x[1] === '|c')) throw new Error(JSON.stringify(t));
});

test('getDiffTuples: обе пустые', () => {
  const t = getDiffTuples('', '');
  if (t.length !== 0) throw new Error(String(t.length));
});

test('buildMergedPlain: порядок сегментов без дублирования', () => {
  const t = getDiffTuples('old', 'new');
  const p = buildMergedPlain(t);
  if (!p.includes('old') || !p.includes('new')) throw new Error(p);
  if (p.includes('Было:') || p.includes('Стало:')) throw new Error('no labels');
});

test('buildMergedPlain: пустые строки', () => {
  if (buildMergedPlain([]) !== '') throw new Error('empty tuples');
});

test('escapeHtml', () => {
  if (escapeHtml('<a>') !== '&lt;a&gt;') throw new Error(escapeHtml('<a>'));
  if (!escapeHtml('&').includes('amp')) throw new Error(escapeHtml('&'));
});

test('buildAfterHtml: класс вставки', () => {
  const t = getDiffTuples('x', 'xy');
  const html = buildAfterHtml(t);
  if (!html.includes('comparator-mark-add') || !html.includes('y')) throw new Error(html);
});

test('buildBeforeHtml: класс удаления', () => {
  const t = getDiffTuples('xy', 'x');
  const html = buildBeforeHtml(t);
  if (!html.includes('comparator-mark-del') || !html.includes('y')) throw new Error(html);
});

test('buildBeforeHtml: удаление средней альтернативы (XTRA)', () => {
  const t = getDiffTuples('foo|XTRA|baz', 'foo|baz');
  const html = buildBeforeHtml(t);
  if (!html.includes('comparator-mark-del') || !html.includes('XTRA')) throw new Error(html);
});

test('buildAfterHtml: экранирование < в вставке', () => {
  const t = getDiffTuples('a', 'a<b>');
  const html = buildAfterHtml(t);
  if (html.includes('<b>') || !html.includes('&lt;b&gt;')) throw new Error(html);
});

test('buildClipboardUnifiedFragment: не таблица, span + цвета как у старого clipboard', () => {
  const t = getDiffTuples('a', 'b');
  const frag = buildClipboardUnifiedFragment(t);
  if (frag.includes('<table')) throw new Error('no table');
  if (!frag.includes('<div')) throw new Error('wrapper');
   if (!frag.includes('<strong>')) throw new Error('strong');
  if (!frag.includes('#b91c1c') || !frag.includes('#15803d')) throw new Error('text colors');
  if (!frag.includes('#fef2f2') || !frag.includes('#f0fdf4')) throw new Error('backgrounds');
  if (!frag.includes('<span style=')) throw new Error('span');
});

test('buildClipboardUnifiedFragment: экранирование вставки', () => {
  const tuples = [
    [diff.EQUAL, 'ok'],
    [diff.INSERT, '<tag>']
  ];
  const frag = buildClipboardUnifiedFragment(tuples);
  if (!frag.includes('&lt;tag&gt;')) throw new Error('expected escaped insert');
});

test('buildMergedClipboardInnerHtml: нет подписей Было/Стало', () => {
  const t = getDiffTuples('x', 'y');
  const inner = buildMergedClipboardInnerHtml(t);
  if (inner.includes('Было') || inner.includes('Стало')) throw new Error(inner);
});

test('замена в середине: и del и add', () => {
  const t = getDiffTuples('(a|b)c', '(a|d)c');
  const hb = buildBeforeHtml(t);
  const ha = buildAfterHtml(t);
  if (!hb.includes('comparator-mark-del') || !ha.includes('comparator-mark-add')) throw new Error('b→d');
});

test('многострочный текст', () => {
  const nl = '\n';
  const b = 'line1' + nl + 'common';
  const a = b + nl + 'tail';
  const t = getDiffTuples(b, a);
  const ha = buildAfterHtml(t);
  if (!ha.includes('comparator-mark-add') || !ha.includes('tail')) throw new Error(ha);
});

test('равные строки: без span классов', () => {
  const t = getDiffTuples('x|y', 'x|y');
  if (buildAfterHtml(t).includes('comparator-mark') || buildBeforeHtml(t).includes('comparator-mark')) {
    throw new Error('unexpected mark');
  }
});

test('escapeHtml амперсанд', () => {
  const t = getDiffTuples('a', 'a&b');
  const ha = buildAfterHtml(t);
  if (!ha.includes('&amp;')) throw new Error(ha);
});

test('равные строки: unified без span-меток', () => {
  const t = getDiffTuples('uv', 'uv');
  const frag = buildClipboardUnifiedFragment(t);
  if (frag.includes('#b91c1c') || frag.includes('#15803d')) throw new Error('no marks when equal');
  if (frag.includes('<strong>')) throw new Error('no strong when equal');
  if (!frag.includes('uv')) throw new Error('content');
});

console.log(`Сравнитель (Node): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
