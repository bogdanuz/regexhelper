/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - SIMPLE CONVERTER
 *                   Конвертация простых триггеров
 * ═══════════════════════════════════════════════════════════════════
 * 
 * @file tools/converter/logic/simpleConverter.js
 * @description Конвертация простых триггеров из textarea
 * @date 15.02.2026
 */

import { validateTriggers } from '../../../shared/utils/validation.js';
import { applyAutoReplacements } from '../converters/autoReplace.js';
import { applyParametersToArray, applyParametersToSimpleWithPerTrigger } from './parameterApplier.js';

export function parseSimpleTriggers(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return [];
  }
  let triggers = text.split(',').map(t => t.trim());
  if (triggers.length === 1) {
    triggers = text.split('\n').map(t => t.trim());
  }
  triggers = triggers.filter(t => t !== '').map(t => t.toLowerCase());
  return triggers;
}

export function convertSimpleTriggers(text, params = {}) {
  const triggers = parseSimpleTriggers(text).filter(t => (t || '').trim() !== '');
  const validation = validateTriggers(triggers);
  if (!validation.valid) {
    return { success: false, result: '', triggers: [], error: validation.error };
  }

  let processedTriggers;
  if (params?._simpleV2 && params.triggerParams) {
    processedTriggers = applyParametersToSimpleWithPerTrigger(triggers, params);
  } else if (params && (params.latinCyrillic || params.declensions || (params.optionalChars && Array.isArray(params.optionalChars)) || (params.prefix && params.prefix.mode) || params.wordBoundaries || params.requireSpaceAfter)) {
    processedTriggers = applyParametersToArray(triggers, params);
  } else {
    // Пустые params: авто-замены + авто «Границы слова» для триггеров ≤3 символов
    processedTriggers = applyParametersToArray(triggers, {});
  }

  const result = processedTriggers.length === 1
    ? processedTriggers[0]
    : `(${processedTriggers.join('|')})`;

  return {
    success: true,
    result,
    triggers,
    processedTriggers,
    error: null
  };
}

export function getSimpleTriggersStats(text) {
  const triggers = parseSimpleTriggers(text);
  const totalChars = triggers.reduce((sum, t) => sum + t.length, 0);
  let autoReplaces = 0;
  triggers.forEach(t => {
    if (t.includes('ё')) autoReplaces += (t.match(/ё/g) || []).length;
    if (t.includes('ь')) autoReplaces += (t.match(/ь/g) || []).length;
    if (t.includes('ъ')) autoReplaces += (t.match(/ъ/g) || []).length;
  });
  return { count: triggers.length, chars: totalChars, autoReplaces };
}

export function previewSimpleConversion(text) {
  const conversion = convertSimpleTriggers(text);
  const stats = getSimpleTriggersStats(text);
  return {
    triggers: conversion.triggers || [],
    result: conversion.result || '',
    stats,
    error: conversion.error
  };
}

export default {
  parseSimpleTriggers,
  convertSimpleTriggers,
  getSimpleTriggersStats,
  previewSimpleConversion
};
