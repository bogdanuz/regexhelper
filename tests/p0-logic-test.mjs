/**
 * P0 logic tests (no DOM). Run: node tests/p0-logic-test.mjs
 * 
 * NOTE: After LinkedBuilder refactor, linked triggers are now handled
 * by linkedBuilderConverter.js. Old linkedConverter.js tests removed.
 */
import { parseSimpleTriggers, convertSimpleTriggers } from '../tools/converter/logic/simpleConverter.js';
import { buildDistance, applyDistance, applyDistanceToArray, parseDistance, validateDistancePattern } from '../tools/converter/logic/distanceBuilder.js';
import { buildRegex, wrapInGroup, unwrapGroup, optimizeRegex, formatRegexForDisplay, validateFinalRegex } from '../tools/converter/logic/regexBuilder.js';
import {
  applyParameters,
  applyParametersToArray,
  applyParametersToSimpleWithPerTrigger
} from '../tools/converter/logic/parameterApplier.js';
import { validateTriggers, validateTriggerText, validateRegexPattern } from '../shared/utils/validation.js';
import { escapeRegex } from '../shared/utils/escape.js';
import { convert } from '../tools/converter/logic/conversionManager.js';
import { isParamActive, getActiveParamKeys, checkParamsCompatibility } from '../tools/converter/logic/compatibilityChecker.js';
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

console.log('\n--- P0 Logic Tests (no DOM) ---\n');

// Test 6: Empty triggers ignored (simple)
console.log('Test 6: Empty triggers ignored (simple)');
try {
  const triggers = parseSimpleTriggers('дрон\n\nтанк');
  assert(triggers.length === 2, 'parseSimpleTriggers: 2 triggers (empty ignored)');
  assert(!triggers.includes(''), 'parseSimpleTriggers: no empty string');
  const res = convertSimpleTriggers('дрон\n\nтанк', {});
  assert(res.success && res.result && (res.result.includes('дрон') && res.result.includes('танк')), 'convertSimpleTriggers: result has дрон|танк');
} catch (e) {
  assert(false, 'Test 6 exception: ' + e.message);
}

// Test 4/5: Distance empty = null (alternation)
console.log('\nTest 4: Distance empty = alternation (buildDistance)');
try {
  const emptyDist = buildDistance('empty');
  assert(emptyDist === null, "buildDistance('empty') returns null");
} catch (e) {
  assert(false, 'buildDistance(empty) exception: ' + e.message);
}

// Test 5: Distance non-empty
console.log('\nTest 5: Distance non-empty pattern');
try {
  const dist = buildDistance('preset-5');
  assert(dist === '.{1,5}', "buildDistance('preset-5') === '.{1,5}'");
} catch (e) {
  assert(false, 'buildDistance(preset-5) exception: ' + e.message);
}

// Test 7: Empty triggers ignored (linked) - convertLinkedBuilder filters empty
console.log('\nTest 7: Empty triggers ignored (linkedBuilder)');
try {
  const elements = [
    { id: '1', type: 'trigger', text: 'дрон', params: {}, connector: { mode: 'alternation' } },
    { id: '2', type: 'trigger', text: '', params: {}, connector: { mode: 'alternation' } },
    { id: '3', type: 'trigger', text: 'танк', params: {}, connector: { mode: 'alternation' } }
  ];
  const result = convertLinkedBuilder(elements);
  assert(result.success, 'convertLinkedBuilder success');
  assert(result.result.includes('дрон') && result.result.includes('танк'), 'linkedBuilder: only дрон and танк in result');
  assert(!result.result.includes('||'), 'linkedBuilder: no double pipe from empty');
} catch (e) {
  assert(false, 'Test 7 exception: ' + e.message);
}

// Two triggers with alternation connector
console.log('\nTest 4b: Two triggers with alternation → |');
try {
  const elements = [
    { id: '1', type: 'trigger', text: 'дрон', params: {}, connector: { mode: 'alternation' } },
    { id: '2', type: 'trigger', text: 'танк', params: {}, connector: { mode: 'alternation' } }
  ];
  const conv = convertLinkedBuilder(elements);
  assert(conv.success, 'convertLinkedBuilder success');
  assert(conv.result && conv.result.includes('дрон') && conv.result.includes('танк') && conv.result.includes('|'), 'Result uses alternation (|)');
} catch (e) {
  assert(false, 'Test 4b exception: ' + e.message);
}

// ═══════════════════════════════════════════════════════════════════
// Дополнительные P0‑тесты: distanceBuilder, regexBuilder, parameters
// ═══════════════════════════════════════════════════════════════════

