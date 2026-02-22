/**
 * Удалить пустые строки
 * Убирает пустые строки с отчётом
 */

/**
 * Удаляет пустые строки
 * @param {string} input - входной текст
 * @param {boolean} treatWhitespaceAsEmpty - считать строки из пробелов пустыми
 * @returns {{ result: string, report: string }}
 */
export function removeEmpty(input, treatWhitespaceAsEmpty = false) {
  if (!input) {
    return { result: '', report: '' };
  }

  const lines = input.split('\n');
  const originalCount = lines.length;

  const resultLines = lines.filter(line => {
    if (treatWhitespaceAsEmpty) {
      return line.trim().length > 0;
    }
    return line.length > 0;
  });

  const removedCount = originalCount - resultLines.length;

  let report = '';
  if (removedCount > 0) {
    report = `Удалено пустых: ${removedCount}`;
  } else {
    report = 'Пустых строк не найдено';
  }

  return {
    result: resultLines.join('\n'),
    report
  };
}
