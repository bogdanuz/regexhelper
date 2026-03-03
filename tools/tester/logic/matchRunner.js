/**
 * RegexHelper — Тестер: запуск совпадений (Python emulated)
 * Препроцессинг паттерна (x), сборка флагов (a/u), создание RegExp и сбор всех совпадений с группами.
 * Использует флаг d (indices) для позиций групп при поддержке.
 * @file tools/tester/logic/matchRunner.js
 */

import { applyExtendedFlag, applyExtendedFlagWithMap } from './patternPreprocess.js';
import { buildFlagsString } from './flagsBuilder.js';

/** В JS \b с флагом u но без i остаётся только ASCII; Python/regex101 используют Unicode. Эквивалент границы слова для Unicode (u, без i). */
const UNICODE_WORD_BOUNDARY = '(?:(?<=[\\p{L}\\p{N}_])(?![\\p{L}\\p{N}_])|(?<![\\p{L}\\p{N}_])(?=[\\p{L}\\p{N}_]))';
const UNICODE_NON_WORD_BOUNDARY = '(?:(?<=[\\p{L}\\p{N}_])(?=[\\p{L}\\p{N}_])|(?<![\\p{L}\\p{N}_])(?![\\p{L}\\p{N}_]))';

/**
 * Заменяет \b и \B вне символьных классов на Unicode-аналоги (для эмуляции Python при u без i).
 * @param {string} p — паттерн
 * @returns {string}
 */
function replaceUnicodeWordBoundaries(p) {
  return replaceUnicodeWordBoundariesWithMap(p).pattern;
}

/**
 * То же, но возвращает маппинг: для каждой позиции в выходной строке — индекс во входной.
 * @param {string} p — паттерн
 * @returns {{ pattern: string, inputByOutput: number[] }}
 */
function replaceUnicodeWordBoundariesWithMap(p) {
  let result = '';
  /** inputByOutput[индекс в result] = индекс в p */
  const inputByOutput = [];
  let i = 0;
  const n = p.length;
  let inClass = false;
  while (i < n) {
    if (inClass) {
      if (p[i] === '\\' && i + 1 < n) {
        result += p[i] + p[i + 1];
        inputByOutput.push(i, i + 1);
        i += 2;
        continue;
      }
      if (p[i] === ']') inClass = false;
      result += p[i];
      inputByOutput.push(i);
      i++;
      continue;
    }
    if (p[i] === '[') {
      inClass = true;
      result += p[i];
      inputByOutput.push(i);
      i++;
      continue;
    }
    if (p[i] === '\\' && i + 1 < n && p[i + 1] === 'b') {
      const inputIdx = i; // позиция \ в исходном паттерне
      for (let k = 0; k < UNICODE_WORD_BOUNDARY.length; k++) {
        inputByOutput.push(inputIdx);
      }
      result += UNICODE_WORD_BOUNDARY;
      i += 2;
      continue;
    }
    if (p[i] === '\\' && i + 1 < n && p[i + 1] === 'B') {
      const inputIdx = i;
      for (let k = 0; k < UNICODE_NON_WORD_BOUNDARY.length; k++) {
        inputByOutput.push(inputIdx);
      }
      result += UNICODE_NON_WORD_BOUNDARY;
      i += 2;
      continue;
    }
    result += p[i];
    inputByOutput.push(i);
    i++;
  }
  return { pattern: result, inputByOutput };
}

/**
 * Проверка баланса скобок ( ), с учётом [ ] и экранирования.
 * Собирает все ошибочные позиции: каждая лишняя ) и каждая незакрытая (.
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

/**
 * Собирает индексы лишних `}` — не входящих в валидный квантификатор {n}, {n,}, {n,m}.
 * Учитывает символьные классы [...] и экранирование.
 * @param {string} p
 * @returns {number[]}
 */
