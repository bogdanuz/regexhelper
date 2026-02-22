/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEX PARSER - ОБРАТНЫЙ КОНВЕРТЕР
 *                   Парсинг regex паттерна в структуру триггеров
 * ═══════════════════════════════════════════════════════════════════
 *
 * @file tools/converter/logic/regexParser.js
 * @description Парсер для разбора regex в структуру конструктора
 *              с обратным маппингом автозамен и параметров
 * @date 2026-02-22
 */

// ═══════════════════════════════════════════════════════════════════
// КОНСТАНТЫ ОБРАТНОГО МАППИНГА
// ═══════════════════════════════════════════════════════════════════

/** Автозамены: regex → исходный символ */
const AUTO_REPLACE_MAP = {
  '[её]': 'ё',
  '[ёе]': 'ё',
  '[её]': 'ё',
  '[ьъ]': 'ь',
  '[ъь]': 'ъ'
};

/**
 * Проверяет является ли character class автозаменой
 * @param {string} classStr - символьный класс, например [её]
 * @returns {string|null} - исходный символ или null
 */
function checkAutoReplace(classStr) {
  // Прямая проверка
  if (AUTO_REPLACE_MAP[classStr]) {
    return AUTO_REPLACE_MAP[classStr];
  }
  
  // Проверка по содержимому класса
  if (classStr.length >= 4 && classStr.startsWith('[') && classStr.endsWith(']')) {
    const inner = classStr.slice(1, -1);
    
    // Проверяем ё/е (автозамена для ё)
    // Код ё = 1105 (0x451), е = 1077 (0x435)
    const hasYo = inner.charCodeAt(0) === 1105 || inner.charCodeAt(1) === 1105 ||
                  inner.charCodeAt(0) === 0x451 || inner.charCodeAt(1) === 0x451;
    const hasYe = inner.charCodeAt(0) === 1077 || inner.charCodeAt(1) === 1077 ||
                  inner.charCodeAt(0) === 0x435 || inner.charCodeAt(1) === 0x435;
    
    if (inner.length === 2 && hasYo && hasYe) {
      return 'ё';
    }
    
    // Проверяем ь/ъ
    // Код ь = 1100 (0x44C), ъ = 1098 (0x44A)
    const hasSoftSign = inner.charCodeAt(0) === 1100 || inner.charCodeAt(1) === 1100;
    const hasHardSign = inner.charCodeAt(0) === 1098 || inner.charCodeAt(1) === 1098;
    
    if (inner.length === 2 && hasSoftSign && hasHardSign) {
      // Возвращаем первый символ как основной
      return inner.charCodeAt(0) === 1100 ? 'ь' : 'ъ';
    }
  }
  
  return null;
}

/** Латиница/Кириллица пары (для параметра latinCyrillic) */
const LATIN_CYRILLIC_PAIRS = {
  '[аa]': 'а', '[aа]': 'а',
  '[оo]': 'о', '[oо]': 'о',
  '[еe]': 'е', '[eе]': 'е',
  '[сc]': 'с', '[cс]': 'с',
  '[рp]': 'р', '[pр]': 'р',
  '[хx]': 'х', '[xх]': 'х',
  '[уy]': 'у', '[yу]': 'у',
  '[дd]': 'д', '[dд]': 'д',
  '[вb]': 'в', '[bв]': 'в',
  '[кk]': 'к', '[kк]': 'к',
  '[мm]': 'м', '[mм]': 'м',
  '[нh]': 'н', '[hн]': 'н',
  '[тt]': 'т', '[tт]': 'т',
  // Верхний регистр
  '[АA]': 'А', '[AА]': 'А',
  '[ОO]': 'О', '[OО]': 'О',
  '[ЕE]': 'Е', '[EЕ]': 'Е',
  '[СC]': 'С', '[CС]': 'С',
  '[РP]': 'Р', '[PР]': 'Р',
  '[ХX]': 'Х', '[XХ]': 'Х',
  '[ВB]': 'В', '[BВ]': 'В',
  '[КK]': 'К', '[KК]': 'К',
  '[МM]': 'М', '[MМ]': 'М',
  '[НH]': 'Н', '[HН]': 'Н',
  '[ТT]': 'Т', '[TТ]': 'Т'
};

