/**
 * Изменение регистра текста
 */

export const CASE_MODES = {
  upper: { label: 'ВЕРХНИЙ', description: 'ВСЕ БУКВЫ ЗАГЛАВНЫЕ' },
  lower: { label: 'нижний', description: 'все буквы строчные' },
  title: { label: 'Каждое Слово', description: 'Каждое Слово С Заглавной' },
  sentence: { label: 'Первое слово', description: 'Первое слово предложения с заглавной' },
  inverted: { label: 'иНВЕРТИРОВАННЫЙ', description: 'зАГЛАВНЫЕ ↔ СТРОЧНЫЕ' }
};

export const DEFAULT_CASE_MODE = 'upper';

/**
 * Применяет изменение регистра
 * @param {string} input - входной текст
 * @param {string} mode - режим из CASE_MODES
 * @returns {{ result: string, report: string }}
 */
export function changeCase(input, mode = DEFAULT_CASE_MODE) {
  if (!input) {
    return { result: '', report: '' };
  }

  let result = input;

  switch (mode) {
    case 'upper':
      result = input.toUpperCase();
      break;
    case 'lower':
      result = input.toLowerCase();
      break;
    case 'title':
      result = input.toLowerCase().replace(/(?:^|\s)\S/g, ch => ch.toUpperCase());
      break;
    case 'sentence':
      result = input.toLowerCase().replace(/(^|[.!?]\s*)(.)/g, (_, prefix, ch) => prefix + ch.toUpperCase());
      break;
    case 'inverted':
      result = input.replace(/\S/g, ch => {
        const low = ch.toLowerCase();
        return low === ch ? ch.toUpperCase() : low;
      });
      break;
  }

  return {
    result,
    report: `Регистр изменён: ${CASE_MODES[mode]?.label || mode}`
  };
}