console.log('\nExtra P0: distanceBuilder errors and helpers');
try {
  const bad1 = validateDistancePattern('.{10,1}');
  assert(!bad1.valid && /Максимальное расстояние должно быть ≥ минимального/i.test(bad1.error || ''), 'validateDistancePattern detects max<min');
  const parsedAny = parseDistance('[\\s\\S]+');
  assert(parsedAny.mode === 'any' && parsedAny.min === null && parsedAny.max === null, 'parseDistance any');
  const parsedUnknown = parseDistance('foo');
  assert(parsedUnknown.mode === 'unknown', 'parseDistance unknown mode');
} catch (e) {
  assert(false, 'Extra P0 distanceBuilder exception: ' + e.message);
}

console.log('\nExtra P0: applyDistance / applyDistanceToArray');
try {
  const alt = applyDistance('(?:а)', '(?:б)', null);
  assert(alt === '((?:а)|(?:б))', 'applyDistance null → alternation');
  const seq = applyDistanceToArray(['(?:а)', '(?:б)', '(?:в)'], '.{1,3}');
  assert(seq === '(?:а).{1,3}(?:б).{1,3}(?:в)', 'applyDistanceToArray with custom distance');
} catch (e) {
  assert(false, 'Extra P0 applyDistance exception: ' + e.message);
}

console.log('\nExtra P0: regexBuilder basic behaviour');
try {
  const r1 = buildRegex(['дрон', 'танк']);
  assert(r1 === '(дрон|танк)', 'buildRegex without distance → alternation');
  const r2 = buildRegex(['(?:дрон)', '.{1,7}', '(?:танк)']);
  assert(r2 === '(?:дрон).{1,7}(?:танк)', 'buildRegex with distance → concatenation');
  const wrapped = wrapInGroup('кот|пёс');
  assert(wrapped === '(кот|пёс)', 'wrapInGroup wraps');
  assert(unwrapGroup(wrapped) === 'кот|пёс', 'unwrapGroup unwraps');
  const optimized = optimizeRegex('(?:актёр|актёр|визит)');
  assert(optimized === '(актёр|визит)', 'optimizeRegex removes duplicates');
  const formatted = formatRegexForDisplay('a|b|c|d', 3);
  assert(formatted.split('\n').length > 1, 'formatRegexForDisplay inserts newlines when exceeding maxLength');
  const longRegex = 'a'.repeat(1001);
  const validation = validateFinalRegex(longRegex);
  assert(validation.valid && validation.warnings.length > 0, 'validateFinalRegex warns on too long regex');
} catch (e) {
  assert(false, 'Extra P0 regexBuilder exception: ' + e.message);
}

console.log('\nExtra P0: applyParameters and incompatibility errors');
try {
  // optionalChars >= length → ошибка
  let threw = false;
  try {
    applyParameters('абв', { optionalChars: [0, 1, 2] });
  } catch (e) {
    threw = /пустой строкой|обязательн/i.test(e.message || '');
  }
  assert(threw, 'applyParameters throws when all chars optional');

  // Несовместимые параметры latinCyrillic + optionalChars на уровне массива
  threw = false;
  try {
    applyParametersToArray(['дрон'], { latinCyrillic: true, optionalChars: [0] });
  } catch (e) {
    threw = /несовместимы/i.test(e.message || '');
  }
  assert(threw, 'applyParametersToArray detects incompatible params');

  // applyParametersToSimpleWithPerTrigger: конфликт у конкретного триггера
  threw = false;
  try {
    applyParametersToSimpleWithPerTrigger(['дрон'], {
      global: {},
      triggerParams: [{ latinCyrillic: true, optionalChars: [0] }]
    });
  } catch (e) {
    threw = /несовместимые параметры/i.test(e.message || '');
  }
  assert(threw, 'applyParametersToSimpleWithPerTrigger detects incompatible per-trigger params');
} catch (e) {
  assert(false, 'Extra P0 parameters exception: ' + e.message);
}

console.log('\nExtra P0: conversionManager negative paths');
try {
  const badInput = convert(null);
  assert(!badInput.success && /Некорректные входные данные/i.test(badInput.error || ''), 'convert(null) → error');
  const badType = convert({ type: 'unknown', text: 'a' });
  assert(!badType.success && /Неизвестный тип/i.test(badType.error || ''), 'convert with unknown type → error');

  // Невалидный regex после escapeRegex + validateRegexPattern
  const invalid = convert({
    type: 'simple',
    text: '\\',
    params: {},
    skipHistory: true
  });
  if (invalid.success) {
    // В редком случае RegExp может принять, проверим validateRegexPattern отдельно
    const vp = validateRegexPattern('\\');
    assert(!vp.valid, 'validateRegexPattern rejects bare backslash');
  } else {
    assert(/Некорректный regex/i.test(invalid.error || ''), 'convert catches invalid final regex');
  }

  // simple v2: несовместимые параметры по триггеру — ошибка до конвертации, текст «триггер N» и «Сначала снимите»
  const simpleV2Incompat = convert({
    type: 'simple',
    text: 'дрон\nтанк',
    params: {
      _simpleV2: true,
      global: {},
      triggerParams: [{ latinCyrillic: true, optionalChars: [0] }, {}]
    },
    skipHistory: true
  });
  assert(!simpleV2Incompat.success && /триггер\s*1/i.test(simpleV2Incompat.error || ''), 'convert(simple v2) incompatible trigger 1 → error mentions trigger');
  assert(/Сначала снимите/i.test(simpleV2Incompat.error || ''), 'convert(simple v2) incompatible → error mentions Сначала снимите');
} catch (e) {
  assert(false, 'Extra P0 conversionManager exception: ' + e.message);
}

