/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - MODALS
 *                   Управление модальными окнами
 * ═══════════════════════════════════════════════════════════════════
 *
 * @file ui/modals.js
 * @description Модальные окна (WIKI, REGLAMENT, Settings, History, Group Settings)
 * @date 15.02.2026
 */

import { WIKI_HTML } from '../../../shared/content/WIKI.js';
import { getIncompatibleParams } from '../logic/compatibilityChecker.js';
import { showInfo, showError, showSuccess } from '../../../shared/ui/notifications.js';
import { parseRegexPattern, analyzePatternSupport, validateRegexSyntax, analyzePatternForUI } from '../logic/regexParser.js';

// ═══════════════════════════════════════════════════════════════════
// БАЗОВАЯ МОДАЛКА
// ═══════════════════════════════════════════════════════════════════

/**
 * Создает модальное окно
 * 
 * @param {Object} options - Опции модалки
 * @param {string} options.id - ID модалки
 * @param {string} options.title - Заголовок
 * @param {string} options.content - HTML контент
 * @param {string} options.size - Размер ('small', 'medium', 'large', 'full')
 * @param {boolean} options.closeOnOverlay - Закрывать при клике на overlay
 * @returns {HTMLElement} Элемент модалки
 */
export function createModal(options) {
  const {
    id = 'modal',
    title = 'Модальное окно',
    content = '',
    size = 'medium',
    closeOnOverlay = true,
    buttons = [],
    bodyClass = ''
  } = options;

  // Создаем overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = `${id}-overlay`;

  // Создаем модалку
  const modal = document.createElement('div');
  modal.className = `modal modal-${size}`;
  modal.id = id;

  // Header
  const header = document.createElement('div');
  header.className = 'modal-header';
  header.innerHTML = `
    <h2 class="modal-title">${title}</h2>
    <button class="btn-icon modal-close" aria-label="Закрыть">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  `;

  // Body
  const body = document.createElement('div');
  body.className = bodyClass ? `modal-body ${bodyClass}` : 'modal-body';
  body.innerHTML = content;

  // Footer (если есть кнопки). Поддержка position: 'left' для кнопки слева.
  let footer = null;
  if (buttons.length > 0) {
    footer = document.createElement('div');
    footer.className = 'modal-footer';
    const leftBtns = buttons.filter((b) => b.position === 'left');
    const rightBtns = buttons.filter((b) => b.position !== 'left');
    if (leftBtns.length > 0) {
      const leftGroup = document.createElement('div');
      leftGroup.className = 'modal-footer-left';
      leftBtns.forEach((btn) => {
        const button = document.createElement('button');
        button.className = `btn btn-${btn.type || 'secondary'}`;
        button.textContent = btn.text;
        button.onclick = btn.onClick;
        leftGroup.appendChild(button);
      });
      footer.appendChild(leftGroup);
    }
    const rightGroup = document.createElement('div');
    rightGroup.className = 'modal-footer-right';
    rightBtns.forEach((btn) => {
      const button = document.createElement('button');
      button.className = `btn btn-${btn.type || 'secondary'}`;
      button.textContent = btn.text;
      button.onclick = btn.onClick;
      rightGroup.appendChild(button);
    });
    footer.appendChild(rightGroup);
  }

  // Собираем модалку
  modal.appendChild(header);
  modal.appendChild(body);
  if (footer) modal.appendChild(footer);
  overlay.appendChild(modal);

  // Обработчики
  const closeBtn = header.querySelector('.modal-close');
  closeBtn.onclick = () => closeModal(id);

  if (closeOnOverlay) {
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal(id);
      }
    };
  }

  // ESC для закрытия
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape' && document.getElementById(id)) {
      closeModal(id);
      document.removeEventListener('keydown', escHandler);
    }
  });

  return overlay;
}

/**
 * Делает окно перетаскиваемым за шапку (drag по заголовку, как у обычного окна).
 * Позиция при следующем открытии не сохраняется — каждый раз окно открывается по умолчанию.
 *
 * @param {HTMLElement} container - Элемент окна для перемещения (.modal или .inline-popup)
 * @param {HTMLElement} headerEl - Шапка (drag handle), например .modal-header или .popup-header
 */
