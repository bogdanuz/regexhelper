/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - CONFIG
 *                   Централизованные константы
 * ═══════════════════════════════════════════════════════════════════
 * 
 * @file config.js
 * @description Все константы приложения в одном месте
 * @date 15.02.2026
 */

// ═══════════════════════════════════════════════════════════════════
// ЛИМИТЫ
// ═══════════════════════════════════════════════════════════════════

/**
 * Максимальное количество символов в textarea простых триггеров (QUESTIONS_SET Q23.1: 1000)
 * @type {number}
 */
export const MAX_SIMPLE_CHARS = 1000;

/**
 * Максимальное количество триггеров в простом режиме (QUESTIONS_SET Q23.1: 1000, без предупреждений)
 * @type {number}
 */
export const MAX_TRIGGERS = 1000;

/**
 * Максимум триггеров в одной группе (связанные). Panel_Hints 2.6 / user confirmation.
 * @type {number}
 */
export const MAX_LINKED_TRIGGERS_PER_GROUP = 100;

/**
 * Максимум триггеров в одной подгруппе (QUESTIONS_SET Q11.1: 15)
 * @type {number}
 */
export const MAX_LINKED_TRIGGERS_PER_SUBGROUP = 15;

/**
 * Максимальное количество групп (связанные триггеры)
 * @type {number}
 */
export const MAX_GROUPS = 15;

/**
 * Максимальное количество подгрупп в группе
 * @type {number}
 */
export const MAX_SUBGROUPS = 15;

/**
 * Максимальная длина одного триггера (символов)
 * @type {number}
 */
export const MAX_TRIGGER_LENGTH = 100;

/**
 * Максимальная длина триггера для автоматического добавления границ слова \\b (REGLAMENT).
 * @type {number}
 */
export const WORD_BOUNDARY_MAX_LENGTH = 3;

/**
 * Максимальная длина результата regex (символов)
 * @type {number}
 */
export const MAX_RESULT_LENGTH = 10000;

/**
 * Максимальное количество элементов в истории (FIFO)
 * @type {number}
 */
export const MAX_HISTORY_ITEMS = 300;

// ═══════════════════════════════════════════════════════════════════
// RESPONSIVE BREAKPOINTS
// ═══════════════════════════════════════════════════════════════════

/**
 * Breakpoint: Large Desktop (оптимальный)
 * @type {number}
 */
export const BREAKPOINT_OPTIMAL = 1920;

/**
 * Breakpoint: Standard Desktop
 * @type {number}
 */
export const BREAKPOINT_STANDARD = 1280;

/**
 * Breakpoint: Small Desktop/Laptop (предупреждение)
 * @type {number}
 */
export const BREAKPOINT_WARNING = 1024;

/**
 * Минимальная поддерживаемая ширина экрана
 * @type {number}
 */
export const MIN_SUPPORTED_WIDTH = 1024;

/**
 * Breakpoint: Desktop (alias для BREAKPOINT_OPTIMAL, для layoutManager)
 * @type {number}
 */
export const BREAKPOINT_DESKTOP = 1920;

/**
 * Breakpoint: Tablet (alias для BREAKPOINT_STANDARD, для layoutManager)
 * @type {number}
 */
export const BREAKPOINT_TABLET = 1280;

/**
 * Breakpoint: Mobile / warning zone (alias для BREAKPOINT_WARNING, для layoutManager)
 * @type {number}
 */
export const BREAKPOINT_MOBILE = 1024;

// ═══════════════════════════════════════════════════════════════════
// DISTANCE НАСТРОЙКИ
// ═══════════════════════════════════════════════════════════════════

/**
 * Минимальное значение для custom distance
 * @type {number}
 */
export const MIN_DISTANCE = 0;

/**
 * Максимальное значение для custom distance
 * @type {number}
 */
export const MAX_DISTANCE = 1000;

/**
 * Distance по умолчанию (мин)
 * @type {number}
 */
export const DEFAULT_DISTANCE_MIN = 0;

