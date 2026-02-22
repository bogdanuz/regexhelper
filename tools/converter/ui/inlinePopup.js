/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - INLINE POPUP
 *                   Inline popup для настроек триггера
 * ═══════════════════════════════════════════════════════════════════
 *
 * @file ui/inlinePopup.js
 * @description Всплывающие окна для индивидуальных настроек триггера
 * @date 21.02.2026
 */

import { showInfo, showError } from '../../../shared/ui/notifications.js';
import { makeDraggableByHeader } from './modals.js';

// ═══════════════════════════════════════════════════════════════════
// СОЗДАНИЕ INLINE POPUP — ОПЦИОНАЛЬНЫЕ СИМВОЛЫ
// ═══════════════════════════════════════════════════════════════════

/**
 * Создает inline popup для опциональных символов
 *
 * @param {HTMLElement} triggerElement - Элемент триггера
 * @param {string} triggerText - Текст триггера
 * @param {Function} onApply - Callback при применении (indices: number[])
 * @param {Array<number>} [selectedIndices=[]] - Предвыбранные индексы (для редактирования)
 * @returns {HTMLElement} Popup элемент
 */
export function createOptionalCharsPopup(triggerElement, triggerText, onApply, selectedIndices = []) {
  removeAllPopups();

  const popup = document.createElement('div');
  popup.className = 'inline-popup optional-chars-popup';
  popup.id = 'optional-chars-popup';

  const header = document.createElement('div');
  header.className = 'popup-header';
  header.innerHTML = `
    <h4>Опциональные символы</h4>
    <button type="button" class="popup-close" aria-label="Закрыть"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
  `;

  const content = document.createElement('div');
  content.className = 'popup-content';

  const charsContainer = document.createElement('div');
  charsContainer.className = 'chars-container';

  const initialSet = new Set(Array.isArray(selectedIndices) ? selectedIndices : []);

  triggerText.split('').forEach((char, index) => {
    const charItem = document.createElement('label');
    charItem.className = 'char-item';
    const checked = initialSet.has(index);
    charItem.innerHTML = `
      <input type="checkbox" name="char-${index}" value="${index}"${checked ? ' checked' : ''}>
      <span class="char-label">${char}</span>
    `;
    const input = charItem.querySelector('input');
    input.checked = checked;
    charsContainer.appendChild(charItem);
  });

  content.appendChild(charsContainer);

  const preview = document.createElement('div');
  preview.className = 'popup-preview';
  preview.innerHTML = `<label>Предпросмотр:</label><code class="optional-preview">${triggerText}</code>`;
  content.appendChild(preview);

  const updatePreview = () => {
    const indices = getSelectedIndices(popup);
    const indexSet = new Set(indices);
    let result = '';
    triggerText.split('').forEach((char, i) => {
      result += indexSet.has(i) ? `${char}?` : char;
    });
    const previewCode = popup.querySelector('.optional-preview');
    if (previewCode) previewCode.textContent = result;
  };

  charsContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', updatePreview);
  });
  updatePreview();
  requestAnimationFrame(() => updatePreview());

  const warning = document.createElement('div');
  warning.className = 'popup-warning';
  warning.textContent = 'Хотя бы один символ должен остаться обязательным.';
  content.appendChild(warning);

  const footer = document.createElement('div');
  footer.className = 'popup-footer';
  footer.innerHTML = `
    <button class="btn btn-secondary" data-action="cancel">Отмена</button>
    <button class="btn btn-primary" data-action="apply">Применить</button>
  `;

  popup.appendChild(header);
  popup.appendChild(content);
  popup.appendChild(footer);

  positionPopup(popup, triggerElement);

  popup.querySelector('.popup-close').onclick = () => removePopup(popup);
  popup.querySelector('[data-action="cancel"]').onclick = () => removePopup(popup);
  popup.querySelector('[data-action="apply"]').onclick = () => {
    const selectedIndices = getSelectedIndices(popup);

    if (selectedIndices.length >= triggerText.length) {
      showError('Хотя бы один символ должен остаться обязательным.');
      return;
    }

    onApply(selectedIndices);
    removePopup(popup);
  };

  return popup;
}

// ═══════════════════════════════════════════════════════════════════
// СОЗДАНИЕ INLINE POPUP — ЛЮБОЙ СИМВОЛ (\w)
// ═══════════════════════════════════════════════════════════════════