function getMisplacedBraceIndices(p) {
  const len = p.length;
  const errorIndices = [];
  const braceStack = []; // индексы неэкранированных {
  let i = 0;
  let inCharClass = false;
  while (i < len) {
    if (p[i] === '\\') {
      i += 2;
      continue;
    }
    if (inCharClass) {
      if (p[i] === ']') inCharClass = false;
      i++;
      continue;
    }
    if (p[i] === '[') {
      inCharClass = true;
      i++;
      continue;
    }
    if (p[i] === '{') {
      braceStack.push(i);
      i++;
      continue;
    }
    if (p[i] === '}') {
      if (braceStack.length === 0) {
        errorIndices.push(i);
        i++;
        continue;
      }
      const start = braceStack.pop();
      const content = p.slice(start + 1, i);
      // Валидный квантификатор: цифры, опционально запятая и цифры (без пробелов в обработанном паттерне)
      if (!/^\d+(,\d*)?$/.test(content)) {
        errorIndices.push(i);
      }
      i++;
      continue;
    }
    i++;
  }
  return errorIndices;
}

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
  if (/unexpected\s*\}|\}\s*$|invalid\s*quantifier|nothing\s*to\s*repeat/i.test(message)) {
    const brace = getMisplacedBraceIndices(p);
    if (brace.length) return brace;
  }
  return [];
}

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

  // В JS \b с флагом u без i остаётся только ASCII; в Python/regex101 \b — Unicode. Заменяем \b/\B на Unicode-аналоги.
  const state = flagsState && typeof flagsState === 'object' ? flagsState : {};
  const hasWordBoundary = /\\b/.test(processedPattern) || /\\B/.test(processedPattern);
  if (!state.a && !state.i && hasWordBoundary) {
    processedPattern = replaceUnicodeWordBoundaries(processedPattern);
  }

  /** Одно сообщение для всех ошибок regex; в UI показывается только оно, детали — в подсветке. */
  const REGEX_ERROR_MESSAGE = 'Invalid regex';

  // Собираем все ошибочные позиции: скобки, лишняя }, лишняя | (начало, конец, ||)
  const allErrorIndices = [];

  const bracketIndices = getBracketErrorIndices(processedPattern);
  if (bracketIndices && bracketIndices.length > 0) {
    allErrorIndices.push(...bracketIndices);
  }

  const misplacedBraces = getMisplacedBraceIndices(processedPattern);
  if (misplacedBraces.length > 0) {
    allErrorIndices.push(...misplacedBraces);
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
    const unique = [...new Set(allErrorIndices)].sort((a, b) => a - b);
    return { error: REGEX_ERROR_MESSAGE, errorIndices: unique };
  }

  let flagsStr = buildFlagsString(flagsState);
  try {
    new RegExp('', flagsStr + 'd');
    flagsStr += 'd';
  } catch (_) {}

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

/**
 * Фильтрует совпадения TRUE, исключая те, которые пересекаются по диапазону с любым совпадением FALSE.
 *
 * @param {MatchEntry[]} trueMatches
 * @param {MatchEntry[]} falseMatches
 * @returns {MatchEntry[]}
 */
export function filterMatchesByFalse(trueMatches, falseMatches) {
  const tList = Array.isArray(trueMatches) ? trueMatches : [];
  const fList = Array.isArray(falseMatches) ? falseMatches : [];
  if (!tList.length || !fList.length) return tList;

  return tList.filter((t) => {
    if (!t || t.index == null || !t.fullMatch) return true;
    const tStart = t.index;
    const tEnd = t.index + t.fullMatch.length;
    return !fList.some((f) => {
      if (!f || f.index == null || !f.fullMatch) return false;
      const fStart = f.index;
      const fEnd = f.index + f.fullMatch.length;
      return fStart < tEnd && fEnd > tStart;
    });
  });
}

const REGEX_ERROR_MESSAGE_UI = 'Invalid regex';

