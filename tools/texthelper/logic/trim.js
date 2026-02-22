/**
 * Trim
 * Убирает пробелы в начале и/или конце каждой строки
 */

export const TRIM_MODES = {
  both: 'Начало и конец',
  start: 'Только начало',
  end: 'Только конец'
};

/**
 * Убирает пробелы из строк
 * @param {string} input - входной текст
 * @param {'both'|'start'|'end'} mode - режим trim
 * @param {boolean} removeDoubleSpaces - убрать двойные пробелы внутри строк
 * @returns {{ result: string, report: string }}
 */
export function trimLines(input, mode = 'both', removeDoubleSpaces = false) {
  if (!input) {
    return { result: '', report: '' };
  }

  const lines = input.split('\n');
  let totalSpacesRemoved = 0;

  const resultLines = lines.map(line => {
    const originalLength = line.length;
    let result = line;

    switch (mode) {
      case 'start':
        result = line.trimStart();
        break;
      case 'end':
        result = line.trimEnd();
        break;
      case 'both':
      default:
        result = line.trim();
        break;
    }

    if (removeDoubleSpaces) {
      const beforeDoubleSpaces = result.length;
      result = result.replace(/\s{2,}/g, ' ');
      totalSpacesRemoved += beforeDoubleSpaces - result.length;
    }

    totalSpacesRemoved += originalLength - (removeDoubleSpaces ? line.trim().length : result.length);

    return result;
  });

  const actualRemoved = lines.reduce((sum, line, i) => {
    return sum + (line.length - resultLines[i].length);
  }, 0);

  let report = '';
  if (actualRemoved > 0) {
    report = `Убрано пробелов: ${actualRemoved}`;
  } else {
    report = 'Лишних пробелов не найдено';
  }

  return {
    result: resultLines.join('\n'),
    report
  };
}
