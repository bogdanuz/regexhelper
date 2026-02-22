/**
 * Тесты конвертера по сценариям Reference (USER_REGEX_EXAMPLES_REFERENCE.md).
 * Запуск: node tests/converter-reference-test.mjs
 *
 * Покрывает: SIMPLE, MEDIUM, COMPLEX, Feature, Valid, Pipeline, EXTREME.
 * Без DOM — только логика.
 */

import { parseSimpleTriggers, convertSimpleTriggers } from '../tools/converter/logic/simpleConverter.js';
import { convertLinkedBuilder } from '../tools/converter/logic/linkedBuilderConverter.js';
import { buildDistance } from '../tools/converter/logic/distanceBuilder.js';
import { applyParametersToArray, applyParametersToSimpleWithPerTrigger } from '../tools/converter/logic/parameterApplier.js';
import { convert } from '../tools/converter/logic/conversionManager.js';
import { applyOptionalChars } from '../tools/converter/converters/optionalChars.js';
import { formatResult } from '../tools/converter/logic/resultFormatter.js';
import { validateTriggers } from '../shared/utils/validation.js';

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

const skipHistory = { skipHistory: true };

console.log('\n--- Converter Reference Tests (no DOM) ---\n');

// ═══════════════════════════════════════════════════════════════════
// REFERENCE SIMPLE
// ═══════════════════════════════════════════════════════════════════

console.log('Reference SIMPLE');
try {
  let r = convertSimpleTriggers('дрон\nбеспилотник\nквадрокоптер\nбпла');
  const hasAll = ['дрон', 'беспилотник', 'квадрокоптер', 'бпла'].every(t => r.result.includes(t));
  assert(r.success && (r.result.startsWith('(?:') || r.result.startsWith('(')) && r.result.includes('|') && hasAll, 'Alternation: дрон|беспилотник|...');

  r = convertSimpleTriggers('удалённый');
  assert(r.success && /удал\[её\]нн\?ый/.test(r.result), 'ё → [её]: удалённый (+ авто удвоение нн?)');

  const altPair = applyParametersToArray(['черника', 'клубника'], {});
  assert(Array.isArray(altPair) && altPair.length === 2 && altPair[0].includes('чер') && altPair[1].includes('клуб'), 'Two triggers: черника, клубника → two processed parts');

  const wb = applyParametersToArray(['кот'], { wordBoundaries: true });
  assert(Array.isArray(wb) && wb[0] && /\\bкот\\b/.test(wb[0]), 'Word boundary short: \\bкот\\b');

  // Границы слова: только явно указанные (авто отключено)
  const wbAuto = applyParametersToArray(['кот'], {});
  assert(Array.isArray(wbAuto) && wbAuto[0] && !/\\b/.test(wbAuto[0]), 'Word boundary auto disabled: no \\b without explicit param');
  const wbAutoOff = applyParametersToArray(['кот'], { wordBoundaries: false });
  assert(Array.isArray(wbAutoOff) && wbAutoOff[0] && !/\\b/.test(wbAutoOff[0]) && wbAutoOff[0].includes('кот'), 'Word boundary explicit false: no \\b');
  const wbLong = applyParametersToArray(['пять'], {});
  assert(Array.isArray(wbLong) && wbLong[0] && !/\\b/.test(wbLong[0]), 'Word boundary long (>3): no auto \\b');
  const wbLongOn = applyParametersToArray(['тест'], { wordBoundaries: true });
  assert(Array.isArray(wbLongOn) && wbLongOn[0] && /\\b/.test(wbLongOn[0]), 'Word boundary explicit true: has \\b');

  const wbPhrase = applyParametersToArray(['без вп'], { wordBoundaries: true });
  assert(Array.isArray(wbPhrase) && wbPhrase[0]?.includes('без вп'), 'Word boundary phrase');

  const space = applyParametersToArray(['парацетамол'], { requireSpaceAfter: true });
  assert(Array.isArray(space) && space[0]?.endsWith('\\s'), 'Trailing space: парацетамол\\s');

  // applyPrefix removed - wildcard functionality now handled by applyParameters with wildcard param

  const opt = applyOptionalChars('пассивный', [3]);
  assert(opt === 'пасс?ивный', 'Optional char: пасс?ивный');

  r = convertSimpleTriggers('медвежий угол\nbeartown\nбьорнстад');
  const hasMixed = r.result.includes('медвежий угол') && r.result.includes('beartown') && r.result.includes('орнстад');
  assert(r.success && hasMixed && r.result.includes('|'), 'Mixed language alternation');
} catch (e) {
  assert(false, 'Reference SIMPLE exception: ' + e.message);
}

