/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - LAYOUT MANAGER
 *                   Управление 100vh layout (скролл, responsive)
 * ═══════════════════════════════════════════════════════════════════
 *
 * @file ui/layoutManager.js
 * @description Управление layout приложения
 * @date 15.02.2026
 */

import { BREAKPOINT_DESKTOP, BREAKPOINT_TABLET, BREAKPOINT_MOBILE } from '../../../core/config.js';
import { showWarning } from '../../../shared/ui/notifications.js';

/**
 * Инициализирует layout
 */
export function initLayout() {
  setupPanelHeights();
  setupResponsive();
  setupSmoothScroll();
}

/**
 * Настраивает высоты панелей: 40% / 25% / 35% заданы в converter.css (flex в 100vh секции).
 * Inline height не задаём, чтобы работал flex layout без вертикального скролла в converter.
 */
function setupPanelHeights() {
  // Layout: .triggers-panel (переключаемая панель) + .output-panel
}

/**
 * Настраивает responsive (медиа-запросы в JS)
 */
function setupResponsive() {
  const updateLayout = () => {
    const width = window.innerWidth;

    if (width < BREAKPOINT_MOBILE) {
      applyMobileLayout();
    } else if (width < BREAKPOINT_TABLET) {
      applyTabletLayout();
    } else {
      applyDesktopLayout();
    }
  };

  window.addEventListener('resize', updateLayout);
  updateLayout();
}

/**
 * Применяет desktop layout
 */
function applyDesktopLayout() {
  document.body.classList.remove('mobile', 'tablet');
  document.body.classList.add('desktop');
}

/**
 * Применяет tablet layout
 */
function applyTabletLayout() {
  document.body.classList.remove('mobile', 'desktop');
  document.body.classList.add('tablet');

  if (!localStorage.getItem('regexhelper_responsive_warning_dismissed')) {
    showWarning('Для комфортной работы рекомендуется экран от 1280px', 8000);
    localStorage.setItem('regexhelper_responsive_warning_dismissed', '1');
  }
}

/**
 * Применяет mobile layout
 */
function applyMobileLayout() {
  document.body.classList.remove('desktop', 'tablet');
  document.body.classList.add('mobile');
}

/**
 * Настраивает smooth scroll для кнопки "История"
 */
function setupSmoothScroll() {
  const historyBtn = document.getElementById('history-btn');
  const historySection = document.getElementById('history-section');

  if (historyBtn && historySection) {
    historyBtn.onclick = () => {
      historySection.scrollIntoView({ behavior: 'smooth' });
    };
  }
}

/**
 * Скролл к элементу
 */
export function scrollToElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export default {
  initLayout,
  scrollToElement
};