export function makeDraggableByHeader(container, headerEl) {
  if (!container || !headerEl) return;
  headerEl.classList.add('draggable-header');
  headerEl.addEventListener('mousedown', (e) => {
    if (e.target.closest('.modal-close, .popup-close, .btn-icon[aria-label="Закрыть"]')) return;
    e.preventDefault();

    const rect = container.getBoundingClientRect();
    let startX = e.clientX;
    let startY = e.clientY;
    let left = rect.left;
    let top = rect.top;

    const wasFixed = container.style.position === 'fixed';
    const hadLeft = container.style.left !== '';
    const hadTop = container.style.top !== '';
    if (!wasFixed || !hadLeft || !hadTop) {
      container.style.position = 'fixed';
      container.style.left = `${left}px`;
      container.style.top = `${top}px`;
      container.style.margin = '0';
      container.style.transform = 'none';
    }

    const onMove = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = e.clientX;
      startY = e.clientY;
      left += dx;
      top += dy;
      container.style.left = `${left}px`;
      container.style.top = `${top}px`;
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

/**
 * Открывает модальное окно
 * 
 * @param {string} id - ID модалки
 */
export function openModal(id) {
  const overlay = document.getElementById(`${id}-overlay`);
  if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Блокируем скролл body
  }
}

/**
 * Закрывает модальное окно
 * 
 * @param {string} id - ID модалки
 */
export function closeModal(id) {
  const overlay = document.getElementById(`${id}-overlay`);
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = ''; // Разблокируем скролл

    // Confirm-модалка остаётся в DOM для повторного использования
    if (id === 'confirm-modal') return;
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }
}

// ═══════════════════════════════════════════════════════════════════
// МОДАЛКА ПОДТВЕРЖДЕНИЯ (удаление группы/подгруппы и т.д.)
// ═══════════════════════════════════════════════════════════════════

/**
 * Открывает модалку подтверждения в стиле приложения (тёмная тема, те же кнопки).
 * @param {{ title: string, message: string, onConfirm: function, onCancel?: function }} options
 */
export function openConfirmModal(options) {
  const { title = 'Подтвердите действие', message = 'Вы уверены?', onConfirm, onCancel } = options;
  const overlay = document.getElementById('confirm-modal-overlay');
  const titleEl = document.getElementById('confirm-modal-title');
  const messageEl = document.getElementById('confirm-modal-message');
  const btnOk = document.getElementById('confirm-modal-ok');
  const btnCancel = document.getElementById('confirm-modal-cancel');
  const btnClose = document.getElementById('confirm-modal-close');
  if (!overlay || !titleEl || !messageEl || !btnOk) return;

  const close = () => {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  titleEl.textContent = title;
  messageEl.textContent = message;

  const handleConfirm = () => {
    close();
    if (typeof onConfirm === 'function') onConfirm();
  };
  const handleCancel = () => {
    close();
    if (typeof onCancel === 'function') onCancel();
  };

  btnOk.onclick = handleConfirm;
  btnCancel.onclick = handleCancel;
  btnClose.onclick = handleCancel;
  overlay.onclick = (e) => {
    if (e.target === overlay) handleCancel();
  };
  const modal = document.getElementById('confirm-modal');
  if (modal) modal.onclick = (e) => e.stopPropagation();

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// ═══════════════════════════════════════════════════════════════════
// МОДАЛКА WIKI
// ═══════════════════════════════════════════════════════════════════

/**
 * Открывает модалку WIKI
 */
export function openWikiModal() {
  // Удаляем предыдущую, если есть
  const existing = document.getElementById('wiki-modal-overlay');
  if (existing) existing.remove();

  const modal = createModal({
    id: 'wiki-modal',
    title: 'Помощь — руководство по конвертеру',
    content: WIKI_HTML,
    size: 'extra-large',
    closeOnOverlay: true
  });

  document.body.appendChild(modal);
  openModal('wiki-modal');

  // Инициализируем внутреннюю навигацию
  initWikiNavigation();
}

/**
 * Инициализирует навигацию внутри WIKI
 */
function initWikiNavigation() {
  const modal = document.getElementById('wiki-modal');
  if (!modal) return;

  const modalBody = modal.querySelector('.modal-body');
  if (!modalBody) return;

  // Навигация по оглавлению
  const navLinks = modal.querySelectorAll('.wiki-nav a');
  navLinks.forEach((link) => {
    link.onclick = (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href')?.substring(1);
      if (!targetId) return;
      const targetSection = modal.querySelector(`#${targetId}`);
      if (targetSection) {
        modalBody.scrollTo({
          top: targetSection.offsetTop - 20,
          behavior: 'smooth'
        });
      }
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// МОДАЛКА НАСТРОЕК ГРУППЫ
// ═══════════════════════════════════════════════════════════════════

/**
 * Открывает модалку настроек группы/подгруппы (Лат/Кир, Склонения, Корень и т.д.).
 * Не используется: в текущем UI параметры задаются только у триггеров (2× клик по полю триггера);
 * корень — только в шапке подгруппы. Оставлено для совместимости и возможного использования в будущем.
 *
 * @param {Object} group - Данные группы
 * @param {Function} onSave - Callback при сохранении
 */
export function openGroupSettingsModal(group, onSave) {
  const existing = document.getElementById('group-settings-modal-overlay');
  if (existing) existing.remove();

  const isSubgroup = group.modalType === 'subgroup';
  const content = generateGroupSettingsContent(group, isSubgroup);
  const title = isSubgroup
    ? `Настройки подгруппы: ${group.name || 'Без названия'}`
    : `Настройки группы: ${group.name || 'Без названия'}`;

  const modal = createModal({
    id: 'group-settings-modal',
    title,
    content,
    size: 'large',
    closeOnOverlay: false,
    buttons: [
      {
        text: 'Очистить',
        type: 'secondary',
        position: 'left',
        onClick: () => clearGroupSettingsParamsInModal()
      },
      {
        text: 'Отмена',
        type: 'secondary',
        onClick: () => closeModal('group-settings-modal')
      },
      {
        text: 'Применить',
        type: 'primary',
        onClick: () => {
          const updatedGroup = collectGroupSettings(group.id);
          onSave(updatedGroup);
          closeModal('group-settings-modal');
        }
      }
    ]
  });

  document.body.appendChild(modal);
  openModal('group-settings-modal');
  initGroupSettingsParamCards(modal);
}

/**
 * Сбрасывает все параметры в открытой модалке настроек группы/подгруппы (все кнопки — неактивны).
 */
function clearGroupSettingsParamsInModal() {
  const modal = document.getElementById('group-settings-modal');
  if (!modal) return;
  const container = modal.querySelector('.group-settings-v2');
  if (!container) return;
  container.querySelectorAll('.param-card[data-param]').forEach((btn) => {
    btn.classList.remove('param-card-active');
  });
}

/** Параметры для модалки группы/подгруппы (модалка не используется в UI) */
const GROUP_PARAM_KEYS = ['latinCyrillic', 'declensions'];
const GROUP_PARAM_INFO = {
  latinCyrillic: { label: 'Лат/Кир ([аa])', hint: 'a → [аa], о → [оo]' },
  declensions: { label: 'Склонения (окончания|)', hint: 'актёр → актёр(а|у|ом|е|ы|ов|ам|ами|ах|)' }
};
const GROUP_OPTION_KEYS = [
  { key: 'wordBoundaries', label: 'Границы слова (\\b)', title: 'Границы слова (\\b): для триггеров 1–3 символа добавляет \\bслово\\b автоматически; для триггеров длиннее 3 символов \\b не применяется.' },
  { key: 'requireSpaceAfter', label: 'Пробел после (\\s)', title: 'Пробел после (\\s): требовать пробел после триггера, например парацетамол\\s' }
];

/**
 * Генерирует контент модалки настроек группы/подгруппы (не используется в UI).
 * @param {boolean} [_isSubgroup] - true для подгруппы (не используется после удаления корня).
 */
function generateGroupSettingsContent(group, _isSubgroup = false) {
  const wordBoundaries = group.params?.wordBoundaries !== false;
  const requireSpace = !!group.params?.requireSpaceAfter;
  const paramCards = GROUP_PARAM_KEYS.map((key) => {
    const info = GROUP_PARAM_INFO[key];
    const active = !!group.params?.[key];
    return `
      <button type="button" class="param-card ${active ? 'param-card-active' : ''}" data-param="${key}" title="${info.hint}">
        <span class="param-card-label">${info.label}</span>
      </button>
    `;
  }).join('');

  const optionCards = GROUP_OPTION_KEYS.map((opt) => {
    const active = opt.key === 'wordBoundaries' ? wordBoundaries : requireSpace;
    return `
      <button type="button" class="param-card ${active ? 'param-card-active' : ''}" data-param="${opt.key}" title="${opt.title}">
        <span class="param-card-label">${opt.label}</span>
      </button>
    `;
  }).join('');

  return `
    <div class="group-settings-v2">
      <div class="group-settings-params-section">
        <div class="param-cards-row">
          ${paramCards}
          ${optionCards}
        </div>
        <p class="modal-hint group-settings-hint">Клик по кнопке → вкл/выкл для всей группы. При конфликте параметров параметр не применится — сначала снимите конфликтующий. Префикс и опциональные символы — у каждого триггера (2× клик по полю триггера).</p>
      </div>
    </div>
  `;
}

/**
 * Инициализирует кнопки параметров в модалке настроек группы/подгруппы (toggle по клику, обводка).
 * При конфликте параметров параметр не применяется — тост «Сначала снимите …».
 */
function initGroupSettingsParamCards(modalElement) {
  const container = modalElement.querySelector('.group-settings-v2');
  if (!container) return;

  const cards = container.querySelectorAll('.param-card[data-param]');
  cards.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (e.target.closest('input[type="number"]')) return;

      const paramKey = btn.dataset.param;
      const isTurningOn = !btn.classList.contains('param-card-active');

      if (isTurningOn && GROUP_PARAM_KEYS.includes(paramKey)) {
        const incompatible = getIncompatibleParams(paramKey);
        const conflictingLabels = [];
        incompatible.forEach((incKey) => {
          const otherCard = container.querySelector(`.param-card[data-param="${incKey}"]`);
          if (otherCard?.classList.contains('param-card-active') && GROUP_PARAM_INFO[incKey]) {
            conflictingLabels.push(GROUP_PARAM_INFO[incKey].label);
          }
        });
        if (conflictingLabels.length > 0) {
          const labelNew = GROUP_PARAM_INFO[paramKey]?.label || paramKey;
          showError(`«${labelNew}» и «${conflictingLabels.join('», «')}» несовместимы. Сначала снимите «${conflictingLabels.join('», «')}».`, 5000);
          return;
        }
      }

      btn.classList.toggle('param-card-active');
    });
  });
}

/**
 * Собирает настройки группы из модалки (кнопки параметров + чекбоксы).
 * optionalChars и prefix не применяются к группе/подгруппе — только к триггеру; в params передаём false.
 */
function collectGroupSettings(groupId) {
  const modal = document.getElementById('group-settings-modal');
  if (!modal) return { id: groupId, params: {} };

  const paramActive = (key) => {
    const card = modal.querySelector(`.group-settings-v2 .param-card[data-param="${key}"]`);
    return card ? card.classList.contains('param-card-active') : false;
  };

  const wordBoundaries = paramActive('wordBoundaries');
  const requireSpaceAfter = paramActive('requireSpaceAfter');

  return {
    id: groupId,
    params: {
      latinCyrillic: paramActive('latinCyrillic'),
      declensions: paramActive('declensions'),
      wordBoundaries,
      requireSpaceAfter,
      optionalChars: false,
      prefix: false
    }
  };
}

// ═══════════════════════════════════════════════════════════════════
// МОДАЛКА ИМПОРТА ПАТТЕРНА (V2 с overlay подсветкой)
// ═══════════════════════════════════════════════════════════════════

/**
 * Открывает модалку для импорта regex паттерна с overlay подсветкой
 * @param {{ onImport: function, hasElements: boolean }} options
 */
export function openImportPatternModal(options) {
  const { onImport, hasElements = false } = options;
  
  const existing = document.getElementById('import-pattern-modal-overlay');
  if (existing) existing.remove();
  
  const content = `
    <div class="import-pattern-container">
      <div class="import-pattern-input-section">
        <label for="import-pattern-textarea" class="import-pattern-label">
          Вставьте регулярное выражение:
        </label>
        <div class="import-pattern-overlay-wrap">
          <div class="import-pattern-highlight-layer" id="import-pattern-highlight-layer" aria-hidden="true"></div>
          <textarea 
            id="import-pattern-textarea" 
            class="import-pattern-textarea-overlay" 
            placeholder="Например: \\b(кот|собака).{1,10}(дом|квартира)\\b"
            spellcheck="false"
            rows="5"
          ></textarea>
        </div>
        <div class="import-pattern-validation" id="import-pattern-validation"></div>
      </div>
      
      <div class="import-pattern-warnings" id="import-pattern-warnings"></div>
      
      <div class="import-pattern-analysis-v2" id="import-pattern-analysis">
        <div class="import-analysis-placeholder">
          Введите regex-паттерн для анализа
        </div>
      </div>
    </div>
  `;
  
  const modal = createModal({
    id: 'import-pattern-modal',
    title: 'Импорт паттерна (обратный конвертер)',
    content,
    size: 'large',
    closeOnOverlay: true,
    bodyClass: 'import-pattern-modal-body',
    buttons: [
      {
        text: 'Отмена',
        type: 'secondary',
        onClick: () => closeModal('import-pattern-modal')
      },
      {
        text: 'Разобрать в конструктор',
        type: 'primary',
        onClick: () => handleImportClick(onImport, hasElements)
      }
    ]
  });
  
  // Добавляем класс для увеличенной модалки
  const modalEl = modal.querySelector('.modal');
  if (modalEl) {
    modalEl.classList.add('modal-import-pattern');
  }
  
  document.body.appendChild(modal);
  openModal('import-pattern-modal');
  
  // Инициализация логики
  initImportPatternModal();
}

/**
 * Инициализирует логику модалки импорта с overlay
 */
function initImportPatternModal() {
  const textarea = document.getElementById('import-pattern-textarea');
  const highlightLayer = document.getElementById('import-pattern-highlight-layer');
  const analysisContainer = document.getElementById('import-pattern-analysis');
  const validationContainer = document.getElementById('import-pattern-validation');
  const warningsContainer = document.getElementById('import-pattern-warnings');
  
  if (!textarea || !analysisContainer || !highlightLayer) return;
  
  let debounceTimer = null;
  
  // Обновление overlay при вводе
  const updateOverlay = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      analyzeInputV2(textarea.value, highlightLayer, analysisContainer, validationContainer, warningsContainer);
    }, 200);
  };
  
  textarea.addEventListener('input', updateOverlay);
  
  // Синхронизация скролла
  textarea.addEventListener('scroll', () => {
    highlightLayer.scrollTop = textarea.scrollTop;
    highlightLayer.scrollLeft = textarea.scrollLeft;
  });
  
  // Начальная синхронизация размера
  const syncSize = () => {
    highlightLayer.style.width = textarea.clientWidth + 'px';
    highlightLayer.style.height = textarea.clientHeight + 'px';
  };
  syncSize();
  
  // ResizeObserver для синхронизации при изменении размера
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(syncSize);
    ro.observe(textarea);
  }
  
  textarea.focus();
}

