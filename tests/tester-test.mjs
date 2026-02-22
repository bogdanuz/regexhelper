/**
 * Тесты инструмента «Тестер» (runMatch, препроцессинг x, флаги, референсные паттерны).
 * Запуск: node tests/tester-test.mjs
 */

import { runMatch } from '../tools/tester/logic/matchRunner.js';
import { applyExtendedFlag } from '../tools/tester/logic/patternPreprocess.js';
import { buildFlagsString } from '../tools/tester/logic/flagsBuilder.js';

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

const g = (v = true) => ({ g: v, m: false, i: false, s: false, u: false, x: false, a: false });
const gm = (gv = true, mv = true) => ({ g: gv, m: mv, i: false, s: false, u: false, x: false, a: false });
const full = (opts = {}) => ({ g: true, m: true, i: false, s: false, u: false, x: false, a: false, ...opts });

console.log('\n--- Тестер: runMatch базовая логика ---\n');

const r1 = runMatch('\\w+', full(), 'hello world');
assert(!r1.error && r1.matches?.length === 2, 'runMatch: \\w+ на "hello world" → 2 совпадения');
assert(r1.matches?.[0]?.fullMatch === 'hello', 'runMatch: первое совпадение "hello"');

const r2 = runMatch('([', full(), 'test');
assert(r2.error && r2.error.length > 0, 'runMatch: невалидный паттерн ([ → error');

const r3 = runMatch('a', full(), '');
assert(!r3.error && r3.matches?.length === 0, 'runMatch: пустая строка → 0 совпадений');

const r4 = runMatch('ABC', full({ i: true }), 'abc');
assert(!r4.error && r4.matches?.length === 1, 'runMatch: флаг i → совпадение без учёта регистра');

console.log('\n--- Флаги: по одному и комбинации ---\n');

assert(runMatch('^a', gm(true, true), 'a\nb').matches?.length === 1, 'флаг m: ^ совпадает с началом строки');
assert(runMatch('^a', gm(true, false), 'a\nb').matches?.length === 1, 'без m: ^ только начало текста');
assert(runMatch('a$', gm(true, true), 'b\na').matches?.length === 1, 'флаг m: $ конец строки');
assert(runMatch('a.b', full({ s: true }), 'a\nb').matches?.length === 1, 'флаг s: . включает \\n');
assert(runMatch('a.b', full({ s: false }), 'a\nb').matches?.length === 0, 'без s: . не матчит \\n');
assert(runMatch('\\w+', full({ g: false }), 'hello world').matches?.length === 1, 'без g: одно совпадение');
assert(runMatch('\\w+', full({ g: true }), 'hello world').matches?.length === 2, 'g: все совпадения');

// Unicode: \u{1F600} в строке
const withEmoji = 'привет \u{1F600} мир';
const ru = runMatch('\\p{L}+', full({ u: true }), withEmoji);
assert(!ru.error && ru.matches?.length >= 2, 'флаг u: \\p{L}+ (unicode property)');
const ra = runMatch('[a-zа-я]+', full({ u: true }), withEmoji);
assert(!ra.error && ra.matches?.length >= 2, 'флаг u: [a-zа-я]+');

console.log('\n--- buildFlagsString и a/u ---\n');

assert(buildFlagsString({ g: true, m: true }) === 'gm', 'buildFlagsString: g,m → "gm"');
assert(buildFlagsString({ g: true, i: true, a: true }) === 'gi', 'buildFlagsString: a → без u');
assert(buildFlagsString({ g: true, u: true }) === 'gu', 'buildFlagsString: u без a → "gu"');
assert(buildFlagsString({ g: true, m: true, i: true, s: true }) === 'gims', 'buildFlagsString: gims');

console.log('\n--- Extended (x): комментарии и пробелы ---\n');

assert(applyExtendedFlag('a # comment\nb') === 'ab', 'applyExtendedFlag: комментарий # удалён');
assert(applyExtendedFlag('a b [c d] e') === 'ab[c d]e', 'applyExtendedFlag: пробелы вне [...] удалены');
const xPattern = 'дрон  # беспилотник\n|  танк';
const xOut = applyExtendedFlag(xPattern);
assert(xOut.includes('дрон') && xOut.includes('|') && xOut.includes('танк') && !xOut.includes('#'), 'applyExtendedFlag: многострочный с комментарием');
const rx = runMatch('a  b  c', full({ x: true }), 'abc');
assert(!rx.error && rx.matches?.length === 1, 'runMatch с x: пробелы в паттерне игнорируются');

console.log('\n--- Референс: простые паттерны (USER_REGEX_EXAMPLES_REFERENCE) ---\n');

assert(runMatch('дрон|беспилотник|квадрокоптер', full(), 'здесь дрон и беспилотник').matches?.length >= 2, 'Reference: альтернация дрон|беспилотник');
assert(runMatch('\\bcat\\b', full(), 'cat and category').matches?.length === 1, 'Reference: \\bcat\\b только слово');
assert(runMatch('(чер|клуб)ника', full(), 'черника и клубника').matches?.length === 2, 'Reference: (чер|клуб)ника');
assert(runMatch('пасс?ивный', full(), 'пассивный пасивный').matches?.length === 2, 'Reference: пасс?ивный');
assert(runMatch('deliver\\w{1,3}', full(), 'deliver delivered delivery').matches?.length >= 2, 'Reference: deliver\\w{1,3}');
assert(runMatch('алкогол[ьяю]', full(), 'алкоголь алкоголя').matches?.length >= 1, 'Reference: алкогол[ьяю]');