/**
 * Distance по умолчанию (макс)
 * @type {number}
 */
export const DEFAULT_DISTANCE_MAX = 10;

/**
 * Distance режимы и их regex паттерны
 * @type {Object}
 */
export const DISTANCE_MODES = {
  alternation: {
    label: '— Альтернация (|)',
    value: '',
    pattern: null,
    tooltip: 'Триггеры как варианты (без соединителя)'
  },
  custom: {
    label: '⚙️ Настроить (.{мин,макс})',
    value: 'custom',
    pattern: (min, max) => `.{${min},${max}}`,
    tooltip: 'Задайте минимальное и максимальное расстояние'
  },
  any: {
    label: 'Любое расстояние ([\\s\\S]+)',
    value: '[\\s\\S]+',
    pattern: '[\\s\\S]+',
    tooltip: 'Ловит триггеры через абзацы и переносы строк'
  },
  paragraph: {
    label: '📄 Абзац (.+)',
    value: '.+',
    pattern: '.+',
    tooltip: 'Ловит триггеры в пределах одного абзаца'
  },
  line: {
    label: '📏 Строка ([^\\n]+)',
    value: '[^\\n]+',
    pattern: '[^\\n]+',
    tooltip: 'Ловит триггеры в пределах одной строки'
  }
};

// ═══════════════════════════════════════════════════════════════════
// ЛОКАЛЬНОЕ ХРАНИЛИЩЕ (localStorage)
// ═══════════════════════════════════════════════════════════════════

/**
 * Ключи для localStorage
 * @type {Object}
 */
export const STORAGE_KEYS = {
  HISTORY: 'regexhelper_history',
  SETTINGS: 'regexhelper_settings',
  SIMPLE_TRIGGERS: 'regexhelper_simple_triggers',
  SIMPLE_PARAMS: 'regexhelper_simple_params',
  LINKED_STRUCTURE: 'regexhelper_linked_structure',
  HINT_DISMISSED: 'regexhelper_hint_dismissed'
};

// ═══════════════════════════════════════════════════════════════════
// ПАРАМЕТРЫ (TYPE 1-6)
// ═══════════════════════════════════════════════════════════════════

/**
 * Названия параметров для UI
 * @type {Object}
 */
export const PARAM_LABELS = {
  latinCyrillic: 'Лат/Кир',
  declensions: 'Склонения',
  optionalChars: 'Опциональные',
  wildcard: 'Любой символ (\\w)'
};

/**
 * Иконки для параметров (emoji)
 * @type {Object}
 */
export const PARAM_ICONS = {
  latinCyrillic: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  declensions: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  optionalChars: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  wildcard: '\\w'
};

/**
 * Цвета для badge параметров
 * @type {Object}
 */
export const PARAM_COLORS = {
  latinCyrillic: '#60A5FA',   // Soft blue
  transliteration: '#EC4899', // Pink
  declensions: '#34D399',     // Soft green
  optionalChars: '#FBBF24',   // Soft gold
  wildcard: '#A78BFA',        // Purple (ранее prefix)
  wordBoundaries: '#06B6D4',  // Cyan/teal
  requireSpaceAfter: '#3B82F6' // Blue
};

// ═══════════════════════════════════════════════════════════════════
// REGEX СПЕЦСИМВОЛЫ
// ═══════════════════════════════════════════════════════════════════

/**
 * Специальные символы regex, требующие экранирования
 * @type {Array<string>}
 */
export const REGEX_SPECIAL_CHARS = [
  '\\', '.', '+', '*', '?', '^', '$', 
  '(', ')', '[', ']', '{', '}', '|'
];

// ═══════════════════════════════════════════════════════════════════
// ЛАТИНИЦА/КИРИЛЛИЦА (TYPE 1)
// ═══════════════════════════════════════════════════════════════════

/**
 * Таблица замен латиница/кириллица (18 пар)
 * @type {Object}
 */