/**
 * Анализирует введённый паттерн и показывает результат с подсветкой
 */
function analyzeInputV2(pattern, highlightLayer, analysisContainer, validationContainer, warningsContainer) {
  // Пустой паттерн
  if (!pattern || !pattern.trim()) {
    highlightLayer.innerHTML = '';
    warningsContainer.innerHTML = '';
    analysisContainer.innerHTML = `
      <div class="import-analysis-placeholder">
        Введите regex-паттерн для анализа
      </div>
    `;
    validationContainer.innerHTML = '';
    validationContainer.className = 'import-pattern-validation';
    return;
  }
  
  // Получаем полный анализ с подсветками
  const uiAnalysis = analyzePatternForUI(pattern);
  
  // Валидация
  if (!uiAnalysis.summary.valid) {
    validationContainer.innerHTML = `
      <span class="validation-icon">❌</span>
      <span class="validation-text">${escapeHtml(uiAnalysis.warnings[0]?.message || 'Ошибка')}</span>
    `;
    validationContainer.className = 'import-pattern-validation validation-error';
    
    // Подсветка ошибок в overlay
    highlightLayer.innerHTML = buildHighlightHtml(pattern, uiAnalysis.highlights);
    
    analysisContainer.innerHTML = `
      <div class="import-analysis-error">
        Исправьте ошибку в регулярном выражении
      </div>
    `;
    warningsContainer.innerHTML = '';
    return;
  }
  
  // Валидный синтаксис
  validationContainer.innerHTML = `
    <span class="validation-icon">✅</span>
    <span class="validation-text">Синтаксис валиден</span>
  `;
  validationContainer.className = 'import-pattern-validation validation-success';
  
  // Подсветка в overlay
  highlightLayer.innerHTML = buildHighlightHtml(pattern, uiAnalysis.highlights);
  
  // Предупреждения внизу
  if (uiAnalysis.warnings.length > 0) {
    const uniqueWarnings = deduplicateWarnings(uiAnalysis.warnings);
    warningsContainer.innerHTML = uniqueWarnings.map(w => {
      const warnClass = w.type === 'unrecognized' ? 'warning-error' 
                      : w.type === 'translitOrLatinCyrillic' ? 'warning-info'
                      : 'warning-warning';
      const icon = w.type === 'unrecognized' ? '❌' 
                 : w.type === 'translitOrLatinCyrillic' ? 'ℹ️'
                 : '⚠️';
      return `
        <div class="import-warning-item ${warnClass}">
          <span class="import-warning-icon">${icon}</span>
          <div class="import-warning-text">
            ${escapeHtml(w.message)}
            ${w.fragment ? `<code class="import-warning-fragment">${escapeHtml(w.fragment)}</code>` : ''}
          </div>
        </div>
      `;
    }).join('');
  } else {
    warningsContainer.innerHTML = '';
  }
  
  // Анализ — статистика и параметры
  const { summary } = uiAnalysis;
  
  let html = '';
  
  // Статистика
  html += `<div class="import-analysis-stats">`;
  html += `
    <div class="import-stat-item">
      <span class="import-stat-icon">📝</span>
      <span class="import-stat-label">Триггеров:</span>
      <span class="import-stat-value">${summary.triggerCount}</span>
    </div>
  `;
  if (summary.groupCount > 0) {
    html += `
      <div class="import-stat-item">
        <span class="import-stat-icon">📁</span>
        <span class="import-stat-label">Групп:</span>
        <span class="import-stat-value">${summary.groupCount}</span>
      </div>
    `;
  }
  html += `</div>`;
  
  // Распознанные параметры
  if (summary.detectedParams && summary.detectedParams.length > 0) {
    html += `<div class="import-detected-params">`;
    html += `<span style="color: var(--color-text-secondary); font-size: 13px; margin-right: 8px;">Распознанные параметры:</span>`;
    summary.detectedParams.forEach(param => {
      const label = getParamLabel(param);
      html += `<span class="import-param-badge">${label}</span>`;
    });
    html += `</div>`;
  }
  
  // Предупреждения о проблемах
  if (summary.hasErrors) {
    html += `
      <div class="import-analysis-section" style="margin-top: 12px;">
        <div class="import-analysis-header import-analysis-warning">
          <span class="analysis-icon">⚠️</span>
          <span>Есть нераспознанные фрагменты — проверьте предупреждения выше</span>
        </div>
      </div>
    `;
  } else if (summary.hasWarnings) {
    html += `
      <div class="import-analysis-section" style="margin-top: 12px;">
        <div class="import-analysis-header import-analysis-info">
          <span class="analysis-icon">ℹ️</span>
          <span>Есть примечания — проверьте после импорта</span>
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="import-analysis-section" style="margin-top: 12px;">
        <div class="import-analysis-header import-analysis-success">
          <span class="analysis-icon">✅</span>
          <span>Паттерн полностью распознан и готов к импорту</span>
        </div>
      </div>
    `;
  }
  
  analysisContainer.innerHTML = html;
}

