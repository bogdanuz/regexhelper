/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - WILDCARD
 *                   Любой символ (\w) — суффикс после триггера
 * ═══════════════════════════════════════════════════════════════════
 *
 * @file converters/wildcard.js
 * @description Генерация \w (1 символ) или \w{min,max} после текста триггера
 * @date 21.02.2026
 */

import { escapeRegex } from '../../../shared/utils/escape.js';

// ═══════════════════════════════════════════════════════════════════
// WILDCARD: ЛЮБОЙ СИМВОЛ (\w)
// ═══════════════════════════════════════════════════════════════════

/**
 * Применяет wildcard к триггеру (добавляет \w или \w{min,max} в конец)
 *
 * @param {string} text - Текст триггера (корень)
 * @param {Object} wildcardParams - Параметры wildcard
 * @param {string} wildcardParams.mode - 'auto' (\w — ровно 1 символ) или 'range' (\w{min,max})
 * @param {number} [wildcardParams.min] - Мин. символов (для mode='range')
 * @param {number} [wildcardParams.max] - Макс. символов (для mode='range')
 * @returns {string} Regex с wildcard
 *
 * @example
 * applyWildcard('доставк', { mode: 'auto' })
 * // 'доставк\\w'
 *
 * applyWildcard('доставк', { mode: 'range', min: 1, max: 3 })
 * // 'доставк\\w{1,3}'
 */
export function applyWildcard(text, wildcardParams) {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new TypeError('applyWildcard: текст должен быть непустой строкой');
  }

  if (!wildcardParams || typeof wildcardParams !== 'object') {
    throw new TypeError('applyWildcard: wildcardParams должен быть объектом');
  }

  const escaped = escapeRegex(text.trim());
  const mode = wildcardParams.mode || 'auto';

  if (mode === 'range') {
    const minInt = typeof wildcardParams.min === 'number' ? wildcardParams.min : parseInt(wildcardParams.min, 10);
    const maxInt = typeof wildcardParams.max === 'number' ? wildcardParams.max : parseInt(wildcardParams.max, 10);

    const isValid =
      !isNaN(minInt) &&
      !isNaN(maxInt) &&
      minInt >= 0 &&
      maxInt >= 1 &&
      minInt <= maxInt;

    if (isValid) {
      return `${escaped}\\w{${minInt},${maxInt}}`;
    }
  }

  // mode === 'auto': ровно 1 любой символ
  return `${escaped}\\w`;
}

// ═══════════════════════════════════════════════════════════════════
// ВАЛИДАЦИЯ
// ═══════════════════════════════════════════════════════════════════

/**
 * Валидирует параметры wildcard
 *
 * @param {Object} wildcardParams - Параметры wildcard
 * @returns {Object} { valid, error }
 */
export function validateWildcard(wildcardParams) {
  if (!wildcardParams || typeof wildcardParams !== 'object') {
    return { valid: false, error: 'Параметры wildcard не указаны' };
  }

  const mode = wildcardParams.mode;
  if (mode !== 'auto' && mode !== 'range') {
    return { valid: false, error: `Некорректный режим: ${mode} (допустимо: 'auto', 'range')` };
  }

  if (mode === 'range') {
    const min = wildcardParams.min;
    const max = wildcardParams.max;

    if (min === undefined || min === null || max === undefined || max === null) {
      return { valid: false, error: 'Для режима range укажите min и max' };
    }

    const minInt = parseInt(min, 10);
    const maxInt = parseInt(max, 10);

    if (isNaN(minInt) || isNaN(maxInt)) {
      return { valid: false, error: 'min и max должны быть числами' };
    }

    if (minInt < 0) {
      return { valid: false, error: 'min не может быть отрицательным' };
    }

    if (maxInt < 1) {
      return { valid: false, error: 'max должен быть не менее 1' };
    }

    if (minInt > maxInt) {
      return { valid: false, error: 'min не может быть больше max' };
    }
  }

  return { valid: true, error: null };
}

// ═══════════════════════════════════════════════════════════════════
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ═══════════════════════════════════════════════════════════════════

/**
 * Генерирует примеры совпадений для wildcard
 *
 * @param {string} text - Корень (триггер)
 * @param {Object} wildcardParams - Параметры wildcard
 * @returns {Array<string>} Примеры
 *
 * @example
 * generateWildcardExamples('доставк', { mode: 'range', min: 1, max: 3 })
 * // ['доставка', 'доставки', 'доставкой']
 */
export function generateWildcardExamples(text, wildcardParams) {
  const suffixes = ['а', 'и', 'ой', 'ами', 'у', 'е'];
  const mode = wildcardParams?.mode || 'auto';

  if (mode === 'range') {
    const max = wildcardParams.max || 3;
    return suffixes
      .filter(s => s.length <= max)
      .slice(0, 4)
      .map(s => `${text}${s}`);
  }

  return suffixes.slice(0, 4).map(s => `${text}${s}`);
}

/**
 * Preview (до и после)
 *
 * @param {string} text - Корень
 * @param {Object} wildcardParams - Параметры
 * @returns {Object} { before, after, changed, error, examples }
 */
export function previewWildcard(text, wildcardParams) {
  const validation = validateWildcard(wildcardParams);

  if (!validation.valid) {
    return {
      before: text,
      after: text,
      changed: false,
      error: validation.error,
      examples: []
    };
  }

  const before = text;
  const after = applyWildcard(text, wildcardParams);
  const changed = before !== after;
  const examples = generateWildcardExamples(text, wildcardParams);

  return {
    before,
    after,
    changed,
    error: null,
    examples
  };
}

// ═══════════════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════════════

export default {
  applyWildcard,
  validateWildcard,
  generateWildcardExamples,
  previewWildcard
};
