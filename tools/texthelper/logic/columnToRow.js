/**
 * Столбец → строка
 * Склеивает строки в одну через разделитель
 */

export const SEPARATORS = {
  space: { label: 'Пробел', value: ' ' },
  comma: { label: 'Запятая', value: ',' },
  commaSpace: { label: 'Запятая + пробел', value: ', ' },
  semicolon: { label: 'Точка с запятой', value: ';' },
  semicolonSpace: { label: 'Точка с запятой + пробел', value: '; ' },
  tab: { label: 'Табуляция', value: '\t' },
  pipe: { label: 'Вертикальная черта', value: '|' },
  pipeSpaces: { label: 'Черта + пробелы', value: ' | ' },
  custom: { label: 'Свой', value: '' }
};

export const DEFAULT_SEPARATOR = 'commaSpace';

/**
 * Конвертирует столбец (многострочный текст) в строку
 * @param {string} input - входной текст
 * @param {string} separatorKey - ключ разделителя из SEPARATORS
 * @param {string} customSeparator - пользовательский разделитель (если separatorKey === 'custom')
 * @returns {{ result: string, report: string }}
 */
export function columnToRow(input, separatorKey = DEFAULT_SEPARATOR, customSeparator = '') {
  if (!input || !input.trim()) {
    return { result: '', report: '' };
  }

  const lines = input.split('\n').filter(line => line.length > 0);
  const originalCount = lines.length;

  if (originalCount === 0) {
    return { result: '', report: '' };
  }

  const separator = separatorKey === 'custom' ? customSeparator : SEPARATORS[separatorKey]?.value || ', ';
  const result = lines.join(separator);

  return {
    result,
    report: `Строк: ${originalCount} → 1`
  };
}