/**
 * Строит HTML для подсветки с учётом позиций highlights
 */
function buildHighlightHtml(text, highlights) {
  if (!highlights || highlights.length === 0) {
    return escapeHtml(text);
  }
  
  // Сортируем highlights по позиции
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  
  // Собираем HTML с подсветкой
  let result = '';
  let lastEnd = 0;
  
  for (const h of sorted) {
    // Текст до подсветки
    if (h.start > lastEnd) {
      result += escapeHtml(text.slice(lastEnd, h.start));
    }
    
    // Подсвеченный фрагмент
    const fragment = text.slice(h.start, h.end);
    const className = h.type === 'error' ? 'import-highlight-error'
                    : h.type === 'warning' ? 'import-highlight-warning'
                    : h.type === 'success' ? 'import-highlight-success'
                    : 'import-highlight-info';
    
    result += `<span class="${className}" title="${escapeHtml(h.message || '')}">${escapeHtml(fragment)}</span>`;
    lastEnd = h.end;
  }
  
  // Оставшийся текст
  if (lastEnd < text.length) {
    result += escapeHtml(text.slice(lastEnd));
  }
  
  return result;
}

/**
 * Удаляет дубликаты предупреждений
 */
function deduplicateWarnings(warnings) {
  const seen = new Set();
  return warnings.filter(w => {
    const key = w.message + (w.fragment || '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Возвращает человекочитаемое название параметра
 */
function getParamLabel(param) {
  const labels = {
    latinCyrillic: 'Лат/Кир',
    transliteration: 'Транслитерация',
    wordBoundaries: 'Границы слова (\\b)',
    requireSpaceAfter: 'Пробел после (\\s)',
    optionalChars: 'Опциональные символы',
    wildcard: 'Любой символ (\\w)',
    declensions: 'Склонения'
  };
  return labels[param] || param;
}

/**
 * Подсчитывает количество триггеров
 */
function countTriggers(elements) {
  let count = 0;
  for (const el of elements) {
    if (el.type === 'trigger') count++;
    if (el.type === 'group' && el.children) {
      count += countTriggers(el.children);
    }
  }
  return count;
}

/**
 * Подсчитывает количество групп
 */
function countGroups(elements) {
  let count = 0;
  for (const el of elements) {
    if (el.type === 'group') {
      count++;
      if (el.children) count += countGroups(el.children);
    }
  }
  return count;
}

/**
 * Обработчик клика по кнопке "Разобрать"
 */
function handleImportClick(onImport, hasElements) {
  const textarea = document.getElementById('import-pattern-textarea');
  if (!textarea) return;
  
  const pattern = textarea.value.trim();
  
  if (!pattern) {
    showError('Введите регулярное выражение');
    return;
  }
  
  // Валидация
  const validation = validateRegexSyntax(pattern);
  if (!validation.valid) {
    showError(validation.error || 'Невалидный regex');
    return;
  }
  
  // Парсинг
  const result = parseRegexPattern(pattern);
  
  if (!result.success) {
    showError(result.error || 'Ошибка парсинга');
    return;
  }
  
  if (!result.elements || result.elements.length === 0) {
    showError('Не удалось распознать элементы в паттерне');
    return;
  }
  
  // Проверяем наличие ошибок
  const hasErrors = result.highlights && result.highlights.some(h => h.type === 'error');
  const warningCount = result.warnings ? result.warnings.length : 0;
  
  const triggerCount = countTriggers(result.elements);
  const groupCount = countGroups(result.elements);
  
  // Если есть элементы в конструкторе — запросить подтверждение
  if (hasElements) {
    let confirmMessage = 'Текущие триггеры и группы будут заменены.';
    if (hasErrors || warningCount > 0) {
      confirmMessage += ` Есть ${warningCount} предупреждение(й) — проверьте результат после импорта.`;
    }
    confirmMessage += ' Продолжить?';
    
    openConfirmModal({
      title: 'Заменить содержимое?',
      message: confirmMessage,
      onConfirm: () => {
        closeModal('import-pattern-modal');
        if (typeof onImport === 'function') {
          onImport(result.elements);
        }
        showSuccess(`Импортировано: ${triggerCount} триггер(ов)${groupCount > 0 ? `, ${groupCount} групп(а)` : ''}`);
      }
    });
  } else {
    // Если есть предупреждения — показать подтверждение
    if (hasErrors || warningCount > 0) {
      openConfirmModal({
        title: 'Импортировать с предупреждениями?',
        message: `Есть ${warningCount} предупреждение(й). Проверьте и исправьте результат в конструкторе после импорта. Продолжить?`,
        onConfirm: () => {
          closeModal('import-pattern-modal');
          if (typeof onImport === 'function') {
            onImport(result.elements);
          }
          showSuccess(`Импортировано: ${triggerCount} триггер(ов)${groupCount > 0 ? `, ${groupCount} групп(а)` : ''}`);
        }
      });
    } else {
      closeModal('import-pattern-modal');
      if (typeof onImport === 'function') {
        onImport(result.elements);
      }
      showSuccess(`Импортировано: ${triggerCount} триггер(ов)${groupCount > 0 ? `, ${groupCount} групп(а)` : ''}`);
    }
  }
}

/**
 * Экранирование HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ═══════════════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════════════

export default {
  createModal,
  openModal,
  closeModal,
  openConfirmModal,
  openWikiModal,
  openGroupSettingsModal,
  openImportPatternModal
};