/**
 * Создает inline popup для "Любой символ (\w)"
 *
 * @param {HTMLElement} triggerElement - Элемент триггера
 * @param {string} triggerText - Текст триггера (корень)
 * @param {Function} onApply - Callback при применении
 * @param {Object} [currentWildcard] - Текущие настройки wildcard
 * @param {Object} [options] - Дополнительные опции
 * @param {boolean} [options.hideDisableButton] - Скрыть кнопку «Выключить»
 * @returns {HTMLElement} Popup элемент
 */
export function createWildcardPopup(triggerElement, triggerText, onApply, currentWildcard = null, options = {}) {
  removeAllPopups();

  const popup = document.createElement('div');
  popup.className = 'inline-popup wildcard-popup';
  popup.id = 'wildcard-popup';

  const currentMode = currentWildcard?.mode || 'auto';
  const currentMin = currentWildcard?.min ?? 1;
  const currentMax = currentWildcard?.max ?? 3;

  const header = document.createElement('div');
  header.className = 'popup-header';
  header.innerHTML = `
    <h4>Любой символ (\\w)</h4>
    <button type="button" class="popup-close" aria-label="Закрыть"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
  `;

  const content = document.createElement('div');
  content.className = 'popup-content';
  content.innerHTML = `
    <p class="popup-description">Добавляет <code>\\w</code> (буква, цифра, _) после триггера.</p>
    <div class="radio-group">
      <label>
        <input type="radio" name="wildcard-mode" value="auto" ${currentMode === 'auto' ? 'checked' : ''}>
        Авто (<code>\\w</code>) — ровно 1 символ
      </label>
      <label>
        <input type="radio" name="wildcard-mode" value="range" ${currentMode === 'range' ? 'checked' : ''}>
        Диапазон (<code>\\w{мин,макс}</code>)
      </label>
    </div>
    <div class="wildcard-range-inputs" style="display: ${currentMode === 'range' ? 'flex' : 'none'};">
      <div class="input-group">
        <label>Мин:</label>
        <input type="number" class="wildcard-min" value="${currentMin}" min="0" max="100">
      </div>
      <div class="input-group">
        <label>Макс:</label>
        <input type="number" class="wildcard-max" value="${currentMax}" min="1" max="100">
      </div>
    </div>
    <div class="popup-preview">
      <label>Предпросмотр:</label>
      <code class="wildcard-preview">${triggerText}\\w</code>
    </div>
  `;

  const footer = document.createElement('div');
  footer.className = 'popup-footer';
  footer.innerHTML = `
    ${options.hideDisableButton ? '' : '<button type="button" class="btn btn-secondary" data-action="disable">Выключить</button>'}
    <button class="btn btn-secondary" data-action="cancel">Отмена</button>
    <button class="btn btn-primary" data-action="apply">Применить</button>
  `;

  popup.appendChild(header);
  popup.appendChild(content);
  popup.appendChild(footer);

  positionPopup(popup, triggerElement);

  const radios = popup.querySelectorAll('input[name="wildcard-mode"]');
  const rangeInputs = popup.querySelector('.wildcard-range-inputs');
  const minInput = popup.querySelector('.wildcard-min');
  const maxInput = popup.querySelector('.wildcard-max');
  const previewCode = popup.querySelector('.wildcard-preview');

  const updatePreview = () => {
    const mode = popup.querySelector('input[name="wildcard-mode"]:checked').value;
    if (mode === 'range') {
      const min = parseInt(minInput.value, 10) || 0;
      const max = parseInt(maxInput.value, 10) || 1;
      previewCode.textContent = `${triggerText}\\w{${min},${max}}`;
    } else {
      previewCode.textContent = `${triggerText}\\w`;
    }
  };

  radios.forEach(radio => {
    radio.onchange = () => {
      rangeInputs.style.display = radio.value === 'range' ? 'flex' : 'none';
      updatePreview();
    };
  });

  minInput.oninput = updatePreview;
  maxInput.oninput = updatePreview;
  updatePreview();

  popup.querySelector('.popup-close').onclick = () => removePopup(popup);
  popup.querySelector('[data-action="cancel"]').onclick = () => removePopup(popup);
  const wildcardDisableBtn = popup.querySelector('[data-action="disable"]');
  if (wildcardDisableBtn) {
    wildcardDisableBtn.onclick = () => {
      onApply(null);
      removePopup(popup);
    };
  }
  popup.querySelector('[data-action="apply"]').onclick = () => {
    const mode = popup.querySelector('input[name="wildcard-mode"]:checked').value;
    const min = parseInt(minInput.value, 10) || 0;
    const max = parseInt(maxInput.value, 10) || 1;

    if (mode === 'range' && min > max) {
      showError('Мин не может быть больше Макс');
      return;
    }

    onApply({ mode, min, max });
    removePopup(popup);
  };

  return popup;
}

