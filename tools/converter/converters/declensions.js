/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - DECLENSIONS
 *                   Склонения (существительные, прилагательные, причастия)
 * ═══════════════════════════════════════════════════════════════════
 *
 * @file converters/declensions.js
 * @description Генерация падежных форм слов
 * @date 21.02.2026
 *
 * Поддерживает:
 * - Существительные в ед. числе (через библиотеку RussianNounsJS)
 * - Существительные во мн. числе (определение + склонение)
 * - Прилагательные (эвристика по окончаниям)
 * - Причастия (как прилагательные)
 *
 * НЕ поддерживает:
 * - Глаголы (спряжение) — используйте параметр \w или точные окончания
 * - Краткие формы прилагательных (красив, красива, красиво)
 *
 * Использует RussianNounsJS v2.5.0 (глобальная переменная window.RussianNouns).
 */

// Кэш Engine — создаём лениво один раз
let _engine = null;

function getEngine() {
  if (!_engine && typeof window !== 'undefined' && window.RussianNouns) {
    _engine = new window.RussianNouns.Engine();
  }
  return _engine;
}

// ═══════════════════════════════════════════════════════════════════
// ОПРЕДЕЛЕНИЕ ЧАСТИ РЕЧИ
// ═══════════════════════════════════════════════════════════════════

/**
 * Существительные, совпадающие по окончанию с инфинитивами (гласная + ть).
 */
const NOUNS_LIKE_INFINITIVES = new Set([
  'мать', 'кровать', 'печать', 'знать', 'стать', 'рать', 'благодать',
  'сеть', 'клеть', 'плеть',
  'нить', 'прыть',
  'плоть',
  'суть', 'жуть', 'муть', 'путь', 'ртуть',
  'мелочь', 'картечь', 'сволочь',
  'пути', 'сети', 'дети', 'гости', 'кости', 'части', 'ногти', 'когти',
]);

/**
 * Определяет тип слова для склонения.
 * @param {string} word - Слово в нижнем регистре
 * @returns {'adjective'|'noun'|'noun_plural'|'verb'|'unknown'}
 */
function detectWordType(word) {
  const w = word.toLowerCase().trim();
  if (w.length < 2) return 'unknown';

  // Сначала проверяем глаголы — они не склоняются
  if (isLikelyVerb(w)) return 'verb';

  // Затем прилагательные/причастия
  if (isLikelyAdjective(w)) return 'adjective';

  // Существительные во множественном числе
  if (isLikelyPluralNoun(w)) return 'noun_plural';

  // Проверяем косвенные падежи (не склоняем)
  if (isNonNominativeEnding(w)) return 'unknown';

  // По умолчанию — существительное в ед. числе
  return 'noun';
}

// ───────────────────────── ГЛАГОЛЫ ─────────────────────────

function isLikelyVerb(w) {
  // Рефлексивные инфинитивы
  if (w.endsWith('ться') || w.endsWith('тись') || w.endsWith('чься')) return true;

  const vowels = 'аяеёиоуыэю';

  // гласная + ть (делать, читать, говорить)
  if (w.endsWith('ть') && w.length >= 3) {
    const ch = w.charAt(w.length - 3);
    if (vowels.includes(ch)) {
      return !NOUNS_LIKE_INFINITIVES.has(w);
    }
  }

  // -ти (нести, идти)
  if (w.endsWith('ти') && w.length >= 4) {
    return !NOUNS_LIKE_INFINITIVES.has(w);
  }

  // -чь ≥ 5 букв (стричь, беречь)
  if (w.endsWith('чь') && w.length >= 5) {
    return !NOUNS_LIKE_INFINITIVES.has(w);
  }

  // Спрягаемые формы
  if (w.endsWith('ешь') || w.endsWith('ёшь') || w.endsWith('ишь')) return true;
  if ((w.endsWith('ете') || w.endsWith('ёте') || w.endsWith('ите')) && w.length >= 5) return true;
  if (w.endsWith('ёт') && w.length >= 4) return true;
  if (w.endsWith('ит') && w.length >= 4) return true;
  if (w.endsWith('ет') && w.length >= 5) return true;
  if ((w.endsWith('ут') || w.endsWith('ют') || w.endsWith('ят')) && w.length >= 4) return true;
  if (w.endsWith('ат') && w.length >= 5) return true;

  return false;
}

