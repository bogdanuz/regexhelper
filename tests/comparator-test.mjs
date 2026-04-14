/**
 * Сравнитель: diff и HTML без браузера.
 * Запуск: node tests/comparator-test.mjs
 */
import diff from '../tools/comparator/vendor/fastDiff.js';
import {
  getDiffTuples,
  buildPlainFallback,
  buildPlainAfterOnly,
  buildBeforeHtml,
  buildAfterHtml,
  buildClipboardTableFragment,
  buildClipboardAfterOnlyFragment,
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

test('buildPlainFallback', () => {
  const plain = buildPlainFallback('old', 'new');
  if (!plain.includes('Было:') || !plain.includes('old') || !plain.includes('Стало:') || !plain.includes('new')) {
    throw new Error(plain);
  }
});

test('buildPlainAfterOnly: без блока «Было»', () => {
  if (buildPlainAfterOnly('pat') !== 'pat') throw new Error('text');
  if (buildPlainAfterOnly('') !== '') throw new Error('empty');
  if (buildPlainAfterOnly(null) !== '') throw new Error('null');
  if (buildPlainAfterOnly('x').includes('Было')) throw new Error('no label');
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

test('buildClipboardTableFragment: таблица и светлые стили', () => {
  const t = getDiffTuples('a', 'b');
  const frag = buildClipboardTableFragment('a', 'b', t);
  if (!frag.includes('<table') || !frag.includes('Было') || !frag.includes('Стало')) throw new Error('structure');
  if (!frag.includes('#15803d') || !frag.includes('#b91c1c')) throw new Error('clipboard colors');
});

test('buildClipboardTableFragment: экранирование вставки', () => {
  const tuples = [
    [diff.EQUAL, 'ok'],
    [diff.INSERT, '<tag>']
  ];
  const frag = buildClipboardTableFragment('ok', 'ok<tag>', tuples);
  if (!frag.includes('&lt;tag&gt;')) throw new Error('expected escaped insert');
});

test('buildClipboardAfterOnlyFragment: одна строка «Стало», без «Было»', () => {
  const t = getDiffTuples('a', 'ab');
  const frag = buildClipboardAfterOnlyFragment(t);
  if (frag.includes('>Было</th>')) throw new Error('must not include Было row');
  if (!frag.includes('>Стало</th>')) throw new Error('Стало header');
  const trCount = (frag.match(/<tr/g) || []).length;
  if (trCount !== 1) throw new Error(`expected 1 tr, got ${trCount}`);
  if (!frag.includes('#15803d')) throw new Error('insert highlight color');
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

test('buildClipboard: жирный для вставок', () => {
  const t = getDiffTuples('u', 'uv');
  const frag = buildClipboardTableFragment('u', 'uv', t);
  if (!frag.includes('font-weight:700')) throw new Error('bold');
});

console.log(`Сравнитель (Node): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
