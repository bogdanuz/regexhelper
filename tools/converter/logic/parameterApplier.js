/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - PARAMETER APPLIER
 *                   Применение параметров к триггерам
 * ═══════════════════════════════════════════════════════════════════
 *
 * @file logic/parameterApplier.js
 * @description Применение параметров (Латиница/Кириллица, Общий корень, Склонения, Опциональные, Префикс) к триггерам
 * @date 15.02.2026
 */

import { applyAutoReplacements } from '../converters/autoReplace.js';
import { applyLatinCyrillic } from '../converters/latinCyrillic.js';
import { applyTransliteration } from '../converters/transliteration.js';
import { getDeclensionStemAndEndings, applyDeclensionsExact, normalizeDeclensionParams } from '../converters/declensions.js';
import { applyOptionalChars } from '../converters/optionalChars.js';
import { applyWildcard } from '../converters/wildcard.js';
import { checkParamsCompatibility } from './compatibilityChecker.js';
import { buildDistance } from './distanceBuilder.js';
import { WORD_BOUNDARY_MAX_LENGTH, DEFAULT_DISTANCE_MIN, DEFAULT_DISTANCE_MAX } from '../../../core/config.js';

// ═══════════════════════════════════════════════════════════════════
// МИГРАЦИЯ СТАРЫХ ДАННЫХ
// ═══════════════════════════════════════════════════════════════════

/**
 * Мигрирует старый формат параметров в новый.
 * - declensions: true → { mode: 'auto' }
 * - prefix: { mode: 'wildcard', ... } → wildcard: { mode: 'auto' или 'range', ... }
 * - prefix: { mode: 'exact', prefix, endings } → declensions: { mode: 'exact', stem, endings }
 *
 * @param {Object} params - Параметры триггера
 * @returns {Object} Мигрированные параметры
 */
export function migrateParams(params) {
  if (!params || typeof params !== 'object') return params;

  const migrated = { ...params };

  // Миграция prefix → wildcard или declensions.exact
  if (migrated.prefix && typeof migrated.prefix === 'object') {
    const prefix = migrated.prefix;

    if (prefix.mode === 'wildcard') {
      migrated.wildcard = {
        mode: (prefix.prefixWildcardMin != null || prefix.prefixWildcardMax != null) ? 'range' : 'auto',
        min: prefix.prefixWildcardMin ?? 1,
        max: prefix.prefixWildcardMax ?? 10
      };
    } else if (prefix.mode === 'exact' && prefix.prefix && prefix.endings?.length > 0) {
      migrated.declensions = {
        mode: 'exact',
        stem: prefix.prefix,
        endings: prefix.endings
      };
    }

    delete migrated.prefix;
  }

  return migrated;
}

/**
 * Эффективное значение «Границы слова»: проверяет, нужно ли применять \b.
 * Теперь глобальной автоматической логики нет — только индивидуально для каждого триггера.
 * @param {string} triggerText - Текст триггера
 * @param {Object} params - Параметры триггера
 * @returns {boolean}
 */
function effectiveWordBoundaries(triggerText, params) {
  return !!params.wordBoundaries;
}

/**
 * Определяет, нужно ли применять \b только в начале слова.
 * При wildcard или declensions граница в конце бессмысленна (конец слова меняется).
 * @param {Object} params - Параметры триггера
 * @returns {boolean} true если \b нужен только в начале
 */
function wordBoundaryStartOnly(params) {
  const hasWildcard = params.wildcard && params.wildcard.mode;
  const hasDeclensions = params.declensions && (params.declensions === true || params.declensions.mode);
  return hasWildcard || hasDeclensions;
}

/**
 * Применяет границы слова к результату с учётом wildcard/declensions.
 * @param {string} part - Обработанный триггер
 * @param {Object} params - Параметры триггера
 * @returns {string}
 */
export function applyWordBoundaries(part, params) {
  if (!effectiveWordBoundaries(part, params)) return part;
  
  if (wordBoundaryStartOnly(params)) {
    return `\\b${part}`;
  }
  return `\\b${part}\\b`;
}

