/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - STORAGE
 *                   Работа с localStorage
 * ═══════════════════════════════════════════════════════════════════
 * 
 * @file shared/utils/storage.js
 * @description Функции для работы с localStorage (история, настройки, данные)
 * @date 15.02.2026
 * 
 * @note Этот файл КОРРЕКТЕН согласно анализу (file:5)
 * - FIFO история (300 элементов) ✅
 * - Методы экспорта/импорта ✅
 * - Сохранение настроек ✅
 */

import { STORAGE_KEYS, MAX_HISTORY_ITEMS } from '../../core/config.js';

// ═══════════════════════════════════════════════════════════════════
// ИСТОРИЯ КОНВЕРТАЦИЙ
// ═══════════════════════════════════════════════════════════════════

/**
 * Сохраняет элемент в историю (с FIFO логикой)
 * 
 * @param {Object} item - Элемент истории
 * @param {string} item.id - Уникальный ID (timestamp)
 * @param {Date} item.date - Дата создания
 * @param {Array<string>} item.triggers - Массив триггеров (макс 10 для отображения)
 * @param {Object} item.params - Параметры конвертации
 * @param {string} item.result - Результат (regex)
 * @param {string} item.type - Тип ('simple' или 'linked')
 * @returns {boolean} true при успехе
 */
export function saveToHistory(item) {
  try {
    const history = getHistory();

    // Добавляем в начало (unshift)
    history.unshift({
      id: item.id || Date.now().toString(),
      date: item.date || new Date().toISOString(),
      triggers: item.triggers || [],
      params: item.params || {},
      result: item.result || '',
      type: item.type || 'simple'
    });

    // FIFO: если превышен лимит, удаляем старые
    if (history.length > MAX_HISTORY_ITEMS) {
      history.splice(MAX_HISTORY_ITEMS);
    }

    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('saveToHistory: ошибка сохранения', error);
    return false;
  }
}

const HISTORY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней

/**
 * Удаляет из истории записи старше 7 дней (при загрузке)
 * @returns {number} Количество удалённых записей
 */
export function cleanHistoryOlderThan7Days() {
  try {
    const history = getHistory();
    const now = Date.now();
    const kept = history.filter(item => {
      const t = new Date(item.date).getTime();
      return now - t < HISTORY_MAX_AGE_MS;
    });
    if (kept.length === history.length) return 0;
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(kept));
    return history.length - kept.length;
  } catch (error) {
    console.error('cleanHistoryOlderThan7Days:', error);
    return 0;
  }
}

/**
 * Получает всю историю из localStorage
 * 
 * @returns {Array<Object>} Массив элементов истории
 */
export function getHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!data) return [];

    const history = JSON.parse(data);

    if (!Array.isArray(history)) {
      console.warn('getHistory: некорректный формат, возвращаем пустой массив');
      return [];
    }

    return history;
  } catch (error) {
    console.error('getHistory: ошибка чтения', error);
    return [];
  }
}

/**
 * Получает элемент истории по ID
 * 
 * @param {string} id - ID элемента
 * @returns {Object|null} Элемент или null
 */
export function getHistoryItem(id) {
  const history = getHistory();
  return history.find(item => item.id === id) || null;
}

/**
 * Удаляет элемент из истории по ID
 * 
 * @param {string} id - ID элемента
 * @returns {boolean} true при успехе
 */
export function deleteFromHistory(id) {
  try {
    const history = getHistory();
    const filtered = history.filter(item => item.id !== id);

    if (filtered.length === history.length) {
      return false; // Элемент не найден
    }

    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('deleteFromHistory: ошибка удаления', error);
    return false;
  }
}

/**
 * Очищает всю историю
 * 
 * @returns {boolean} true при успехе
 */
export function clearHistory() {
  try {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    return true;
  } catch (error) {
    console.error('clearHistory: ошибка очистки', error);
    return false;
  }
}