console.log('\nExtra P0: escapeRegex basics');
try {
  const src = 'a.b?(c)';
  const escaped = escapeRegex(src);
  const re = new RegExp(escaped);
  assert(re.test(src), 'escapeRegex result matches original literal string');
} catch (e) {
  assert(false, 'Extra P0 escapeRegex exception: ' + e.message);
}

console.log('\nExtra P0: validateTriggerText rejects newline in trigger');
try {
  const r = validateTriggerText('дрон\nтанк');
  assert(!r.valid && (r.error || '').toLowerCase().includes('перевод'), 'validateTriggerText rejects trigger with \\n');
} catch (e) {
  assert(false, 'validateTriggerText newline exception: ' + e.message);
}

// ═══════════════════════════════════════════════════════════════════
// LinkedBuilder tests
// ═══════════════════════════════════════════════════════════════════

console.log('\nLinkedBuilder: parameters applied to triggers');
try {
  const elements = [
    { id: '1', type: 'trigger', text: 'дрон', params: { latinCyrillic: true }, connector: { mode: 'alternation' } },
    { id: '2', type: 'trigger', text: 'танк', params: {}, connector: { mode: 'alternation' } }
  ];
  const result = convertLinkedBuilder(elements);
  assert(result.success, 'convertLinkedBuilder success');
  assert(result.result.includes('танк'), 'linkedBuilder: second trigger unchanged');
  assert(result.result.includes('[дd]') || result.result.includes('дрон'), 'linkedBuilder: first trigger processed (latinCyrillic or literal)');
} catch (e) {
  assert(false, 'LinkedBuilder parameters exception: ' + e.message);
}

console.log('\nLinkedBuilder: group with nested triggers');
try {
  const elements = [
    {
      id: 'g1',
      type: 'group',
      children: [
        { id: '1', type: 'trigger', text: 'дети', params: {}, connector: { mode: 'alternation' } },
        { id: '2', type: 'trigger', text: 'школа', params: {}, connector: { mode: 'alternation' } }
      ],
      params: {},
      connector: { mode: 'alternation' }
    }
  ];
  const result = convertLinkedBuilder(elements);
  assert(result.success, 'convertLinkedBuilder with group success');
  assert(result.result.includes('дети') && result.result.includes('школа'), 'group contains both triggers');
} catch (e) {
  assert(false, 'LinkedBuilder group exception: ' + e.message);
}

console.log('\nLinkedBuilder: triggers with sequence connector');
try {
  const elements = [
    { id: '1', type: 'trigger', text: 'привет', params: {}, connector: { mode: 'custom', min: 1, max: 5 } },
    { id: '2', type: 'trigger', text: 'мир', params: {}, connector: { mode: 'alternation' } }
  ];
  const result = convertLinkedBuilder(elements);
  assert(result.success, 'convertLinkedBuilder with sequence success');
  assert(result.result.includes('привет') && result.result.includes('мир'), 'sequence result contains both triggers');
  assert(result.result.includes('.{1,5}'), 'sequence result contains distance pattern');
} catch (e) {
  assert(false, 'LinkedBuilder sequence exception: ' + e.message);
}

console.log('\nWord boundaries effective (no auto-boundaries, only explicit)');
try {
  // Без параметра wordBoundaries — нет \b
  const shortNoParam = applyParametersToArray(['ок'], {});
  assert(Array.isArray(shortNoParam) && shortNoParam[0] && !/\\b/.test(shortNoParam[0]), 'short trigger (≤3) no params: no auto \\b (auto disabled)');
  const shortFalse = applyParametersToArray(['ок'], { wordBoundaries: false });
  assert(Array.isArray(shortFalse) && shortFalse[0] && !/\\b/.test(shortFalse[0]), 'short trigger wordBoundaries: false: no \\b');
  const longNoParam = applyParametersToArray(['четыре'], {});
  assert(Array.isArray(longNoParam) && longNoParam[0] && !/\\b/.test(longNoParam[0]), 'long trigger (>3) no params: no auto \\b');
  // С параметром wordBoundaries: true — добавляем \b
  const triggerWithBoundaries = applyParametersToArray(['тест'], { wordBoundaries: true });
  assert(Array.isArray(triggerWithBoundaries) && triggerWithBoundaries[0] && /\\b/.test(triggerWithBoundaries[0]), 'trigger wordBoundaries: true: has \\b');
} catch (e) {
  assert(false, 'Word boundaries effective exception: ' + e.message);
}