/** По умолчанию соединитель между триггерами — альтернация (без паттерна). */
function getTriggerDistancePattern(triggerParams, index) {
  const d = triggerParams[index]?.distance;
  if (!d || d.mode === 'alternation' || d.mode === 'empty') return null;
  const mode = d.mode || 'alternation';
  const min = d.min != null ? d.min : DEFAULT_DISTANCE_MIN;
  const max = d.max != null ? d.max : DEFAULT_DISTANCE_MAX;
  try {
    return buildDistance(mode, min, max);
  } catch (_) {
    return null;
  }
}

/**
 * Собирает цепочку частей с соединителями: части, между которыми distance === null, объединяются через |;
 * между сегментами вставляется паттерн distance.
 * @param {string[]} parts - Regex части по порядку
 * @param {Object[]} triggerParams - triggerParams[i] для части i
 * @param {number[]} [originalIndices] - если задан, triggerParams[originalIndices[i]] для соединителя после части i
 */
function buildChainWithDistances(parts, triggerParams, originalIndices) {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  const idx = (i) => (Array.isArray(originalIndices) && originalIndices[i] != null ? originalIndices[i] : i);
  const segments = [];
  let current = [parts[0]];
  for (let i = 0; i < parts.length - 1; i++) {
    const dist = getTriggerDistancePattern(triggerParams, idx(i));
    if (dist) {
      segments.push(current.length === 1 ? current[0] : `(${current.join('|')})`);
      segments.push(dist);
      current = [parts[i + 1]];
    } else {
      current.push(parts[i + 1]);
    }
  }
  segments.push(current.length === 1 ? current[0] : `(${current.join('|')})`);
  return segments.join('');
}

function safeNormalize(s) {
  return typeof s === 'string' && typeof s.normalize === 'function' ? s.normalize('NFC') : String(s);
}

/**
 * Индексы второго символа в парах подряд одинаковых (строго пары; 3+ подряд не считаем).
 * Используется для авто-опциональности удвоенных букв.
 */
function getDoubledSecondIndices(str) {
  if (typeof str !== 'string' || str.length < 2) return [];
  const s = safeNormalize(str);
  const indices = [];
  for (let i = 0; i < s.length - 1; i++) {
    const sameAsNext = s[i] === s[i + 1];
    const notTripleBefore = i === 0 || s[i - 1] !== s[i];
    const notTripleAfter = i + 2 >= s.length || s[i + 2] !== s[i];
    if (sameAsNext && notTripleBefore && notTripleAfter) indices.push(i + 1);
  }
  return indices;
}

/** Объединяет ручные опциональные индексы с авто-удвоениями (второй из пары подряд одинаковых). */
function mergeOptionalIndices(manualIndices, autoDoubledIndices) {
  const set = new Set(manualIndices || []);
  (autoDoubledIndices || []).forEach((i) => set.add(i));
  return [...set].sort((a, b) => a - b);
}
// ═══════════════════════════════════════════════════════════════════
// ПОРЯДОК ПРИМЕНЕНИЯ ПАРАМЕТРОВ
// ═══════════════════════════════════════════════════════════════════

/**
 * Применяет параметры к триггеру в правильном порядке
 *
 * Порядок:
 * 1. Подготовка: lowercase, trim
 * 2. Если wildcard включен — применяем wildcard (корень + \w{min,max})
 * 3. Если склонения включены:
 *    a. Режим 'exact': применяем applyDeclensionsExact (корень + указанные окончания)
 *    b. Режим 'auto': склонения применяются к ЧИСТОМУ слову
 *    c. Автозамены и Латиница/Кириллица к каждой форме
 * 4. Если склонения выключены:
 *    a. Автозамены (ВСЕГДА)
 *    b. Латиница/Кириллица
 * 5. Опциональные символы (только без склонений и без wildcard)
 * 6. Требовать пробел после триггера
 */
