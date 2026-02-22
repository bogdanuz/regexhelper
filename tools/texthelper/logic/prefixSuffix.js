/**
 * Префикс/суффикс
 * Добавляет текст в начало и/или конец каждой строки
 */

export const PRESETS = {
  doubleQuotes: { label: '"..."', prefix: '"', suffix: '"' },
  singleQuotes: { label: "'...'", prefix: "'", suffix: "'" },
  parentheses: { label: '(...)', prefix: '(', suffix: ')' },
  brackets: { label: '[...]', prefix: '[', suffix: ']' },
  braces: { label: '{...}', prefix: '{', suffix: '}' },
  listDash: { label: '- ...', prefix: '- ', suffix: '' },
  sql: { label: 'SQL', prefix: "'", suffix: "'," }
};

/**
 * Добавляет префикс и/или суффикс к каждой строке
 * @param {string} input - входной текст
 * @param {string} prefix - префикс
 * @param {string} suffix - суффикс
 * @param {boolean} numbered - использовать нумерацию вместо фиксированного префикса
 * @returns {{ result: string, report: string }}
 */
export function addPrefixSuffix(input, prefix = '', suffix = '', numbered = false) {
  if (!input || !input.trim()) {
    return { result: '', report: '' };
  }

  const lines = input.split('\n');
  let counter = 1;

  const resultLines = lines.map(line => {
    if (line.length === 0) {
      return line;
    }

    const actualPrefix = numbered ? `${counter++}. ` : prefix;
    return actualPrefix + line + suffix;
  });

  const processedCount = lines.filter(l => l.length > 0).length;

  return {
    result: resultLines.join('\n'),
    report: `Обработано: ${processedCount} строк`
  };
}

/**
 * Применяет пресет
 * @param {string} input - входной текст
 * @param {string} presetKey - ключ пресета из PRESETS
 * @returns {{ result: string, report: string }}
 */
export function applyPreset(input, presetKey) {
  const preset = PRESETS[presetKey];
  if (!preset) {
    return { result: input, report: 'Неизвестный пресет' };
  }
  return addPrefixSuffix(input, preset.prefix, preset.suffix, false);
}
