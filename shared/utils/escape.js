/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - ESCAPE
 *                   Экранирование regex символов
 * ═══════════════════════════════════════════════════════════════════
 * 
 * @file shared/utils/escape.js
 * @description Функции для экранирования специальных символов regex
 * @date 15.02.2026
 */

import { REGEX_SPECIAL_CHARS } from '../../core/config.js';

// ═══════════════════════════════════════════════════════════════════
// ЭКРАНИРОВАНИЕ REGEX СИМВОЛОВ
// ═══════════════════════════════════════════════════════════════════

export function escapeRegex(text) {
  if (typeof text !== 'string') {
    throw new TypeError('escapeRegex: аргумент должен быть строкой');
  }
  let result = text;
  const specialChars = ['\\', '.', '+', '*', '?', '^', '$', '(', ')', '[', ']', '{', '}', '|'];
  specialChars.forEach(char => {
    const regex = new RegExp('\\' + char, 'g');
    result = result.replace(regex, '\\' + char);
  });
  return result;
}

export function hasSpecialChars(text) {
  if (typeof text !== 'string') return false;
  const specialCharsRegex = /[\\.*+?^$()\[\]{}|]/;
  return specialCharsRegex.test(text);
}

export function getSpecialChars(text) {
  if (typeof text !== 'string') return [];
  const result = [];
  const specialChars = ['\\', '.', '+', '*', '?', '^', '$', '(', ')', '[', ']', '{', '}', '|'];
  specialChars.forEach(char => {
    const positions = [];
    let index = text.indexOf(char);
    while (index !== -1) {
      positions.push(index);
      index = text.indexOf(char, index + 1);
    }
    if (positions.length > 0) {
      result.push({ char, positions, count: positions.length });
    }
  });
  return result;
}

export function escapeCharClass(text) {
  if (typeof text !== 'string') {
    throw new TypeError('escapeCharClass: аргумент должен быть строкой');
  }
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\]/g, '\\]')
    .replace(/\^/g, '\\^')
    .replace(/-/g, '\\-');
}

export function safeRegex(pattern, flags = '') {
  try {
    const escapedPattern = escapeRegex(pattern);
    return new RegExp(escapedPattern, flags);
  } catch (error) {
    console.error('safeRegex: не удалось создать RegExp', error);
    return null;
  }
}

export function validateRegex(pattern) {
  if (typeof pattern !== 'string') {
    return { valid: false, error: 'Паттерн должен быть строкой' };
  }
  try {
    new RegExp(pattern);
    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

export default {
  escapeRegex,
  hasSpecialChars,
  getSpecialChars,
  escapeCharClass,
  safeRegex,
  validateRegex
};

export { REGEX_SPECIAL_CHARS };
