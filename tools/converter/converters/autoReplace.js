/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - AUTO REPLACE
 *                   Автозамены (ё → [её], ь → [ьъ], ъ → [ъь])
 * ═══════════════════════════════════════════════════════════════════
 *
 * @file converters/autoReplace.js
 * @description Автозамены для русских букв (применяются ВСЕГДА)
 * @date 15.02.2026
 */

// ═══════════════════════════════════════════════════════════════════
// АВТОЗАМЕНА Ё → [её]
// ═══════════════════════════════════════════════════════════════════

/**
 * Заменяет ВСЕ вхождения ё на [её]
 * 
 * Применяется ВСЕГДА (нельзя отключить)
 * 
 * @param {string} text - Исходный текст
 * @returns {string} Текст с замененными ё
 * 
 * @example
 * applyYoReplacement('актёр') // 'акт[её]р'
 * applyYoReplacement('трёхзвёздный') // 'тр[её]хзв[её]здный'
 * applyYoReplacement('ёлка') // '[её]лка'
 */
export function applyYoReplacement(text) {
  if (typeof text !== 'string') {
    throw new TypeError('applyYoReplacement: аргумент должен быть строкой');
  }

  // Проверяем наличие ё
  if (!text.includes('ё')) {
    return text;
  }

  // Заменяем ВСЕ вхождения ё на [её]
  return text.replace(/ё/g, '[её]');
}

// ═══════════════════════════════════════════════════════════════════
// АВТОЗАМЕНА Ь и Ъ
// ═══════════════════════════════════════════════════════════════════

/**
 * Заменяет ь → [ьъ] и ъ → [ъь]
 * 
 * Применяется ВСЕГДА (нельзя отключить).
 * Один проход по символам, чтобы вставленные ь/ъ внутри [ьъ]/[ъь] не заменялись повторно
 * (иначе мазь → маз[ьъ] → маз[ь[ъь] — ошибка).
 * 
 * @param {string} text - Исходный текст
 * @returns {string} Текст с замененными ь и ъ
 * 
 * @example
 * applySoftHardSignReplacement('семь') // 'сем[ьъ]'
 * applySoftHardSignReplacement('подъём') // 'под[ъь]ём'
 * applySoftHardSignReplacement('объект') // 'об[ъь]ект'
 * applySoftHardSignReplacement('мазь') // 'маз[ьъ]'
 */
export function applySoftHardSignReplacement(text) {
  if (typeof text !== 'string') {
    throw new TypeError('applySoftHardSignReplacement: аргумент должен быть строкой');
  }

  let result = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === 'ь') result += '[ьъ]';
    else if (c === 'ъ') result += '[ъь]';
    else result += c;
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// УНИВЕРСАЛЬНАЯ ФУНКЦИЯ (ВСЕ АВТОЗАМЕНЫ)
// ═══════════════════════════════════════════════════════════════════

/**
 * Применяет ВСЕ автозамены (ё, ь, ъ)
 * 
 * Порядок:
 * 1. ё → [её]
 * 2. ь → [ьъ]
 * 3. ъ → [ъь]
 * 
 * @param {string} text - Исходный текст
 * @returns {string} Текст со всеми автозаменами
 * 
 * @example
 * applyAutoReplacements('актёр') // 'акт[её]р'
 * applyAutoReplacements('семь') // 'сем[ьъ]'
 * applyAutoReplacements('подъём') // 'под[ъь][её]м'
 * applyAutoReplacements('трёхзвёздный') // 'тр[её]хзв[её]здный'
 */
export function applyAutoReplacements(text) {
  if (typeof text !== 'string') {
    throw new TypeError('applyAutoReplacements: аргумент должен быть строкой');
  }

  // Шаг 1: ё → [её]
  text = applyYoReplacement(text);

  // Шаг 2: ь → [ьъ], ъ → [ъь]
  text = applySoftHardSignReplacement(text);

  return text;
}

// ═══════════════════════════════════════════════════════════════════
// ПРОВЕРКА НАЛИЧИЯ АВТОЗАМЕН
// ═══════════════════════════════════════════════════════════════════

/**
 * Проверяет, есть ли в тексте символы для автозамены
 * 
 * @param {string} text - Текст для проверки
 * @returns {Object} { hasYo, hasSoft, hasHard }
 * 
 * @example
 * hasAutoReplaceChars('актёр') // { hasYo: true, hasSoft: false, hasHard: false }
 * hasAutoReplaceChars('семь') // { hasYo: false, hasSoft: true, hasHard: false }
 * hasAutoReplaceChars('подъём') // { hasYo: true, hasSoft: false, hasHard: true }
 */
export function hasAutoReplaceChars(text) {
  if (typeof text !== 'string') {
    return { hasYo: false, hasSoft: false, hasHard: false };
  }

  return {
    hasYo: text.includes('ё'),
    hasSoft: text.includes('ь'),
    hasHard: text.includes('ъ')
  };
}

// ═══════════════════════════════════════════════════════════════════
// СТАТИСТИКА АВТОЗАМЕН
// ═══════════════════════════════════════════════════════════════════

/**
 * Возвращает статистику автозамен
 * 
 * @param {string} text - Исходный текст
 * @returns {Object} { yoCount, softCount, hardCount, total }
 * 
 * @example
 * getAutoReplaceStats('трёхзвёздный') // { yoCount: 2, softCount: 0, hardCount: 0, total: 2 }
 */
export function getAutoReplaceStats(text) {
  if (typeof text !== 'string') {
    return { yoCount: 0, softCount: 0, hardCount: 0, total: 0 };
  }

  const yoCount = (text.match(/ё/g) || []).length;
  const softCount = (text.match(/ь/g) || []).length;
  const hardCount = (text.match(/ъ/g) || []).length;

  return {
    yoCount,
    softCount,
    hardCount,
    total: yoCount + softCount + hardCount
  };
}

// ═══════════════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════════════

export default {
  applyYoReplacement,
  applySoftHardSignReplacement,
  applyAutoReplacements,
  hasAutoReplaceChars,
  getAutoReplaceStats
};