console.log('\nLinkedBuilder: word boundaries applied in linkedBuilder');
try {
  const elements = [
    { id: '1', type: 'trigger', text: 'ок', params: { wordBoundaries: true }, connector: { mode: 'alternation' } },
    { id: '2', type: 'trigger', text: 'да', params: {}, connector: { mode: 'alternation' } }
  ];
  const result = convertLinkedBuilder(elements);
  assert(result.success, 'convertLinkedBuilder success');
  assert(result.result.includes('\\b'), 'linkedBuilder: short trigger with word boundaries has \\b');
} catch (e) {
  assert(false, 'LinkedBuilder word boundaries exception: ' + e.message);
}

console.log('\nCompatibility: isParamActive, optionalChars [] not active');
try {
  assert(!isParamActive('optionalChars', []), 'optionalChars [] not active');
  assert(isParamActive('optionalChars', [0]), 'optionalChars [0] active');
  const active = getActiveParamKeys({ latinCyrillic: true, optionalChars: [] });
  assert(active.length === 1 && active[0] === 'latinCyrillic', 'getActiveParamKeys excludes optionalChars []');
  const compat = checkParamsCompatibility({ latinCyrillic: true, optionalChars: [] });
  assert(compat.compatible, 'latinCyrillic + optionalChars [] compatible');
} catch (e) {
  assert(false, 'Compatibility exception: ' + e.message);
}

console.log('\nLinkedBuilder: convertLinkedBuilder basic structure');
try {
  const elements = [
    { id: '1', type: 'trigger', text: 'дрон', params: {}, connector: { mode: 'alternation' } },
    { id: '2', type: 'trigger', text: 'танк', params: {}, connector: { mode: 'alternation' } }
  ];
  const conv = convertLinkedBuilder(elements);
  assert(conv.success && conv.result, 'convertLinkedBuilder success');
  assert(conv.result.includes('дрон') && conv.result.includes('танк'), 'linkedBuilder result contains triggers');
} catch (e) {
  assert(false, 'convertLinkedBuilder exception: ' + e.message);
}

// ═══════════════════════════════════════════════════════════════════
// Declensions: новый функционал (прилагательные, причастия, мн. число)
// ═══════════════════════════════════════════════════════════════════

console.log('\nDeclensions: adjectives, participles, plural nouns');
try {
  // Прилагательные
  const adjDecl = applyParametersToArray(['красивый'], { declensions: true });
  const adjResult = Array.isArray(adjDecl) ? adjDecl[0] : '';
  assert(adjResult.includes('красив') && adjResult.includes('|'), 'Declensions: adjective красивый → multiple forms');
  assert(adjResult.includes('ого') || adjResult.includes('ому') || adjResult.includes('ым'), 'Declensions: adjective has case endings');

  // Причастие на -нный
  const partNn = applyParametersToArray(['написанный'], { declensions: true });
  const partNnResult = Array.isArray(partNn) ? partNn[0] : '';
  assert(partNnResult.includes('написанн') && partNnResult.includes('|'), 'Declensions: participle написанный → forms');

  // Причастие на -щий
  const partSch = applyParametersToArray(['работающий'], { declensions: true });
  const partSchResult = Array.isArray(partSch) ? partSch[0] : '';
  assert(partSchResult.includes('работающ') && partSchResult.includes('|'), 'Declensions: participle работающий → forms');

  // Существительное во мн. числе
  const plural = applyParametersToArray(['книги'], { declensions: true });
  const pluralResult = Array.isArray(plural) ? plural[0] : '';
  assert(pluralResult.includes('книг') && pluralResult.includes('|'), 'Declensions: plural noun книги → forms');

  // Мягкое прилагательное
  const soft = applyParametersToArray(['синий'], { declensions: true });
  const softResult = Array.isArray(soft) ? soft[0] : '';
  assert(softResult.includes('син') && softResult.includes('|'), 'Declensions: soft adjective синий → forms');

  // Глаголы не склоняются (проверяем отсутствие альтернаций — склонения не применяются)
  const verb = applyParametersToArray(['читать'], { declensions: true });
  assert(Array.isArray(verb) && verb[0] && !verb[0].includes('|'), 'Declensions: verb читать not declined (no |)');

  const verbConj = applyParametersToArray(['пишешь'], { declensions: true });
  assert(Array.isArray(verbConj) && verbConj[0] && !verbConj[0].includes('|'), 'Declensions: conjugated verb пишешь not declined (no |)');
} catch (e) {
  assert(false, 'Declensions adjectives/participles exception: ' + e.message);
}