// ───────────────────── ПРИЛАГАТЕЛЬНЫЕ / ПРИЧАСТИЯ ──────────────────

/**
 * Определяет, является ли слово прилагательным или причастием.
 */
function isLikelyAdjective(w) {
  if (w.length < 4) return false;

  // Муж. род: -ый, -ой (сильный, большой)
  if (w.endsWith('ый') || w.endsWith('ой')) return true;

  // Мн. число: -ые (сильные)
  if (w.endsWith('ые')) return true;

  // Жен. род: -яя (синяя)
  if (w.endsWith('яя') && w.length >= 5) return true;

  // Жен. род: -ая ≥ 5 букв (сильная)
  if (w.endsWith('ая') && w.length >= 5) return true;

  // Ср. род: -ое ≥ 5 букв (сильное)
  if (w.endsWith('ое') && w.length >= 5) return true;

  // Ср. род: -ее ≥ 5 букв (синее)
  if (w.endsWith('ее') && w.length >= 5) return true;

  // Муж. род: -ий ≥ 5 букв + согласная перед -ий (синий)
  if (w.endsWith('ий') && w.length >= 5) {
    const before = w.charAt(w.length - 3);
    if (!'аеёиоуыэюя'.includes(before)) return true;
  }

  // Мн. число: -ие ≥ 5 букв (синие)
  // НО: -ание, -ение, -тие, -ствие → существительные
  if (w.endsWith('ие') && w.length >= 5) {
    if (w.endsWith('ание') || w.endsWith('ение') || w.endsWith('ёние') ||
        w.endsWith('тие') || w.endsWith('ствие') || w.endsWith('зие')) {
      return false;
    }
    return true;
  }

  // Причастия
  if (w.endsWith('ший') && w.length >= 5) return true;
  if (w.endsWith('щий') && w.length >= 5) return true;
  if (w.endsWith('нный') && w.length >= 6) return true;
  if (w.endsWith('тый') && w.length >= 6) return true;
  if (w.endsWith('мый') && w.length >= 6) return true;

  return false;
}

// ───────────────────── СУЩЕСТВИТЕЛЬНЫЕ ВО МН. ЧИСЛЕ ──────────────────

/**
 * Определяет, является ли слово существительным во множественном числе.
 */
function isLikelyPluralNoun(w) {
  if (w.length < 3) return false;

  // Типичные окончания мн. числа существительных
  // -ы (столы, дома — но дома может быть и род. падеж ед.ч.)
  // -и (книги, двери)
  // -а (города, дома, глаза) — для ср. рода и некоторых муж.
  // -я (поля, моря)

  // Мн. число на -ы (не прилагательные)
  if (w.endsWith('ы') && !w.endsWith('ый') && !w.endsWith('ые') && w.length >= 3) {
    // Исключаем прилагательные
    return true;
  }

  // Мн. число на -и (не прилагательные на -ий/-ие/-ши/-щи)
  if (w.endsWith('и') && w.length >= 3) {
    if (w.endsWith('ий') || w.endsWith('ие') || w.endsWith('ши') || w.endsWith('щи')) {
      return false;
    }
    return true;
  }

  // Мн. число на -а (города, глаза)
  if (w.endsWith('а') && w.length >= 4) {
    // Проверяем характерные паттерны мн. числа
    // -да (города), -за (глаза), -са (голоса), -ра (вечера)
    const beforeA = w.charAt(w.length - 2);
    if ('дзсрл'.includes(beforeA) && w.length >= 4) {
      // Дополнительная проверка — если ед. число без -а существует в словаре
      return true;
    }
  }

  // Мн. число на -я (поля, моря)
  if (w.endsWith('я') && !w.endsWith('яя') && w.length >= 3) {
    const beforeYa = w.charAt(w.length - 2);
    if ('лрп'.includes(beforeYa)) {
      return true;
    }
  }

  return false;
}

