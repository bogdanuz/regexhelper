/**
 * Строка → столбец
 * Разбивает строку на строки по разделителю
 */

export const SEPARATORS = {
  auto: { label: 'Авто', value: null },
  space: { label: 'Пробел', value: ' ' },
  comma: { label: 'Запятая', value: ',' },
  commaSpace: { label: 'Запятая + пробел', value: ', ' },
  semicolon: { label: 'Точка с запятой', value: ';' },
  tab: { label: 'Табуляция', value: '\t' },
  pipe: { label: 'Вертикальная черта', value: '|' },
  custom: { label: 'Свой', value: '' }
};

export const DEFAULT_SEPARATOR = 'auto';

/**
 * Автоматически определяет разделитель в строке
 * @param {string} input
 * @returns {string} разделитель
 */
function detectSeparator(input) {
  const candidates = [
    { sep: '\t', priority: 1 },
    { sep: ' | ', priority: 2 },
    { sep: '|', priority: 3 },
    { sep: '; ', priority: 4 },
    { sep: ';', priority: 5 },
    { sep: ', ', priority: 6 },
    { sep: ',', priority: 7 },
    { sep: ' ', priority: 8 }
  ];

  for (const { sep } of candidates) {
    if (input.includes(sep)) {
      const parts = input.split(sep);
      if (parts.length > 1 && parts.some(p => p.trim().length > 0)) {
        return sep;
      }
    }
  }

  return ' ';
}

/**
 * Конвертирует строку в столбец (многострочный текст)
 * @param {string} input - входной текст
 * @param {string} separatorKey - ключ разделителя из SEPARATORS
 * @param {string} customSeparator - пользовательский разделитель (если separatorKey === 'custom')
 * @param {boolean} trimLines - убирать пробелы по краям каждой строки
 * @returns {{ result: string, report: string }}
 */
export function rowToColumn(input, separatorKey = DEFAULT_SEPARATOR, customSeparator = '', trimLines = false) {
  if (!input || !input.trim()) {
    return { result: '', report: '' };
  }

  let separator;
  if (separatorKey === 'auto') {
    separator = detectSeparator(input);
  } else if (separatorKey === 'custom') {
    separator = customSeparator || ' ';
  } else {
    separator = SEPARATORS[separatorKey]?.value || ' ';
  }

  let lines = input.split(separator);

  if (trimLines) {
    lines = lines.map(line => line.trim());
  }

  lines = lines.filter(line => line.length > 0);
  const resultCount = lines.length;

  return {
    result: lines.join('\n'),
    report: `Строк: 1 → ${resultCount}`
  };
}