// ═══════════════════════════════════════════════════════════════════
// REFERENCE MEDIUM
// ═══════════════════════════════════════════════════════════════════

console.log('\nReference MEDIUM');
try {
  // LinkedBuilder format: triggers with connectors
  const elements1 = [
    { id: '1', type: 'trigger', text: 'выкуп', params: {}, connector: { mode: 'custom', min: 1, max: 7 } },
    { id: '2', type: 'trigger', text: 'дорого', params: {}, connector: { mode: 'alternation' } }
  ];
  let r = convertLinkedBuilder(elements1);
  assert(r.success && r.result.includes('.{1,7}') && r.result.includes('выкуп') && r.result.includes('дорого'), 'Distance .{1,7}: выкуп.{1,7}дорого');

  const elements2 = [
    { id: '1', type: 'trigger', text: 'военный', params: {}, connector: { mode: 'any' } },
    { id: '2', type: 'trigger', text: 'дрон', params: {}, connector: { mode: 'alternation' } }
  ];
  r = convertLinkedBuilder(elements2);
  assert(r.success && r.result.includes('[\\s\\S]+'), 'Distance any [\\s\\S]+');

  assert(buildDistance('line') === '[^\\n]+', 'Distance line');
  assert(buildDistance('paragraph') === '.+', 'Distance paragraph');

  const elements3 = [
    { id: '1', type: 'trigger', text: 'за стенкой', params: {}, connector: { mode: 'any' } },
    { id: '2', type: 'trigger', text: 'коста', params: {}, connector: { mode: 'alternation' } }
  ];
  r = convertLinkedBuilder(elements3);
  assert(r.success && r.result.includes('за стенкой') && r.result.includes('коста'), 'Linked: phrase + distance');
} catch (e) {
  assert(false, 'Reference MEDIUM exception: ' + e.message);
}

// ═══════════════════════════════════════════════════════════════════
// REFERENCE COMPLEX
// ═══════════════════════════════════════════════════════════════════

console.log('\nReference COMPLEX');
try {
  const elements = [
    { id: '1', type: 'trigger', text: 'военный', params: {}, connector: { mode: 'any' } },
    { id: '2', type: 'trigger', text: 'дрон', params: {}, connector: { mode: 'alternation' } }
  ];
  const r = convertLinkedBuilder(elements);
  // военный → военн?ый (авто-удвоение)
  assert(r.success && r.result.includes('военн?ый') && r.result.includes('дрон'), 'Linked one order');

  // Bidirectional: two groups with alternation
  const elementsBidir = [
    {
      id: 'g1',
      type: 'group',
      children: [
        { id: '1', type: 'trigger', text: 'мышь', params: {}, connector: { mode: 'any' } },
        { id: '2', type: 'trigger', text: 'филиппов', params: {}, connector: { mode: 'alternation' } }
      ],
      params: {},
      connector: { mode: 'alternation' }
    },
    {
      id: 'g2',
      type: 'group',
      children: [
        { id: '3', type: 'trigger', text: 'филиппов', params: {}, connector: { mode: 'any' } },
        { id: '4', type: 'trigger', text: 'мышь', params: {}, connector: { mode: 'alternation' } }
      ],
      params: {},
      connector: { mode: 'alternation' }
    }
  ];
  const r2 = convertLinkedBuilder(elementsBidir);
  // "мышь" → "мыш[ьъ]" (autoReplace), "филиппов" → "филипп?ов" (авто-удвоение)
  assert(r2.success && r2.result.includes('мыш') && r2.result.includes('филипп?ов'), 'Bidirectional two groups');
} catch (e) {
  assert(false, 'Reference COMPLEX exception: ' + e.message);
}

// ═══════════════════════════════════════════════════════════════════
// REFERENCE FEATURE
// ═══════════════════════════════════════════════════════════════════

