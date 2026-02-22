/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - REGEX BUILDER
 *                   Финальная сборка regex выражений
 * ═══════════════════════════════════════════════════════════════════
 *
 * @file logic/regexBuilder.js
 * @description Сборка финального regex из частей
 * @date 15.02.2026
 */

import { validateRegexPattern } from '../../../shared/utils/validation.js';

// ═══════════════════════════════════════════════════════════════════
// СБОРКА REGEX
// ═══════════════════════════════════════════════════════════════════

/**
 * Собирает финальный regex из частей
 * 
 * @param {Array<string>} parts - Массив частей regex
 * @param {Object} options - Опции сборки
 * @returns {string} Финальный regex
 * 
 * @example
 * buildRegex(['(?:актёр)', '(?:визит)'])
 * // '(актёр|визит)'
 * 
 * buildRegex(['(?:актёр)', '.{1,10}', '(?:визит)'])
 * // '(?:актёр).{1,10}(?:визит)'
 */
export function buildRegex(parts, options = {}) {
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new Error('buildRegex: части должны быть непустым массивом');
  }

  // Фильтруем пустые части
  const validParts = parts.filter(p => p && p.trim() !== '');

  if (validParts.length === 0) {
    throw new Error('buildRegex: все части пустые');
  }

  // Если одна часть, возвращаем как есть
  if (validParts.length === 1) {
    return validParts[0];
  }

  // Проверяем наличие distance (parts с .{...}, [\s\S]+, и т.д.)
  const hasDistance = validParts.some(p => 
    p.includes('.{') || 
    p.includes('[\\s\\S]') ||
    p === '.+' ||
    p === '[^\\n]+'
  );

  let result;

  if (hasDistance) {
    // Если есть distance, просто соединяем части
    result = validParts.join('');
  } else {
    // Если нет distance, делаем альтернацию
    result = `(${validParts.join('|')})`;
  }

  return result;
}

/**
 * Оборачивает regex в не захватывающую группу (если нужно)
 * 
 * @param {string} regex - Regex
 * @returns {string} Обёрнутый regex
 * 
 * @example
 * wrapInGroup('актёр|визит') // '(актёр|визит)'
 * wrapInGroup('(актёр|визит)') // '(актёр|визит)' (уже обёрнут)
 */
export function wrapInGroup(regex) {
  if (typeof regex !== 'string' || regex.trim() === '') {
    return regex;
  }

  // Если уже обёрнут в группу, не оборачиваем снова
  if ((regex.startsWith('(?:') || regex.startsWith('(')) && regex.endsWith(')')) {
    return regex;
  }

  return `(${regex})`;
}

/**
 * Удаляет лишние обёртки (если есть)
 * 
 * @param {string} regex - Regex
 * @returns {string} Regex без лишних обёрток
 */
export function unwrapGroup(regex) {
  if (typeof regex !== 'string' || regex.trim() === '') {
    return regex;
  }

  // Если обёрнут в (?:...), убираем обёртку
  if (regex.startsWith('(?:') && regex.endsWith(')')) {
    return regex.slice(3, -1);
  }
  // Если обёрнут в одну верхнеуровневую группу (...), убираем обёртку (не трогаем (a)(b))
  if (regex.startsWith('(') && regex.endsWith(')') && regex.length > 2) {
    let depth = 1;
    for (let i = 1; i < regex.length - 1; i++) {
      if (regex[i] === '\\') { i++; continue; }
      if (regex[i] === '(') depth++;
      else if (regex[i] === ')') { depth--; if (depth === 0) return regex; }
    }
    if (depth === 1) return regex.slice(1, -1);
  }

  return regex;
}

// ═══════════════════════════════════════════════════════════════════
// ОПТИМИЗАЦИЯ REGEX
// ═══════════════════════════════════════════════════════════════════

/**
 * Оптимизирует regex (удаляет дубликаты, упрощает)
 * 
 * @param {string} regex - Исходный regex
 * @returns {string} Оптимизированный regex
 */
export function optimizeRegex(regex) {
  if (typeof regex !== 'string' || regex.trim() === '') {
    return regex;
  }

  // Удаляем дубликаты в альтернациях: (?:a|b|c) или (a|b|c) → (a|b|c)
  const nonCapturingMatch = regex.match(/^\(\?:(.+)\)$/);
  const capturingMatch = regex.match(/^\(([^()]*(?:\|[^()]*)*)\)$/);
  const inner = nonCapturingMatch ? nonCapturingMatch[1] : (capturingMatch ? capturingMatch[1] : null);
  if (inner != null) {
    const parts = inner.split('|');
    const uniqueParts = [...new Set(parts)];

    if (uniqueParts.length === 1) {
      return uniqueParts[0];
    }

    return `(${uniqueParts.join('|')})`;
  }

  return regex;
}

/**
 * Форматирует regex для отображения (с переносами строк).
 * Разбивка по | только для простой альтернации без вложенных групп (?:…);
 * при наличии (?: возвращает строку как есть, чтобы не разрывать группы.
 *
 * @param {string} regex - Regex
 * @param {number} maxLength - Максимальная длина строки (по умолчанию 80)
 * @returns {string} Форматированный regex
 */
export function formatRegexForDisplay(regex, maxLength = 80) {
  if (typeof regex !== 'string') {
    return '';
  }

  if (regex.length <= maxLength) {
    return regex;
  }

  // Не разбиваем по |, если есть группы с альтернацией — иначе разрыв внутри (a|b) или (?:a|b)
  if (regex.includes('(?:') || (regex.includes('(') && regex.includes('|'))) {
    return regex;
  }

  const parts = regex.split('|');

  let result = '';
  let currentLine = '';

  parts.forEach((part, index) => {
    const separator = index > 0 ? '|' : '';
    const piece = separator + part;

    if ((currentLine + piece).length > maxLength && currentLine) {
      result += currentLine + '\n';
      currentLine = part;
    } else {
      currentLine += piece;
    }
  });

  if (currentLine) {
    result += currentLine;
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════
// ВАЛИДАЦИЯ
// ═══════════════════════════════════════════════════════════════════

/**
 * Валидирует финальный regex
 * 
 * @param {string} regex - Regex
 * @returns {Object} { valid, error, warnings }
 */
export function validateFinalRegex(regex) {
  const validation = validateRegexPattern(regex);

  if (!validation.valid) {
    return {
      valid: false,
      error: validation.error,
      warnings: []
    };
  }

  const warnings = [];

  // Предупреждение о длине
  if (regex.length > 1000) {
    warnings.push('Regex слишком длинный (>1000 символов). Может быть медленным.');
  }

  // Предупреждение о сложности
  const alternationsCount = (regex.match(/\|/g) || []).length;
  if (alternationsCount > 100) {
    warnings.push(`Слишком много альтернаций (${alternationsCount}). Может быть медленным.`);
  }

  return {
    valid: true,
    error: null,
    warnings
  };
}

// ═══════════════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════════════

export default {
  buildRegex,
  wrapInGroup,
  unwrapGroup,
  optimizeRegex,
  formatRegexForDisplay,
  validateFinalRegex
};