// ═══════════════════════════════════════════════════════════════════
// СОЗДАНИЕ INLINE POPUP — СКЛОНЕНИЯ
// ═══════════════════════════════════════════════════════════════════

/**
 * Создает inline popup для склонений
 *
 * @param {HTMLElement} triggerElement - Элемент триггера
 * @param {string} triggerText - Текст триггера
 * @param {Function} onApply - Callback при применении
 * @param {Object} [currentDeclensions] - Текущие настройки склонений
 * @param {Object} [options] - Дополнительные опции
 * @param {boolean} [options.hideDisableButton] - Скрыть кнопку «Выключить»
 * @returns {HTMLElement} Popup элемент
 */
export function createDeclensionsPopup(triggerElement, triggerText, onApply, currentDeclensions = null, options = {}) {
  removeAllPopups();

  const popup = document.createElement('div');
  popup.className = 'inline-popup declensions-popup';
  popup.id = 'declensions-popup';

  const isExact = currentDeclensions?.mode === 'exact';
  const currentStem = currentDeclensions?.stem || triggerText || '';
  const currentEndings = currentDeclensions?.endings || [];

  const header = document.createElement('div');
  header.className = 'popup-header';
  header.innerHTML = `
    <h4>Склонения</h4>
    <button type="button" class="popup-close" aria-label="Закрыть"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
  `;

  const content = document.createElement('div');
  content.className = 'popup-content';
  content.innerHTML = `
    <div class="radio-group">
      <label>
        <input type="radio" name="declension-mode" value="auto" ${!isExact ? 'checked' : ''}>
        Автоматически (генерирует формы)
      </label>
      <label>
        <input type="radio" name="declension-mode" value="exact" ${isExact ? 'checked' : ''}>
        Точные окончания (указать вручную)
      </label>
    </div>
    <div class="declension-info" style="margin: 8px 0; padding: 8px; background: var(--bg-secondary); border-radius: 4px; font-size: 12px; line-height: 1.4;">
      <strong>Авто-режим поддерживает:</strong>
      <ul style="margin: 4px 0 0; padding-left: 16px;">
        <li>Существительные (ед. и мн. число): дом → домов, домам...</li>
        <li>Прилагательные: красивый → красивого, красивому...</li>
        <li>Причастия: написанный → написанного, написанным...</li>
      </ul>
      <p style="margin: 6px 0 0; color: var(--text-secondary);">
        <em>Глаголы и краткие формы (красив, красива) не поддерживаются — используйте «Точные окончания» или параметр \\w.</em>
      </p>
    </div>
    <div class="declension-exact-inputs" style="display: ${isExact ? 'block' : 'none'};">
      <div class="input-group">
        <label>Корень:</label>
        <input type="text" class="declension-stem" value="${currentStem.replace(/"/g, '&quot;')}" placeholder="Например: доставк">
      </div>
      <div class="input-group">
        <label>Окончания (каждое с новой строки):</label>
        <textarea class="declension-endings" placeholder="а\nи\nой\nами" rows="4">${currentEndings.join('\n')}</textarea>
      </div>
    </div>
    <div class="popup-preview">
      <label>Предпросмотр:</label>
      <code class="declension-preview">${triggerText}(а|и|ой|...)</code>
    </div>
  `;

  const footer = document.createElement('div');
  footer.className = 'popup-footer';
  footer.innerHTML = `
    ${options.hideDisableButton ? '' : '<button type="button" class="btn btn-secondary" data-action="disable">Выключить</button>'}
    <button class="btn btn-secondary" data-action="cancel">Отмена</button>
    <button class="btn btn-primary" data-action="apply">Применить</button>
  `;

  popup.appendChild(header);
  popup.appendChild(content);
  popup.appendChild(footer);

  positionPopup(popup, triggerElement);

  const radios = popup.querySelectorAll('input[name="declension-mode"]');
  const exactInputs = popup.querySelector('.declension-exact-inputs');
  const stemInput = popup.querySelector('.declension-stem');
  const endingsTextarea = popup.querySelector('.declension-endings');
  const previewCode = popup.querySelector('.declension-preview');

  const updatePreview = () => {
    const mode = popup.querySelector('input[name="declension-mode"]:checked').value;
    if (mode === 'exact') {
      const stem = stemInput.value.trim() || triggerText;
      const endings = endingsTextarea.value.split('\n').map(e => e.trim()).filter(Boolean);
      if (endings.length > 0) {
        const preview = endings.slice(0, 3).join('|') + (endings.length > 3 ? '|...' : '');
        previewCode.textContent = `${stem}(${preview})`;
      } else {
        previewCode.textContent = `${stem}(окончания...)`;
      }
    } else {
      previewCode.textContent = `${triggerText}(а|и|ой|ами|...)`;
    }
  };

  radios.forEach(radio => {
    radio.onchange = () => {
      exactInputs.style.display = radio.value === 'exact' ? 'block' : 'none';
      updatePreview();
    };
  });

  stemInput.oninput = updatePreview;
  endingsTextarea.oninput = updatePreview;
  updatePreview();

  popup.querySelector('.popup-close').onclick = () => removePopup(popup);
  popup.querySelector('[data-action="cancel"]').onclick = () => removePopup(popup);
  const declDisableBtn = popup.querySelector('[data-action="disable"]');
  if (declDisableBtn) {
    declDisableBtn.onclick = () => {
      onApply(null);
      removePopup(popup);
    };
  }
  popup.querySelector('[data-action="apply"]').onclick = () => {
    const mode = popup.querySelector('input[name="declension-mode"]:checked').value;

    if (mode === 'exact') {
      const stem = stemInput.value.trim();
      const endings = endingsTextarea.value.split('\n').map(e => e.trim()).filter(Boolean);

      if (!stem) {
        showError('Введите корень слова');
        return;
      }
      if (endings.length === 0) {
        showError('Введите хотя бы одно окончание');
        return;
      }

      onApply({ mode: 'exact', stem, endings });
    } else {
      onApply({ mode: 'auto' });
    }

    removePopup(popup);
  };

  return popup;
}