console.log('\nReference Feature');
try {
  let r = convertSimpleTriggers('удалённый');
  assert(r.success && /\[её\]/.test(r.result), 'ё replacement');

  const lc = applyParametersToArray(['epstein'], { latinCyrillic: true });
  assert(Array.isArray(lc) && lc[0] && lc[0].includes('[') && lc[0].includes('e'), 'Latin/Cyrillic: epstein → char classes');

  const optArr = applyParametersToArray(['подарок'], { optionalChars: [5] });
  assert(Array.isArray(optArr) && optArr[0]?.includes('?'), 'Optional: подаро?к');

  const decl = applyParametersToArray(['актёр'], { declensions: true });
  assert(Array.isArray(decl) && decl[0] && (decl[0].includes('акт') || decl[0].includes('|')), 'Declensions');

  const declVerb = applyParametersToArray(['курит'], { declensions: true });
  assert(Array.isArray(declVerb) && declVerb[0] === 'курит', 'Declensions: verb not declined (курит stays as-is)');

  // Новые тесты: прилагательные
  const declAdj = applyParametersToArray(['красивый'], { declensions: true });
  assert(Array.isArray(declAdj) && declAdj[0] && declAdj[0].includes('красив') && declAdj[0].includes('|'), 'Declensions: adjective красивый → forms');

  // Проверяем формы прилагательного
  const declAdjResult = declAdj[0];
  const hasAdjForms = declAdjResult.includes('ого') || declAdjResult.includes('ому') || declAdjResult.includes('ым');
  assert(hasAdjForms, 'Declensions: adjective has case forms (ого, ому, ым)');

  // Причастия
  const declPart = applyParametersToArray(['написанный'], { declensions: true });
  assert(Array.isArray(declPart) && declPart[0] && declPart[0].includes('написанн') && declPart[0].includes('|'), 'Declensions: participle написанный → forms');

  // Причастие на -щий
  const declPartSch = applyParametersToArray(['работающий'], { declensions: true });
  assert(Array.isArray(declPartSch) && declPartSch[0] && declPartSch[0].includes('работающ') && declPartSch[0].includes('|'), 'Declensions: participle работающий → forms');

  // Существительные во мн. числе
  const declPlural = applyParametersToArray(['книги'], { declensions: true });
  assert(Array.isArray(declPlural) && declPlural[0] && declPlural[0].includes('книг') && declPlural[0].includes('|'), 'Declensions: plural noun книги → forms');

  // Мягкое прилагательное (-ий)
  const declSoft = applyParametersToArray(['синий'], { declensions: true });
  assert(Array.isArray(declSoft) && declSoft[0] && declSoft[0].includes('син') && declSoft[0].includes('|'), 'Declensions: soft adjective синий → forms');

  const wb3 = applyParametersToArray(['мир'], { wordBoundaries: true });
  assert(Array.isArray(wb3) && wb3[0] && /\\bмир\\b/.test(wb3[0]), 'Word boundary for 3-char');

  // Авто-удвоения: второй из пары подряд одинаковых опционален; ь/ъ без повторной замены
  const maj = applyParametersToArray(['мазь'], {});
  assert(Array.isArray(maj) && maj[0] === 'маз[ьъ]', 'ь → [ьъ]: мазь (без маз[ь[ъь])');

  const doubled = convertSimpleTriggers('аллея');
  assert(doubled.success && /алл\?ея/.test(doubled.result), 'Авто-удвоение: аллея → алл?ея');

  const multi = convertSimpleTriggers('аббревиатура\nакклиматизация\nаллея');
  assert(multi.success && /абб\?ревиатура/.test(multi.result) && /акк\?лиматизация/.test(multi.result) && /алл\?ея/.test(multi.result), 'Авто-удвоение в нескольких триггерах');

  const triple = applyParametersToArray(['ааа'], {});
  const tripleStr = Array.isArray(triple) ? triple[0] : '';
  assert(Array.isArray(triple) && tripleStr.includes('ааа') && !/а\?а\?а|аа\?а|ааа\?/.test(tripleStr), 'Тройка одинаковых (ааа): опциональный не добавляется');
} catch (e) {
  assert(false, 'Reference Feature exception: ' + e.message);
}