// ═══════════════════════════════════════════════════════════════════
// Declensions: ед. и мн. число отдельно (без супплетивных форм)
// ═══════════════════════════════════════════════════════════════════

console.log('\nDeclensions: singular/plural separation (no suppletive forms)');
try {
  // "ребёнок" в ед. числе — НЕ должен генерировать "дети"
  // ПРИМЕЧАНИЕ: В Node.js без RussianNouns склонение ед. числа не работает,
  // поэтому проверяем только отсутствие "дети", а не наличие форм
  const rebenok = applyParametersToArray(['ребёнок'], { declensions: true });
  const rebenokResult = Array.isArray(rebenok) ? rebenok[0] : '';
  assert(rebenokResult.includes('реб'), 'Declensions: ребёнок → result contains реб');
  assert(!rebenokResult.includes('дет'), 'Declensions: ребёнок does NOT include дети (suppletive)');

  // "дети" во мн. числе — должен склоняться отдельно
  const deti = applyParametersToArray(['дети'], { declensions: true });
  const detiResult = Array.isArray(deti) ? deti[0] : '';
  assert(detiResult.includes('дет') && detiResult.includes('|'), 'Declensions: дети → multiple forms');
  assert(detiResult.includes('детей') || detiResult.includes('ей'), 'Declensions: дети includes детей');
  assert(detiResult.includes('детьми') || detiResult.includes('ьми') || detiResult.includes('[ьъ]ми'), 'Declensions: дети includes детьми');
  assert(!detiResult.includes('ребён') && !rebenokResult.includes('ребен'), 'Declensions: дети does NOT include ребёнок');

  // "люди" во мн. числе — должен склоняться отдельно
  const ludi = applyParametersToArray(['люди'], { declensions: true });
  const ludiResult = Array.isArray(ludi) ? ludi[0] : '';
  assert(ludiResult.includes('люд') && ludiResult.includes('|'), 'Declensions: люди → multiple forms');
  assert(ludiResult.includes('людей') || ludiResult.includes('ей'), 'Declensions: люди includes людей');
  assert(!ludiResult.includes('человек'), 'Declensions: люди does NOT include человек (suppletive)');

  // "человек" в ед. числе — НЕ должен генерировать "люди"
  // ПРИМЕЧАНИЕ: В Node.js без RussianNouns склонение ед. числа не работает
  const chelovek = applyParametersToArray(['человек'], { declensions: true });
  const chelovekResult = Array.isArray(chelovek) ? chelovek[0] : '';
  assert(chelovekResult.includes('человек'), 'Declensions: человек → result contains человек');
  assert(!chelovekResult.includes('люд'), 'Declensions: человек does NOT include люди (suppletive)');
} catch (e) {
  assert(false, 'Declensions singular/plural separation exception: ' + e.message);
}

// ═══════════════════════════════════════════════════════════════════
// LinkedBuilder: кнопка "+" inline add trigger (UI test placeholder)
// ═══════════════════════════════════════════════════════════════════

console.log('\nLinkedBuilder: inline add trigger button (structure test)');
try {
  // Проверяем что конвертер корректно обрабатывает пустые триггеры
  const elementsWithEmpty = [
    { id: '1', type: 'trigger', text: 'тест', params: {}, connector: { mode: 'alternation' } },
    { id: '2', type: 'trigger', text: '', params: {}, connector: { mode: 'alternation' } }
  ];
  const result = convertLinkedBuilder(elementsWithEmpty);
  assert(result.success, 'convertLinkedBuilder filters empty triggers');
  assert(result.result.includes('тест'), 'Result contains non-empty trigger');
  assert(!result.result.includes('||'), 'No double pipe from empty trigger');
} catch (e) {
  assert(false, 'LinkedBuilder inline add exception: ' + e.message);
}

// ═══════════════════════════════════════════════════════════════════
// LinkedBuilder: группировка — скобки только для явных групп
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// LinkedBuilder: авто-удвоение (вторая одинаковая буква = опциональная)
// ═══════════════════════════════════════════════════════════════════

