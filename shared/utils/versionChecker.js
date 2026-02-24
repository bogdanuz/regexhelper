/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - VERSION CHECKER
 *                   Проверка обновлений в фоне
 * ═══════════════════════════════════════════════════════════════════
 * 
 * @file shared/utils/versionChecker.js
 * @description Периодическая проверка version.json для уведомления пользователя об обновлениях
 * @date 2026-02-24
 */

import { showUpdateAvailable } from '../ui/notifications.js';

// ═══════════════════════════════════════════════════════════════════
// КОНФИГУРАЦИЯ
// ═══════════════════════════════════════════════════════════════════

const VERSION_URL = './version.json';
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 час

// ═══════════════════════════════════════════════════════════════════
// СОСТОЯНИЕ
// ═══════════════════════════════════════════════════════════════════

let currentVersion = null;
let checkIntervalId = null;
let updateNotified = false;

// ═══════════════════════════════════════════════════════════════════
// ОСНОВНЫЕ ФУНКЦИИ
// ═══════════════════════════════════════════════════════════════════

/**
 * Получает версию с сервера
 * @returns {Promise<string|null>} Версия или null при ошибке
 */
async function fetchVersion() {
  try {
    const response = await fetch(VERSION_URL, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.warn('[VersionChecker] Не удалось загрузить version.json:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.version || null;
  } catch (error) {
    console.warn('[VersionChecker] Ошибка при проверке версии:', error.message);
    return null;
  }
}

/**
 * Проверяет наличие обновления
 */
async function checkForUpdate() {
  if (updateNotified) {
    return;
  }
  
  const serverVersion = await fetchVersion();
  
  if (!serverVersion) {
    return;
  }
  
  if (currentVersion && serverVersion !== currentVersion) {
    console.log('[VersionChecker] Доступно обновление:', currentVersion, '→', serverVersion);
    updateNotified = true;
    showUpdateAvailable();
  }
}

/**
 * Инициализирует проверку версий
 * Сохраняет текущую версию при загрузке и запускает периодическую проверку
 */
export async function initVersionChecker() {
  currentVersion = await fetchVersion();
  
  if (!currentVersion) {
    console.warn('[VersionChecker] Не удалось определить начальную версию');
    return;
  }
  
  console.log('[VersionChecker] Текущая версия:', currentVersion);
  
  checkIntervalId = setInterval(checkForUpdate, CHECK_INTERVAL_MS);
  
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !updateNotified) {
      checkForUpdate();
    }
  });
}

/**
 * Останавливает проверку версий (для тестов)
 */
export function stopVersionChecker() {
  if (checkIntervalId) {
    clearInterval(checkIntervalId);
    checkIntervalId = null;
  }
  updateNotified = false;
  currentVersion = null;
}

// ═══════════════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════════════

export default {
  initVersionChecker,
  stopVersionChecker
};
