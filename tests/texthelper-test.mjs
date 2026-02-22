/**
 * Тесты Текстового помощника (все инструменты).
 * Запуск: node tests/texthelper-test.mjs
 */

import { changeCase, CASE_MODES } from '../tools/texthelper/logic/changeCase.js';
import { columnToRow, SEPARATORS as COL_SEPARATORS } from '../tools/texthelper/logic/columnToRow.js';
import { rowToColumn, SEPARATORS as ROW_SEPARATORS } from '../tools/texthelper/logic/rowToColumn.js';
import { removeDuplicates } from '../tools/texthelper/logic/removeDuplicates.js';
import { removeEmpty } from '../tools/texthelper/logic/removeEmpty.js';
import { addPrefixSuffix, PRESETS } from '../tools/texthelper/logic/prefixSuffix.js';
import { trimLines, TRIM_MODES } from '../tools/texthelper/logic/trim.js';
import { formatStats } from '../tools/texthelper/logic/stats.js';

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

// ═══════════════════════════════════════════════════════════════════
// ИЗМЕНИТЬ РЕГИСТР (changeCase)
// ═══════════════════════════════════════════════════════════════════

console.log('\n--- changeCase ---\n');

assert(changeCase('hello World', 'upper').result === 'HELLO WORLD', 'upper: латиница');
assert(changeCase('привет мир', 'upper').result === 'ПРИВЕТ МИР', 'upper: кириллица');
assert(changeCase('Привет МИР', 'lower').result === 'привет мир', 'lower');
assert(changeCase('hello world', 'title').result === 'Hello World', 'title: латиница');
assert(changeCase('привет мир', 'title').result === 'Привет Мир', 'title: кириллица');
assert(changeCase('hello. world', 'sentence').result === 'Hello. World', 'sentence');
assert(changeCase('first. second! third?', 'sentence').result === 'First. Second! Third?', 'sentence: несколько');
assert(changeCase('Привет', 'inverted').result === 'пРИВЕТ', 'inverted: кириллица');
assert(changeCase('Hello', 'inverted').result === 'hELLO', 'inverted: латиница');
assert(changeCase('', 'upper').result === '', 'пустая строка');
assert(Object.keys(CASE_MODES).length === 5, 'CASE_MODES: 5 режимов');

// ═══════════════════════════════════════════════════════════════════
// СТОЛБЕЦ → СТРОКА (columnToRow)
// ═══════════════════════════════════════════════════════════════════

console.log('\n--- columnToRow ---\n');

assert(columnToRow('a\nb\nc', 'commaSpace').result === 'a, b, c', 'commaSpace');
assert(columnToRow('a\nb\nc', 'space').result === 'a b c', 'space');
assert(columnToRow('a\nb\nc', 'comma').result === 'a,b,c', 'comma');
assert(columnToRow('a\nb\nc', 'semicolon').result === 'a;b;c', 'semicolon');
assert(columnToRow('a\nb\nc', 'pipe').result === 'a|b|c', 'pipe');
assert(columnToRow('a\nb\nc', 'custom', '-').result === 'a-b-c', 'custom separator');
assert(columnToRow('', 'commaSpace').result === '', 'пустая строка');
assert(columnToRow('single', 'commaSpace').result === 'single', 'одна строка');
assert(Object.keys(COL_SEPARATORS).length >= 8, 'SEPARATORS: минимум 8');

// ═══════════════════════════════════════════════════════════════════
// СТРОКА → СТОЛБЕЦ (rowToColumn)
// ═══════════════════════════════════════════════════════════════════

console.log('\n--- rowToColumn ---\n');

assert(rowToColumn('a, b, c', 'commaSpace').result === 'a\nb\nc', 'commaSpace');
assert(rowToColumn('a b c', 'space').result === 'a\nb\nc', 'space');
assert(rowToColumn('a,b,c', 'comma').result === 'a\nb\nc', 'comma');
assert(rowToColumn('a;b;c', 'semicolon').result === 'a\nb\nc', 'semicolon');
assert(rowToColumn('a|b|c', 'pipe').result === 'a\nb\nc', 'pipe');
assert(rowToColumn('a-b-c', 'custom', '-').result === 'a\nb\nc', 'custom separator');
assert(rowToColumn('a, b, c', 'auto').result === 'a\nb\nc', 'auto detect commaSpace');
assert(rowToColumn('a;b;c', 'auto').result === 'a\nb\nc', 'auto detect semicolon');
assert(rowToColumn('  a  ,  b  ', 'comma', '', true).result === 'a\nb', 'trimLines option');
assert(rowToColumn('', 'commaSpace').result === '', 'пустая строка');