// ═══════════════════════════════════════════════════════════════════
// REFERENCE VALID (RegExp syntax)
// ═══════════════════════════════════════════════════════════════════

console.log('\nReference Valid');
try {
  const re1 = new RegExp('(?:a|b)');
  assert(re1.test('a') && re1.test('b'), 'Pattern (?:a|b) valid');

  const re2 = new RegExp('\\bcat\\b');
  assert(re2.test('cat') && !re2.test('category'), 'Pattern \\bкот\\b (ASCII)');

  const re3 = new RegExp('выкуп.{1,7}дорого');
  assert(re3.test('выкуп дорого') && re3.test('выкуплю дорого'), 'Pattern выкуп.{1,7}дорого');

  const re4 = new RegExp('военный[\\s\\S]+дрон');
  assert(re4.test('военный\n\nдрон'), 'Pattern [\\s\\S]+ matches newline');

  const re5 = new RegExp('военный[^\\n]+дрон');
  assert(re5.test('военный и дрон') && !re5.test('военный\nдрон'), 'Pattern [^\\n]+ no cross newline');
} catch (e) {
  assert(false, 'Reference Valid exception: ' + e.message);
}

// ═══════════════════════════════════════════════════════════════════
// REFERENCE PIPELINE (convert full)
// ═══════════════════════════════════════════════════════════════════

console.log('\nReference Pipeline (convert)');
try {
  let c = convert({ type: 'simple', text: 'актёр, визит', params: {}, ...skipHistory });
  assert(c.success && c.result.includes('акт') && c.result.includes('визит') && c.result.includes('|'), 'Simple: актёр, визит');

  c = convert({ type: 'simple', text: 'кот', params: { wordBoundaries: true }, ...skipHistory });
  assert(c.success && /\\bкот\\b/.test(c.result), 'Simple + wordBoundaries (explicit)');
  // Note: auto wordBoundaries for short triggers is disabled - test with explicit param only
  
  c = convert({ type: 'simple', text: 'парацетамол', params: { requireSpaceAfter: true }, ...skipHistory });
  assert(c.success && c.result.endsWith('\\s'), 'Simple + requireSpaceAfter');

  // LinkedBuilder: two triggers + distance
  let lb = convertLinkedBuilder([
    { id: '1', type: 'trigger', text: 'актёр', params: {}, connector: { mode: 'custom', min: 1, max: 10 } },
    { id: '2', type: 'trigger', text: 'визит', params: {}, connector: { mode: 'alternation' } }
  ]);
  assert(lb.success && lb.result.includes('.{1,10}') && lb.result.includes('акт') && lb.result.includes('визит'), 'LinkedBuilder: two triggers + distance');

  // LinkedBuilder: subgroup alternation
  lb = convertLinkedBuilder([
    { id: '1', type: 'trigger', text: 'песня', params: {}, connector: { mode: 'alternation' } },
    { id: '2', type: 'trigger', text: 'песню', params: {}, connector: { mode: 'alternation' } },
    { id: '3', type: 'trigger', text: 'песни', params: {}, connector: { mode: 'alternation' } }
  ]);
  assert(lb.success && (lb.result.includes('песня') || lb.result.includes('песн')), 'LinkedBuilder: triggers alternation');

  // LinkedBuilder: distance any
  lb = convertLinkedBuilder([
    { id: '1', type: 'trigger', text: 'начало', params: {}, connector: { mode: 'any' } },
    { id: '2', type: 'trigger', text: 'конец', params: {}, connector: { mode: 'alternation' } }
  ]);
  assert(lb.success && lb.result.includes('[\\s\\S]+'), 'LinkedBuilder: distance any');

  // LinkedBuilder: triggers with paragraph connector
  lb = convertLinkedBuilder([
    { id: '1', type: 'trigger', text: 'подбородок', params: {}, connector: { mode: 'paragraph' } },
    { id: '2', type: 'trigger', text: 'подросток', params: {}, connector: { mode: 'alternation' } }
  ]);
  assert(lb.success && lb.result.includes('.+') && lb.result.includes('подбородок') && lb.result.includes('подросток'), 'LinkedBuilder: triggers with paragraph distance');

  // LinkedBuilder: triggers with alternation
  lb = convertLinkedBuilder([
    { id: '1', type: 'trigger', text: 'дети', params: {}, connector: { mode: 'alternation' } },
    { id: '2', type: 'trigger', text: 'школа', params: {}, connector: { mode: 'alternation' } }
  ]);
  assert(lb.success && lb.result.includes('дети') && lb.result.includes('школа') && lb.result.includes('|'), 'LinkedBuilder: triggers alternation');

  // LinkedBuilder: ребёнок с declensions — НЕ должен включать "дети"
  lb = convertLinkedBuilder([
    { id: '1', type: 'trigger', text: 'ребёнок', params: { declensions: { mode: 'auto' } }, connector: { mode: 'alternation' } }
  ]);
  assert(lb.success && lb.result.includes('реб'), 'LinkedBuilder: ребёнок declensions success');
  assert(!lb.result.includes('дет'), 'LinkedBuilder: ребёнок declensions does NOT include дети');

  // LinkedBuilder: дети с declensions — должен склоняться
  lb = convertLinkedBuilder([
    { id: '1', type: 'trigger', text: 'дети', params: { declensions: { mode: 'auto' } }, connector: { mode: 'alternation' } }
  ]);
  assert(lb.success && lb.result.includes('дет'), 'LinkedBuilder: дети declensions success');
  assert(lb.result.includes('|'), 'LinkedBuilder: дети declensions has multiple forms');

  // LinkedBuilder: группировка — скобки только для явных групп
  // Две вложенные группы + отдельный триггер
  lb = convertLinkedBuilder([
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
  ]);
  assert(lb.success, 'LinkedBuilder: nested groups success');
  assert(lb.result.startsWith('((корова|собака)|(кошка|кролик))'), 'LinkedBuilder: nested groups have correct brackets');
  assert(lb.result.endsWith('|хомяк'), 'LinkedBuilder: trigger outside group has no extra brackets');
  assert(!lb.result.startsWith('((('), 'LinkedBuilder: no triple brackets (no extra wrapping)');
} catch (e) {
  assert(false, 'Reference Pipeline exception: ' + e.message);
}

