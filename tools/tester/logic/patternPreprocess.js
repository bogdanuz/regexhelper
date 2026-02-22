/**
 * RegexHelper — Тестер: препроцессинг паттерна (флаг extended / VERBOSE)
 * Удаление пробелов и комментариев (# до конца строки) вне символьных классов [...]
 * @file tools/tester/logic/patternPreprocess.js
 */

/**
 * Применяет режим extended (Python re.VERBOSE / flag x):
 * вне символьного класса [...] удаляются пробелы, табы, переводы строк
 * и комментарии от # до конца строки.
 *
 * @param {string} pattern — исходный паттерн
 * @returns {string} — обработанный паттерн
 */
export function applyExtendedFlag(pattern) {
  if (!pattern || typeof pattern !== 'string') return pattern;

  let result = '';
  let i = 0;
  const n = pattern.length;
  let inClass = false;
  let classFirstChar = false; // после [ возможен ^

  while (i < n) {
    const c = pattern[i];

    if (inClass) {
      result += c;
      if (c === '\\' && i + 1 < n) {
        result += pattern[i + 1];
        i += 2;
        continue;
      }
      if (c === ']') inClass = false;
      i++;
      continue;
    }

    if (c === '[') {
      inClass = true;
      classFirstChar = true;
      result += c;
      i++;
      continue;
    }

    if (c === '\\' && i + 1 < n) {
      result += c + pattern[i + 1];
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
    i++;
  }

  return result;
}
