/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - BADGES
 *                   Badge система (цветные индикаторы параметров)
 * ═══════════════════════════════════════════════════════════════════
 *
 * @file ui/badges.js
 * @description Управление badge (показываются ТОЛЬКО если параметр активен)
 * @date 15.02.2026
 */

import { PARAM_COLORS } from '../../../core/config.js';

// ═══════════════════════════════════════════════════════════════════
// СОЗДАНИЕ BADGE
// ═══════════════════════════════════════════════════════════════════

/**
 * Создает badge элемент
 * 
 * @param {string} paramType - Тип параметра (latinCyrillic, declensions, optionalChars, wildcard)
 * @param {Object} options - Дополнительные опции
 * @returns {HTMLElement} Badge элемент
 * 
 * @example
 * createBadge('latinCyrillic')
 * // <span class="badge badge-latin-cyrillic">🌐 Лат/Кир</span>
 */
export function createBadge(paramType, options = {}) {
  const badge = document.createElement('span');
  badge.className = `badge badge-${paramType}`;
  badge.dataset.param = paramType;

  const info = getBadgeInfo(paramType);
  const label = options.label != null ? options.label : info.label;
  const { icon, color } = info;

  badge.style.color = color;
  badge.style.backgroundColor = `${color}15`; // 15 = opacity 0.08 в hex
  badge.style.border = `1px solid ${color}40`;

  badge.innerHTML = `${icon} ${label}`.trim();

  // Tooltip
  if (options.tooltip) {
    badge.title = options.tooltip;
  }

  // Клик на badge (открывает модалку настроек)
  if (options.onClick) {
    badge.style.cursor = 'pointer';
    badge.onclick = options.onClick;
  }

  return badge;
}

/**
 * Возвращает информацию о badge
 * 
 * @param {string} paramType - Тип параметра
 * @returns {Object} { icon, label, color }
 */
function getBadgeInfo(paramType) {
  // label — короткое отображение на badge; tooltipLabel — полное имя для tooltip (Panel_Hints 2.4)
  const info = {
    latinCyrillic: {
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
      label: 'Лат/Кир',
      tooltipLabel: 'Латиница / Кириллица — визуально похожие буквы',
      color: PARAM_COLORS.latinCyrillic
    },
    transliteration: {
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/></svg>',
      label: 'Транслит',
      tooltipLabel: 'Транслитерация — каждая буква кириллицей и латиницей',
      color: PARAM_COLORS.transliteration || '#EC4899'
    },
    declensions: {
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      label: 'Склонения',
      tooltipLabel: 'Склонения',
      color: PARAM_COLORS.declensions
    },
    optionalChars: {
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      label: '(?)',
      tooltipLabel: 'Опциональные символы (?) — напр. пасс?ивный',
      color: PARAM_COLORS.optionalChars
    },
    wildcard: {
      icon: '\\w',
      label: 'Любой символ (\\w)',
      tooltipLabel: 'Любой символ (\\w) — напр. доставк\\w{1,3}',
      color: PARAM_COLORS.wildcard || '#A78BFA'
    },
    wordBoundaries: {
      icon: '',
      label: 'Границы слова (\\b)',
      tooltipLabel: 'Границы слова (\\b) — только для триггеров 1–3 символа',
      color: PARAM_COLORS.wordBoundaries || '#06B6D4'
    },
    requireSpaceAfter: {
      icon: '',
      label: 'Пробел после (\\s)',
      tooltipLabel: 'Пробел после (\\s)',
      color: PARAM_COLORS.requireSpaceAfter || '#3B82F6'
    },
    distance: {
      icon: '',
      label: 'Соединитель',
      tooltipLabel: 'Соединитель со следующим элементом (|, .{1,7}, [\\s\\S]+ и т.д.)',
      color: (PARAM_COLORS && PARAM_COLORS.distance) || '#8B5CF6'
    }
  };

  return info[paramType] || {
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg>',
    label: 'Параметр',
    tooltipLabel: 'Параметр',
    color: '#888888'
  };
}

// ═══════════════════════════════════════════════════════════════════
// УПРАВЛЕНИЕ BADGE В ГРУППЕ/ПОДГРУППЕ
// ═══════════════════════════════════════════════════════════════════

/**
 * Проверяет, активен ли параметр в объекте params
 */
function isParamActive(params, paramType) {
  const v = params[paramType];
  if (v === true) return true;
  if (paramType === 'optionalChars') return Array.isArray(v) && v.length > 0;
  if (paramType === 'wildcard') return v && typeof v === 'object' && v.mode;
  if (paramType === 'declensions') {
    if (v === true) return true;
    return v && typeof v === 'object' && v.mode;
  }
  return false;
}

/**
 * Собирает список активных типов параметров
 */
function getActiveParamTypes(params) {
  const active = [];
  Object.keys(params || {}).forEach(paramType => {
    if (isParamActive(params, paramType)) active.push(paramType);
  });
  return active;
}

/**
 * Показывает поповер со списком параметров под сводным бейджем
 */