// ═══════════════════════════════════════════════════════════════════
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ═══════════════════════════════════════════════════════════════════

function getPopupContainer() {
  return document.body;
}

let scrollPinListenerAdded = false;

function pinInlinePopupsOnScroll() {
  const popups = document.querySelectorAll('body > .inline-popup');
  popups.forEach((el) => {
    const trigger = el._pinTrigger;
    if (trigger && document.contains(trigger)) {
      positionPopup(el, trigger);
    }
  });
  if (popups.length === 0 && scrollPinListenerAdded) {
    window.removeEventListener('scroll', pinInlinePopupsOnScroll, { capture: true });
    scrollPinListenerAdded = false;
  }
}

function positionPopup(popup, triggerElement) {
  const rect = triggerElement.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  popup.style.setProperty('position', 'fixed', 'important');
  popup.style.zIndex = '9999';

  let top = rect.bottom + 8;
  let left = rect.left;

  if (left + 380 > viewportWidth) {
    left = Math.max(8, viewportWidth - 400);
  }

  if (top + 300 > viewportHeight) {
    top = Math.max(8, rect.top - 310);
  }

  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;
  popup._pinTrigger = triggerElement;

  if (!scrollPinListenerAdded) {
    scrollPinListenerAdded = true;
    window.addEventListener('scroll', pinInlinePopupsOnScroll, { capture: true, passive: true });
  }
}

function getSelectedIndices(popup) {
  const checkboxes = popup.querySelectorAll('input[type="checkbox"]');
  return Array.from(checkboxes).filter(cb => cb.checked).map(cb => parseInt(cb.value, 10));
}

function removePopup(popup) {
  if (popup) {
    popup.classList.add('closing');
    setTimeout(() => {
      popup.remove();
      if (document.querySelectorAll('body > .inline-popup').length === 0 && scrollPinListenerAdded) {
        window.removeEventListener('scroll', pinInlinePopupsOnScroll, { capture: true });
        scrollPinListenerAdded = false;
      }
    }, 200);
  }
}