// ═══════════════════════════════════════════════════════════════════
// УДАЛИТЬ ДУБЛИКАТЫ (removeDuplicates)
// ═══════════════════════════════════════════════════════════════════

console.log('\n--- removeDuplicates ---\n');

assert(removeDuplicates('a\nb\na\nc').result === 'a\nb\nc', 'базовый');
assert(removeDuplicates('a\nA\na', false).result === 'a', 'case insensitive');
assert(removeDuplicates('a\nA\na', true).result === 'a\nA', 'case sensitive');
assert(removeDuplicates('a\nb\na\nc', false, true).result === 'a', 'showOnlyDuplicates');
assert(removeDuplicates('a\nb\nc').result === 'a\nb\nc', 'нет дубликатов');
assert(removeDuplicates('').result === '', 'пустая строка');
const dupReport = removeDuplicates('a\nb\na\na');
assert(dupReport.report.includes('2'), 'report содержит количество');

// ═══════════════════════════════════════════════════════════════════
// УДАЛИТЬ ПУСТЫЕ СТРОКИ (removeEmpty)
// ═══════════════════════════════════════════════════════════════════

console.log('\n--- removeEmpty ---\n');

assert(removeEmpty('a\n\nb\n\nc').result === 'a\nb\nc', 'базовый');
assert(removeEmpty('a\n   \nb', false).result === 'a\n   \nb', 'whitespace not empty');
assert(removeEmpty('a\n   \nb', true).result === 'a\nb', 'whitespace as empty');
assert(removeEmpty('').result === '', 'пустая строка');
assert(removeEmpty('a\nb\nc').result === 'a\nb\nc', 'нет пустых');
const emptyReport = removeEmpty('a\n\n\nb');
assert(emptyReport.report.includes('2'), 'report содержит количество');

// ═══════════════════════════════════════════════════════════════════
// ДОБАВИТЬ ОБЁРТКУ (addPrefixSuffix)
// ═══════════════════════════════════════════════════════════════════

console.log('\n--- addPrefixSuffix ---\n');

assert(addPrefixSuffix('a\nb', '"', '"').result === '"a"\n"b"', 'prefix + suffix');
assert(addPrefixSuffix('a\nb', '- ', '').result === '- a\n- b', 'only prefix');
assert(addPrefixSuffix('a\nb', '', '!').result === 'a!\nb!', 'only suffix');
assert(addPrefixSuffix('a\nb\nc', '', '', true).result === '1. a\n2. b\n3. c', 'numbered');
assert(addPrefixSuffix('', '"', '"').result === '', 'пустая строка');
assert(Object.keys(PRESETS).length >= 5, 'PRESETS: минимум 5');

// ═══════════════════════════════════════════════════════════════════
// УБРАТЬ ПРОБЕЛЫ (trimLines)
// ═══════════════════════════════════════════════════════════════════

console.log('\n--- trimLines ---\n');

assert(trimLines('  a  \n  b  ', 'both').result === 'a\nb', 'both');
assert(trimLines('  a  \n  b  ', 'start').result === 'a  \nb  ', 'start');
assert(trimLines('  a  \n  b  ', 'end').result === '  a\n  b', 'end');
assert(trimLines('a  b  c', 'both', true).result === 'a b c', 'removeDoubleSpaces');
assert(trimLines('a    b', 'both', true).result === 'a b', 'multiple spaces');
assert(trimLines('', 'both').result === '', 'пустая строка');
assert(Object.keys(TRIM_MODES).length === 3, 'TRIM_MODES: 3 режима');

// ═══════════════════════════════════════════════════════════════════
// СТАТИСТИКА (formatStats)
// ═══════════════════════════════════════════════════════════════════

console.log('\n--- formatStats ---\n');

assert(formatStats('hello world').includes('2'), 'слова: 2');
assert(formatStats('hello world').includes('11'), 'символы: 11');
assert(formatStats('a\nb\nc').includes('3'), 'строки: 3');
assert(formatStats('').includes('0'), 'пустая строка: 0');

// ═══════════════════════════════════════════════════════════════════
// ИТОГО
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log(`  Текстовый помощник: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════════════════════\n');

process.exit(failed > 0 ? 1 : 0);