function showBadgePopover(container, summaryBadge, activeTypes) {
  const existing = document.getElementById('badge-popover-root');
  if (existing) {
    if (existing._outside) document.removeEventListener('click', existing._outside);
    existing.remove();
    return;
  }

  const popover = document.createElement('div');
  popover.id = 'badge-popover-root';
  popover.className = 'badge-popover';
  const list = document.createElement('div');
  list.className = 'badge-popover-list';
  activeTypes.forEach((paramType) => {
    const info = getBadgeInfo(paramType);
    const item = document.createElement('span');
    item.className = 'badge-popover-item';
    item.textContent = info.label;
    list.appendChild(item);
  });
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'badge-popover-settings btn btn-secondary';
  btn.textContent = 'Настроить';
  popover.appendChild(list);
  popover.appendChild(btn);

  const rect = summaryBadge.getBoundingClientRect();
  popover.style.position = 'fixed';
  popover.style.left = `${rect.left}px`;
  popover.style.top = `${rect.bottom + 4}px`;
  popover.style.minWidth = `${Math.max(rect.width, 140)}px`;
  document.body.appendChild(popover);

  const close = () => {
    if (popover._outside) document.removeEventListener('click', popover._outside);
    popover.remove();
  };

  const outside = (e) => {
    if (!popover.contains(e.target) && e.target !== summaryBadge) close();
  };
  popover._outside = outside;
  setTimeout(() => document.addEventListener('click', outside), 0);

  btn.onclick = (e) => {
    e.stopPropagation();
    close();
    // Открыть настройки элемента
    container.querySelector('[data-action="settings"]')?.click();
  };
}

/**
 * Обновляет badge в заголовке группы/подгруппы: один сводный бейдж «Параметры (N)» с поповером по клику.
 * 
 * @param {HTMLElement} container - Контейнер группы/подгруппы
 * @param {Object} params - Параметры
 */
export function updateBadges(container, params) {
  if (!container) return;

  let badgeContainer = container.querySelector('.badges-container');
  if (!badgeContainer) {
    const header = container.querySelector('.group-header, .subgroup-header');
    if (header) {
      badgeContainer = document.createElement('div');
      badgeContainer.className = 'badges-container';
      header.appendChild(badgeContainer);
      updateBadges(container, params);
    }
    return;
  }

  badgeContainer.innerHTML = '';

  const activeTypes = getActiveParamTypes(params);
  if (activeTypes.length > 0) {
    const summary = document.createElement('span');
    summary.className = 'badge badge-summary';
    summary.textContent = `Параметры (${activeTypes.length})`;
    summary.title = 'Параметры группы/подгруппы';
    summary.style.cursor = 'pointer';
    summary.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      showBadgePopover(container, summary, activeTypes);
    };
    badgeContainer.appendChild(summary);
  }
}

/**
 * Добавляет badge в заголовок
 * 
 * @param {HTMLElement} header - Заголовок группы/подгруппы
 * @param {string} paramType - Тип параметра
 */
export function addBadge(header, paramType) {
  if (!header) return;

  let badgeContainer = header.querySelector('.badges-container');
  if (!badgeContainer) {
    badgeContainer = document.createElement('div');
    badgeContainer.className = 'badges-container';
    header.appendChild(badgeContainer);
  }

  // Проверяем, нет ли уже такого badge
  const existing = badgeContainer.querySelector(`[data-param="${paramType}"]`);
  if (existing) return;

  const badge = createBadge(paramType);
  badgeContainer.appendChild(badge);
}

/**
 * Удаляет badge из заголовка
 * 
 * @param {HTMLElement} header - Заголовок группы/подгруппы
 * @param {string} paramType - Тип параметра
 */
export function removeBadge(header, paramType) {
  if (!header) return;

  const badgeContainer = header.querySelector('.badges-container');
  if (!badgeContainer) return;

  const badge = badgeContainer.querySelector(`[data-param="${paramType}"]`);
  if (badge) {
    badge.remove();
  }
}

/**
 * Проверяет наличие badge
 * 
 * @param {HTMLElement} header - Заголовок
 * @param {string} paramType - Тип параметра
 * @returns {boolean} true, если badge присутствует
 */
export function hasBadge(header, paramType) {
  if (!header) return false;

  const badgeContainer = header.querySelector('.badges-container');
  if (!badgeContainer) return false;

  return badgeContainer.querySelector(`[data-param="${paramType}"]`) !== null;
}

/**
 * Получает все активные badge
 * 
 * @param {HTMLElement} container - Контейнер
 * @returns {Array<string>} Массив типов параметров
 */
export function getActiveBadges(container) {
  if (!container) return [];

  const badgeContainer = container.querySelector('.badges-container');
  if (!badgeContainer) return [];

  const badges = badgeContainer.querySelectorAll('.badge');
  return Array.from(badges).map(badge => badge.dataset.param);
}

// ═══════════════════════════════════════════════════════════════════
// АНИМАЦИЯ BADGE
// ═══════════════════════════════════════════════════════════════════

/**
 * Анимирует добавление badge (fade in + slide)
 * 
 * @param {HTMLElement} badge - Badge элемент
 */
export function animateBadgeIn(badge) {
  if (!badge) return;

  badge.style.opacity = '0';
  badge.style.transform = 'translateY(-10px)';

  requestAnimationFrame(() => {
    badge.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    badge.style.opacity = '1';
    badge.style.transform = 'translateY(0)';
  });
}

/**
 * Анимирует удаление badge (fade out)
 * 
 * @param {HTMLElement} badge - Badge элемент
 * @param {Function} callback - Callback после анимации
 */
export function animateBadgeOut(badge, callback) {
  if (!badge) {
    if (callback) callback();
    return;
  }

  badge.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  badge.style.opacity = '0';
  badge.style.transform = 'translateY(-10px)';

  setTimeout(() => {
    badge.remove();
    if (callback) callback();
  }, 300);
}

// ═══════════════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════════════

export default {
  createBadge,
  updateBadges,
  addBadge,
  removeBadge,
  hasBadge,
  getActiveBadges,
  animateBadgeIn,
  animateBadgeOut
};

export { PARAM_COLORS };
