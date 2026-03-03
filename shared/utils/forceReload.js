/**
 * RegexHelper — принудительная перезагрузка страницы
 * @file shared/utils/forceReload.js
 *
 * Реализует "жёсткую" перезагрузку для приложения:
 * - добавляет/обновляет query-параметр в URL, чтобы обойти кеш
 * - не трогает localStorage (история, настройки и т.п.)
 */

/**
 * Выполняет принудительную перезагрузку страницы.
 * Добавляет/обновляет параметр forceReload в query-строке текущего URL.
 *
 * В тестах можно установить флаг window.__REGEXHELPER_FORCE_RELOAD_TEST_ONLY__ = true,
 * тогда навигация не выполняется, а выставляется флаг window.__REGEXHELPER_FORCE_RELOAD_CALLED__.
 */
export function forceReload() {
  try {
    if (typeof window !== 'undefined' && window.__REGEXHELPER_FORCE_RELOAD_TEST_ONLY__) {
      window.__REGEXHELPER_FORCE_RELOAD_CALLED__ = true;
      return;
    }

    const url = new URL(window.location.href);
    const now = Date.now().toString();
    url.searchParams.set('forceReload', now);
    window.location.href = url.toString();
  } catch (e) {
    // Fallback: обычная перезагрузка без кеша (где поддерживается)
    try {
      window.location.reload(true);
    } catch {
      window.location.reload();
    }
  }
}

export default {
  forceReload,
};

