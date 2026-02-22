/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - OPTIONAL CHARS
 *                   Type 4: Опциональные символы (?)
 * ═══════════════════════════════════════════════════════════════════
 *
 * @file converters/optionalChars.js
 * @description Делает выбранные символы опциональными (добавляет ?)
 * @date 15.02.2026
 */

// ═══════════════════════════════════════════════════════════════════
// TYPE 4: ОПЦИОНАЛЬНЫЕ СИМВОЛЫ
// ═══════════════════════════════════════════════════════════════════

// Классы автозамены: [её], [ьъ], [ъь]. В JavaScript длина каждой строки = 4 символа ([ + 2 буквы + ]).
// ВАЖНО: SEG_LEN должен быть именно 4, не 5. Иначе сегмент не распознаётся, ? вставляется
// после первого символа '[' и получается неверный результат [?её]ж вместо [её]?ж. Регрессионный тест: optionalChars ё → [её]?
const SEG_EO = '[\u0435\u0451]';   // [её]  (е U+0435, ё U+0451)
const SEG_SOFT = '[\u044C\u044A]'; // [ьъ]
const SEG_HARD = '[\u044A\u044C]'; // [ъь]
const SEG_LEN = 4; // не менять: "[её]".length === 4

/**
 * Строит концы сегментов в уже преобразованной строке (после автозамен).
 * Сегмент = один символ или целый класс [её]/[ьъ]/[ъь] (4 символа).
 * @param {string} text - Строка после автозамен
 * @returns {{ segmentEnds: number[], logicalLength: number }}
 */
function getSegmentEndPositions(text) {
  const segmentEnds = [];
  let i = 0;
  while (i < text.length) {
    const rest = text.substring(i);
    const isEo = rest.length >= SEG_LEN && rest.substring(0, SEG_LEN) === SEG_EO;
    const isSoft = rest.length >= SEG_LEN && rest.substring(0, SEG_LEN) === SEG_SOFT;
    const isHard = rest.length >= SEG_LEN && rest.substring(0, SEG_LEN) === SEG_HARD;
    if (isEo || isSoft || isHard) {
      segmentEnds.push(i + SEG_LEN);
      i += SEG_LEN;
    } else {
      segmentEnds.push(i + 1);
      i += 1;
    }
  }
  return { segmentEnds, logicalLength: segmentEnds.length };
}

/**
 * Применяет опциональные символы к тексту (уже после автозамен ё/ь/ъ).
 * Для ё (теперь [её]) вставляет ? после всей группы: [её]?, а не [?её].
 * text должен быть после автозамен; indices — логические позиции (как в исходной строке триггера).
 *
 * @param {string} text - Текст после автозамен (должен содержать [её], [ьъ], [ъь], а не ё/ь/ъ)
 * @param {Array<number>} indices - Индексы опциональных символов (логические позиции в исходной строке)
 * @returns {string} Текст с опциональными ?
 */