/** Транслитерация: паттерны → исходный символ */
const TRANSLIT_SIMPLE = {
  '[пp]': 'п', '[pп]': 'п',
  '[рr]': 'р', '[rр]': 'р',
  '[иi]': 'и', '[iи]': 'и',
  '[вvw]': 'в', '[vwв]': 'в', '[wvв]': 'в',
  '[бb]': 'б', '[bб]': 'б',
  '[гg]': 'г', '[gг]': 'г',
  '[зz]': 'з', '[zз]': 'з',
  '[лl]': 'л', '[lл]': 'л',
  '[нn]': 'н', '[nн]': 'н',
  '[фf]': 'ф', '[fф]': 'ф',
  '[ыy]': 'ы', '[yы]': 'ы',
  '[йyj]': 'й', '[yjй]': 'й', '[jyй]': 'й',
  '[еёe]': 'е', '[ёеe]': 'е', '[eёе]': 'е', '[eео]': 'е',
  '[эеe]': 'э', '[eэе]': 'э',
  '[хh]': 'х', '[hх]': 'х',
  '[кq]': 'к', '[qк]': 'к',
  '[йжj]': 'й', '[jйж]': 'й'
};

/** Транслитерация: диграфы */
const TRANSLIT_DIGRAPHS = {
  '(щ|shch|sch)': 'щ', '(shch|щ|sch)': 'щ', '(sch|shch|щ)': 'щ',
  '(ж|zh|j)': 'ж', '(zh|ж|j)': 'ж', '(j|ж|zh)': 'ж',
  '(х|kh|h|x)': 'х', '(kh|х|h|x)': 'х', '(h|kh|х|x)': 'х',
  '(кс|ks|x)': 'кс', '(ks|кс|x)': 'кс', '(x|кс|ks)': 'кс',
  '(ц|ts|c)': 'ц', '(ts|ц|c)': 'ц', '(c|ц|ts)': 'ц',
  '(ч|ch)': 'ч', '(ch|ч)': 'ч',
  '(ш|sh)': 'ш', '(sh|ш)': 'ш',
  '(ю|yu|u)': 'ю', '(yu|ю|u)': 'ю', '(u|ю|yu)': 'ю',
  '(я|ya|a)': 'я', '(ya|я|a)': 'я', '(a|я|ya)': 'я',
  '(ё|yo|e)': 'ё', '(yo|ё|e)': 'ё', '(e|ё|yo)': 'ё',
  '(ф|ph|f)': 'ф', '(ph|ф|f)': 'ф', '(f|ф|ph)': 'ф'
};

