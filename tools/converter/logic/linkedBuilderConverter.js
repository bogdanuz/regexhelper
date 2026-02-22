/**
 * ═══════════════════════════════════════════════════════════════════
 *                    LINKED BUILDER CONVERTER
 *                   Конвертация данных конструктора в regex
 * ═══════════════════════════════════════════════════════════════════
 *
 * @file tools/converter/logic/linkedBuilderConverter.js
 * @description Конвертация структуры LinkedBuilder в regex
 * @date 2026-02-21
 */

import { applyAutoReplacements } from '../converters/autoReplace.js';
import { applyParameters, applyWordBoundaries } from './parameterApplier.js';

// ═══════════════════════════════════════════════════════════════════
// КОНСТАНТЫ
// ═══════════════════════════════════════════════════════════════════

/** Паттерны соединителей */
const CONNECTOR_PATTERNS = {
  alternation: '|',
  any: '[\\s\\S]+',
  paragraph: '.+',
  line: '[^\\n]+'
};

// ═══════════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════════

/**
 * Получить паттерн соединителя
 * @param {Object} connector - { mode, min, max }
 * @returns {string}
 */
function getConnectorPattern(connector) {
  if (!connector || !connector.mode) return '|';
  
  if (connector.mode === 'custom') {
    const min = connector.min ?? 0;
    const max = connector.max ?? 10;
    return `.{${min},${max}}`;
  }
  
  return CONNECTOR_PATTERNS[connector.mode] || '|';
}

/**
 * Применить параметры к тексту триггера
 * @param {string} text - текст триггера
 * @param {Object} params - параметры
 * @returns {string}
 */
function applyTriggerParams(text, params) {
  if (!text || !text.trim()) return '';
  
  let result = text.trim();
  
  // Всегда применяем applyParameters — даже с пустыми параметрами
  // Это включает авто-удвоение (getDoubledSecondIndices) и автозамены
  result = applyParameters(result, params || {});
  
  // Применяем границы слова если заданы
  if (params && Object.keys(params).length > 0) {
    result = applyWordBoundaries(result, params);
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// КОНВЕРТАЦИЯ
// ═══════════════════════════════════════════════════════════════════

/**
 * Конвертировать один элемент (триггер или группу)
 * @param {Object} element - элемент
 * @returns {string}
 */
function convertElement(element) {
  if (!element) return '';
  
  if (element.type === 'trigger') {
    return applyTriggerParams(element.text, element.params);
  }
  
  if (element.type === 'group') {
    return convertGroup(element);
  }
  
  return '';
}

/**
 * Конвертировать группу (явная группа, созданная пользователем)
 * @param {Object} group - группа
 * @returns {string}
 */
function convertGroup(group) {
  if (!group || !group.children || group.children.length === 0) return '';
  
  // Собираем содержимое группы
  const innerResult = convertElementsToRegex(group.children);
  
  if (!innerResult) return '';
  
  // Группа ВСЕГДА оборачивается в скобки — это явная группировка пользователя
  return `(${innerResult})`;
}

/**
 * Конвертировать массив элементов в regex строку (без внешних скобок)
 * @param {Array} elements - массив элементов
 * @returns {string}
 */
function convertElementsToRegex(elements) {
  if (!Array.isArray(elements) || elements.length === 0) return '';
  
  const parts = [];
  
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const elementRegex = convertElement(element);
    
    if (!elementRegex) continue;
    
    parts.push(elementRegex);
    
    const isLast = i === elements.length - 1;
    if (!isLast) {
      const connector = element.connector;
      const connectorPattern = getConnectorPattern(connector);
      parts.push(connectorPattern);
    }
  }
  
  return parts.join('');
}

/**
 * Конвертировать массив элементов верхнего уровня
 * @param {Array} elements - массив элементов
 * @returns {{ success: boolean, result: string, error: string|null, stats: Object }}
 */
export function convertLinkedBuilder(elements) {
  if (!Array.isArray(elements) || elements.length === 0) {
    return { 
      success: false, 
      result: '', 
      error: 'Нет триггеров для конвертации',
      stats: { triggersCount: 0, groupsCount: 0 }
    };
  }
  
  // Собираем статистику
  const stats = countElements(elements);
  
  // Фильтруем пустые триггеры
  const nonEmptyElements = filterEmptyElements(elements);
  
  if (nonEmptyElements.length === 0) {
    return {
      success: false,
      result: '',
      error: 'Все триггеры пустые',
      stats
    };
  }
  
  try {
    // Верхний уровень — НЕ группа, просто контейнер
    // Скобки добавляются только для явных групп (type: 'group')
    const result = convertElementsToRegex(nonEmptyElements);
    
    return {
      success: true,
      result,
      error: null,
      stats
    };
    
  } catch (error) {
    return {
      success: false,
      result: '',
      error: error.message || 'Ошибка конвертации',
      stats
    };
  }
}

/**
 * Подсчёт элементов
 * @param {Array} elements
 * @returns {{ triggersCount: number, groupsCount: number }}
 */
function countElements(elements) {
  let triggersCount = 0;
  let groupsCount = 0;
  
  function count(arr) {
    for (const el of arr) {
      if (el.type === 'trigger') {
        triggersCount++;
      } else if (el.type === 'group') {
        groupsCount++;
        if (el.children) count(el.children);
      }
    }
  }
  
  count(elements);
  return { triggersCount, groupsCount };
}

/**
 * Фильтрация пустых элементов
 * @param {Array} elements
 * @returns {Array}
 */
function filterEmptyElements(elements) {
  const result = [];
  
  for (const el of elements) {
    if (el.type === 'trigger') {
      if (el.text && el.text.trim()) {
        result.push(el);
      }
    } else if (el.type === 'group') {
      const filteredChildren = filterEmptyElements(el.children || []);
      if (filteredChildren.length > 0) {
        result.push({ ...el, children: filteredChildren });
      }
    }
  }
  
  return result;
}

/**
 * Предпросмотр конвертации
 * @param {Array} elements
 * @returns {{ result: string, stats: Object, error: string|null }}
 */
export function previewLinkedBuilderConversion(elements) {
  const conversion = convertLinkedBuilder(elements);
  return {
    result: conversion.result || '',
    stats: conversion.stats,
    error: conversion.error
  };
}

export default {
  convertLinkedBuilder,
  previewLinkedBuilderConversion
};