export function applyParameters(text, params = {}) {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new TypeError('applyParameters: текст должен быть непустой строкой');
  }

  // Миграция старого формата
  params = migrateParams(params);

  const originalTrigger = text.toLowerCase().trim();
  let result = originalTrigger;

  // Wildcard: корень + \w+ или \w{min,max}
  if (params.wildcard && typeof params.wildcard === 'object' && params.wildcard.mode) {
    // Сначала применяем автозамены/транслитерацию/Лат-Кир к корню
    let processedRoot;
    if (params.transliteration) {
      processedRoot = applyTransliteration(result);
    } else {
      processedRoot = applyAutoReplacements(result);
      if (params.latinCyrillic) {
        processedRoot = applyLatinCyrillic(processedRoot);
      }
    }
    result = applyWildcard(processedRoot, params.wildcard);

    // Требовать пробел после триггера (\s)
    if (params.requireSpaceAfter) {
      result += '\\s';
    }
    return result;
  }

  // Нормализуем параметры склонений для обратной совместимости
  const declensionParams = normalizeDeclensionParams(params.declensions);

  if (declensionParams) {
    // Режим exact: корень + указанные окончания
    if (declensionParams.mode === 'exact' && declensionParams.stem && declensionParams.endings?.length > 0) {
      let processedStem;
      if (params.transliteration) {
        processedStem = applyTransliteration(declensionParams.stem);
      } else {
        processedStem = applyAutoReplacements(declensionParams.stem);
        if (params.latinCyrillic) {
          processedStem = applyLatinCyrillic(processedStem);
        }
      }
      const processedEndings = declensionParams.endings.map(e => {
        if (params.transliteration) {
          return applyTransliteration(e);
        }
        let p = applyAutoReplacements(e);
        if (params.latinCyrillic) p = applyLatinCyrillic(p);
        return p;
      });
      result = `${processedStem}(${processedEndings.join('|')})`;
    } else {
      // Режим auto: автоматическое склонение
      const parsed = getDeclensionStemAndEndings(result);

      if ('single' in parsed) {
        if (params.transliteration) {
          result = applyTransliteration(parsed.single);
        } else {
          result = applyAutoReplacements(parsed.single);
          if (params.latinCyrillic) result = applyLatinCyrillic(result);
          const effectiveOptional = mergeOptionalIndices(params.optionalChars, getDoubledSecondIndices(parsed.single));
          if (effectiveOptional.length > 0) result = applyOptionalChars(result, effectiveOptional);
        }
      } else if ('forms' in parsed && parsed.forms.length > 0) {
        const manual = Array.isArray(params.optionalChars) ? params.optionalChars : [];
        const processedForms = parsed.forms.map(form => {
          if (params.transliteration) {
            return applyTransliteration(form);
          }
          let processed = applyAutoReplacements(form);
          if (params.latinCyrillic) processed = applyLatinCyrillic(processed);
          const autoIndices = getDoubledSecondIndices(form);
          const manualForForm = manual.filter((i) => i < form.length);
          const effectiveOptional = mergeOptionalIndices(manualForForm, autoIndices);
          if (effectiveOptional.length > 0) processed = applyOptionalChars(processed, effectiveOptional);
          return processed;
        });
        const uniqueForms = [...new Set(processedForms)];
        result = uniqueForms.length === 1 ? uniqueForms[0] : `(${uniqueForms.join('|')})`;
      } else if ('stem' in parsed && 'endings' in parsed) {
        let processedStem;
        if (params.transliteration) {
          processedStem = applyTransliteration(parsed.stem);
        } else {
          processedStem = applyAutoReplacements(parsed.stem);
          if (params.latinCyrillic) processedStem = applyLatinCyrillic(processedStem);
          const manualStem = (Array.isArray(params.optionalChars) ? params.optionalChars : []).filter((i) => i < parsed.stem.length);
          const effectiveStem = mergeOptionalIndices(manualStem, getDoubledSecondIndices(parsed.stem));
          if (effectiveStem.length > 0) processedStem = applyOptionalChars(processedStem, effectiveStem);
        }
        const processedEndings = parsed.endings.map((e, j) => {
          if (params.transliteration) {
            return applyTransliteration(e);
          }
          let p = applyAutoReplacements(e);
          if (params.latinCyrillic) p = applyLatinCyrillic(p);
          const stemLen = parsed.stem.length;
          const endLen = parsed.endings[j].length;
          const manualEnd = (Array.isArray(params.optionalChars) ? params.optionalChars : [])
            .filter((i) => i >= stemLen && i < stemLen + endLen)
            .map((i) => i - stemLen);
          const effectiveEnd = mergeOptionalIndices(manualEnd, getDoubledSecondIndices(parsed.endings[j]));
          if (effectiveEnd.length > 0) p = applyOptionalChars(p, effectiveEnd);
          return p;
        });
        result = `${processedStem}(${processedEndings.join('|')})`;
      } else {
        if (params.transliteration) {
          result = applyTransliteration(result);
        } else {
          result = applyAutoReplacements(result);
          if (params.latinCyrillic) result = applyLatinCyrillic(result);
          const effectiveOptional = mergeOptionalIndices(params.optionalChars, getDoubledSecondIndices(originalTrigger));
          if (effectiveOptional.length > 0) result = applyOptionalChars(result, effectiveOptional);
        }
      }
    }
  } else {
    // Обычный пайплайн без склонений
    if (params.transliteration) {
      // Транслитерация заменяет автозамены и Лат/Кир
      result = applyTransliteration(result);
    } else {
      // 1. Автозамены (ВСЕГДА)
      result = applyAutoReplacements(result);

      // 2. Латиница/Кириллица
      if (params.latinCyrillic) {
        result = applyLatinCyrillic(result);
      }

      // 3. Опциональные символы (только без склонений и без wildcard)
      const effectiveOptional = mergeOptionalIndices(params.optionalChars, getDoubledSecondIndices(originalTrigger));
      if (effectiveOptional.length > 0) {
        result = applyOptionalChars(result, effectiveOptional);
      }
    }
  }

  // 5. Требовать пробел после триггера (\s)
  if (params.requireSpaceAfter) {
    result += '\\s';
  }

  return result;
}