// a→[аa], o→[оo], e→[еe] — полный список (user spec)
export const LATIN_CYRILLIC_PAIRS = {
  'a': '[\u0430a]', 'c': '[\u0441c]', 'e': '[\u0435e]', 'o': '[\u043eo]', 'p': '[\u0440p]', 'x': '[\u0445x]', 'y': '[\u0443y]',
  'd': '[\u0434d]', 'b': '[\u0432b]', 'k': '[\u043ak]', 'm': '[\u043cm]', 'h': '[\u043dh]', 't': '[\u0442t]',
  'A': '[\u0410A]', 'B': '[\u0412B]', 'C': '[\u0421C]', 'E': '[\u0415E]', 'H': '[\u041dH]', 'K': '[\u041aK]', 'M': '[\u041cM]',
  'O': '[\u041eO]', 'P': '[\u0420P]', 'T': '[\u0422T]', 'X': '[\u0425X]',
  'а': '[\u0430a]', 'с': '[\u0441c]', 'е': '[\u0435e]', 'о': '[\u043eo]', 'р': '[\u0440p]', 'х': '[\u0445x]', 'у': '[\u0443y]',
  'д': '[\u0434d]', 'в': '[\u0432b]', 'к': '[\u043ak]', 'м': '[\u043cm]', 'н': '[\u043dh]', 'т': '[\u0442t]',
  'А': '[\u0410A]', 'В': '[\u0412B]', 'С': '[\u0421C]', 'Е': '[\u0415E]', 'Н': '[\u041dH]', 'К': '[\u041aK]', 'М': '[\u041cM]',
  'О': '[\u041eO]', 'Р': '[\u0420P]', 'Т': '[\u0422T]', 'Х': '[\u0425X]'
};

// ═══════════════════════════════════════════════════════════════════
// UI НАСТРОЙКИ
// ═══════════════════════════════════════════════════════════════════

/**
 * Длительность уведомлений (мс)
 * @type {Object}
 */
export const NOTIFICATION_DURATION = {
  success: 3000,
  error: 5000,
  warning: 5000,
  info: 4000
};

/**
 * Цвета уведомлений
 * @type {Object}
 */
export const NOTIFICATION_COLORS = {
  success: '#34D399',
  error: '#EF4444',
  warning: '#FBBF24',
  info: '#3B82F6'
};

/**
 * Debounce задержка для автосохранения (мс)
 * @type {number}
 */
export const AUTOSAVE_DELAY = 30000; // 30 секунд


/**
 * Название приложения
 * @type {string}
 */
export const APP_NAME = 'RegexHelper';

// ═══════════════════════════════════════════════════════════════════
// ЭКСПОРТ ПО УМОЛЧАНИЮ
// ═══════════════════════════════════════════════════════════════════

export default {
  MAX_SIMPLE_CHARS,
  MAX_TRIGGERS,
  MAX_GROUPS,
  MAX_SUBGROUPS,
  MAX_LINKED_TRIGGERS_PER_GROUP,
  MAX_LINKED_TRIGGERS_PER_SUBGROUP,
  MAX_TRIGGER_LENGTH,
  MAX_RESULT_LENGTH,
  MAX_HISTORY_ITEMS,
  BREAKPOINT_OPTIMAL,
  BREAKPOINT_STANDARD,
  BREAKPOINT_WARNING,
  MIN_SUPPORTED_WIDTH,
  BREAKPOINT_DESKTOP,
  BREAKPOINT_TABLET,
  BREAKPOINT_MOBILE,
  MIN_DISTANCE,
  MAX_DISTANCE,
  DEFAULT_DISTANCE_MIN,
  DEFAULT_DISTANCE_MAX,
  DISTANCE_MODES,
  STORAGE_KEYS,
  PARAM_LABELS,
  PARAM_ICONS,
  PARAM_COLORS,
  REGEX_SPECIAL_CHARS,
  LATIN_CYRILLIC_PAIRS,
  NOTIFICATION_DURATION,
  NOTIFICATION_COLORS,
  AUTOSAVE_DELAY,
  APP_NAME
};
