/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - CONVERSION MANAGER
 *                   Управление всем процессом конвертации
 * ═══════════════════════════════════════════════════════════════════
 * 
 * @file tools/converter/logic/conversionManager.js
 * @description Главный модуль управления конвертацией (простые + связанные)
 * @date 15.02.2026
 */

import { convertSimpleTriggers, parseSimpleTriggers } from './simpleConverter.js';
import { buildRegex, validateFinalRegex } from './regexBuilder.js';
import { checkParamsCompatibility } from './compatibilityChecker.js';
import { formatResult } from './resultFormatter.js';
import { saveToHistory } from '../../../shared/utils/storage.js';
import { escapeRegex } from '../../../shared/utils/escape.js';

// ═══════════════════════════════════════════════════════════════════
// ГЛАВНАЯ ФУНКЦИЯ КОНВЕРТАЦИИ
// ═══════════════════════════════════════════════════════════════════

/**
 * Главная функция конвертации (простые или связанные триггеры)
 * 
 * @param {Object} input - Входные данные
 * @param {string} input.type - Тип ('simple' или 'linked')
 * @param {string} input.text - Текст (для простых)
 * @param {Array<Object>} input.groups - Группы (для связанных)
 * @param {Object} input.params - Параметры
 * @returns {Object} { success, result, data, error }
 */
export function convert(input) {
  if (!input || typeof input !== 'object') {
    return {
      success: false,
      result: '',
      data: null,
      error: 'Некорректные входные данные'
    };
  }

  const { type, text, groups, params = {}, skipHistory = false } = input;

  if (type === 'simple' && params._simpleV2 && Array.isArray(params.triggerParams)) {
    const global = params.global || {};
    for (let i = 0; i < params.triggerParams.length; i++) {
      const p = { ...global, ...(params.triggerParams[i] || {}) };
      const compat = checkParamsCompatibility(p);
      if (!compat.compatible) {
        return {
          success: false,
          result: '',
          data: null,
          error: `Несовместимые параметры (триггер ${i + 1}): ${compat.conflicts.join('; ')}. Сначала снимите конфликтующий параметр.`
        };
      }
    }
  } else {
    const compatibility = checkParamsCompatibility(params);
    if (!compatibility.compatible) {
      return {
        success: false,
        result: '',
        data: null,
        error: `Несовместимые параметры: ${compatibility.conflicts.join('; ')}. Выберите только один из конфликтующих.`
      };
    }
  }

  let conversionResult;

  try {
    if (type === 'simple') {
      conversionResult = convertSimple(text, params);
    } else {
      // Связанные триггеры теперь обрабатываются через linkedBuilderConverter.js
      return {
        success: false,
        result: '',
        data: null,
        error: `Неизвестный тип: ${type}`
      };
    }

    if (!conversionResult.success) {
      return conversionResult;
    }

    const formatted = formatResult(conversionResult.result);
    const validation = validateFinalRegex(conversionResult.result);
    if (!validation.valid) {
      return {
        success: false,
        result: '',
        data: null,
        error: validation.error
      };
    }

    const fullData = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type,
      triggers: conversionResult.triggers || [],
      params,
      result: conversionResult.result,
      formatted,
      stats: conversionResult.stats || {},
      warnings: validation.warnings || []
    };

    if (!skipHistory) {
      saveToHistory({
        id: fullData.id,
        date: fullData.date,
        triggers: fullData.triggers.slice(0, 10),
        params,
        result: fullData.result,
        type
      });
    }

    return {
      success: true,
      result: conversionResult.result,
      data: fullData,
      error: null,
      escapedToast: conversionResult.escapedToast
    };

  } catch (error) {
    return {
      success: false,
      result: '',
      data: null,
      error: error.message
    };
  }
}

function buildEscapedToastMessage(before, after) {
  return `ℹ️ Спецсимволы экранированы: ${before} → ${after}`;
}

function convertSimple(text, params) {
  const triggers = parseSimpleTriggers(text);
  const escaped = (triggers || []).map(t => escapeRegex(t));
  let escapedToast = null;
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i] !== escaped[i]) {
      escapedToast = buildEscapedToastMessage(triggers[i], escaped[i]);
      break;
    }
  }
  const textToUse = escaped.length ? escaped.join('\n') : text;
  const conversion = convertSimpleTriggers(textToUse, params || {});

  if (!conversion.success) {
    return conversion;
  }

  return {
    success: true,
    result: conversion.result,
    triggers: conversion.triggers,
    stats: { triggersCount: conversion.triggers.length, autoReplacesCount: 0 },
    error: null,
    escapedToast
  };
}


export function quickConvert(input) {
  const result = convert(input);
  return result.success ? result.result : '';
}

export function previewConversion(input) {
  const conversion = convert({ ...input, skipHistory: true });
  return {
    result: conversion.result || '',
    error: conversion.error,
    warnings: conversion.data?.warnings || []
  };
}

export default {
  convert,
  quickConvert,
  previewConversion
};