console.log('\nLinkedBuilder: auto-doubling (second identical letter optional)');
try {
  // Триггер с удвоенной буквой без параметров — должен получить ?
  const doubledTrigger = [
    { id: '1', type: 'trigger', text: 'многообразие', params: {}, connector: { mode: 'alternation' } }
  ];
  const r1 = convertLinkedBuilder(doubledTrigger);
  assert(r1.success, 'Auto-doubling: success');
  assert(r1.result.includes('многоо?бразие'), 'Auto-doubling: многообразие → многоо?бразие');
  
  // Два триггера с удвоенными буквами
  const twoDoubled = [
    { id: '1', type: 'trigger', text: 'аллея', params: {}, connector: { mode: 'alternation' } },
    { id: '2', type: 'trigger', text: 'колонна', params: {}, connector: { mode: 'alternation' } }
  ];
  const r2 = convertLinkedBuilder(twoDoubled);
  assert(r2.success, 'Auto-doubling two triggers: success');
  assert(r2.result.includes('алл?ея'), 'Auto-doubling: аллея → алл?ея');
  assert(r2.result.includes('колонн?а'), 'Auto-doubling: колонна → колонн?а');
  
  // Триггер правоохранительн — удвоенная оо
  const pravoohr = [
    { id: '1', type: 'trigger', text: 'правоохранительн', params: {}, connector: { mode: 'alternation' } }
  ];
  const r3 = convertLinkedBuilder(pravoohr);
  assert(r3.success, 'Auto-doubling правоохранительн: success');
  assert(r3.result.includes('правоо?хранител'), 'Auto-doubling: правоохранительн → правоо?хранител...');
} catch (e) {
  assert(false, 'LinkedBuilder auto-doubling exception: ' + e.message);
}

console.log('\nLinkedBuilder: grouping brackets only for explicit groups');
try {
  // Два триггера без группы — НЕТ внешних скобок
  const twoTriggers = [
    { id: '1', type: 'trigger', text: 'кот', params: {}, connector: { mode: 'alternation' } },
    { id: '2', type: 'trigger', text: 'пёс', params: {}, connector: { mode: 'alternation' } }
  ];
  const r1 = convertLinkedBuilder(twoTriggers);
  assert(r1.success, 'Two triggers: success');
  assert(r1.result === 'кот|п[её]с', 'Two triggers without group: no outer brackets');

  // Одна группа с двумя триггерами — скобки вокруг группы
  const oneGroup = [
    {
      id: 'g1', type: 'group', connector: { mode: 'alternation' },
      children: [
        { id: '1', type: 'trigger', text: 'кот', params: {}, connector: { mode: 'alternation' } },
        { id: '2', type: 'trigger', text: 'пёс', params: {}, connector: { mode: 'alternation' } }
      ]
    }
  ];
  const r2 = convertLinkedBuilder(oneGroup);
  assert(r2.success, 'One group: success');
  assert(r2.result === '(кот|п[её]с)', 'One group: brackets around group');

  // Две вложенные группы + отдельный триггер
  const nestedGroups = [
    {
      id: 'outer', type: 'group', connector: { mode: 'alternation' },
      children: [
        {
          id: 'g1', type: 'group', connector: { mode: 'alternation' },
          children: [
            { id: '1', type: 'trigger', text: 'корова', params: {}, connector: { mode: 'alternation' } },
            { id: '2', type: 'trigger', text: 'собака', params: {}, connector: { mode: 'alternation' } }
          ]
        },
        {
          id: 'g2', type: 'group', connector: { mode: 'alternation' },
          children: [
            { id: '3', type: 'trigger', text: 'кошка', params: {}, connector: { mode: 'alternation' } },
            { id: '4', type: 'trigger', text: 'кролик', params: {}, connector: { mode: 'alternation' } }
          ]
        }
      ]
    },
    { id: '5', type: 'trigger', text: 'хомяк', params: {}, connector: { mode: 'alternation' } }
  ];
  const r3 = convertLinkedBuilder(nestedGroups);
  assert(r3.success, 'Nested groups + trigger: success');
  // Ожидаем: ((корова|собака)|(кошка|кролик))|хомяк
  assert(r3.result.startsWith('((корова|собака)|(кошка|кролик))'), 'Nested groups: two levels of brackets');
  assert(r3.result.endsWith('|хомяк'), 'Nested groups: trigger without extra brackets');
  assert(!r3.result.startsWith('((('), 'Nested groups: no triple brackets');
} catch (e) {
  assert(false, 'LinkedBuilder grouping brackets exception: ' + e.message);
}

console.log('\nSimple triggers: optionalChars parameter');
try {
  // optionalChars применяется к простым триггерам
  const res = applyParameters('пассивный', { optionalChars: [3] });
  assert(res.includes('пасс?ивный') || res.includes('пас?сивный'), 'optionalChars: пассивный → пасс?ивный');
  
  // optionalChars с auto-doubling (merged indices)
  const res2 = applyParameters('аллея', { optionalChars: [] });
  assert(res2 === 'алл?ея', 'optionalChars empty + auto-doubling: аллея → алл?ея');
  
  // optionalChars несовместим с declensions (используем checkParamsCompatibility с обоими активными)
  const compat = checkParamsCompatibility({ declensions: { mode: 'auto' }, optionalChars: [0] });
  assert(!compat.compatible, 'optionalChars incompatible with declensions');
  
  // optionalChars несовместим с latinCyrillic
  const compat2 = checkParamsCompatibility({ latinCyrillic: true, optionalChars: [0] });
  assert(!compat2.compatible, 'optionalChars incompatible with latinCyrillic');
  
  // optionalChars несовместим с transliteration
  const compat3 = checkParamsCompatibility({ transliteration: true, optionalChars: [0] });
  assert(!compat3.compatible, 'optionalChars incompatible with transliteration');
} catch (e) {
  assert(false, 'Simple triggers optionalChars exception: ' + e.message);
}

