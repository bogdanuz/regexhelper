/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - TRANSLITERATION
 *              Транслитерация кириллицы ↔ латиницы
 * ═══════════════════════════════════════════════════════════════════
 * 
 * @file tools/converter/converters/transliteration.js
 * @description Преобразует каждую букву в regex-паттерн, ловящий
 *              как кириллический, так и латинский вариант написания.
 * @date 21.02.2026
 */

/**
 * Словарь простых соответствий (один символ → один символ).
 * Ключ — символ в нижнем регистре, значение — массив эквивалентов.
 */
const SIMPLE_MAP = {
  'а': ['а', 'a'],
  'a': ['а', 'a'],
  'б': ['б', 'b'],
  'b': ['б', 'b'],
  'в': ['в', 'v', 'w'],
  'v': ['в', 'v'],
  'w': ['в', 'w'],
  'г': ['г', 'g'],
  'g': ['г', 'g'],
  'д': ['д', 'd'],
  'd': ['д', 'd'],
  'е': ['е', 'ё', 'e'],
  'ё': ['е', 'ё', 'e'],
  'e': ['е', 'ё', 'e'],
  'з': ['з', 'z'],
  'z': ['з', 'z'],
  'и': ['и', 'i'],
  'i': ['и', 'i'],
  'й': ['й', 'y', 'j'],
  'к': ['к', 'k'],
  'k': ['к', 'k'],
  'л': ['л', 'l'],
  'l': ['л', 'l'],
  'м': ['м', 'm'],
  'm': ['м', 'm'],
  'н': ['н', 'n'],
  'n': ['н', 'n'],
  'о': ['о', 'o'],
  'o': ['о', 'o'],
  'п': ['п', 'p'],
  'p': ['п', 'p'],
  'р': ['р', 'r'],
  'r': ['р', 'r'],
  'с': ['с', 's', 'c'],
  's': ['с', 's'],
  'c': ['с', 'c', 'ц', 'к'],
  'т': ['т', 't'],
  't': ['т', 't'],
  'у': ['у', 'u'],
  'u': ['у', 'u'],
  'ф': ['ф', 'f'],
  'f': ['ф', 'f'],
  'ы': ['ы', 'y'],
  'y': ['ы', 'й', 'y'],
  'э': ['э', 'е', 'e'],
  'ь': ['ь'],
  'ъ': ['ъ'],
  'j': ['й', 'ж', 'j'],
  'h': ['х', 'h'],
  'x': ['х', 'кс', 'x'],
  'q': ['к', 'q'],
};

/**
 * Словарь диграфов (несколько символов ↔ один символ).
 * Порядок важен: сначала длинные, потом короткие.
 * Ключ — диграф в нижнем регистре, значение — массив альтернатив.
 */
const DIGRAPH_MAP = {
  'shch': ['щ', 'shch', 'sch'],
  'щ': ['щ', 'shch', 'sch'],
  'sch': ['щ', 'shch', 'sch'],
  'zh': ['ж', 'zh', 'j'],
  'ж': ['ж', 'zh', 'j'],
  'kh': ['х', 'kh', 'h', 'x'],
  'х': ['х', 'kh', 'h', 'x'],
  'ks': ['кс', 'ks', 'x'],
  'кс': ['кс', 'ks', 'x'],
  'ts': ['ц', 'ts', 'c'],
  'ц': ['ц', 'ts', 'c'],
  'ch': ['ч', 'ch'],
  'ч': ['ч', 'ch'],
  'sh': ['ш', 'sh'],
  'ш': ['ш', 'sh'],
  'yu': ['ю', 'yu', 'u'],
  'ю': ['ю', 'yu', 'u'],
  'ya': ['я', 'ya', 'a'],
  'я': ['я', 'ya', 'a'],
  'yo': ['ё', 'yo', 'e'],
  'ph': ['ф', 'ph', 'f'],
};

const DIGRAPH_KEYS_SORTED = Object.keys(DIGRAPH_MAP).sort((a, b) => b.length - a.length);

/**
 * Экранирует специальные regex-символы.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Создаёт regex-паттерн для набора альтернатив.
 * Если все альтернативы — одиночные символы, использует [...].
 * Иначе — (a|b|c).
 * @param {string[]} alternatives - Массив альтернатив
 * @returns {string} Regex-паттерн
 */
function buildAlternatives(alternatives) {
  const unique = [...new Set(alternatives)];
  if (unique.length === 1) {
    return escapeRegex(unique[0]);
  }
  
  const allSingle = unique.every(alt => alt.length === 1);
  if (allSingle) {
    const escaped = unique.map(ch => {
      if (ch === ']' || ch === '\\' || ch === '^' || ch === '-') {
        return '\\' + ch;
      }
      return ch;
    }).join('');
    return `[${escaped}]`;
  }
  
  const escaped = unique.map(escapeRegex);
  return `(${escaped.join('|')})`;
}

/**
 * Применяет транслитерацию к тексту.
 * Каждый символ/диграф заменяется на regex-паттерн с альтернативами.
 * 
 * @param {string} text - Исходный текст
 * @returns {string} Regex-паттерн
 */
export function applyTransliteration(text) {
  if (!text || typeof text !== 'string') return text || '';
  
  let result = '';
  let i = 0;
  const lower = text.toLowerCase();
  
  while (i < text.length) {
    let matched = false;
    
    for (const digraph of DIGRAPH_KEYS_SORTED) {
      if (lower.substring(i, i + digraph.length) === digraph) {
        const alternatives = DIGRAPH_MAP[digraph];
        result += buildAlternatives(alternatives);
        i += digraph.length;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      const char = lower[i];
      const originalChar = text[i];
      
      if (SIMPLE_MAP[char]) {
        result += buildAlternatives(SIMPLE_MAP[char]);
      } else if (/[a-zа-яёA-ZА-ЯЁ]/.test(originalChar)) {
        result += escapeRegex(originalChar);
      } else {
        result += escapeRegex(originalChar);
      }
      i++;
    }
  }
  
  return result;
}

/**
 * Валидирует текст для транслитерации.
 * @param {string} text - Текст для проверки
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateTransliteration(text) {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Текст не указан' };
  }
  if (text.trim().length === 0) {
    return { valid: false, error: 'Текст пустой' };
  }
  return { valid: true };
}

/**
 * Генерирует предпросмотр транслитерации.
 * @param {string} text - Исходный текст
 * @returns {string} Предпросмотр паттерна
 */
export function previewTransliteration(text) {
  if (!text || text.trim().length === 0) return '';
  return applyTransliteration(text);
}

/**
 * Примеры использования транслитерации.
 * @param {string} text - Исходный текст
 * @returns {string[]} Массив примеров
 */
export function generateTransliterationExamples(text) {
  if (!text || text.trim().length === 0) return [];
  
  const pattern = applyTransliteration(text);
  return [
    `${text} → ${pattern}`,
    'Ловит: кириллицу, латиницу и смешанные варианты'
  ];
}

export default {
  applyTransliteration,
  validateTransliteration,
  previewTransliteration,
  generateTransliterationExamples
};
