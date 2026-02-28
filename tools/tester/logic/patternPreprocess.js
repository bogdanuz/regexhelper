/**
 * RegexHelper — Тестер: препроцессинг паттерна (флаг extended / VERBOSE)
 * Удаление пробелов и комментариев (# до конца строки) вне символьных классов [...]
 * @file tools/tester/logic/patternPreprocess.js
 */

/**
 * Применяет режим extended (Python re.VERBOSE / flag x) и возвращает паттерн + маппинг позиций.
 * Вне символьного класса [...] удаляются пробелы, табы, переводы строк и комментарии (# до \n).
 *
 * @param {string} pattern — исходный паттерн
 * @returns {{ pattern: string, rawByProcessed: number[] }} — обработанный паттерн и для каждой позиции в нём индекс в raw
 */
export function applyExtendedFlagWithMap(pattern) {
  if (!pattern || typeof pattern !== 'string') {
    const p = pattern || '';
    return { pattern: p, rawByProcessed: Array.from({ length: p.length }, (_, i) => i) };
  }

  let result = '';
  /** rawByProcessed[индекс в result] = индекс в pattern */
  const rawByProcessed = [];
  let i = 0;
  const n = pattern.length;
  let inClass = false;

  while (i < n) {
    const c = pattern[i];

    if (inClass) {
      result += c;
      rawByProcessed.push(i);
      if (c === '\\' && i + 1 < n) {
        result += pattern[i + 1];
        rawByProcessed.push(i + 1);
        i += 2;
        continue;
      }
      if (c === ']') inClass = false;
      i++;
      continue;
    }

    if (c === '[') {
      inClass = true;
      result += c;
      rawByProcessed.push(i);
      i++;
      continue;
    }

    if (c === '\\' && i + 1 < n) {
      result += c + pattern[i + 1];
      rawByProcessed.push(i, i + 1);
      i += 2;
      continue;
    }

    if (c === '#') {
      while (i < n && pattern[i] !== '\n') i++;
      continue;
    }

    if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v') {
      i++;
      continue;
    }

    result += c;
    rawByProcessed.push(i);
    i++;
  }

  return { pattern: result, rawByProcessed };
}

/**
 * Применяет режим extended (Python re.VERBOSE / flag x):
 * вне символьного класса [...] удаляются пробелы, табы, переводы строк
 * и комментарии от # до конца строки.
 *
 * @param {string} pattern — исходный паттерн
 * @returns {string} — обработанный паттерн
 */
export function applyExtendedFlag(pattern) {
  return applyExtendedFlagWithMap(pattern).pattern;
}