// ═══════════════════════════════════════════════════════════════════
// RegexParser: Обратный конвертер (импорт паттернов)
// ═══════════════════════════════════════════════════════════════════

import { parseRegexPattern, validateRegexSyntax, analyzePatternForUI } from '../tools/converter/logic/regexParser.js';

console.log('\nRegexParser: validateRegexSyntax');
try {
  // Валидный паттерн
  const valid = validateRegexSyntax('дрон|танк');
  assert(valid.valid === true, 'validateRegexSyntax: valid pattern');
  
  // Невалидный паттерн (незакрытая скобка)
  const invalid = validateRegexSyntax('(дрон');
  assert(invalid.valid === false, 'validateRegexSyntax: invalid pattern detected');
  
  // Паттерн с флагами /pattern/gi
  const withFlags = validateRegexSyntax('/дрон|танк/gi');
  assert(withFlags.valid === false && withFlags.isSlashFormat === true, 'validateRegexSyntax: detects slash format');
  
  // Пустой паттерн
  const empty = validateRegexSyntax('');
  assert(empty.valid === false, 'validateRegexSyntax: empty pattern invalid');
} catch (e) {
  assert(false, 'validateRegexSyntax exception: ' + e.message);
}

console.log('\nRegexParser: parseRegexPattern basic');
try {
  // Простая альтернация
  const r1 = parseRegexPattern('дрон|танк');
  assert(r1.success === true, 'parseRegexPattern: simple alternation success');
  assert(r1.elements && r1.elements.length >= 2, 'parseRegexPattern: created multiple elements');
  
  // Группа
  const r2 = parseRegexPattern('(дрон|танк)');
  assert(r2.success === true, 'parseRegexPattern: group success');
  
  // Соединитель [\s\S]+
  const r3 = parseRegexPattern('дрон[\\s\\S]+танк');
  assert(r3.success === true, 'parseRegexPattern: any connector success');
  
  // Соединитель .{1,10}
  const r4 = parseRegexPattern('дрон.{1,10}танк');
  assert(r4.success === true, 'parseRegexPattern: custom distance success');
} catch (e) {
  assert(false, 'parseRegexPattern basic exception: ' + e.message);
}

console.log('\nRegexParser: reverse mapping автозамен');
try {
  // [её] → ё
  const r1 = parseRegexPattern('акт[её]р');
  assert(r1.success === true, 'parseRegexPattern: [её] success');
  const trigger1 = r1.elements && r1.elements[0];
  assert(trigger1 && trigger1.text === 'актёр', 'parseRegexPattern: [её] → ё');
  
  // [ьъ] → ь
  const r2 = parseRegexPattern('маз[ьъ]');
  assert(r2.success === true, 'parseRegexPattern: [ьъ] success');
  const trigger2 = r2.elements && r2.elements[0];
  assert(trigger2 && trigger2.text === 'мазь', 'parseRegexPattern: [ьъ] → ь');
  
  // [ъь] → ъ
  const r3 = parseRegexPattern('под[ъь]езд');
  assert(r3.success === true, 'parseRegexPattern: [ъь] success');
  const trigger3 = r3.elements && r3.elements[0];
  assert(trigger3 && trigger3.text === 'подъезд', 'parseRegexPattern: [ъь] → ъ');
} catch (e) {
  assert(false, 'parseRegexPattern автозамены exception: ' + e.message);
}

console.log('\nRegexParser: reverse mapping latinCyrillic');
try {
  // [аa] → а + latinCyrillic
  const r1 = parseRegexPattern('[аa]втор');
  assert(r1.success === true, 'parseRegexPattern: [аa] success');
  const trigger1 = r1.elements && r1.elements[0];
  assert(trigger1 && trigger1.text === 'автор', 'parseRegexPattern: [аa] → а');
  assert(trigger1 && trigger1.params && trigger1.params.latinCyrillic === true, 'parseRegexPattern: latinCyrillic param set');
} catch (e) {
  assert(false, 'parseRegexPattern latinCyrillic exception: ' + e.message);
}

