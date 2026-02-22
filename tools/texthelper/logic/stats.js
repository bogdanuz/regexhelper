/**
 * Статистика текста
 * Подсчёт строк, слов, символов
 */

/**
 * Считает статистику текста
 * @param {string} input - входной текст
 * @returns {{ lines: number, words: number, chars: number, charsNoSpaces: number }}
 */
export function getStats(input) {
  if (!input) {
    return { lines: 0, words: 0, chars: 0, charsNoSpaces: 0 };
  }

  const lines = input.split('\n').length;
  const words = input.trim() ? input.trim().split(/\s+/).length : 0;
  const chars = input.length;
  const charsNoSpaces = input.replace(/\s/g, '').length;

  return { lines, words, chars, charsNoSpaces };
}

/**
 * Форматирует статистику для отображения
 * @param {string} input - входной текст
 * @returns {string}
 */
export function formatStats(input) {
  const { lines, words, chars } = getStats(input);
  return `Строк: ${lines} | Слов: ${words} | Символов: ${chars}`;
}
