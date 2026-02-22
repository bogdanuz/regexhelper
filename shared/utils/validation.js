/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - VALIDATION
 *                   Валидация входных данных
 * ═══════════════════════════════════════════════════════════════════
 * 
 * @file shared/utils/validation.js
 * @description Функции валидации для триггеров, дистанции и т.д.
 * @date 15.02.2026
 */

import { 
  MAX_TRIGGER_LENGTH, 
  MAX_TRIGGERS,
  MAX_GROUPS,
  MAX_SUBGROUPS,
  MIN_DISTANCE,
  MAX_DISTANCE
} from '../../core/config.js';

// ═══════════════════════════════════════════════════════════════════
// ВАЛИДАЦИЯ ТРИГГЕРОВ
// ═══════════════════════════════════════════════════════════════════

/**
 * Валидирует текст триггера
 * 
 * ИСПРАВЛЕНИЕ: Пустая строка проверяется ПЕРВОЙ
 * 
 * @param {string} text - Текст триггера
 * @returns {Object} { valid: boolean, error: string|null }
 */
export function validateTriggerText(text) {
  if (!text || text.trim() === '') {
    return { valid: false, error: 'Триггер не может быть пустым' };
  }
  if (text.includes('\n')) {
    return { valid: false, error: 'Триггер не может содержать перевод строки' };
  }
  if (text.length > MAX_TRIGGER_LENGTH) {
    return { valid: false, error: `Триггер слишком длинный (максимум ${MAX_TRIGGER_LENGTH} символов)` };
  }
  const validPattern = /^[а-яёА-ЯЁa-zA-Z0-9\s\-\.\+\*\?\(\)\[\]\|\^\$\{\}\\]*$/;
  if (!validPattern.test(text)) {
    return { valid: false, error: 'Триггер содержит недопустимые символы' };
  }
  return { valid: true, error: null };
}

/**
 * Валидирует массив триггеров
 */
export function validateTriggers(triggers) {
  if (!Array.isArray(triggers)) {
    return { valid: false, error: 'Триггеры должны быть массивом' };
  }
  if (triggers.length === 0) {
    return { valid: false, error: 'Добавьте хотя бы один триггер' };
  }
  if (triggers.length > MAX_TRIGGERS) {
    return { valid: false, error: `Слишком много триггеров (максимум ${MAX_TRIGGERS})` };
  }
  for (let i = 0; i < triggers.length; i++) {
    const result = validateTriggerText(triggers[i]);
    if (!result.valid) {
      return { valid: false, error: `Триггер #${i + 1}: ${result.error}` };
    }
  }
  return { valid: true, error: null };
}

// ═══════════════════════════════════════════════════════════════════
// ВАЛИДАЦИЯ DISTANCE
// ═══════════════════════════════════════════════════════════════════

export function validateDistance(min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    return { valid: false, error: 'Расстояние должно быть целым числом' };
  }
  if (min < MIN_DISTANCE) {
    return { valid: false, error: `Минимальное расстояние должно быть ≥ ${MIN_DISTANCE}` };
  }
  if (max < min) {
    return { valid: false, error: 'Максимальное расстояние должно быть ≥ минимального' };
  }
  if (max > MAX_DISTANCE) {
    console.warn(`⚠️ Большое расстояние (${max}) может замедлить regex. Рекомендуется: 1-${MAX_DISTANCE}`);
  }
  return { valid: true, error: null };
}

// ═══════════════════════════════════════════════════════════════════
// ВАЛИДАЦИЯ СТРУКТУРЫ (ГРУППЫ/ПОДГРУППЫ)
// ═══════════════════════════════════════════════════════════════════

export function validateGroupCount(count) {
  if (count > MAX_GROUPS) {
    return { valid: false, error: `Слишком много групп (максимум ${MAX_GROUPS})` };
  }
  return { valid: true, error: null };
}

export function validateSubgroupCount(count) {
  if (count > MAX_SUBGROUPS) {
    return { valid: false, error: `Слишком много подгрупп (максимум ${MAX_SUBGROUPS})` };
  }
  return { valid: true, error: null };
}

// ═══════════════════════════════════════════════════════════════════
// ВАЛИДАЦИЯ ПАРАМЕТРОВ
// ═══════════════════════════════════════════════════════════════════

export function validateOptionalChars(indices, text) {
  if (!Array.isArray(indices) || indices.length === 0) {
    return { valid: false, error: 'Выберите хотя бы один символ' };
  }
  if (indices.length >= text.length) {
    return { valid: false, error: 'Хотя бы 1 символ должен быть обязательным' };
  }
  for (const index of indices) {
    if (index < 0 || index >= text.length) {
      return { valid: false, error: `Некорректный индекс: ${index}` };
    }
  }
  return { valid: true, error: null };
}

export function validatePrefix(prefix, endings, mode) {
  if (!prefix || prefix.trim() === '') {
    return { valid: false, error: 'Префикс не может быть пустым' };
  }
  if (mode === 'exact') {
    if (!Array.isArray(endings) || endings.length === 0) {
      return { valid: false, error: 'Укажите хотя бы одно окончание' };
    }
    const validEndings = endings.filter(e => e && e.trim() !== '');
    if (validEndings.length === 0) {
      return { valid: false, error: 'Окончания не могут быть пустыми' };
    }
  }
  return { valid: true, error: null };
}

// ═══════════════════════════════════════════════════════════════════
// ВАЛИДАЦИЯ REGEX РЕЗУЛЬТАТА
// ═══════════════════════════════════════════════════════════════════

export function validateRegexPattern(pattern) {
  if (!pattern || pattern.trim() === '') {
    return { valid: false, error: 'Regex не может быть пустым' };
  }
  try {
    new RegExp(pattern);
    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: `Некорректный regex: ${error.message}` };
  }
}

export default {
  validateTriggerText,
  validateTriggers,
  validateDistance,
  validateGroupCount,
  validateSubgroupCount,
  validateOptionalChars,
  validatePrefix,
  validateRegexPattern
};