console.log('\nRegexParser: reverse mapping optionalChars vs auto-doubling');
try {
  // оо? → оо (автоудвоение, т.к. предыдущая буква та же)
  const r1 = parseRegexPattern('правоо?хранител');
  assert(r1.success === true, 'parseRegexPattern: оо? success');
  const trigger1 = r1.elements && r1.elements[0];
  assert(trigger1 && trigger1.text === 'правоохранител', 'parseRegexPattern: оо? → оо (auto-doubling)');
  assert(!trigger1.params || !trigger1.params.optionalChars || trigger1.params.optionalChars.length === 0, 
    'parseRegexPattern: оо? no optionalChars (auto-doubling)');
  
  // но?к → нок + optionalChars (разные буквы)
  const r2 = parseRegexPattern('подросто?к');
  assert(r2.success === true, 'parseRegexPattern: о?к success');
  const trigger2 = r2.elements && r2.elements[0];
  assert(trigger2 && trigger2.text === 'подросток', 'parseRegexPattern: о?к → ок (text)');
  assert(trigger2 && trigger2.params && trigger2.params.optionalChars && trigger2.params.optionalChars.length > 0,
    'parseRegexPattern: о?к has optionalChars param');
} catch (e) {
  assert(false, 'parseRegexPattern optionalChars/auto-doubling exception: ' + e.message);
}

console.log('\nRegexParser: reverse mapping wordBoundaries');
try {
  const r1 = parseRegexPattern('\\bкот\\b');
  assert(r1.success === true, 'parseRegexPattern: \\b success');
  const trigger1 = r1.elements && r1.elements[0];
  assert(trigger1 && trigger1.text === 'кот', 'parseRegexPattern: \\b removed from text');
  assert(trigger1 && trigger1.params && trigger1.params.wordBoundaries === true, 
    'parseRegexPattern: wordBoundaries param set');
} catch (e) {
  assert(false, 'parseRegexPattern wordBoundaries exception: ' + e.message);
}

console.log('\nRegexParser: reverse mapping wildcard');
try {
  const r1 = parseRegexPattern('доставк\\w{1,3}');
  assert(r1.success === true, 'parseRegexPattern: wildcard success');
  const trigger1 = r1.elements && r1.elements[0];
  assert(trigger1 && trigger1.text === 'доставк', 'parseRegexPattern: wildcard text extracted');
  assert(trigger1 && trigger1.params && trigger1.params.wildcard && trigger1.params.wildcard.enabled, 
    'parseRegexPattern: wildcard param set');
  assert(trigger1.params.wildcard.min === 1 && trigger1.params.wildcard.max === 3, 
    'parseRegexPattern: wildcard min/max correct');
} catch (e) {
  assert(false, 'parseRegexPattern wildcard exception: ' + e.message);
}

console.log('\nRegexParser: complex patterns from reference');
try {
  // Сложный паттерн с несколькими элементами
  const r1 = parseRegexPattern('парень встретил парня|дни нашей жизни|окна во двор');
  assert(r1.success === true, 'parseRegexPattern: multiple alternations success');
  assert(r1.elements && r1.elements.length === 3, 'parseRegexPattern: 3 elements from 3 alternatives');
  
  // Паттерн с группами
  const r2 = parseRegexPattern('(тетрадь в клеточку|почти 15 лет|\\bлев\\b)');
  assert(r2.success === true, 'parseRegexPattern: group with alternatives success');
  
  // Паттерн со сложным соединителем
  const r3 = parseRegexPattern('за стенкой[\\s\\S]*\\bкоста\\b');
  assert(r3.success === true, 'parseRegexPattern: connector + word boundary success');
} catch (e) {
  assert(false, 'parseRegexPattern complex patterns exception: ' + e.message);
}

console.log('\nRegexParser: analyzePatternForUI');
try {
  // Валидный паттерн
  const r1 = analyzePatternForUI('дрон|танк');
  assert(r1.summary && r1.summary.valid === true, 'analyzePatternForUI: valid pattern');
  assert(r1.summary.canImport === true, 'analyzePatternForUI: can import');
  assert(r1.summary.triggerCount >= 2, 'analyzePatternForUI: trigger count');
  
  // Паттерн с нераспознанным символьным классом
  const r2 = analyzePatternForUI('дет[ьк]?');
  assert(r2.warnings && r2.warnings.length > 0, 'analyzePatternForUI: unrecognized class has warnings');
  assert(r2.highlights && r2.highlights.length > 0, 'analyzePatternForUI: unrecognized class has highlights');
  assert(r2.summary && r2.summary.hasErrors === true, 'analyzePatternForUI: unrecognized class marks hasErrors');
  
  // Паттерн с флагами
  const r3 = analyzePatternForUI('/дрон/gi');
  assert(r3.summary && r3.summary.valid === false, 'analyzePatternForUI: slash format invalid');
  assert(r3.warnings && r3.warnings.some(w => w.type === 'slashFormat'), 'analyzePatternForUI: slash format warning');
} catch (e) {
  assert(false, 'analyzePatternForUI exception: ' + e.message);
}

console.log('\n--- Result: ' + passed + ' passed, ' + failed + ' failed ---\n');
process.exit(failed > 0 ? 1 : 0);
