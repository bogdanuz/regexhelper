/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - NOTIFICATIONS
 *                   Система уведомлений (success/error/warning/info)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * @file shared/ui/notifications.js
 * @description Toast уведомления с автозакрытием
 * @date 15.02.2026
 */

// ═══════════════════════════════════════════════════════════════════
// СОЗДАНИЕ УВЕДОМЛЕНИЯ
// ═══════════════════════════════════════════════════════════════════

/**
 * Показывает уведомление
 * 
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип ('success', 'error', 'warning', 'info')
 * @param {number} duration - Длительность в мс (0 = не закрывать автоматически)
 * @returns {HTMLElement} Элемент уведомления
 */
export function showNotification(message, type = 'info', duration = 3000) {
  // Создаем контейнер для уведомлений, если его нет
  let container = document.getElementById('notifications-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notifications-container';
    container.className = 'notifications-container';
    document.body.appendChild(container);
  }

  // Создаем уведомление
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;

  const icon = getNotificationIcon(type);

  notification.innerHTML = `
    <div class="notification-icon">${icon}</div>
    <div class="notification-message">${message}</div>
    <button class="notification-close" aria-label="Закрыть">×</button>
  `;

  // Добавляем в контейнер
  container.appendChild(notification);

  // Анимация появления
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  // Обработчик закрытия
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.onclick = () => closeNotification(notification);

  // Автозакрытие
  if (duration > 0) {
    setTimeout(() => {
      closeNotification(notification);
    }, duration);
  }

  return notification;
}

/**
 * Возвращает иконку для типа уведомления
 * 
 * @param {string} type - Тип
 * @returns {string} HTML иконки
 */
function getNotificationIcon(type) {
  const icons = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  return icons[type] || icons.info;
}

/**
 * Закрывает уведомление
 * 
 * @param {HTMLElement} notification - Элемент уведомления
 */
export function closeNotification(notification) {
  if (!notification) return;

  notification.classList.remove('show');
  notification.classList.add('hide');

  setTimeout(() => {
    notification.remove();
  }, 300);
}

// ═══════════════════════════════════════════════════════════════════
// БЫСТРЫЕ МЕТОДЫ
// ═══════════════════════════════════════════════════════════════════

/**
 * Показывает success уведомление
 * 
 * @param {string} message - Сообщение
 * @param {number} duration - Длительность
 */
export function showSuccess(message, duration = 3000) {
  return showNotification(message, 'success', duration);
}

/**
 * Показывает error уведомление
 * 
 * @param {string} message - Сообщение
 * @param {number} duration - Длительность (0 = не закрывать)
 */
export function showError(message, duration = 5000) {
  return showNotification(message, 'error', duration);
}

/**
 * Показывает warning уведомление
 * 
 * @param {string} message - Сообщение
 * @param {number} duration - Длительность
 */
export function showWarning(message, duration = 4000) {
  return showNotification(message, 'warning', duration);
}

/**
 * Показывает info уведомление
 * 
 * @param {string} message - Сообщение
 * @param {number} duration - Длительность
 */
export function showInfo(message, duration = 3000) {
  return showNotification(message, 'info', duration);
}

// ═══════════════════════════════════════════════════════════════════
// СПЕЦИАЛЬНЫЕ УВЕДОМЛЕНИЯ
// ═══════════════════════════════════════════════════════════════════

/**
 * Показывает уведомление о копировании
 */
export function showCopySuccess() {
  return showSuccess('Скопировано в буфер обмена', 2000);
}

/**
 * Показывает уведомление о сохранении в историю
 */
export function showHistorySaved() {
  return showSuccess('Сохранено в историю', 2000);
}

/**
 * Показывает уведомление об экспорте
 * 
 * @param {string} format - Формат экспорта
 */
export function showExportSuccess(format) {
  return showSuccess(`Экспортировано в ${format.toUpperCase()}`, 2000);
}

/**
 * Показывает уведомление об ошибке валидации
 * 
 * @param {string} error - Текст ошибки
 */
export function showValidationError(error) {
  return showError(`Ошибка валидации: ${error}`, 5000);
}

/**
 * Показывает уведомление о лимите
 * 
 * @param {string} limitType - Тип лимита
 * @param {number} max - Максимальное значение
 */
export function showLimitWarning(limitType, max) {
  return showWarning(`Максимум достигнут: ${max} ${limitType}`, 4000);
}

// ═══════════════════════════════════════════════════════════════════
// ОЧИСТКА УВЕДОМЛЕНИЙ
// ═══════════════════════════════════════════════════════════════════

/**
 * Закрывает все уведомления
 */
export function closeAllNotifications() {
  const notifications = document.querySelectorAll('.notification');
  notifications.forEach(n => closeNotification(n));
}

// ═══════════════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════════════

export default {
  showNotification,
  closeNotification,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showCopySuccess,
  showHistorySaved,
  showExportSuccess,
  showValidationError,
  showLimitWarning,
  closeAllNotifications
};