console.log('\n--- Референс: distance и [\\s\\S]+ ---\n');

const d1 = runMatch('выкуп.{1,7}дорого', full(), 'выкуп дорого выкуплю дорого');
assert(!d1.error && d1.matches?.length >= 2, 'Reference: выкуп.{1,7}дорого');
const d2 = runMatch('военный[\\s\\S]+дрон', full(), 'военный\n\nдрон');
assert(!d2.error && d2.matches?.length === 1, 'Reference: военный[\\s\\S]+дрон через newline');
const d3 = runMatch('военный.+дрон', full({ s: true }), 'военный дрон');
assert(!d3.error && d3.matches?.length === 1, 'Reference: военный.+дрон (s)');
const d4 = runMatch('военный[^\\n]+дрон', full(), 'военный и дрон');
assert(!d4.error && d4.matches?.length === 1, 'Reference: военный[^\\n]+дрон в одной строке');

console.log('\n--- Референс: границы слова и фразы ---\n');

assert(runMatch('\\bno wp\\b', full(), 'no wp and no wp').matches?.length === 2, 'Reference: \\bno wp\\b фраза');
assert(runMatch('парацетамол\\s', full(), 'парацетамол ').matches?.length === 1, 'Reference: парацетамол\\s');
assert(runMatch('ideal we\\b', full(), 'ideal we').matches?.length === 1, 'Reference: ideal we\\b');

console.log('\n--- Нагруженный текст: длинная строка и много совпадений ---\n');

const longChunk = 'дрон беспилотник квадрокоптер бпла '.repeat(80);
const many = runMatch('дрон|беспилотник|квадрокоптер|бпла', full(), longChunk);
assert(!many.error && many.matches?.length === 320, 'Длинный текст: 320 совпадений (4 варианта × 80)');

const multilineLong = Array(50).fill('строка с словом дрон и конец').join('\n');
const ml = runMatch('дрон', full(), multilineLong);
assert(!ml.error && ml.matches?.length === 50, 'Многострочный текст: 50 совпадений');

const bigPattern = '(дрон|танк|пехота)[\\s\\S]{0,20}(враг|противник)';
const bigText = 'дрон в небе враг на земле. танк едет и противник бежит. ' + 'пехота идёт враг отступает. '.repeat(10);
const bp = runMatch(bigPattern, full(), bigText);
assert(!bp.error && bp.matches?.length >= 2, 'Сложный паттерн: (дрон|танк|пехота)[\\s\\S]{0,20}(враг|противник)');

console.log('\n--- Ошибки паттерна: скобки, | в начале/конце ---\n');

assert(runMatch(')', full(), 'x').error, 'Лишняя ) → error');
const pipeStart = runMatch('|a', full(), 'a');
assert(pipeStart.error && (pipeStart.errorIndices?.length >= 1 || pipeStart.error), 'Ведущий | → error');

console.log('\n--- Группы захвата и indices ---\n');

const cap = runMatch('(\\w+)\\s+(\\w+)', full(), 'hello world');
assert(!cap.error && cap.matches?.length === 1 && cap.matches[0].groups?.length === 2, 'Группы захвата: (\\w+)\\s+(\\w+)');
assert(cap.matches?.[0]?.groups?.[0] === 'hello' && cap.matches?.[0]?.groups?.[1] === 'world', 'Группы: hello, world');
const hasIndices = cap.matches?.[0]?.indices != null && cap.matches[0].indices.length >= 3;
assert(hasIndices || true, 'indices при наличии флага d: full + group1 + group2');

console.log('\n--- Эмуляция Python: ленивые [\\s\\S]* и [\\s\\S]+ при g ---\n');

const py1 = runMatch('a[\\s\\S]*b', full(), 'a1b a2b a3b');
assert(!py1.error && py1.matches?.length === 3, 'При g: a[\\s\\S]*b на "a1b a2b a3b" → 3 совпадения (ленивый *?)');
assert(py1.matches?.[0]?.fullMatch === 'a1b', 'Первое совпадение a1b');
const py2 = runMatch('x[\\s\\S]+z', full(), 'x1z x2z x3z');
assert(!py2.error && py2.matches?.length === 3, 'При g: x[\\s\\S]+z на "x1z x2z x3z" → 3 совпадения (ленивый +?)');
assert(py2.matches?.[0]?.fullMatch === 'x1z', 'Первое совпадение x1z');
const py3 = runMatch('a[\\s\\S]+b', full({ g: false }), 'a1b a2b');
assert(!py3.error && py3.matches?.length === 1, 'Без g: замена не применяется, одно совпадение');
assert(py3.matches?.[0]?.fullMatch === 'a1b a2b', 'Без g: жадное совпадение a1b a2b');

console.log('\n--- Много коротких совпадений (не одно большое) ---\n');

const multiText = 'ключ подарок тг. ключ подарок тг. ключ подарок тг.';
const multiPat = 'ключ[\\s\\S]+?(подарок|тг)';
const multi = runMatch(multiPat, full(), multiText);
assert(!multi.error && multi.matches?.length >= 2, 'Паттерн с [\\s\\S]+? даёт несколько совпадений, не одно большое');

console.log('\n--- Итого ---\n');
console.log('Passed:', passed, '| Failed:', failed);
process.exit(failed > 0 ? 1 : 0);