export function applyOptionalChars(text, indices) {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new TypeError('applyOptionalChars: текст должен быть непустой строкой');
  }

  if (!Array.isArray(indices) || indices.length === 0) {
    return text;
  }

  const { segmentEnds, logicalLength } = getSegmentEndPositions(text);

  // Валидация: хотя бы 1 обязательный символ (по логическим сегментам)
  if (indices.length >= logicalLength) {
    throw new Error('Минимум 1 символ должен быть обязательным!');
  }

  for (const index of indices) {
    if (index < 0 || index >= logicalLength) {
      throw new RangeError(`Некорректный индекс: ${index} (логическая длина: ${logicalLength})`);
    }
  }

  // Позиции вставки ? — после конца соответствующего сегмента
  const insertPositions = [...new Set(indices.map(i => segmentEnds[i]))].sort((a, b) => b - a);

  let result = text;
  for (const pos of insertPositions) {
    result = result.substring(0, pos) + '?' + result.substring(pos);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════
// ВАЛИДАЦИЯ
// ═══════════════════════════════════════════════════════════════════

/**
 * Валидирует индексы опциональных символов.
 * text — исходный текст триггера (до автозамен ё/ь/ъ); индексы в позициях этого текста.
 *
 * @param {Array<number>} indices - Индексы (по исходной строке)
 * @param {string} text - Исходный текст триггера
 * @returns {Object} { valid, error }
 */
export function validateOptionalIndices(indices, text) {
  if (!Array.isArray(indices)) {
    return {
      valid: false,
      error: 'Индексы должны быть массивом'
    };
  }

  if (indices.length === 0) {
    return {
      valid: false,
      error: 'Выберите хотя бы один символ'
    };
  }

  if (typeof text !== 'string' || text.length === 0) {
    return {
      valid: false,
      error: 'Текст не может быть пустым'
    };
  }

  // Хотя бы 1 обязательный символ
  if (indices.length >= text.length) {
    return {
      valid: false,
      error: 'Хотя бы 1 символ должен быть обязательным'
    };
  }

  // Проверка корректности индексов
  for (const index of indices) {
    if (!Number.isInteger(index)) {
      return {
        valid: false,
        error: `Индекс должен быть целым числом: ${index}`
      };
    }

    if (index < 0 || index >= text.length) {
      return {
        valid: false,
        error: `Некорректный индекс: ${index} (допустимо: 0-${text.length - 1})`
      };
    }
  }

  return {
    valid: true,
    error: null
  };
}

// ═══════════════════════════════════════════════════════════════════
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ═══════════════════════════════════════════════════════════════════

/**
 * Возвращает символы с индексами для UI
 * 
 * @param {string} text - Текст
 * @returns {Array<Object>} Массив { char, index, optional }
 * 
 * @example
 * getCharsWithIndices('визит')
 * // [
 * //   { char: 'в', index: 0, optional: false },
 * //   { char: 'и', index: 1, optional: false },
 * //   { char: 'з', index: 2, optional: false },
 * //   { char: 'и', index: 3, optional: false },
 * //   { char: 'т', index: 4, optional: false }
 * // ]
 */
export function getCharsWithIndices(text, selectedIndices = []) {
  if (typeof text !== 'string') {
    return [];
  }

  return text.split('').map((char, index) => ({
    char,
    index,
    optional: selectedIndices.includes(index)
  }));
}

/**
 * Возвращает количество обязательных символов
 * 
 * @param {string} text - Текст
 * @param {Array<number>} indices - Индексы опциональных
 * @returns {number} Количество обязательных символов
 */
export function getRequiredCharsCount(text, indices) {
  if (typeof text !== 'string') {
    return 0;
  }

  return text.length - (indices?.length || 0);
}

/**
 * Preview (до и после)
 */
export function previewOptionalChars(text, indices) {
  const validation = validateOptionalIndices(indices, text);

  if (!validation.valid) {
    return {
      before: text,
      after: text,
      changed: false,
      error: validation.error,
      requiredCount: text.length
    };
  }

  const before = text;
  const after = applyOptionalChars(text, indices);
  const changed = before !== after;
  const requiredCount = getRequiredCharsCount(text, indices);

  return {
    before,
    after,
    changed,
    error: null,
    requiredCount
  };
}

// ═══════════════════════════════════════════════════════════════════
// ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
// ═══════════════════════════════════════════════════════════════════

/**
 * Генерирует примеры возможных совпадений
 * 
 * @param {string} result - Результат с ?
 * @returns {Array<string>} Массив примеров
 * 
 * @example
 * generateMatchExamples('в?из?ит')
 * // ['визит', 'изит', 'взит', 'зит']
 */
export function generateMatchExamples(result) {
  // Для простоты возвращаем базовые примеры
  // Полная генерация всех вариантов потребует комбинаторики

  const examples = [result.replace(/\?/g, '')]; // Все символы

  // TODO: Реализовать полную генерацию (комбинаторика)
  // Сейчас возвращаем только основной вариант

  return examples;
}

// ═══════════════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════════════

export default {
  applyOptionalChars,
  validateOptionalIndices,
  getCharsWithIndices,
  getRequiredCharsCount,
  previewOptionalChars,
  generateMatchExamples
};
