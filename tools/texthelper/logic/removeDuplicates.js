/**
 * Удалить дубликаты
 * Оставляет только уникальные строки с отчётом о дубликатах
 */

/**
 * Удаляет дубликаты строк
 * @param {string} input - входной текст
 * @param {boolean} caseSensitive - учитывать регистр
 * @param {boolean} showOnlyDuplicates - показать только дубликаты (вместо уникальных)
 * @returns {{ result: string, report: string }}
 */
export function removeDuplicates(input, caseSensitive = false, showOnlyDuplicates = false) {
  if (!input || !input.trim()) {
    return { result: '', report: '' };
  }

  const lines = input.split('\n');
  const counts = new Map();
  const firstOccurrence = new Map();

  lines.forEach((line, index) => {
    const key = caseSensitive ? line : line.toLowerCase();
    if (counts.has(key)) {
      counts.set(key, counts.get(key) + 1);
    } else {
      counts.set(key, 1);
      firstOccurrence.set(key, { line, index });
    }
  });

  const duplicates = [];
  counts.forEach((count, key) => {
    if (count > 1) {
      const original = firstOccurrence.get(key).line;
      duplicates.push({ text: original, count: count - 1 });
    }
  });

  let resultLines;
  if (showOnlyDuplicates) {
    resultLines = [];
    lines.forEach(line => {
      const key = caseSensitive ? line : line.toLowerCase();
      if (counts.get(key) > 1) {
        resultLines.push(line);
      }
    });
    const seen = new Set();
    resultLines = resultLines.filter(line => {
      const key = caseSensitive ? line : line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } else {
    const seen = new Set();
    resultLines = lines.filter(line => {
      const key = caseSensitive ? line : line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const totalDuplicates = duplicates.reduce((sum, d) => sum + d.count, 0);

  let report = '';
  if (totalDuplicates > 0) {
    report = `Удалено: ${totalDuplicates}\n`;
    duplicates.slice(0, 5).forEach(d => {
      const displayText = d.text.length > 20 ? d.text.slice(0, 20) + '…' : d.text;
      report += `• "${displayText}" × ${d.count}\n`;
    });
    if (duplicates.length > 5) {
      report += `• и ещё ${duplicates.length - 5}...`;
    }
  } else {
    report = 'Дубликатов не найдено';
  }

  return {
    result: resultLines.join('\n'),
    report: report.trim()
  };
}
