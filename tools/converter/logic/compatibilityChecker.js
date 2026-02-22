/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - COMPATIBILITY CHECKER
 *                   Проверка совместимости параметров
 * ═══════════════════════════════════════════════════════════════════
 * 
 * @file tools/converter/logic/compatibilityChecker.js
 * @description Проверка совместимости параметров (Латиница/Кириллица, Общий корень, Склонения, Опциональные, Префикс)
 * @date 15.02.2026
 */

// ═══════════════════════════════════════════════════════════════════
// МАТРИЦА СОВМЕСТИМОСТИ (из документации)
// ═══════════════════════════════════════════════════════════════════

/** Названия параметров для тостов (как в интерфейсе) */
const PARAM_UI_LABELS = {
  latinCyrillic: 'Лат/Кир ([аa])',
  transliteration: 'Транслит',
  declensions: 'Склонения (окончания|)',
  optionalChars: 'Опциональные символы (?)',
  wildcard: 'Любой символ (\\w)',
  wordBoundaries: 'Границы слова (\\b)',
  requireSpaceAfter: 'Пробел после (\\s)'
};

/**
 * Проверяет, считается ли параметр активным (для совместимости и фильтрации).
 * optionalChars: [] — не активен.
 * wildcard/declensions: объект с mode или true — активен.
 */
export function isParamActive(key, value) {
  if (value === undefined || value === null) return false;
  if (key === 'optionalChars') return Array.isArray(value) && value.length > 0;
  if (key === 'wildcard') return typeof value === 'object' && value !== null && value.mode;
  if (key === 'declensions') {
    if (value === true) return true;
    return typeof value === 'object' && value !== null && value.mode;
  }
  return value === true;
}

/**
 * Возвращает ключи реально активных параметров (с учётом optionalChars/prefix).
 */
export function getActiveParamKeys(params) {
  if (!params || typeof params !== 'object') return [];
  const known = Object.keys(COMPATIBILITY_MATRIX);
  return Object.keys(params).filter(key => known.includes(key) && isParamActive(key, params[key]));
}

/**
 * Матрица совместимости параметров.
 *
 * Несовместимы:
 * - wildcard + declensions (взаимоисключающие: либо \w+, либо окончания)
 * - wildcard + optionalChars (неоднозначность regex)
 * - declensions + optionalChars (индексы ломаются при склонениях)
 * - latinCyrillic + optionalChars (индексы ломаются при замене символов)
 * - transliteration + latinCyrillic (транслит включает функционал Лат/Кир)
 * - transliteration + optionalChars (индексы ломаются из-за диграфов)
 *
 * Совместимы:
 * - latinCyrillic + declensions
 * - latinCyrillic + wildcard
 * - latinCyrillic + wordBoundaries/requireSpaceAfter
 * - transliteration + declensions
 * - transliteration + wildcard
 * - transliteration + wordBoundaries/requireSpaceAfter
 * - wildcard + wordBoundaries/requireSpaceAfter (но \b только в начале)
 * - declensions + wordBoundaries/requireSpaceAfter (но \b только в начале)
 * - optionalChars + wordBoundaries/requireSpaceAfter
 * - wordBoundaries + requireSpaceAfter
 */
const COMPATIBILITY_MATRIX = {
  latinCyrillic: {
    transliteration: false,
    declensions: true,
    optionalChars: false,
    wildcard: true,
    wordBoundaries: true,
    requireSpaceAfter: true
  },
  transliteration: {
    latinCyrillic: false,
    declensions: true,
    optionalChars: false,
    wildcard: true,
    wordBoundaries: true,
    requireSpaceAfter: true
  },
  declensions: {
    latinCyrillic: true,
    transliteration: true,
    optionalChars: false,
    wildcard: false,
    wordBoundaries: true,
    requireSpaceAfter: true
  },
  optionalChars: {
    latinCyrillic: false,
    transliteration: false,
    declensions: false,
    wildcard: false,
    wordBoundaries: true,
    requireSpaceAfter: true
  },
  wildcard: {
    latinCyrillic: true,
    transliteration: true,
    declensions: false,
    optionalChars: false,
    wordBoundaries: true,
    requireSpaceAfter: true
  },
  wordBoundaries: {
    latinCyrillic: true,
    transliteration: true,
    declensions: true,
    optionalChars: true,
    wildcard: true,
    requireSpaceAfter: true
  },
  requireSpaceAfter: {
    latinCyrillic: true,
    transliteration: true,
    declensions: true,
    optionalChars: true,
    wildcard: true,
    wordBoundaries: true
  }
};

export function areParamsCompatible(param1, param2) {
  if (param1 === param2) return true;
  if (!COMPATIBILITY_MATRIX[param1]) {
    console.warn(`Неизвестный параметр: ${param1}`);
    return false;
  }
  return COMPATIBILITY_MATRIX[param1][param2] === true;
}

export function checkParamsCompatibility(params) {
  if (!params || typeof params !== 'object') {
    return { compatible: true, conflicts: [] };
  }
  const activeParams = getActiveParamKeys(params);
  if (activeParams.length <= 1) {
    return { compatible: true, conflicts: [] };
  }
  const conflicts = [];
  for (let i = 0; i < activeParams.length; i++) {
    for (let j = i + 1; j < activeParams.length; j++) {
      if (!areParamsCompatible(activeParams[i], activeParams[j])) {
        const labelA = PARAM_UI_LABELS[activeParams[i]] || activeParams[i];
        const labelB = PARAM_UI_LABELS[activeParams[j]] || activeParams[j];
        conflicts.push(`«${labelA}» и «${labelB}» несовместимы`);
      }
    }
  }
  return { compatible: conflicts.length === 0, conflicts };
}

export function getIncompatibleParams(param) {
  if (!COMPATIBILITY_MATRIX[param]) return [];
  return Object.keys(COMPATIBILITY_MATRIX[param]).filter(key => COMPATIBILITY_MATRIX[param][key] === false);
}

export function getCompatibleParams(param) {
  if (!COMPATIBILITY_MATRIX[param]) return [];
  return Object.keys(COMPATIBILITY_MATRIX[param]).filter(key => COMPATIBILITY_MATRIX[param][key] === true);
}

export default {
  areParamsCompatible,
  checkParamsCompatibility,
  getIncompatibleParams,
  getCompatibleParams,
  isParamActive,
  getActiveParamKeys
};

export { COMPATIBILITY_MATRIX };