/**
 * Применяет параметры к простым триггерам с поддержкой per-trigger (новая модалка v2).
 *
 * @param {Array<string>} triggers - Массив триггеров
 * @param {Object} data - { global, triggerParams }
 * @returns {Array<string>} Обработанные триггеры
 */
export function applyParametersToSimpleWithPerTrigger(triggers, data = {}) {
  if (!Array.isArray(triggers)) {
    throw new TypeError('applyParametersToSimpleWithPerTrigger: триггеры должны быть массивом');
  }

  const { global = {}, triggerParams = [] } = data;
  const baseGlobal = { ...global };

  const getParamsForIndex = (i) => ({ ...baseGlobal, ...(triggerParams[i] || {}) });

  const processed = [];

  for (let i = 0; i < triggers.length; i++) {
    const p = getParamsForIndex(i);
    const compatibility = checkParamsCompatibility(p);
    if (!compatibility.compatible) {
      throw new Error(`Несовместимые параметры у триггера "${triggers[i]}": ${compatibility.conflicts.join('; ')}`);
    }
    let part = applyParameters(triggers[i], p);
    part = applyWordBoundaries(part, p);
    processed.push(part);
  }

  return processed;
}

/**
 * Применяет параметры к массиву триггеров
 * 
 * @param {Array<string>} triggers - Массив триггеров
 * @param {Object} params - Параметры
 * @returns {Array<string>} Обработанные триггеры
 */
export function applyParametersToArray(triggers, params = {}) {
  if (!Array.isArray(triggers)) {
    throw new TypeError('applyParametersToArray: триггеры должны быть массивом');
  }
  const compatibility = checkParamsCompatibility(params);
  if (!compatibility.compatible) {
    throw new Error(`Несовместимые параметры: ${compatibility.conflicts.join('; ')}. Выберите только один из конфликтующих.`);
  }

  let result = triggers.map(t => applyParameters(t, params));

  // Границы слова \b — только если индивидуально включено
  result = result.map((part) => applyWordBoundaries(part, params));

  return result;
}

