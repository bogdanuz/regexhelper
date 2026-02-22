/**
 * RegexHelper — инструмент для работы с регулярными выражениями
 * @file main.js
 */

import { initApp } from './tools/converter/app.js';
import { initVisualizer } from './tools/visualizer/app.js';
import { initCase } from './tools/case/app.js';
import { initTester } from './tools/tester/app.js';
import { initFeedback } from './shared/ui/feedback.js';

// ═══════════════════════════════════════════════════════════════════
// НАСТРОЙКА ПОВЕДЕНИЯ СКРОЛЛА
// ═══════════════════════════════════════════════════════════════════

// Отключаем автоматическое восстановление позиции скролла браузером
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

// ═══════════════════════════════════════════════════════════════════
// ЗАПУСК ПРИЛОЖЕНИЯ
// ═══════════════════════════════════════════════════════════════════

/**
 * Запуск приложения после загрузки DOM
 */
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Всегда прокручиваем страницу в самый верх при загрузке
    window.scrollTo(0, 0);

    // Инициализация приложения
    initApp();
    initVisualizer();
    initCase();
    initTester();
    initFeedback();
  } catch (error) {
    console.error('❌ Ошибка инициализации приложения:', error);
    alert(`Ошибка запуска приложения: ${error.message}`);
  }
});

// ═══════════════════════════════════════════════════════════════════
// ОБРАБОТКА ОШИБОК
// ═══════════════════════════════════════════════════════════════════

/**
 * Глобальный обработчик ошибок
 */
window.addEventListener('error', (event) => {
  console.error('Глобальная ошибка:', event.error);

  // TODO: отправка логов на сервер (опционально)
});

/**
 * Обработчик необработанных Promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise rejection:', event.reason);
});

// ═══════════════════════════════════════════════════════════════════
// ЭКСПОРТ (для тестирования)
// ═══════════════════════════════════════════════════════════════════

export { initApp };