/**
 * Валидирует паттерн с тем же препроцессингом и флагами, что и runMatch.
 * Возвращает индексы ошибок в исходном (raw) паттерне для подсветки в UI.
 *
 * @param {string} raw — исходный паттерн (как в поле ввода)
 * @param {{ g?: boolean, m?: boolean, i?: boolean, s?: boolean, u?: boolean, x?: boolean, a?: boolean }} flagsState
 * @returns {{ valid: true } | { valid: false, error: string, errorIndices: number[] }}
 */
export function validatePatternForUI(raw, flagsState) {
  if (typeof raw !== 'string') {
    return { valid: true };
  }

  let p1;
  let rawByProcessed; // p1 index -> raw index (length = p1.length)
  if (flagsState.x) {
    const out = applyExtendedFlagWithMap(raw);
    p1 = out.pattern;
    rawByProcessed = out.rawByProcessed;
  } else {
    p1 = raw;
    rawByProcessed = Array.from({ length: raw.length }, (_, i) => i);
  }

  const state = flagsState && typeof flagsState === 'object' ? flagsState : {};
  const hasWordBoundary = /\\b/.test(p1) || /\\B/.test(p1);
  let p2;
  let processedToRaw; // p2 index -> raw index (length = p2.length)
  if (!state.a && !state.i && hasWordBoundary) {
    const out = replaceUnicodeWordBoundariesWithMap(p1);
    p2 = out.pattern;
    processedToRaw = out.inputByOutput.map((idx1) => rawByProcessed[idx1]);
  } else {
    p2 = p1;
    processedToRaw = rawByProcessed.slice();
  }

  const allErrorIndices = [];
  const bracketIndices = getBracketErrorIndices(p2);
  if (bracketIndices && bracketIndices.length > 0) {
    allErrorIndices.push(...bracketIndices);
  }
  const misplacedBraces = getMisplacedBraceIndices(p2);
  if (misplacedBraces.length > 0) {
    allErrorIndices.push(...misplacedBraces);
  }
  const leadingPipe = p2.match(/^\s*\|/);
  if (leadingPipe) {
    const idx = p2.indexOf('|');
    if (idx >= 0 && !allErrorIndices.includes(idx)) allErrorIndices.push(idx);
  }
  const trailingPipe = p2.match(/\|\s*$/);
  if (trailingPipe) {
    const idx = p2.lastIndexOf('|');
    const i = idx >= 0 ? idx : Math.max(0, p2.length - 1);
    if (!allErrorIndices.includes(i)) allErrorIndices.push(i);
  }
  if (/\|\|/.test(p2)) {
    let m;
    const rePipe = /\|\|/g;
    while ((m = rePipe.exec(p2)) !== null) {
      if (!allErrorIndices.includes(m.index)) allErrorIndices.push(m.index);
      if (!allErrorIndices.includes(m.index + 1)) allErrorIndices.push(m.index + 1);
    }
  }

  if (allErrorIndices.length > 0) {
    const rawIndices = allErrorIndices
      .map((j) => (j < processedToRaw.length ? processedToRaw[j] : undefined))
      .filter((r) => r !== undefined);
    const unique = [...new Set(rawIndices)].sort((a, b) => a - b);
    return { valid: false, error: REGEX_ERROR_MESSAGE_UI, errorIndices: unique };
  }

  let flagsStr = buildFlagsString(flagsState);
  try {
    new RegExp('', flagsStr + 'd');
    flagsStr += 'd';
  } catch (_) {}

  try {
    new RegExp(p2, flagsStr);
    return { valid: true };
  } catch (e) {
    const indices = getErrorIndicesFromMessage(e.message, p2);
    const rawIndices = indices
      .map((j) => (j < processedToRaw.length ? processedToRaw[j] : undefined))
      .filter((r) => r !== undefined);
    const unique = [...new Set(rawIndices)].sort((a, b) => a - b);
    return { valid: false, error: e.message, errorIndices: unique.length ? unique : [0] };
  }
}
