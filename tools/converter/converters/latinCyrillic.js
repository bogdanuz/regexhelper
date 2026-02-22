/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - LATIN/CYRILLIC
 *                   Type 1: Латиница/Кириллица (18 пар)
 * ═══════════════════════════════════════════════════════════════════
 *
 * @file converters/latinCyrillic.js
 * @description Замена визуально похожих символов латиницы и кириллицы
 * @date 15.02.2026
 */

import { LATIN_CYRILLIC_PAIRS } from '../../../core/config.js';

// ═══════════════════════════════════════════════════════════════════
// TYPE 1: ЛАТИНИЦА/КИРИЛЛИЦА
// ═══════════════════════════════════════════════════════════════════

/**
 * Применяет замену латиница/кириллица (18 пар)
 * 
 * Заменяет визуально похожие символы на символьные классы:
 * a → [a\u0430], o → [o\u043e], и т.д.
 * 
 * @param {string} text - Исходный текст
 * @returns {string} Текст с замененными символами
 * 
 * @example
 * applyLatinCyrillic('дрон') // '[дd]р[оo]н'
 * applyLatinCyrillic('актёр') // '[аa]кт[её]р'
 * applyLatinCyrillic('обзор') // '[оo]бз[оo]р'
 */
export function applyLatinCyrillic(text) {
  if (typeof text !== 'string') {
    throw new TypeError('applyLatinCyrillic: аргумент должен быть строкой');
  }

  let result = text;

  // Применяем пары только к тексту ВНЕ скобок [...].
  // Скобки уже могут содержать [её], [ьъ], [ъь] от автозамен — их не трогаем.
  const bracketPattern = /(\[[^\]]*\])/g;
  const parts = result.split(bracketPattern);
  
  for (let i = 0; i < parts.length; i++) {
    // Пропускаем части внутри скобок (они начинаются с '[')
    if (parts[i].charAt(0) === '[') {
      continue;
    }
    // Применяем замены только к тексту вне скобок
    for (const [char, replacement] of Object.entries(LATIN_CYRILLIC_PAIRS)) {
      const regex = new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      parts[i] = parts[i].replace(regex, replacement);
    }
  }
  
  result = parts.join('');
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// ПРОВЕРКА НАЛИЧИЯ ПОХОЖИХ СИМВОЛОВ
// ═══════════════════════════════════════════════════════════════════

/**
 * Проверяет, есть ли в тексте символы для замены
 * 
 * @param {string} text - Текст для проверки
 * @returns {boolean} true, если есть похожие символы
 * 
 * @example
 * hasLatinCyrillicChars('дрон') // true
 * hasLatinCyrillicChars('жбнк') // false
 */
export function hasLatinCyrillicChars(text) {
  if (typeof text !== 'string') {
    return false;
  }

  // Проверяем наличие хотя бы одного символа из пар
  const charsToCheck = Object.keys(LATIN_CYRILLIC_PAIRS);
  return charsToCheck.some(char => text.includes(char));
}

// ═══════════════════════════════════════════════════════════════════
// СТАТИСТИКА ЗАМЕН
// ═══════════════════════════════════════════════════════════════════

/**
 * Возвращает статистику замен
 * 
 * @param {string} text - Исходный текст
 * @returns {Object} { chars: Array<{ char, count }>, total }
 * 
 * @example
 * getLatinCyrillicStats('дрон')
 * // { chars: [{ char: 'д', count: 1 }, { char: 'р', count: 1 }, { char: 'о', count: 1 }], total: 3 }
 */
export function getLatinCyrillicStats(text) {
  if (typeof text !== 'string') {
    return { chars: [], total: 0 };
  }

  const chars = [];
  const charsToCheck = Object.keys(LATIN_CYRILLIC_PAIRS);

  charsToCheck.forEach(char => {
    const count = (text.match(new RegExp(char, 'g')) || []).length;
    if (count > 0) {
      chars.push({ char, count });
    }
  });

  const total = chars.reduce((sum, item) => sum + item.count, 0);

  return { chars, total };
}

// ═══════════════════════════════════════════════════════════════════
// ПОЛУЧЕНИЕ СПИСКА ЗАМЕНЁННЫХ СИМВОЛОВ
// ═══════════════════════════════════════════════════════════════════

/**
 * Возвращает список всех заменённых символов с позициями
 * 
 * @param {string} text - Исходный текст
 * @returns {Array<Object>} Массив { char, positions, replacement }
 * 
 * @example
 * getReplacedChars('дрон')
 * // [
 * //   { char: 'д', positions: [0], replacement: '[дd]' },
 * //   { char: 'р', positions: [1], replacement: '[рp]' },
 * //   { char: 'о', positions: [2], replacement: '[оo]' }
 * // ]
 */
export function getReplacedChars(text) {
  if (typeof text !== 'string') {
    return [];
  }

  const result = [];
  const charsToCheck = Object.keys(LATIN_CYRILLIC_PAIRS);

  charsToCheck.forEach(char => {
    const positions = [];
    let index = text.indexOf(char);

    while (index !== -1) {
      positions.push(index);
      index = text.indexOf(char, index + 1);
    }

    if (positions.length > 0) {
      result.push({
        char,
        positions,
        replacement: LATIN_CYRILLIC_PAIRS[char]
      });
    }
  });

  return result;
}

// ═══════════════════════════════════════════════════════════════════
// ПРИМЕНЕНИЕ К МАССИВУ ТРИГГЕРОВ
// ═══════════════════════════════════════════════════════════════════

/**
 * Применяет латиница/кириллица к массиву триггеров
 * 
 * @param {Array<string>} triggers - Массив триггеров
 * @returns {Array<string>} Массив с замененными символами
 * 
 * @example
 * applyLatinCyrillicToArray(['дрон', 'актёр'])
 * // ['[дd]р[оo]н', '[аa]кт[её]р']
 */
export function applyLatinCyrillicToArray(triggers) {
  if (!Array.isArray(triggers)) {
    throw new TypeError('applyLatinCyrillicToArray: аргумент должен быть массивом');
  }

  return triggers.map(trigger => applyLatinCyrillic(trigger));
}

// ═══════════════════════════════════════════════════════════════════
// PREVIEW (ПРЕДПРОСМОТР)
// ═══════════════════════════════════════════════════════════════════

/**
 * Генерирует preview (до и после)
 * 
 * @param {string} text - Исходный текст
 * @returns {Object} { before, after, changed, stats }
 * 
 * @example
 * previewLatinCyrillic('дрон')
 * // {
 * //   before: 'дрон',
 * //   after: '[дd]р[оo]н',
 * //   changed: true,
 * //   stats: { chars: [...], total: 3 }
 * // }
 */
export function previewLatinCyrillic(text) {
  if (typeof text !== 'string') {
    return {
      before: '',
      after: '',
      changed: false,
      stats: { chars: [], total: 0 }
    };
  }

  const before = text;
  const after = applyLatinCyrillic(text);
  const changed = before !== after;
  const stats = getLatinCyrillicStats(text);

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
  applyLatinCyrillic,
  hasLatinCyrillicChars,
  getLatinCyrillicStats,
  getReplacedChars,
  applyLatinCyrillicToArray,
  previewLatinCyrillic
};

// Реэкспортируем константы
export { LATIN_CYRILLIC_PAIRS };
