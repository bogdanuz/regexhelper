/**
 * RegexHelper — Тестер: запуск совпадений (Python emulated)
 * Препроцессинг паттерна (x), сборка флагов (a/u), создание RegExp и сбор всех совпадений с группами.
 * Использует флаг d (indices) для позиций групп при поддержке.
 * @file tools/tester/logic/matchRunner.js
 */

import { applyExtendedFlag } from './patternPreprocess.js';
import { buildFlagsString } from './flagsBuilder.js';

/**
 * Результат одного совпадения: полное совпадение, индекс, группы, индексы для подсветки.
 * @typedef {{ match: string, index: number, groups: string[], fullMatch: string, indices?: number[][] }} MatchEntry
 */

/**
 * Собирает совпадения через exec в цикле. Поддерживает флаг d для indices.
 *
 * @param {RegExp} re
 * @param {string} str
 * @returns {MatchEntry[]}
 */
function collectMatches(re, str) {
  const matches = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(str)) !== null) {
    const groups = m.slice(1).map((g) => (g == null ? '' : String(g)));
    const entry = {
      fullMatch: m[0],
      match: m[0],
      index: m.index,
      groups,
    };
    if (m.indices) {
      entry.indices = m.indices.map((idx) => (Array.isArray(idx) && idx.length >= 2 ? [idx[0], idx[1]] : null));
    }
    matches.push(entry);
    if (m[0].length === 0) {
      re.lastIndex = str.length;
      break;
    }
  }
  return matches;
}

/**
 * Запускает regex на строке и возвращает массив совпадений с группами или ошибку.
 *
 * @param {string} pattern — исходный паттерн (до препроцессинга x)
 * @param {{ g?: boolean, m?: boolean, i?: boolean, s?: boolean, u?: boolean, x?: boolean, a?: boolean }} flagsState — объект флагов
 * @param {string} str — тестовая строка
 * @returns {{ matches: MatchEntry[] } | { error: string }}
 */
export function runMatch(pattern, flagsState, str) {
  if (typeof pattern !== 'string' || typeof str !== 'string') {
    return { matches: [] };
  }

  let processedPattern = pattern;
  if (flagsState.x) {
    processedPattern = applyExtendedFlag(pattern);
  }

  // Эмуляция Python/regex101: при глобальном поиске жадные [\s\S]* и [\s\S]+ дают одно большое совпадение.
  // Заменяем на ленивые варианты, чтобы получать несколько неперекрывающихся совпадений, как в regex101 (Python).
  if (flagsState.g) {
    processedPattern = processedPattern.replace(/\[\\s\\S\]\*(?!\?)/g, '[\\s\\S]*?');
    processedPattern = processedPattern.replace(/\[\\s\\S\]\+(?!\?)/g, '[\\s\\S]+?');
  }

  /** Одно сообщение для всех ошибок regex; в UI показывается только оно, детали — в подсветке. */
  const REGEX_ERROR_MESSAGE = 'Invalid regex';

  /**
   * Проверка баланса скобок ( ), с учётом [ ] и экранирования.
   * Собирает все ошибочные позиции за один проход: каждая лишняя ) и каждая незакрытая (.
   * @param {string} p
   * @returns {number[] | null}
   */
  function getBracketErrorIndices(p) {
    const len = p.length;
    let i = 0;
    let depth = 0;
    const openIndices = [];
    const errorIndices = [];
    let inCharClass = false;

    while (i < len) {
      if (p[i] === '\\') {
        i += 2;
        continue;
      }
      if (inCharClass) {
        if (p[i] === '\\') {
          i += 2;
          continue;
        }
        if (p[i] === ']') inCharClass = false;
        i++;
        continue;
      }
      if (p[i] === '[') {
        inCharClass = true;
        i++;
        continue;
      }
      if (p[i] === '(') {
        depth++;
        openIndices.push(i);
        i++;
        continue;
      }
      if (p[i] === ')') {
        depth--;
        if (depth < 0) {
          errorIndices.push(i);
          i++;
          continue;
        }
        openIndices.pop();
        i++;
        continue;
      }
      i++;
    }
    if (depth > 0) {
      errorIndices.push(...openIndices.slice(-depth));
    }
    return errorIndices.length ? errorIndices : null;
  }

  // Собираем все ошибочные позиции за один проход: скобки + лишняя | (начало, конец, ||)
  const allErrorIndices = [];

  const bracketIndices = getBracketErrorIndices(processedPattern);
  if (bracketIndices && bracketIndices.length > 0) {
    allErrorIndices.push(...bracketIndices);
  }

  const leadingPipe = processedPattern.match(/^\s*\|/);
  if (leadingPipe) {
    const idx = processedPattern.indexOf('|');
    if (idx >= 0 && !allErrorIndices.includes(idx)) allErrorIndices.push(idx);
  }
  const trailingPipe = processedPattern.match(/\|\s*$/);
  if (trailingPipe) {
    const idx = processedPattern.lastIndexOf('|');
    const i = idx >= 0 ? idx : Math.max(0, processedPattern.length - 1);
    if (!allErrorIndices.includes(i)) allErrorIndices.push(i);
  }
  if (/\|\|/.test(processedPattern)) {
    let m;
    const re = /\|\|/g;
    while ((m = re.exec(processedPattern)) !== null) {
      if (!allErrorIndices.includes(m.index)) allErrorIndices.push(m.index);
      if (!allErrorIndices.includes(m.index + 1)) allErrorIndices.push(m.index + 1);
    }
  }

  if (allErrorIndices.length > 0) {
    allErrorIndices.sort((a, b) => a - b);
    return { error: REGEX_ERROR_MESSAGE, errorIndices: allErrorIndices };
  }

  let flagsStr = buildFlagsString(flagsState);
  try {
    new RegExp('', flagsStr + 'd');
    flagsStr += 'd';
  } catch (_) {}

  /**
   * Позиция ошибки из сообщения движка (нестандартно).
   * @param {string} message
   * @param {string} p
   * @returns {number[]}
   */
  function getErrorIndicesFromMessage(message, p) {
    if (typeof message !== 'string') return [];
    const m = message.match(/(?:index|position|at)\s*(\d+)/i);
    if (m) return [Math.max(0, parseInt(m[1], 10))];
    if (/nothing to repeat/i.test(message) && /^\s*\|/.test(p)) return [0];
    if (/unmatched|unclosed|\)\s*$|\(\s*\)/i.test(message)) {
      const bracket = getBracketErrorIndices(p);
      if (bracket && bracket.length) return bracket;
    }
    return [];
  }

  let re;
  try {
    re = new RegExp(processedPattern, flagsStr);
  } catch (e) {
    const errorIndices = getErrorIndicesFromMessage(e.message, processedPattern);
    return { error: e.message, errorIndices: errorIndices.length ? errorIndices : undefined };
  }

  const global = Boolean(flagsState.g);
  if (!global) {
    const m = re.exec(str);
    if (!m) return { matches: [] };
    const groups = m.slice(1).map((g) => (g == null ? '' : String(g)));
    const entry = {
      fullMatch: m[0],
      match: m[0],
      index: m.index,
      groups,
    };
    if (m.indices) entry.indices = m.indices.map((idx) => (Array.isArray(idx) && idx.length >= 2 ? [idx[0], idx[1]] : null));
    return { matches: [entry] };
  }

  const matches = collectMatches(re, str);
  return { matches };
}