/** Неподдерживаемые конструкции */
const UNSUPPORTED_CONSTRUCTS = [
  { pattern: /\(\?=/g, name: 'Positive lookahead (?=...)', description: 'Проверка наличия текста впереди без его захвата' },
  { pattern: /\(\?!/g, name: 'Negative lookahead (?!...)', description: 'Проверка отсутствия текста впереди' },
  { pattern: /\(\?<=/g, name: 'Positive lookbehind (?<=...)', description: 'Проверка наличия текста позади без его захвата' },
  { pattern: /\(\?<!/g, name: 'Negative lookbehind (?<!...)', description: 'Проверка отсутствия текста позади' },
  { pattern: /\(\?R\)/g, name: 'Рекурсия (?R)', description: 'Рекурсивный вызов всего паттерна' },
  { pattern: /\(\?\d+\)/g, name: 'Рекурсия (?n)', description: 'Рекурсивный вызов группы' },
  { pattern: /\\[1-9]/g, name: 'Backreference (\\1, \\2...)', description: 'Ссылка на ранее захваченную группу' },
  { pattern: /\(\?<\w+>/g, name: 'Именованная группа (?<name>)', description: 'Группа с именем' },
  { pattern: /\(\?P<\w+>/g, name: 'Именованная группа (?P<name>)', description: 'Группа с именем (Python стиль)' },
  { pattern: /\(\?[imsx]+:/g, name: 'Inline флаги (?i:...)', description: 'Флаги внутри паттерна' },
  { pattern: /\(\?[imsx]+\)/g, name: 'Mode modifier (?i)', description: 'Модификатор режима' }
];

/** Частично поддерживаемые конструкции */
const PARTIAL_SUPPORT = [
  { pattern: /\(\?:/g, name: 'Non-capturing group (?:...)', description: 'Будет преобразована в обычную группу ()' },
  { pattern: /\^/g, name: 'Якорь начала ^', description: 'Отсутствует в конструкторе, будет удалён' },
  { pattern: /\$(?!})/g, name: 'Якорь конца $', description: 'Отсутствует в конструкторе, будет удалён' }
];

// ═══════════════════════════════════════════════════════════════════
// ВАЛИДАЦИЯ
// ═══════════════════════════════════════════════════════════════════

/**
 * Проверяет валидность regex синтаксиса
 */
export function validateRegexSyntax(pattern) {
  if (!pattern || typeof pattern !== 'string') {
    return { valid: false, error: 'Паттерн пуст или не является строкой' };
  }
  
  // Проверка на формат /pattern/flags
  if (/^\/.*\/[gimsuvy]*$/i.test(pattern)) {
    return { 
      valid: false, 
      error: 'Уберите слеши и флаги (/.../) — вставьте только паттерн',
      isSlashFormat: true
    };
  }
  
  try {
    new RegExp(pattern);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

/**
 * Анализирует паттерн и возвращает информацию о поддержке
 */
export function analyzePatternSupport(pattern) {
  const result = {
    supported: [],
    unsupported: [],
    partial: []
  };
  
  if (!pattern) return result;
  
  for (const construct of UNSUPPORTED_CONSTRUCTS) {
    const matches = pattern.match(construct.pattern);
    if (matches) {
      result.unsupported.push({
        name: construct.name,
        description: construct.description,
        count: matches.length,
        examples: matches.slice(0, 3)
      });
    }
  }
  
  for (const construct of PARTIAL_SUPPORT) {
    const matches = pattern.match(construct.pattern);
    if (matches) {
      result.partial.push({
        name: construct.name,
        description: construct.description,
        count: matches.length
      });
    }
  }
  
  const supportedFeatures = [];
  
  if (/\([^?]/.test(pattern) || /\(\)/.test(pattern)) {
    supportedFeatures.push({ name: 'Группы (...)', description: 'Capturing группы' });
  }
  if (/\|/.test(pattern)) {
    supportedFeatures.push({ name: 'Альтернация |', description: 'Выбор из вариантов' });
  }
  if (/\\b/.test(pattern)) {
    supportedFeatures.push({ name: 'Границы слова \\b', description: 'wordBoundaries параметр' });
  }
  if (/\.\{[\d,]+\}/.test(pattern)) {
    supportedFeatures.push({ name: 'Расстояние .{n,m}', description: 'custom соединитель' });
  }
  if (/\[\\s\\S\][\+\*]/.test(pattern)) {
    supportedFeatures.push({ name: 'Любое расстояние [\\s\\S]+', description: 'any соединитель' });
  }
  if (/\.\+/.test(pattern)) {
    supportedFeatures.push({ name: 'В пределах абзаца .+', description: 'paragraph соединитель' });
  }
  if (/\[[^\]]+\]/.test(pattern)) {
    supportedFeatures.push({ name: 'Классы символов [...]', description: 'Автозамены и символьные классы' });
  }
  
  result.supported = supportedFeatures;
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// ОБРАТНЫЙ МАППИНГ
// ═══════════════════════════════════════════════════════════════════

/**
 * Результат обратного маппинга текста
 * @typedef {Object} ReverseMapResult
 * @property {string} text - Восстановленный текст триггера
 * @property {Object} params - Распознанные параметры
 * @property {Array} warnings - Предупреждения
 * @property {Array} highlights - Подсветки для UI [{start, end, type, message}]
 */

/**
 * Применяет обратный маппинг к тексту триггера
 * @param {string} rawText - Сырой текст из regex
 * @param {number} baseOffset - Базовый offset в исходном паттерне
 * @returns {ReverseMapResult}
 */
function reverseMapTriggerText(rawText, baseOffset = 0) {
  let text = rawText;
  const params = {};
  const warnings = [];
  const highlights = [];
  
  let hasLatinCyrillic = false;
  let hasTranslit = false;
  let hasTranslitDigraph = false;
  
  // 1. Проверяем \b в начале/конце (wordBoundaries)
  if (text.startsWith('\\b') || text.endsWith('\\b')) {
    params.wordBoundaries = true;
    text = text.replace(/^\\b/, '').replace(/\\b$/, '');
  }
  
  // 2. Проверяем \s в конце (requireSpaceAfter)
  if (text.endsWith('\\s')) {
    params.requireSpaceAfter = true;
    text = text.slice(0, -2);
  }
  
  // 3. Проверяем \w в конце (wildcard)
  const wildcardMatch = text.match(/\\w(\{(\d+),(\d+)\})?$/);
  if (wildcardMatch) {
    if (wildcardMatch[1]) {
      params.wildcard = {
        enabled: true,
        mode: 'range',
        min: parseInt(wildcardMatch[2], 10),
        max: parseInt(wildcardMatch[3], 10)
      };
    } else {
      params.wildcard = { enabled: true, mode: 'auto' };
    }
    text = text.replace(/\\w(\{\d+,\d+\})?$/, '');
  }
  
  // 4. Обратный маппинг символьных классов
  let result = '';
  let i = 0;
  const optionalCharsIndices = [];
  let logicalIndex = 0;
  
  while (i < text.length) {
    const remaining = text.slice(i);
    let matched = false;
    
    // Проверяем диграфы транслитерации (...)
    for (const [pattern, replacement] of Object.entries(TRANSLIT_DIGRAPHS)) {
      if (remaining.startsWith(pattern)) {
        result += replacement;
        hasTranslitDigraph = true;
        hasTranslit = true;
        i += pattern.length;
        logicalIndex++;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    
    // Проверяем character class [...]
    if (remaining[0] === '[') {
      const classEnd = findCharClassEnd(remaining);
      if (classEnd > 0) {
        const classStr = remaining.slice(0, classEnd);
        const afterClass = remaining.slice(classEnd);
        const hasQuantifier = afterClass[0] === '?';
        
        // Проверяем автозамены (с умной проверкой)
        const autoReplaceMapped = checkAutoReplace(classStr);
        if (autoReplaceMapped) {
          if (hasQuantifier) {
            // [её]? — проверяем автоудвоение или optionalChars
            const prevChar = result[result.length - 1];
            if (prevChar && (prevChar === 'е' || prevChar === 'ё' || prevChar === autoReplaceMapped)) {
              // Автоудвоение: её? → ёё
              result += autoReplaceMapped;
            } else {
              // optionalChars
              result += autoReplaceMapped;
              optionalCharsIndices.push(logicalIndex);
            }
            i += classStr.length + 1; // +1 за ?
          } else {
            result += autoReplaceMapped;
            i += classStr.length;
          }
          logicalIndex++;
          continue;
        }
        
        // Проверяем латиница/кириллица
        if (LATIN_CYRILLIC_PAIRS[classStr]) {
          hasLatinCyrillic = true;
          const mappedChar = LATIN_CYRILLIC_PAIRS[classStr];
          
          if (hasQuantifier) {
            const prevChar = result[result.length - 1];
            if (prevChar && prevChar.toLowerCase() === mappedChar.toLowerCase()) {
              result += mappedChar;
            } else {
              result += mappedChar;
              optionalCharsIndices.push(logicalIndex);
            }
            i += classStr.length + 1;
          } else {
            result += mappedChar;
            i += classStr.length;
          }
          logicalIndex++;
          continue;
        }
        
        // Проверяем транслитерацию
        if (TRANSLIT_SIMPLE[classStr]) {
          hasTranslit = true;
          const mappedChar = TRANSLIT_SIMPLE[classStr];
          
          if (hasQuantifier) {
            const prevChar = result[result.length - 1];
            if (prevChar && prevChar.toLowerCase() === mappedChar.toLowerCase()) {
              result += mappedChar;
            } else {
              result += mappedChar;
              optionalCharsIndices.push(logicalIndex);
            }
            i += classStr.length + 1;
          } else {
            result += mappedChar;
            i += classStr.length;
          }
          logicalIndex++;
          continue;
        }
        
        // Нераспознанный character class — предупреждение
        const fullPattern = hasQuantifier ? classStr + '?' : classStr;
        warnings.push({
          type: 'unrecognized',
          message: `Нераспознанный паттерн: ${fullPattern}`,
          fragment: fullPattern
        });
        highlights.push({
          start: baseOffset + i,
          end: baseOffset + i + fullPattern.length,
          type: 'error',
          message: `Нераспознанный паттерн: ${fullPattern} — исправьте вручную или проверьте в конструкторе`
        });
        
        // Оставляем как есть
        result += fullPattern;
        i += fullPattern.length;
        logicalIndex++;
        continue;
      }
    }
    
    // Обычный символ с квантификатором ?
    if (i + 1 < text.length && text[i + 1] === '?') {
      const char = text[i];
      const prevChar = result[result.length - 1];
      
      if (prevChar && prevChar.toLowerCase() === char.toLowerCase()) {
        // Автоудвоение: оо? → оо
        result += char;
      } else {
        // optionalChars
        result += char;
        optionalCharsIndices.push(logicalIndex);
      }
      i += 2;
      logicalIndex++;
      continue;
    }
    
    // Экранированный символ
    if (text[i] === '\\' && i + 1 < text.length) {
      const next = text[i + 1];
      if ('dDwWsSnrt'.includes(next)) {
        // Оставляем специальные классы
        result += '\\' + next;
      } else {
        // Экранированный символ → просто символ
        result += next;
      }
      i += 2;
      logicalIndex++;
      continue;
    }
    
    // Обычный символ
    result += text[i];
    i++;
    logicalIndex++;
  }
  
  // Устанавливаем параметры
  if (hasTranslit || hasTranslitDigraph) {
    params.transliteration = true;
    if (hasLatinCyrillic && !hasTranslitDigraph) {
      // Только простые пары без диграфов — возможно latinCyrillic
      warnings.push({
        type: 'translitOrLatinCyrillic',
        message: 'Обнаружены пары лат/кир символов — распознано как транслитерация. Если нужна замена похожих символов, измените в конструкторе.',
        fragment: null
      });
    }
  } else if (hasLatinCyrillic) {
    params.latinCyrillic = true;
  }
  
  if (optionalCharsIndices.length > 0) {
    params.optionalChars = optionalCharsIndices;
  }
  
  return {
    text: result,
    params,
    warnings,
    highlights
  };
}

/**
 * Находит конец character class
 */
function findCharClassEnd(str) {
  if (str[0] !== '[') return -1;
  let j = 1;
  if (str[j] === '^') j++;
  if (str[j] === ']') j++;
  while (j < str.length) {
    if (str[j] === '\\' && j + 1 < str.length) {
      j += 2;
      continue;
    }
    if (str[j] === ']') {
      return j + 1;
    }
    j++;
  }
  return -1;
}

/**
 * Проверяем паттерн на склонения: корень(окончание1|окончание2|...)
 */
function checkDeclensionPattern(text) {
  const match = text.match(/^(.+?)\(([^)]+)\)$/);
  if (!match) return null;
  
  const stem = match[1];
  const endingsStr = match[2];
  
  // Проверяем, что внутри скобок только альтернации коротких строк
  const endings = endingsStr.split('|');
  if (endings.length < 2) return null;
  
  // Все окончания должны быть короткими (1-4 символа)
  const allShort = endings.every(e => e.length >= 1 && e.length <= 5);
  if (!allShort) return null;
  
  return {
    stem,
    endings,
    params: {
      declensions: {
        enabled: true,
        mode: 'exact',
        stem,
        endings
      }
    }
  };
}

// ═══════════════════════════════════════════════════════════════════
// РЕКУРСИВНЫЙ ПАРСЕР
// ═══════════════════════════════════════════════════════════════════

let idCounter = 0;
let globalOffset = 0;
let allHighlights = [];
let allWarnings = [];

function generateId() {
  return `parsed-${Date.now()}-${++idCounter}`;
}

/**
 * Парсит regex и возвращает структуру для конструктора
 */
export function parseRegexPattern(pattern) {
  const validation = validateRegexSyntax(pattern);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      isSlashFormat: validation.isSlashFormat
    };
  }
  
  const analysis = analyzePatternSupport(pattern);
  idCounter = 0;
  globalOffset = 0;
  allHighlights = [];
  allWarnings = [];
  
  // Проверяем \b в начале и конце всего паттерна
  let cleanPattern = pattern;
  let hasWordBoundaries = false;
  
  if (cleanPattern.startsWith('\\b')) {
    hasWordBoundaries = true;
    cleanPattern = cleanPattern.slice(2);
    globalOffset += 2;
  }
  if (cleanPattern.endsWith('\\b')) {
    hasWordBoundaries = true;
    cleanPattern = cleanPattern.slice(0, -2);
  }
  
  // Удаляем якоря ^ и $ (не поддерживаются)
  if (cleanPattern.startsWith('^')) {
    cleanPattern = cleanPattern.slice(1);
    globalOffset += 1;
  }
  if (cleanPattern.endsWith('$')) {
    cleanPattern = cleanPattern.slice(0, -1);
  }
  
  try {
    const elements = parseTopLevel(cleanPattern, allWarnings, globalOffset);
    
    // Если есть wordBoundaries — применяем ко всем триггерам верхнего уровня
    if (hasWordBoundaries) {
      applyParamToAllTriggers(elements, 'wordBoundaries', true);
    }
    
    return {
      success: true,
      elements,
      analysis,
      warnings: allWarnings,
      highlights: allHighlights
    };
  } catch (e) {
    return {
      success: false,
      error: `Ошибка парсинга: ${e.message}`
    };
  }
}

/**
 * Применяет параметр ко всем триггерам
 */
function applyParamToAllTriggers(elements, paramName, paramValue) {
  for (const el of elements) {
    if (el.type === 'trigger') {
      el.params = el.params || {};
      el.params[paramName] = paramValue;
    } else if (el.type === 'group' && el.children) {
      applyParamToAllTriggers(el.children, paramName, paramValue);
    }
  }
}

/**
 * Парсит верхний уровень паттерна
 */
function parseTopLevel(pattern, warnings, baseOffset) {
  const result = parseExpression(pattern, 0, warnings, baseOffset);
  return result.elements;
}

/**
 * Парсит выражение и возвращает элементы конструктора
 */
function parseExpression(pattern, startPos, warnings, baseOffset) {
  let pos = startPos;
  const segments = [];
  let currentSegment = { items: [], connector: null, startPos: pos };
  
  while (pos < pattern.length) {
    const char = pattern[pos];
    const remaining = pattern.slice(pos);
    
    // Конец группы
    if (char === ')') {
      break;
    }
    
    // Альтернация — начинаем новый сегмент
    if (char === '|') {
      if (currentSegment.items.length > 0) {
        segments.push(currentSegment);
      }
      currentSegment = { items: [], connector: null, startPos: pos + 1 };
      pos++;
      continue;
    }
    
    // Соединитель [\s\S]+ или [\s\S]*
    const anyMatch = remaining.match(/^\[\\s\\S\]([\+\*])/);
    if (anyMatch) {
      if (currentSegment.items.length > 0) {
        currentSegment.connector = { mode: 'any' };
        segments.push(currentSegment);
        currentSegment = { items: [], connector: null, startPos: pos + anyMatch[0].length };
      }
      pos += anyMatch[0].length;
      continue;
    }
    
    // Соединитель .{n,m} или .+ или .*
    const distMatch = remaining.match(/^\.(\{(\d+),(\d*)\}|(\+)|(\*))/);
    if (distMatch) {
      let connector;
      if (distMatch[2] !== undefined) {
        const min = parseInt(distMatch[2], 10);
        const max = distMatch[3] === '' ? 999 : parseInt(distMatch[3], 10);
        connector = { mode: 'custom', min, max };
      } else if (distMatch[4]) {
        connector = { mode: 'paragraph' };
      } else {
        connector = { mode: 'paragraph' };
      }
      
      if (currentSegment.items.length > 0) {
        currentSegment.connector = connector;
        segments.push(currentSegment);
        currentSegment = { items: [], connector: null, startPos: pos + distMatch[0].length };
      }
      pos += distMatch[0].length;
      continue;
    }
    
    // Соединитель [^\n]+ или [^\n]*
    const lineMatch = remaining.match(/^\[\^\\n\]([\+\*])/);
    if (lineMatch) {
      if (currentSegment.items.length > 0) {
        currentSegment.connector = { mode: 'line' };
        segments.push(currentSegment);
        currentSegment = { items: [], connector: null, startPos: pos + lineMatch[0].length };
      }
      pos += lineMatch[0].length;
      continue;
    }
    
    // Начало группы
    if (char === '(' || remaining.startsWith('(?:')) {
      const isNonCapturing = remaining.startsWith('(?:');
      const groupStartOffset = baseOffset + pos;
      pos += isNonCapturing ? 3 : 1;
      
      // Рекурсивно парсим содержимое группы
      const innerResult = parseExpression(pattern, pos, warnings, baseOffset);
      pos = innerResult.endPos;
      
      // Пропускаем закрывающую скобку
      if (pattern[pos] === ')') {
        pos++;
      }
      
      // Проверяем квантификатор после группы
      let groupQuantifier = null;
      if (pattern[pos] === '?' || pattern[pos] === '+' || pattern[pos] === '*') {
        groupQuantifier = pattern[pos];
        pos++;
      } else if (pattern.slice(pos).match(/^\{\d+,?\d*\}/)) {
        const qMatch = pattern.slice(pos).match(/^\{\d+,?\d*\}/);
        groupQuantifier = qMatch[0];
        pos += qMatch[0].length;
      }
      
      // Создаём группу
      const groupElement = createGroupFromElements(innerResult.elements, groupQuantifier);
      if (groupElement) {
        currentSegment.items.push(groupElement);
      }
      continue;
    }
    
    // Обычный элемент (текст триггера)
    const atomResult = parseAtom(pattern, pos, warnings, baseOffset);
    if (atomResult.text) {
      currentSegment.items.push({
        type: 'text',
        text: atomResult.text,
        raw: atomResult.raw,
        startOffset: baseOffset + pos,
        endOffset: baseOffset + atomResult.endPos
      });
    }
    pos = atomResult.endPos;
  }
  
  // Добавляем последний сегмент
  if (currentSegment.items.length > 0) {
    segments.push(currentSegment);
  }
  
  // Конвертируем сегменты в элементы конструктора
  const elements = convertSegmentsToElements(segments, baseOffset);
  
  return {
    elements,
    endPos: pos
  };
}

/**
 * Парсит один "атом" — текст, character class, escape-последовательность
 */
function parseAtom(pattern, startPos, warnings, baseOffset) {
  let pos = startPos;
  let text = '';
  let raw = '';
  
  while (pos < pattern.length) {
    const char = pattern[pos];
    const remaining = pattern.slice(pos);
    
    // Специальные символы — конец атома
    if ('()|'.includes(char)) {
      break;
    }
    
    // Проверяем, не начинается ли соединитель
    if (remaining.match(/^\[\\s\\S\][\+\*]/) ||
        remaining.match(/^\.(\{\d+,\d*\}|\+|\*)/) ||
        remaining.match(/^\[\^\\n\][\+\*]/)) {
      break;
    }
    
    // Экранированные символы
    if (char === '\\' && pos + 1 < pattern.length) {
      const next = pattern[pos + 1];
      
      // \b — граница слова (пропускаем, это параметр)
      if (next === 'b') {
        pos += 2;
        continue;
      }
      
      raw += '\\' + next;
      if ('dDwWsSnrt'.includes(next)) {
        text += '\\' + next;
      } else {
        text += next;
      }
      pos += 2;
      continue;
    }
    
    // Character class [...]
    if (char === '[') {
      const classEnd = findCharClassEnd(remaining);
      if (classEnd > 0) {
        const classStr = remaining.slice(0, classEnd);
        text += classStr;
        raw += classStr;
        pos += classEnd;
        
        // Проверяем квантификатор после класса
        if (pattern[pos] === '?') {
          text += '?';
          raw += '?';
          pos++;
        } else if (pattern[pos] === '+' || pattern[pos] === '*') {
          text += pattern[pos];
          raw += pattern[pos];
          pos++;
        } else if (pattern.slice(pos).match(/^\{\d+,?\d*\}/)) {
          const qMatch = pattern.slice(pos).match(/^\{\d+,?\d*\}/);
          text += qMatch[0];
          raw += qMatch[0];
          pos += qMatch[0].length;
        }
        continue;
      }
    }
    
    // Точка без квантификатора
    if (char === '.') {
      const nextChar = pattern[pos + 1];
      if (nextChar === '+' || nextChar === '*' || nextChar === '{') {
        break;
      }
      text += '.';
      raw += '.';
      pos++;
      continue;
    }
    
    // Квантификаторы ?, +, *, {n,m}
    if (char === '?') {
      text += '?';
      raw += '?';
      pos++;
      continue;
    }
    
    if (char === '+' || char === '*') {
      text += char;
      raw += char;
      pos++;
      continue;
    }
    
    if (char === '{') {
      const qMatch = remaining.match(/^\{\d+,?\d*\}/);
      if (qMatch) {
        text += qMatch[0];
        raw += qMatch[0];
        pos += qMatch[0].length;
        continue;
      }
    }
    
    // Обычный символ
    text += char;
    raw += char;
    pos++;
  }
  
  return {
    text,
    raw,
    endPos: pos
  };
}

/**
 * Создаёт группу из элементов
 */
function createGroupFromElements(elements, quantifier) {
  if (elements.length === 0) {
    return null;
  }
  
  // Если один элемент и это триггер — возвращаем как есть
  if (elements.length === 1 && elements[0].type === 'trigger') {
    const trigger = { ...elements[0] };
    if (quantifier) {
      trigger.text = `(${trigger.text})${quantifier}`;
    }
    return trigger;
  }
  
  // Создаём группу
  return {
    type: 'group',
    id: generateId(),
    children: elements,
    connector: { mode: 'alternation' },
    _quantifier: quantifier
  };
}

/**
 * Конвертирует сегменты в элементы конструктора
 */
function convertSegmentsToElements(segments, baseOffset) {
  if (segments.length === 0) {
    return [];
  }
  
  const elements = [];
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;
    
    const segmentElement = convertSegmentItemsToElement(segment.items, baseOffset);
    
    if (segmentElement) {
      // Устанавливаем соединитель
      if (!isLast && segment.connector) {
        segmentElement.connector = segment.connector;
      } else if (!isLast) {
        segmentElement.connector = { mode: 'alternation' };
      } else {
        segmentElement.connector = { mode: 'alternation' };
      }
      
      delete segmentElement._quantifier;
      elements.push(segmentElement);
    }
  }
  
  cleanupElements(elements);
  
  return elements;
}

/**
 * Рекурсивно удаляет служебные поля из элементов
 */
function cleanupElements(elements) {
  for (const el of elements) {
    delete el._quantifier;
    delete el.startOffset;
    delete el.endOffset;
    if (el.type === 'group' && el.children) {
      cleanupElements(el.children);
    }
  }
}

/**
 * Конвертирует items одного сегмента в элемент (триггер или группу)
 */
function convertSegmentItemsToElement(items, baseOffset) {
  if (items.length === 0) {
    return null;
  }
  
  const textParts = [];
  const groups = [];
  let totalRawText = '';
  let startOffset = null;
  let endOffset = null;
  
  for (const item of items) {
    if (item.type === 'text') {
      textParts.push(item.text);
      totalRawText += item.raw || item.text;
      if (startOffset === null) startOffset = item.startOffset;
      endOffset = item.endOffset;
    } else if (item.type === 'group' || item.type === 'trigger') {
      groups.push(item);
    }
  }
  
  // Если есть только текст — создаём триггер с обратным маппингом
  if (groups.length === 0 && textParts.length > 0) {
    const rawText = textParts.join('');
    
    // Проверяем паттерн склонений
    const declResult = checkDeclensionPattern(rawText);
    if (declResult) {
      // Применяем обратный маппинг к основе
      const stemMapping = reverseMapTriggerText(declResult.stem, startOffset || 0);
      
      // Добавляем highlights и warnings
      allHighlights.push(...stemMapping.highlights);
      allWarnings.push(...stemMapping.warnings);
      
      return {
        type: 'trigger',
        id: generateId(),
        text: stemMapping.text,
        params: { ...stemMapping.params, ...declResult.params },
        connector: { mode: 'alternation' }
      };
    }
    
    // Обычный обратный маппинг
    const mapping = reverseMapTriggerText(rawText, startOffset || 0);
    
    // Добавляем highlights и warnings
    allHighlights.push(...mapping.highlights);
    allWarnings.push(...mapping.warnings);
    
    return {
      type: 'trigger',
      id: generateId(),
      text: mapping.text,
      params: mapping.params,
      connector: { mode: 'alternation' }
    };
  }
  
  // Если есть только одна группа и нет текста — возвращаем её
  if (groups.length === 1 && textParts.length === 0) {
    return groups[0];
  }
  
  // Если есть текст + группы — создаём сложную структуру
  const children = [];
  
  if (textParts.length > 0) {
    const rawText = textParts.join('');
    const mapping = reverseMapTriggerText(rawText, startOffset || 0);
    
    allHighlights.push(...mapping.highlights);
    allWarnings.push(...mapping.warnings);
    
    children.push({
      type: 'trigger',
      id: generateId(),
      text: mapping.text,
      params: mapping.params,
      connector: { mode: 'paragraph' }
    });
  }
  
  for (const group of groups) {
    children.push(group);
  }
  
  if (children.length === 1) {
    return children[0];
  }
  
  return {
    type: 'group',
    id: generateId(),
    children,
    connector: { mode: 'alternation' }
  };
}

// ═══════════════════════════════════════════════════════════════════
// АНАЛИЗ ДЛЯ UI (подсветка в модалке)
// ═══════════════════════════════════════════════════════════════════

/**
 * Анализирует паттерн и возвращает данные для подсветки в UI
 * @param {string} pattern
 * @returns {{ highlights: Array, warnings: Array, summary: Object }}
 */
export function analyzePatternForUI(pattern) {
  const validation = validateRegexSyntax(pattern);
  
  if (!validation.valid) {
    if (validation.isSlashFormat) {
      return {
        highlights: [{
          start: 0,
          end: pattern.length,
          type: 'error',
          message: 'Уберите слеши и флаги — вставьте только паттерн'
        }],
        warnings: [{
          type: 'slashFormat',
          message: 'Формат /pattern/flags не поддерживается. Вставьте только паттерн без слешей.'
        }],
        summary: { valid: false, canImport: false }
      };
    }
    
    return {
      highlights: [],
      warnings: [{
        type: 'syntaxError',
        message: `Синтаксическая ошибка: ${validation.error}`
      }],
      summary: { valid: false, canImport: false }
    };
  }
  
  // Парсим для получения highlights
  const result = parseRegexPattern(pattern);
  
  if (!result.success) {
    return {
      highlights: [],
      warnings: [{
        type: 'parseError',
        message: result.error
      }],
      summary: { valid: false, canImport: false }
    };
  }
  
  // Подсчитываем статистику
  let triggerCount = 0;
  let groupCount = 0;
  const detectedParams = new Set();
  
  function countElements(elements) {
    for (const el of elements) {
      if (el.type === 'trigger') {
        triggerCount++;
        if (el.params) {
          for (const key of Object.keys(el.params)) {
            detectedParams.add(key);
          }
        }
      } else if (el.type === 'group') {
        groupCount++;
        if (el.children) {
          countElements(el.children);
        }
      }
    }
  }
  
  countElements(result.elements);
  
  const hasErrors = result.highlights.some(h => h.type === 'error');
  const hasWarnings = result.warnings.length > 0 || result.highlights.some(h => h.type === 'warning');
  
  return {
    highlights: result.highlights,
    warnings: result.warnings,
    summary: {
      valid: true,
      canImport: true,
      hasErrors,
      hasWarnings,
      triggerCount,
      groupCount,
      detectedParams: Array.from(detectedParams)
    }
  };
}

// ═══════════════════════════════════════════════════════════════════
// LEGACY EXPORTS (для совместимости)
// ═══════════════════════════════════════════════════════════════════

export function tokenize(pattern) {
  return [];
}

export function buildAST(tokens) {
  return { ast: null, warnings: [] };
}

export function convertASTToTriggers(parseResult) {
  return { elements: [], warnings: [] };
}

export default {
  parseRegexPattern,
  validateRegexSyntax,
  analyzePatternSupport,
  analyzePatternForUI,
  tokenize,
  buildAST,
  convertASTToTriggers
};
