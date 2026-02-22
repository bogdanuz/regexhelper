/**
 * RegexHelper — конвертер регистра текста (Регистр)
 * @file tools/case/logic/caseConverter.js
 */

/** Режимы регистра */
export const CASE_MODES = {
  UPPER: 'upper',
  LOWER: 'lower',
  TITLE: 'title',
  SENTENCE: 'sentence',
  INVERTED: 'inverted'
};

/**
 * Верхний регистр (все буквы заглавные).
 * @param {string} str
 * @returns {string}
 */
export function toUpper(str) {
  return String(str).toUpperCase();
}

/**
 * Нижний регистр (все буквы строчные).
 * @param {string} str
 * @returns {string}
 */
export function toLower(str) {
  return String(str).toLowerCase();
}

/**
 * Каждое слово с заглавной буквы (Title Case).
 * Граница слова — пробелы и начало строки. RU/EN обрабатываются одинаково.
 * @param {string} str
 * @returns {string}
 */
export function toTitleCase(str) {
  const s = String(str).toLowerCase();
  return s.replace(/(?:^|\s)\S/g, (ch) => ch.toUpperCase());
}

/**
 * Первое слово с заглавной (Sentence case).
 * Заглавная: первая буква текста и первая буква после . ! ?
 * @param {string} str
 * @returns {string}
 */
export function toSentenceCase(str) {
  const s = String(str).toLowerCase();
  return s.replace(/(^|[.!?]\s*)(.)/g, (_, prefix, ch) => prefix + ch.toUpperCase());
}

/**
 * Инвертированный регистр (строчные → заглавные, заглавные → строчные).
 * @param {string} str
 * @returns {string}
 */
export function toInverted(str) {
  return String(str).replace(/\S/g, (ch) => {
    const low = ch.toLowerCase();
    return low === ch ? ch.toUpperCase() : low;
  });
}

/**
 * Применить выбранный режим регистра к строке.
 * @param {string} str — исходный текст
 * @param {string} mode — один из CASE_MODES
 * @returns {string}
 */
export function applyCase(str, mode) {
  switch (mode) {
    case CASE_MODES.UPPER:
      return toUpper(str);
    case CASE_MODES.LOWER:
      return toLower(str);
    case CASE_MODES.TITLE:
      return toTitleCase(str);
    case CASE_MODES.SENTENCE:
      return toSentenceCase(str);
    case CASE_MODES.INVERTED:
      return toInverted(str);
    default:
      return String(str);
  }
}