// ───────────────────── КОСВЕННЫЕ ПАДЕЖИ ──────────────────

function isNonNominativeEnding(w) {
  const last = w.charAt(w.length - 1);
  if ((last === 'ю' || last === 'у') && w.length >= 4) {
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════
// СКЛОНЕНИЕ ПРИЛАГАТЕЛЬНЫХ (ЭВРИСТИКА)
// ═══════════════════════════════════════════════════════════════════

/**
 * Склоняет прилагательное/причастие по всем формам.
 * @param {string} word - Прилагательное в им. падеже
 * @returns {string[]} Массив всех форм
 */
function declineAdjective(word) {
  const w = word.toLowerCase().trim();
  const forms = new Set();
  forms.add(w);

  // Определяем основу и тип склонения
  let stem = '';
  let type = 'hard'; // 'hard' (-ый/-ой) или 'soft' (-ий)

  if (w.endsWith('ый')) {
    stem = w.slice(0, -2);
    type = 'hard';
  } else if (w.endsWith('ой')) {
    stem = w.slice(0, -2);
    type = 'hard';
  } else if (w.endsWith('ий')) {
    stem = w.slice(0, -2);
    type = 'soft';
  } else if (w.endsWith('ая')) {
    stem = w.slice(0, -2);
    type = 'hard';
  } else if (w.endsWith('яя')) {
    stem = w.slice(0, -2);
    type = 'soft';
  } else if (w.endsWith('ое')) {
    stem = w.slice(0, -2);
    type = 'hard';
  } else if (w.endsWith('ее')) {
    stem = w.slice(0, -2);
    type = 'soft';
  } else if (w.endsWith('ые')) {
    stem = w.slice(0, -2);
    type = 'hard';
  } else if (w.endsWith('ие')) {
    stem = w.slice(0, -2);
    type = 'soft';
  } else if (w.endsWith('нный')) {
    stem = w.slice(0, -4);
    type = 'participle_nn';
  } else if (w.endsWith('тый')) {
    stem = w.slice(0, -3);
    type = 'participle_t';
  } else if (w.endsWith('мый')) {
    stem = w.slice(0, -3);
    type = 'participle_m';
  } else if (w.endsWith('ший')) {
    stem = w.slice(0, -3);
    type = 'participle_sh';
  } else if (w.endsWith('щий')) {
    stem = w.slice(0, -3);
    type = 'participle_sch';
  } else {
    return [w];
  }

  // Окончания для твёрдого склонения (-ый/-ой)
  const hardEndings = [
    // Муж. род
    'ый', 'ой', 'ого', 'ому', 'ым', 'ом',
    // Жен. род
    'ая', 'ой', 'ую',
    // Ср. род
    'ое', 'ого', 'ому', 'ым', 'ом',
    // Мн. число
    'ые', 'ых', 'ым', 'ыми'
  ];

  // Окончания для мягкого склонения (-ий)
  const softEndings = [
    // Муж. род
    'ий', 'его', 'ему', 'им', 'ем',
    // Жен. род
    'яя', 'ей', 'юю',
    // Ср. род
    'ее', 'его', 'ему', 'им', 'ем',
    // Мн. число
    'ие', 'их', 'им', 'ими'
  ];

  // Окончания для причастий на -нный
  const participleNnEndings = [
    'нный', 'нного', 'нному', 'нным', 'нном',
    'нная', 'нной', 'нную',
    'нное', 'нного', 'нному', 'нным', 'нном',
    'нные', 'нных', 'нным', 'нными'
  ];

  // Окончания для причастий на -тый
  const participleTEndings = [
    'тый', 'того', 'тому', 'тым', 'том',
    'тая', 'той', 'тую',
    'тое', 'того', 'тому', 'тым', 'том',
    'тые', 'тых', 'тым', 'тыми'
  ];

  // Окончания для причастий на -мый
  const participleMEndings = [
    'мый', 'мого', 'мому', 'мым', 'мом',
    'мая', 'мой', 'мую',
    'мое', 'мого', 'мому', 'мым', 'мом',
    'мые', 'мых', 'мым', 'мыми'
  ];

  // Окончания для причастий на -ший
  const participleShEndings = [
    'ший', 'шего', 'шему', 'шим', 'шем',
    'шая', 'шей', 'шую',
    'шее', 'шего', 'шему', 'шим', 'шем',
    'шие', 'ших', 'шим', 'шими'
  ];

  // Окончания для причастий на -щий
  const participleSchEndings = [
    'щий', 'щего', 'щему', 'щим', 'щем',
    'щая', 'щей', 'щую',
    'щее', 'щего', 'щему', 'щим', 'щем',
    'щие', 'щих', 'щим', 'щими'
  ];

  let endings;
  switch (type) {
    case 'hard':
      endings = hardEndings;
      break;
    case 'soft':
      endings = softEndings;
      break;
    case 'participle_nn':
      endings = participleNnEndings;
      break;
    case 'participle_t':
      endings = participleTEndings;
      break;
    case 'participle_m':
      endings = participleMEndings;
      break;
    case 'participle_sh':
      endings = participleShEndings;
      break;
    case 'participle_sch':
      endings = participleSchEndings;
      break;
    default:
      endings = hardEndings;
  }

  for (const ending of endings) {
    forms.add(stem + ending);
  }

  return Array.from(forms).sort((a, b) => b.length - a.length);
}

// ═══════════════════════════════════════════════════════════════════
// СКЛОНЕНИЕ СУЩЕСТВИТЕЛЬНЫХ ВО МН. ЧИСЛЕ
// ═══════════════════════════════════════════════════════════════════

/**
 * Исключения — супплетивные и нерегулярные формы мн. числа.
 * Ключ — им. падеж мн. числа, значение — все падежные формы.
 */
const PLURAL_EXCEPTIONS = {
  'дети': ['дети', 'детей', 'детям', 'детьми', 'детях'],
  'люди': ['люди', 'людей', 'людям', 'людьми', 'людях'],
};

/**
 * Пытается найти ед. число и просклонять.
 * Или склоняет мн. число эвристически.
 */
function declinePluralNoun(word) {
  const w = word.toLowerCase().trim();
  const forms = new Set();
  forms.add(w);

  // Проверяем исключения
  if (PLURAL_EXCEPTIONS[w]) {
    PLURAL_EXCEPTIONS[w].forEach(f => forms.add(f));
    return Array.from(forms).sort((a, b) => b.length - a.length);
  }

  // Также добавляем падежные формы мн. числа эвристически
  const pluralForms = declinePluralNounHeuristic(w);
  pluralForms.forEach(f => forms.add(f));

  return Array.from(forms).sort((a, b) => b.length - a.length);
}

/**
 * Пытается угадать ед. число от мн. числа.
 */
function guessSingularForm(plural) {
  const w = plural.toLowerCase().trim();

  // -ы → убираем (столы → стол)
  if (w.endsWith('ы') && w.length >= 3) {
    return w.slice(0, -1);
  }

  // -и → убираем (книги → книг → книга? нет, пробуем как есть)
  if (w.endsWith('и') && w.length >= 3) {
    // книги → книга (добавляем -а)
    const stem = w.slice(0, -1);
    // Пробуем несколько вариантов
    return stem + 'а'; // книги → книга
  }

  // -а (мн. от ср. рода: окна → окно)
  if (w.endsWith('а') && w.length >= 3) {
    return w.slice(0, -1) + 'о';
  }

  // -я (поля → поле)
  if (w.endsWith('я') && w.length >= 3) {
    return w.slice(0, -1) + 'е';
  }

  return null;
}

/**
 * Эвристическое склонение мн. числа.
 */
function declinePluralNounHeuristic(word) {
  const w = word.toLowerCase().trim();
  const forms = new Set();
  forms.add(w);

  let stem = '';

  if (w.endsWith('ы')) {
    stem = w.slice(0, -1);
    // Мн. число: -ы, -ов, -ам, -ами, -ах
    forms.add(stem + 'ы');
    forms.add(stem + 'ов');
    forms.add(stem + 'ам');
    forms.add(stem + 'ами');
    forms.add(stem + 'ах');
  } else if (w.endsWith('и')) {
    stem = w.slice(0, -1);
    // Мн. число: -и, -ей, -ям, -ями, -ях (или -ь вариант)
    forms.add(stem + 'и');
    forms.add(stem + 'ей');
    forms.add(stem + 'ям');
    forms.add(stem + 'ями');
    forms.add(stem + 'ях');
    // Альтернатива: -ок, -ам
    forms.add(stem + 'ок');
    forms.add(stem + 'ам');
    forms.add(stem + 'ами');
    forms.add(stem + 'ах');
  } else if (w.endsWith('а')) {
    stem = w.slice(0, -1);
    // Мн. число ср. рода: -а, -, -ам, -ами, -ах
    forms.add(stem + 'а');
    forms.add(stem);
    forms.add(stem + 'ам');
    forms.add(stem + 'ами');
    forms.add(stem + 'ах');
  } else if (w.endsWith('я')) {
    stem = w.slice(0, -1);
    // Мн. число: -я, -ей/-ь, -ям, -ями, -ях
    forms.add(stem + 'я');
    forms.add(stem + 'ей');
    forms.add(stem + 'ь');
    forms.add(stem + 'ям');
    forms.add(stem + 'ями');
    forms.add(stem + 'ях');
  }

  return Array.from(forms);
}

// ═══════════════════════════════════════════════════════════════════
// СКЛОНЕНИЕ СУЩЕСТВИТЕЛЬНЫХ (ЕД. ЧИСЛО) — ЧЕРЕЗ БИБЛИОТЕКУ
// ═══════════════════════════════════════════════════════════════════

/**
 * Определяет род существительного по окончанию.
 */
function detectGender(word) {
  if (typeof window === 'undefined' || !window.RussianNouns) {
    return 'masculine';
  }

  const G = window.RussianNouns.Gender;
  const w = word.toLowerCase().trim();
  if (!w) return G.MASCULINE;

  if (w.endsWith('мя')) return G.NEUTER;
  if (w.endsWith('о') || w.endsWith('е') || w.endsWith('ё')) return G.NEUTER;

  if (w.endsWith('а') || w.endsWith('я')) {
    const masculineWords = [
      'мужчина', 'папа', 'дядя', 'дедушка', 'юноша', 'воевода',
      'староста', 'слуга', 'владыка', 'воротила', 'вышибала',
      'детина', 'жилица', 'заводила', 'запевала', 'левша',
      'сирота', 'соня', 'умница', 'неряха', 'задира', 'забияка',
      'невежа', 'невежда', 'обжора', 'плакса', 'тихоня', 'грязнуля'
    ];
    if (masculineWords.includes(w)) return G.COMMON;
    return G.FEMININE;
  }

  if (w.endsWith('ь')) {
    const lastBeforeSoft = w.charAt(w.length - 2);
    if ('жшчщ'.includes(lastBeforeSoft)) return G.FEMININE;
    if (w.endsWith('ость') || w.endsWith('есть') || w.endsWith('ность') ||
        w.endsWith('знь') || w.endsWith('сть') || w.endsWith('зь') ||
        w.endsWith('дь')) return G.FEMININE;
    return G.MASCULINE;
  }

  return G.MASCULINE;
}

/**
 * Склоняет существительное в ед. числе через библиотеку.
 * НЕ генерирует множественное число — только падежи ед. числа.
 * Если пользователь хочет мн. число, он вводит его отдельным триггером.
 */
function declineNounSingular(word) {
  const engine = getEngine();
  if (!engine) return [word];

  const RN = window.RussianNouns;
  const gender = detectGender(word);
  const params = { text: word, gender };

  const allCases = [
    RN.Case.NOMINATIVE, RN.Case.GENITIVE, RN.Case.DATIVE,
    RN.Case.ACCUSATIVE, RN.Case.INSTRUMENTAL, RN.Case.PREPOSITIONAL
  ];

  const forms = new Set();

  // Только единственное число — 6 падежей
  for (const cas of allCases) {
    try {
      const declined = engine.decline(params, cas);
      if (Array.isArray(declined)) {
        for (const f of declined) {
          if (f && f.trim()) forms.add(f.toLowerCase());
        }
      }
    } catch (_) { /* пропускаем */ }
  }

  // Для слов на -ь пробуем альтернативный род
  if (word.endsWith('ь') && forms.size <= 1) {
    const G = RN.Gender;
    const altGender = (gender === G.MASCULINE) ? G.FEMININE : G.MASCULINE;
    const altParams = { text: word, gender: altGender };
    
    for (const cas of allCases) {
      try {
        const declined = engine.decline(altParams, cas);
        if (Array.isArray(declined)) {
          for (const f of declined) {
            if (f && f.trim()) forms.add(f.toLowerCase());
          }
        }
      } catch (_) { /* пропускаем */ }
    }
  }

  return Array.from(forms).sort((a, b) => b.length - a.length);
}

// ═══════════════════════════════════════════════════════════════════
// ГЛАВНЫЕ ФУНКЦИИ
// ═══════════════════════════════════════════════════════════════════

/**
 * Находит наибольший общий префикс массива строк.
 */
function longestCommonPrefix(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  let i = 0;
  const first = arr[0];
  while (i < first.length && arr.every(s => s.length > i && s[i] === first[i])) {
    i++;
  }
  return first.slice(0, i);
}

/**
 * Возвращает все формы слова (без regex-обёртки).
 * Определяет тип слова и применяет соответствующее склонение.
 *
 * @param {string} text - Слово
 * @returns {Array<string>} Массив уникальных форм
 */
export function getDeclensionForms(text) {
  if (typeof text !== 'string' || text.trim() === '') return [];

  const word = text.toLowerCase().trim();
  const wordType = detectWordType(word);

  switch (wordType) {
    case 'adjective':
      return declineAdjective(word);
    case 'noun_plural':
      return declinePluralNoun(word);
    case 'noun':
      return declineNounSingular(word);
    case 'verb':
      // Глаголы не склоняем — возвращаем как есть
      return [word];
    default:
      return [word];
  }
}

/**
 * Возвращает структуру для оптимизированного regex: основа + окончания.
 */
export function getDeclensionStemAndEndings(text) {
  const forms = getDeclensionForms(text);
  if (forms.length === 0) return { forms: [] };
  if (forms.length === 1) return { single: forms[0] };

  const stem = longestCommonPrefix(forms);
  if (stem === '') return { forms };

  const endings = forms.map(f => f.slice(stem.length));
  return { stem, endings };
}

/**
 * Применяет склонения к слову (авто-режим).
 * @param {string} text - Слово
 * @returns {string} Regex с формами слова
 */
export function applyDeclensions(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new TypeError('applyDeclensions: аргумент должен быть непустой строкой');
  }

  const parsed = getDeclensionStemAndEndings(text);

  if ('single' in parsed) return parsed.single;
  if ('forms' in parsed) {
    if (parsed.forms.length === 0) return text;
    return `(${parsed.forms.join('|')})`;
  }

  const { stem, endings } = parsed;
  return `${stem}(${endings.join('|')})`;
}

/**
 * Применяет точные окончания к корню (ручной режим).
 */
export function applyDeclensionsExact(stem, endings) {
  if (typeof stem !== 'string' || stem.trim() === '') {
    throw new TypeError('applyDeclensionsExact: корень должен быть непустой строкой');
  }

  if (!Array.isArray(endings) || endings.length === 0) {
    throw new TypeError('applyDeclensionsExact: укажите хотя бы одно окончание');
  }

  const validEndings = endings
    .map(e => (typeof e === 'string' ? e.trim() : ''))
    .filter(e => e !== '' || endings.includes(''));

  if (validEndings.length === 0) {
    throw new Error('applyDeclensionsExact: все окончания пустые');
  }

  const trimmedStem = stem.trim();
  const group = '(' + validEndings.join('|') + ')';
  return trimmedStem + group;
}

/**
 * Универсальная функция применения склонений с поддержкой режимов.
 */
export function applyDeclensionsWithParams(text, declensionParams) {
  if (!declensionParams || typeof declensionParams !== 'object') {
    return applyDeclensions(text);
  }

  const mode = declensionParams.mode || 'auto';

  if (mode === 'exact') {
    const stem = declensionParams.stem || text;
    const endings = declensionParams.endings || [];
    if (endings.length === 0) {
      throw new Error('Для режима exact укажите окончания');
    }
    return applyDeclensionsExact(stem, endings);
  }

  return applyDeclensions(text);
}

/**
 * Валидация параметров склонений.
 */
export function validateDeclensionParams(declensionParams) {
  if (declensionParams === true) {
    return { valid: true, error: null };
  }

  if (!declensionParams || typeof declensionParams !== 'object') {
    return { valid: false, error: 'Параметры склонений не указаны' };
  }

  const mode = declensionParams.mode;
  if (mode !== 'auto' && mode !== 'exact') {
    return { valid: false, error: `Некорректный режим: ${mode} (допустимо: 'auto', 'exact')` };
  }

  if (mode === 'exact') {
    if (!declensionParams.stem || declensionParams.stem.trim() === '') {
      return { valid: false, error: 'Для режима exact укажите корень' };
    }

    if (!Array.isArray(declensionParams.endings) || declensionParams.endings.length === 0) {
      return { valid: false, error: 'Для режима exact укажите хотя бы одно окончание' };
    }

    const validEndings = declensionParams.endings.filter(e => typeof e === 'string');
    if (validEndings.length === 0) {
      return { valid: false, error: 'Все окончания невалидны' };
    }
  }

  return { valid: true, error: null };
}

/**
 * Нормализует параметры склонений.
 */
export function normalizeDeclensionParams(declensionParams) {
  if (declensionParams === true) {
    return { mode: 'auto' };
  }

  if (declensionParams === false || declensionParams === null || declensionParams === undefined) {
    return null;
  }

  if (typeof declensionParams === 'object') {
    return declensionParams;
  }

  return null;
}

/**
 * Проверяет, можно ли просклонять слово.
 */
export function canDeclension(text) {
  if (typeof text !== 'string' || text.trim() === '') return false;

  const word = text.toLowerCase().trim();
  const wordType = detectWordType(word);

  // Глаголы не склоняем
  if (wordType === 'verb') return false;

  try {
    const forms = getDeclensionForms(text);
    return forms.length > 1;
  } catch {
    return false;
  }
}

/**
 * Определяет тип слова для информирования пользователя.
 * @returns {'noun'|'noun_plural'|'adjective'|'verb'|'unknown'}
 */
export function getWordType(text) {
  if (typeof text !== 'string' || text.trim() === '') return 'unknown';
  return detectWordType(text.toLowerCase().trim());
}

/**
 * Статистика склонений.
 */
export function getDeclensionStats(text) {
  const forms = getDeclensionForms(text);
  const wordType = getWordType(text);

  return {
    forms,
    count: forms.length,
    wordType,
    singular: wordType === 'noun' ? Math.min(forms.length, 6) : 0,
    plural: wordType === 'noun' ? Math.max(0, forms.length - 6) : 0
  };
}

/**
 * Preview (до и после).
 */
export function previewDeclensions(text) {
  const before = text;
  const after = applyDeclensions(text);
  const changed = before !== after;
  const stats = getDeclensionStats(text);

  return {
    before,
    after,
    changed,
    stats
  };
}

// ═══════════════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════════════

export default {
  applyDeclensions,
  applyDeclensionsExact,
  applyDeclensionsWithParams,
  validateDeclensionParams,
  normalizeDeclensionParams,
  canDeclension,
  getDeclensionForms,
  getDeclensionStemAndEndings,
  getDeclensionStats,
  previewDeclensions,
  getWordType
};