export function removeAllPopups() {
  document.querySelectorAll('.inline-popup').forEach(popup => {
    popup.remove();
  });
  if (scrollPinListenerAdded) {
    window.removeEventListener('scroll', pinInlinePopupsOnScroll, { capture: true });
    scrollPinListenerAdded = false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// UNIFIED POPUP — НАСТРОЙКА ТРИГГЕРА
// ═══════════════════════════════════════════════════════════════════

const TRIGGER_PARAM_KEYS = ['latinCyrillic', 'transliteration', 'wordBoundaries', 'requireSpaceAfter'];
const TRIGGER_PARAM_INFO = {
  latinCyrillic: { label: 'Лат/Кир', hint: 'Лат/Кир: заменяет визуально похожие буквы. Пример: a → [аa], о → [оo].' },
  transliteration: { label: 'Транслит', hint: 'Транслитерация: заменяет каждую букву на кириллический и латинский варианты. Пример: roblox → [рr][оo][бb][лl][оo](кс|x). Ловит слово независимо от раскладки.' },
  wordBoundaries: { label: '(\\b)', hint: 'Границы слова: указывает границу слова в regex. Пример: дом → \\bдом\\b. При использовании со склонениями или \\w — граница только в начале.' },
  requireSpaceAfter: { label: '(\\s)', hint: 'Пробел после: добавляет \\s после триггера. Пример: дом → дом\\s. Совпадёт с пробелом, табуляцией или переводом строки.' }
};

const OPTIONAL_BUTTON_LABEL = 'Опциональные символы (?)';
const OPTIONAL_BUTTON_TITLE = 'Опциональные символы (?) — пример: пасс?ивный';
const WILDCARD_BUTTON_LABEL = 'Любой символ (\\w)';
const WILDCARD_BUTTON_TITLE = 'Любой символ (\\w) — пример: доставк\\w{1,3}';
const DECLENSIONS_BUTTON_LABEL = 'Склонения';
const DECLENSIONS_BUTTON_TITLE = 'Склонения — генерация падежных форм';

/**
 * Проверяет, активен ли параметр
 */
function isParamActiveForUI(key, value) {
  if (value === undefined || value === null) return false;
  if (key === 'optionalChars') return Array.isArray(value) && value.length > 0;
  if (key === 'wildcard') return typeof value === 'object' && value !== null && value.mode;
  if (key === 'declensions') {
    if (value === true) return true;
    return typeof value === 'object' && value !== null && value.mode;
  }
  return value === true;
}

/**
 * Открывает unified настройки триггера (для простых триггеров).
 */
export function openTriggerActionChoicePopup(triggerElement, triggerText, onOptionalApply, onWildcardApply, onParamsChange, currentParams = {}, initialOptionalIndices = [], options = {}) {
  removeAllPopups();

  const hasOptional = isParamActiveForUI('optionalChars', currentParams.optionalChars);
  const hasWildcard = isParamActiveForUI('wildcard', currentParams.wildcard);
  const hasDeclensions = isParamActiveForUI('declensions', currentParams.declensions);

  const hintHtml = '<p class="trigger-action-hint">Лат/Кир настраивается в окне параметров (кнопка «Настройки»). Здесь:</p>';

  const choice = document.createElement('div');
  choice.className = 'inline-popup trigger-action-choice-popup';
  choice.innerHTML = `
    <div class="popup-header">
      <h4>Настройка триггера</h4>
      <button type="button" class="popup-close btn-icon" aria-label="Закрыть" title="Закрыть"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="popup-content">
      <div class="trigger-action-buttons" style="margin-top:12px;">
        <button type="button" class="btn btn-secondary btn-block ${hasOptional ? 'btn-configured' : ''}" data-action="optional" title="${OPTIONAL_BUTTON_TITLE}">${OPTIONAL_BUTTON_LABEL}${hasOptional ? ' ✓' : ''}</button>
        <button type="button" class="btn btn-secondary btn-block ${hasWildcard ? 'btn-configured' : ''}" data-action="wildcard" title="${WILDCARD_BUTTON_TITLE}">${WILDCARD_BUTTON_LABEL}${hasWildcard ? ' ✓' : ''}</button>
        <button type="button" class="btn btn-secondary btn-block ${hasDeclensions ? 'btn-configured' : ''}" data-action="declensions" title="${DECLENSIONS_BUTTON_TITLE}">${DECLENSIONS_BUTTON_LABEL}${hasDeclensions ? ' ✓' : ''}</button>
      </div>
      ${hintHtml}
    </div>
    <div class="popup-footer">
      <button class="btn btn-secondary" data-action="cancel">Закрыть</button>
    </div>
  `;

  positionPopup(choice, triggerElement);
  getPopupContainer().appendChild(choice);
  makeDraggableByHeader(choice, choice.querySelector('.popup-header'));

  let state = { ...currentParams };
  if (state.optionalChars) state = { ...state, optionalChars: [...(state.optionalChars || [])] };
  if (state.wildcard) state = { ...state, wildcard: { ...state.wildcard } };
  if (state.declensions && typeof state.declensions === 'object') state = { ...state, declensions: { ...state.declensions } };


  const closeOnClickOutside = (e) => {
    if (!choice.contains(e.target)) {
      if (choice._triggerInputCleanup) choice._triggerInputCleanup();
      removePopup(choice);
      document.removeEventListener('click', closeOnClickOutside);
    }
  };
  setTimeout(() => document.addEventListener('click', closeOnClickOutside), 0);

  const closePopup = () => {
    document.removeEventListener('click', closeOnClickOutside);
    if (choice._triggerInputCleanup) choice._triggerInputCleanup();
    removePopup(choice);
  };

  choice.querySelector('.popup-close').onclick = closePopup;
  choice.querySelector('[data-action="cancel"]').onclick = closePopup;

  // Кнопка "Опциональные символы"
  choice.querySelector('[data-action="optional"]').onclick = () => {
    closePopup();
    const popup = createOptionalCharsPopup(triggerElement, triggerText, onOptionalApply, initialOptionalIndices);
    getPopupContainer().appendChild(popup);
    makeDraggableByHeader(popup, popup.querySelector('.popup-header'));
  };

  // Кнопка "Любой символ (\w)"
  choice.querySelector('[data-action="wildcard"]').onclick = () => {
    closePopup();
    const popup = createWildcardPopup(triggerElement, triggerText, (wildcardData) => {
      if (wildcardData === null) {
        delete state.wildcard;
      } else {
        state.wildcard = wildcardData;
        delete state.declensions;
        delete state.optionalChars;
      }
      onParamsChange({ ...state });
      onWildcardApply(wildcardData);
    }, currentParams.wildcard);
    getPopupContainer().appendChild(popup);
    makeDraggableByHeader(popup, popup.querySelector('.popup-header'));
  };

  // Кнопка "Склонения"
  choice.querySelector('[data-action="declensions"]').onclick = () => {
    closePopup();
    const currentDecl = typeof currentParams.declensions === 'object' ? currentParams.declensions : null;
    const popup = createDeclensionsPopup(triggerElement, triggerText, (declensionData) => {
      if (declensionData === null) {
        delete state.declensions;
      } else {
        state.declensions = declensionData;
        delete state.wildcard;
        delete state.optionalChars;
      }
      onParamsChange({ ...state });
    }, currentDecl);
    getPopupContainer().appendChild(popup);
    makeDraggableByHeader(popup, popup.querySelector('.popup-header'));
  };
}

// ═══════════════════════════════════════════════════════════════════
// ОТКРЫТИЕ ОТДЕЛЬНЫХ POPUP
// ═══════════════════════════════════════════════════════════════════

export function openOptionalCharsPopup(triggerElement, triggerText, onApply, selectedIndices = []) {
  const popup = createOptionalCharsPopup(triggerElement, triggerText, onApply, selectedIndices);
  getPopupContainer().appendChild(popup);
}

export function openWildcardPopup(triggerElement, triggerText, onApply, currentWildcard = null, options = {}) {
  const popup = createWildcardPopup(triggerElement, triggerText, onApply, currentWildcard, options);
  getPopupContainer().appendChild(popup);
}

export function openDeclensionsPopup(triggerElement, triggerText, onApply, currentDeclensions = null, options = {}) {
  const popup = createDeclensionsPopup(triggerElement, triggerText, onApply, currentDeclensions, options);
  getPopupContainer().appendChild(popup);
}

// ═══════════════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════════════

export default {
  createOptionalCharsPopup,
  createWildcardPopup,
  createDeclensionsPopup,
  openTriggerActionChoicePopup,
  openOptionalCharsPopup,
  openWildcardPopup,
  openDeclensionsPopup,
  removeAllPopups
};