/**
 * Применяет параметры к подгруппе. Только индивидуальные параметры триггеров (triggerParams[i]).
 *
 * @param {Object} subgroup - Подгруппа (triggers, triggerParams)
 * @param {Object} [_groupCommonRoot] - Не используется (оставлен для совместимости сигнатуры)
 * @returns {string} Regex для подгруппы
 */
export function applyParametersToSubgroup(subgroup, _groupCommonRoot = {}) {
  if (!subgroup || !Array.isArray(subgroup.triggers)) {
    throw new TypeError('applyParametersToSubgroup: некорректная подгруппа');
  }

  const { triggers, triggerParams = [] } = subgroup;

  const nonEmpty = triggers
    .map((t, i) => ({ text: (t || '').trim(), i }))
    .filter(({ text }) => text !== '');
  if (nonEmpty.length === 0) {
    return '';
  }

  const processedTriggers = nonEmpty.map(({ text, i }) => {
    const params = triggerParams[i] || {};
    const compatibility = checkParamsCompatibility(params);
    if (!compatibility.compatible) {
      throw new Error(`Несовместимые параметры у триггера "${text}": ${compatibility.conflicts.join('; ')}. Выберите только один из конфликтующих.`);
    }
    let part = applyParameters(text, params);
    part = applyWordBoundaries(part, params);
    return part;
  });

  if (processedTriggers.length === 1) {
    return processedTriggers[0];
  }
  const originalIndices = nonEmpty.map((n) => n.i);
  return buildChainWithDistances(processedTriggers, triggerParams, originalIndices);
}

/**
 * Применяет параметры к группе.
 *
 * @param {Object} group - Группа (subgroups, directTriggers)
 * @returns {Object} Группа с обработанными подгруппами
 */
export function applyParametersToGroup(group) {
  if (!group || !Array.isArray(group.subgroups)) {
    throw new TypeError('applyParametersToGroup: некорректная группа');
  }

  const processedSubgroups = group.subgroups.map(subgroup => ({
    ...subgroup,
    regex: applyParametersToSubgroup(subgroup, {})
  }));

  let processedDirectTriggers = null;
  if (group.directTriggers && Array.isArray(group.directTriggers.triggers)) {
    const nonEmpty = group.directTriggers.triggers.some(t => (t || '').trim() !== '');
    if (nonEmpty) {
      const slotCounts = group.directTriggers.slotCounts;
      if (Array.isArray(slotCounts) && slotCounts.length > 0) {
        const triggers = group.directTriggers.triggers || [];
        const triggerParams = group.directTriggers.triggerParams || [];
        let offset = 0;
        const slotRegexes = slotCounts.map((n) => {
          const slotT = triggers.slice(offset, offset + n);
          const slotP = triggerParams.slice(offset, offset + n);
          offset += n;
          const slotSub = { triggers: slotT, triggerParams: slotP };
          return applyParametersToSubgroup(slotSub, {});
        });
        let distOffset = 0;
        const slotDistanceToNext = slotCounts.map((n) => {
          const lastIdx = n > 0 ? distOffset + n - 1 : -1;
          distOffset += n;
          return lastIdx >= 0 ? getTriggerDistancePattern(triggerParams, lastIdx) : null;
        });
        processedDirectTriggers = {
          ...group.directTriggers,
          slotRegexes,
          slotDistanceToNext
        };
      } else {
        processedDirectTriggers = {
          ...group.directTriggers,
          regex: applyParametersToSubgroup(group.directTriggers, {})
        };
      }
    }
  }

  return {
    ...group,
    subgroups: processedSubgroups,
    directTriggers: processedDirectTriggers
  };
}

// ═══════════════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════════════

export default {
  applyParameters,
  applyParametersToArray,
  applyParametersToSimpleWithPerTrigger,
  applyParametersToSubgroup,
  applyParametersToGroup,
  migrateParams
};