// ═══════════════════════════════════════════════════════════════════
// INTEGRATION
// ═══════════════════════════════════════════════════════════════════

console.log('\nIntegration');
try {
  const vt = validateTriggers(['дрон', 'танк']);
  assert(vt.valid, 'validateTriggers valid');

  const formatted = formatResult('(?:a|b)');
  assert(formatted && (formatted.formatted || formatted.plain), 'formatResult returns formatted/plain');

  const perTrigger = applyParametersToSimpleWithPerTrigger(['актёр', 'дом'], {
    global: {},
    triggerParams: [{ latinCyrillic: true }, {}]
  });
  assert(perTrigger.length === 2 && perTrigger[0].includes('[') && !perTrigger[1].includes('[аa]'), 'applyParametersToSimpleWithPerTrigger');

  // Per-trigger: wordBoundaries disabled by default, need explicit param
  const perTriggerExplicit = applyParametersToSimpleWithPerTrigger(['мир', 'длинный'], {
    global: {},
    triggerParams: [{ wordBoundaries: true }, {}]
  });
  assert(perTriggerExplicit.length === 2 && /\\bмир\\b/.test(perTriggerExplicit[0]) && !/\\b/.test(perTriggerExplicit[1]), 'applyParametersToSimpleWithPerTrigger: explicit wordBoundaries');
} catch (e) {
  assert(false, 'Integration exception: ' + e.message);
}

// ═══════════════════════════════════════════════════════════════════
// REFERENCE EXTREME (syntax validity)
// ═══════════════════════════════════════════════════════════════════

console.log('\nReference EXTREME (syntax)');
try {
  const longDist = '.{0,150}';
  let re;
  try {
    re = new RegExp(`выкуп${longDist}дорого`);
    assert(re.test('выкуп' + ' '.repeat(100) + 'дорого'), 'Long distance .{0,150} matches');
  } catch (e) {
    assert(false, 'Long distance regex: ' + e.message);
  }
} catch (e) {
  assert(false, 'Reference EXTREME exception: ' + e.message);
}

console.log('\n--- Converter Reference: ' + passed + ' passed, ' + failed + ' failed ---\n');
process.exit(failed > 0 ? 1 : 0);
