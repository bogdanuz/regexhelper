/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - DISTANCE BUILDER
 *                   Построение distance между группами/подгруппами
 * ═══════════════════════════════════════════════════════════════════
 * 
 * @file tools/converter/logic/distanceBuilder.js
 * @description Создание distance паттернов для regex
 * @date 15.02.2026
 */

import { DISTANCE_MODES, MIN_DISTANCE, MAX_DISTANCE } from '../../../core/config.js';
import { validateDistance } from '../../../shared/utils/validation.js';

export function buildDistance(mode, min = 0, max = 10) {
  switch (mode) {
    case 'alternation':
    case 'empty':
      return null;
    case 'custom':
      const validation = validateDistance(min, max);
      if (!validation.valid) throw new Error(`Некорректные значения distance: ${validation.error}`);
      return `.{${min},${max}}`;
    case 'preset-5': return '.{1,5}';
    case 'preset-10': return '.{1,10}';
    case 'any': return '[\\s\\S]+';
    case 'paragraph': return '.+';
    case 'line': return '[^\\n]+';
    default: throw new Error(`Неизвестный режим distance: ${mode}`);
  }
}

export function applyDistance(part1, part2, distance) {
  if (!part1 || !part2) throw new Error('applyDistance: обе части должны быть непустыми');
  if (!distance) return `(${part1}|${part2})`;
  return `${part1}${distance}${part2}`;
}

export function applyDistanceToArray(parts, distance) {
  if (!Array.isArray(parts) || parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (!distance) return `(${parts.join('|')})`;
  return parts.join(distance);
}

export function getDistanceInfo(mode) {
  const modeData = DISTANCE_MODES[mode];
  if (!modeData) return { label: 'Неизвестный режим', pattern: null, tooltip: '' };
  return {
    label: modeData.label,
    pattern: typeof modeData.pattern === 'function' ? modeData.pattern(1, 10) : modeData.pattern,
    tooltip: modeData.tooltip
  };
}

export function parseDistance(distanceValue) {
  if (!distanceValue) return { mode: 'alternation', min: null, max: null };
  const customMatch = distanceValue.match(/^\.\{(\d+),(\d+)\}$/);
  if (customMatch) {
    return { mode: 'custom', min: parseInt(customMatch[1], 10), max: parseInt(customMatch[2], 10) };
  }
  if (distanceValue === '[\\s\\S]+') return { mode: 'any', min: null, max: null };
  if (distanceValue === '.+') return { mode: 'paragraph', min: null, max: null };
  if (distanceValue === '[^\\n]+') return { mode: 'line', min: null, max: null };
  return { mode: 'unknown', min: null, max: null };
}

export function validateDistancePattern(distanceValue) {
  if (!distanceValue) return { valid: true, error: null };
  const parsed = parseDistance(distanceValue);
  if (parsed.mode === 'unknown') {
    return { valid: false, error: `Некорректный distance паттерн: ${distanceValue}` };
  }
  if (parsed.mode === 'custom') return validateDistance(parsed.min, parsed.max);
  return { valid: true, error: null };
}

export default {
  buildDistance,
  applyDistance,
  applyDistanceToArray,
  getDistanceInfo,
  parseDistance,
  validateDistancePattern
};

export { DISTANCE_MODES, MIN_DISTANCE, MAX_DISTANCE };