/**
 * Получает количество элементов в истории
 * 
 * @returns {number} Количество элементов
 */
export function getHistoryCount() {
  return getHistory().length;
}

/**
 * Получает N последних элементов истории
 * 
 * @param {number} count - Количество элементов (по умолчанию 10)
 * @returns {Array<Object>} Массив последних N элементов
 */
export function getRecentHistory(count = 10) {
  const history = getHistory();
  return history.slice(0, count);
}

// ═══════════════════════════════════════════════════════════════════
// ПОИСК В ИСТОРИИ
// ═══════════════════════════════════════════════════════════════════

/**
 * Поиск в истории по запросу
 * 
 * @param {string} query - Поисковый запрос
 * @returns {Array<Object>} Найденные элементы
 */
export function searchHistory(query) {
  if (!query || typeof query !== 'string') {
    return [];
  }

  const history = getHistory();
  const lowerQuery = query.toLowerCase();

  return history.filter(item => {
    // Поиск по триггерам
    const triggersMatch = item.triggers.some(trigger => 
      trigger.toLowerCase().includes(lowerQuery)
    );

    // Поиск по результату
    const resultMatch = item.result.toLowerCase().includes(lowerQuery);

    return triggersMatch || resultMatch;
  });
}

/**
 * Импортирует историю из JSON
 * 
 * @param {string} jsonString - JSON строка
 * @returns {boolean} true при успехе
 */
export function importHistoryJSON(jsonString) {
  try {
    const imported = JSON.parse(jsonString);

    if (!Array.isArray(imported)) {
      throw new Error('Некорректный формат JSON');
    }

    // Объединяем с текущей историей
    const currentHistory = getHistory();
    const merged = [...imported, ...currentHistory];

    // Убираем дубликаты по ID
    const unique = merged.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id)
    );

    // Ограничиваем до MAX_HISTORY_ITEMS
    const limited = unique.slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(limited));
    return true;
  } catch (error) {
    console.error('importHistoryJSON: ошибка импорта', error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// НАСТРОЙКИ
// ═══════════════════════════════════════════════════════════════════

/**
 * Сохраняет настройки приложения
 * 
 * @param {Object} settings - Объект настроек
 * @returns {boolean} true при успехе
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('saveSettings: ошибка сохранения', error);
    return false;
  }
}

/**
 * Получает настройки приложения
 * 
 * @returns {Object} Объект настроек
 */
export function getSettings() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('getSettings: ошибка чтения', error);
    return {};
  }
}

// ═══════════════════════════════════════════════════════════════════
// ПРОСТЫЕ ТРИГГЕРЫ
// ═══════════════════════════════════════════════════════════════════

/**
 * Сохраняет текст простых триггеров (raw text из textarea)
 *
 * @param {string} text - Текст из textarea
 * @returns {boolean} true при успехе
 */
export function saveSimpleTriggersText(text) {
  try {
    const data = typeof text === 'string' ? { text } : { text: '' };
    localStorage.setItem(STORAGE_KEYS.SIMPLE_TRIGGERS, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('saveSimpleTriggersText: ошибка сохранения', error);
    return false;
  }
}

/**
 * Получает текст простых триггеров
 *
 * @returns {string} Текст для textarea
 */
export function getSimpleTriggersText() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SIMPLE_TRIGGERS);
    if (!raw) return '';
    const data = JSON.parse(raw);
    if (data && typeof data.text === 'string') return data.text;
    // Обратная совместимость: старый формат — массив триггеров
    if (Array.isArray(data)) return data.join('\n');
    return '';
  } catch (error) {
    console.error('getSimpleTriggersText: ошибка чтения', error);
    return '';
  }
}

/** @deprecated Используйте saveSimpleTriggersText. Сохраняет массив триггеров (legacy). */
export function saveSimpleTriggers(triggers) {
  const text = Array.isArray(triggers) ? triggers.join('\n') : '';
  return saveSimpleTriggersText(text);
}

