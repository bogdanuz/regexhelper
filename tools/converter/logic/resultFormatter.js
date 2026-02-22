/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - RESULT FORMATTER
 *                   Форматирование результата конвертации
 * ═══════════════════════════════════════════════════════════════════
 *
 * @file tools/converter/logic/resultFormatter.js
 * @description Форматирование результата для отображения
 * @date 15.02.2026
 */

import { PARAM_LABELS } from '../../../core/config.js';

/** Дополнительные названия параметров для отображения (как в интерфейсе) */
const PARAM_LABELS_EXTRA = {
  ...PARAM_LABELS,
  wordBoundaries: 'Границы слова (\\b)',
  requireSpaceAfter: 'Пробел после (\\s)',
  optionalChars: 'Опциональные символы (?)',
  wildcard: 'Любой символ (\\w)'
};

/** Внутренние ключи, которые не показывать пользователю */
const INTERNAL_PARAM_KEYS = new Set(['_simpleV2', 'global', 'triggerParams']);

/**
 * Форматирует объект параметров в строку с понятными названиями (как в UI).
 * @param {Object} params - Параметры (простых или связанных триггеров)
 * @param {'simple'|'linked'} kind - Тип: простые (могут быть global/triggerParams) или связанные (плоский объект)
 * @returns {string}
 */
export function formatParamsForDisplay(params, kind = 'linked') {
  if (!params || typeof params !== 'object') return '';
  const p = kind === 'simple' && params.global ? params.global : params;
  if (!p || typeof p !== 'object') return '';
  const parts = [];
  for (const [key, value] of Object.entries(p)) {
    if (INTERNAL_PARAM_KEYS.has(key)) continue;
    const label = PARAM_LABELS_EXTRA[key];
    if (!label) continue;
    if (key === 'optionalChars') {
      if (Array.isArray(value) && value.length > 0) parts.push(PARAM_LABELS_EXTRA.optionalChars || 'Опциональные символы (?)');
      continue;
    }
    if (key === 'wildcard') {
      if (value && typeof value === 'object' && value.mode) parts.push(PARAM_LABELS_EXTRA.wildcard || 'Любой символ (\\w)');
      continue;
    }
    if (value === true || (value !== false && value !== null && value !== undefined && value !== '')) {
      parts.push(label);
    }
  }
  return parts.join(', ');
}

export function formatResult(result, options = {}) {
  if (typeof result !== 'string' || result === '') {
    return { formatted: '', html: '', plain: '' };
  }
  const { highlightSyntax = false, maxLength = 1000, truncate = false } = options;
  let formatted = result;
  if (truncate && formatted.length > maxLength) {
    formatted = formatted.substring(0, maxLength) + '...';
  }
  let html = formatted;
  if (highlightSyntax) html = highlightRegexSyntax(formatted);
  return { formatted, html, plain: result };
}

function highlightRegexSyntax(regex) {
  let html = regex;
  html = html.replace(/\(\?:/g, '<span class="regex-group">(?:</span>');
  html = html.replace(/\)/g, '<span class="regex-group">)</span>');
  html = html.replace(/\.\{(\d+),(\d+)\}/g, '<span class="regex-quantifier">.{$1,$2}</span>');
  html = html.replace(/\[([^\]]+)\]/g, '<span class="regex-charclass">[$1]</span>');
  html = html.replace(/\|/g, '<span class="regex-alternation">|</span>');
  return html;
}

export function getResultStats(result) {
  if (typeof result !== 'string') {
    return { length: 0, groups: 0, alternations: 0, charClasses: 0 };
  }
  return {
    length: result.length,
    groups: (result.match(/\(\?:/g) || []).length,
    alternations: (result.match(/\|/g) || []).length,
    charClasses: (result.match(/\[[^\]]+\]/g) || []).length
  };
}

export default {
  formatResult,
  formatParamsForDisplay,
  getResultStats
};