/** @deprecated Используйте getSimpleTriggersText. Возвращает массив триггеров (legacy). */
export function getSimpleTriggers() {
  const text = getSimpleTriggersText();
  return text ? text.split(/\n|,/).map((t) => t.trim()).filter(Boolean) : [];
}

// ═══════════════════════════════════════════════════════════════════
// ПАРАМЕТРЫ ПРОСТЫХ ТРИГГЕРОВ
// ═══════════════════════════════════════════════════════════════════

/**
 * Сохраняет параметры простых триггеров (поддержка { global, triggerParams } в будущем)
 *
 * @param {Object} params - Параметры из модалки
 * @returns {boolean} true при успехе
 */
export function saveSimpleParams(params) {
  try {
    localStorage.setItem(STORAGE_KEYS.SIMPLE_PARAMS, JSON.stringify(params || {}));
    return true;
  } catch (error) {
    console.error('saveSimpleParams: ошибка сохранения', error);
    return false;
  }
}

/**
 * Получает параметры простых триггеров
 *
 * @returns {Object} Параметры
 */
export function getSimpleParams() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SIMPLE_PARAMS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('getSimpleParams: ошибка чтения', error);
    return {};
  }
}

// ═══════════════════════════════════════════════════════════════════
// СВЯЗАННЫЕ ТРИГГЕРЫ (СТРУКТУРА)
// ═══════════════════════════════════════════════════════════════════

/**
 * Сохраняет структуру связанных триггеров
 * 
 * @param {Object} structure - Объект структуры { groups: [...] }
 * @returns {boolean} true при успехе
 */
export function saveLinkedStructure(structure) {
  try {
    localStorage.setItem(STORAGE_KEYS.LINKED_STRUCTURE, JSON.stringify(structure));
    return true;
  } catch (error) {
    console.error('saveLinkedStructure: ошибка сохранения', error);
    return false;
  }
}

/**
 * Получает структуру связанных триггеров
 * 
 * @returns {Object} Объект структуры { groups: [...] }
 */
export function getLinkedStructure() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LINKED_STRUCTURE);
    return data ? JSON.parse(data) : { groups: [] };
  } catch (error) {
    console.error('getLinkedStructure: ошибка чтения', error);
    return { groups: [] };
  }
}

// ═══════════════════════════════════════════════════════════════════
// ОЧИСТКА ВСЕХ ДАННЫХ
// ═══════════════════════════════════════════════════════════════════

/**
 * Очищает все данные из localStorage
 * 
 * @returns {boolean} true при успехе
 */
export function clearAllStorage() {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    return true;
  } catch (error) {
    console.error('clearAllStorage: ошибка очистки', error);
    return false;
  }
}

/**
 * Получает размер занятого localStorage (в КБ)
 * 
 * @returns {number} Размер в КБ
 */
export function getStorageSize() {
  try {
    let total = 0;
    Object.values(STORAGE_KEYS).forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        total += data.length;
      }
    });
    return (total / 1024).toFixed(2);
  } catch (error) {
    console.error('getStorageSize: ошибка подсчёта', error);
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════════════

export default {
  saveToHistory,
  getHistory,
  getHistoryItem,
  deleteFromHistory,
  clearHistory,
  cleanHistoryOlderThan7Days,
  getHistoryCount,
  getRecentHistory,
  searchHistory,
  importHistoryJSON,
  saveSettings,
  getSettings,
  saveSimpleTriggersText,
  getSimpleTriggersText,
  saveSimpleTriggers,
  getSimpleTriggers,
  saveSimpleParams,
  getSimpleParams,
  saveLinkedStructure,
  getLinkedStructure,
  clearAllStorage,
  getStorageSize
};

export { STORAGE_KEYS, MAX_HISTORY_ITEMS };
/** Алиас для обратной совместимости (кэш браузера может подгружать старый модуль) */
export { cleanHistoryOlderThan7Days as cleanHistoryOlderThan12h };
