/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - SETTINGS UI
 *                   Модальное окно параметров простых триггеров
 * ═══════════════════════════════════════════════════════════════════
 *
 * @file ui/settingsUI.js
 * @description Модальное окно «Простые триггеры — параметры» (перетаскивание за шапку)
 * @date 17.02.2026
 */

import { createModal, closeModal, openModal, makeDraggableByHeader } from './modals.js';
import { openTriggerActionChoicePopup, openOptionalCharsPopup } from './inlinePopup.js';
import { getIncompatibleParams, getActiveParamKeys, checkParamsCompatibility } from '../logic/compatibilityChecker.js';
import { PARAM_COLORS } from '../../../core/config.js';
import { showInfo, showError } from '../../../shared/ui/notifications.js';

const SIMPLE_SETTINGS_MODAL_ID = 'simple-settings-modal';

// Глобально применимые параметры (кнопки сверху)
const GLOBAL_PARAMS = ['latinCyrillic', 'declensions'];

const PARAM_INFO = {
  latinCyrillic: { label: 'Лат/Кир ([аa])', hint: 'a → [аa], о → [оo]' },
  declensions: { label: 'Склонения (окончания|)', hint: 'актёр → актёр(а|у|ом|е|ы|ов|ам|ами|ах|)' }
};

// ═══════════════════════════════════════════════════════════════════
// ГЕНЕРАЦИЯ КОНТЕНТА
// ═══════════════════════════════════════════════════════════════════

/**
 * Преобразует старый формат params в новый { global, triggerParams }
 */
function normalizeParams(currentParams, triggersCount) {
  if (!currentParams || typeof currentParams !== 'object') {
    return { global: {}, triggerParams: [] };
  }
  if (currentParams.triggerParams && Array.isArray(currentParams.triggerParams)) {
    return {
      global: currentParams.global || {},
      triggerParams: currentParams.triggerParams
    };
  }
  // Миграция со старого формата
  const global = {
    wordBoundaries: currentParams.wordBoundaries !== false,
    requireSpaceAfter: !!currentParams.requireSpaceAfter
  };
  const triggerParams = Array(triggersCount).fill(null).map(() => ({}));
  return { global, triggerParams };
}

function generateSimpleSettingsContent(triggers, data) {
  const { global = {}, triggerParams = [] } = data;
  const wordBoundaries = global.wordBoundaries !== false;
  const requireSpace = !!global.requireSpaceAfter;

  const paramCards = GLOBAL_PARAMS.map((key) => {
    const info = PARAM_INFO[key];
    return `
      <button type="button" class="param-card" data-param="${key}" title="${info.hint}">
        <span class="param-card-label">${info.label}</span>
      </button>
    `;
  }).join('');

  return `
    <div class="simple-settings-v2">
      <div class="simple-settings-params-section">
        <div class="param-cards-row">
          ${paramCards}
          <button type="button" class="param-card" data-param="optionalChars" title="Опциональные символы (?): делает выбранные символы в триггере необязательными. Пример: пасс?ивный. Несовместим с Лат/Кир, Склонения.">
            <span class="param-card-label">(?)</span>
          </button>
          <button type="button" class="param-card ${wordBoundaries ? 'param-card-active' : ''}" data-param="wordBoundaries" title="Границы слова (\\b): для триггеров длиной 1–3 символа добавляет \\bслово\\b автоматически; для триггеров длиннее 3 символов \\b не применяется (даже при включении опции).">
            <span class="param-card-label">Границы слова (\\b)</span>
          </button>
          <button type="button" class="param-card ${requireSpace ? 'param-card-active' : ''}" data-param="requireSpaceAfter" title="Пробел после (\\s): требует пробел после триггера, например парацетамол\\s">
            <span class="param-card-label">Пробел после (\\s)</span>
          </button>
        </div>
        <p class="modal-hint simple-settings-hint">Границы слова (\\b) и Пробел после (\\s) — один клик вкл/выкл для всех триггеров (\\b автоматически только для триггеров 1–3 символа). Остальные параметры — к выделенным: клик по кнопке применяет, повторный снимает. При конфликте параметров параметр не применится — сначала снимите конфликтующий. Изменения (в том числе после «Очистить все триггеры от параметров») сохраняются после нажатия «Применить».</p>
      </div>
      <div class="simple-settings-triggers-section">
        <div class="triggers-section-header">
          <span class="triggers-title">Триггеры</span>
          <div class="triggers-actions">
            <button type="button" class="btn-pool-action" id="pool-select-all">Выбрать все</button>
            <button type="button" class="btn-pool-action" id="pool-deselect-all">Снять все</button>
            <button type="button" class="btn-pool-action" id="pool-clear-all-params">Очистить все триггеры от параметров</button>
          </div>
        </div>
        <div class="triggers-grid" id="simple-triggers-grid"></div>
        <p class="modal-hint triggers-empty-hint" id="triggers-empty-hint" style="display: none;">Добавьте триггеры в поле ввода выше.</p>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ
// ═══════════════════════════════════════════════════════════════════

function renderTriggerBadges(container, params) {
  if (!container) return;
  container.innerHTML = '';
  const labels = { latinCyrillic: 'Лат/Кир', declensions: 'Склон.', optionalChars: '(?)', wildcard: '\\w' };
  Object.entries(labels).forEach(([key, label]) => {
    const v = params[key];
    let active = false;
    if (v === true) active = true;
    else if (key === 'optionalChars') active = Array.isArray(v) && v.length > 0;
    else if (key === 'wildcard') active = v && typeof v === 'object' && v.mode;
    else if (key === 'declensions') active = v === true || (v && typeof v === 'object' && v.mode);
    if (active) {
      const span = document.createElement('span');
      span.className = `param-badge param-badge-${key}`;
      span.textContent = label;
      span.style.backgroundColor = `${(PARAM_COLORS[key] || '#888')}20`;
      span.style.color = PARAM_COLORS[key] || '#888';
      span.style.borderColor = `${(PARAM_COLORS[key] || '#888')}60`;
      container.appendChild(span);
    }
  });
}

function initSimpleSettingsModal(modalElement, triggers, data, onDataChange) {
  const grid = modalElement.querySelector('#simple-triggers-grid');
  const emptyHint = modalElement.querySelector('#triggers-empty-hint');
  if (!grid) return;

  if (triggers.length === 0) {
    if (emptyHint) emptyHint.style.display = 'block';
    return;
  }
  if (emptyHint) emptyHint.style.display = 'none';

  let { triggerParams = [] } = data;
  if (triggerParams.length !== triggers.length) {
    triggerParams = triggers.map((_, i) => ({ ...(triggerParams[i] || {}) }));
  }
  modalElement._simpleTriggerParams = triggerParams;

  const updateParamCardStates = () => {
    GLOBAL_PARAMS.forEach((paramKey) => {
      const count = triggerParams.filter((p) => p[paramKey]).length;
      const btn = modalElement.querySelector(`.param-card[data-param="${paramKey}"]`);
      if (btn) btn.classList.toggle('param-card-active', count > 0);
    });
    // Обновляем состояние кнопки optionalChars
    const optBtn = modalElement.querySelector('.param-card[data-param="optionalChars"]');
    if (optBtn) {
      const count = triggerParams.filter((p) => Array.isArray(p.optionalChars) && p.optionalChars.length > 0).length;
      optBtn.classList.toggle('param-card-active', count > 0);
    }
  };

  const applyParamToSelected = (paramKey, add) => {
    const selected = grid.querySelectorAll('.trigger-card.selected');
    if (selected.length === 0 && add) return;
    const indices = [...selected].map((el) => parseInt(el.dataset.triggerIndex, 10));

    if (add) {
      const incompatible = getIncompatibleParams(paramKey);
      for (const i of indices) {
        const p = triggerParams[i] || {};
        const activeKeys = getActiveParamKeys(p);
        const conflicting = incompatible.filter((k) => activeKeys.includes(k));
        if (conflicting.length > 0) {
          const labelNew = PARAM_INFO[paramKey]?.label || paramKey;
          const labelConf = conflicting.map((k) => PARAM_INFO[k]?.label || (k === 'optionalChars' ? 'Опциональные символы' : k === 'wildcard' ? 'Любой символ' : k)).join('», «');
          showError(`«${labelNew}» и «${labelConf}» несовместимы. Сначала снимите «${labelConf}».`, 5000);
          return;
        }
      }
    }

    indices.forEach((i) => {
      if (!triggerParams[i]) triggerParams[i] = {};
      if (add) {
        const incompatible = getIncompatibleParams(paramKey);
        incompatible.forEach((inc) => delete triggerParams[i][inc]);
        triggerParams[i][paramKey] = true;
      } else {
        delete triggerParams[i][paramKey];
      }
    });

    modalElement._simpleTriggerParams = triggerParams;
    reflowTriggerCards();
    updateParamCardStates();
    onDataChange({ ...data, triggerParams });
  };

  const reflowTriggerCards = () => {
    grid.querySelectorAll('.trigger-card').forEach((card) => {
      const i = parseInt(card.dataset.triggerIndex, 10);
      const p = triggerParams[i] || {};
      renderTriggerBadges(card.querySelector('.trigger-card-badges'), p);
      card.classList.toggle('has-params', Object.keys(p).some((k) => p[k]));
    });
  };

  triggers.forEach((triggerText, index) => {
    const card = document.createElement('div');
    card.className = 'trigger-card';
    card.dataset.triggerIndex = index;
    card.innerHTML = `
      <div class="trigger-card-text">${(triggerText || '').replace(/</g, '&lt;')}</div>
      <div class="trigger-card-badges"></div>
    `;

    card.addEventListener('click', (e) => {
      if (e.detail === 2) return;
      card.classList.toggle('selected');
      updateParamCardStates();
    });

    card.addEventListener('dblclick', () => {
      const text = (triggerText || '').trim();
      if (!text) return;
      const currentParams = triggerParams[index] || {};
      const optionalIndices = Array.isArray(currentParams.optionalChars) ? currentParams.optionalChars : [];

      openTriggerActionChoicePopup(
        card,
        text,
        // onOptionalApply
        (indices) => {
          if (!triggerParams[index]) triggerParams[index] = {};
          if (indices && indices.length > 0) {
            triggerParams[index].optionalChars = indices;
            delete triggerParams[index].wildcard;
            delete triggerParams[index].declensions;
          } else {
            delete triggerParams[index].optionalChars;
          }
          modalElement._simpleTriggerParams = triggerParams;
          reflowTriggerCards();
          onDataChange({ ...data, triggerParams });
        },
        // onWildcardApply
        (wildcardData) => {
          if (!triggerParams[index]) triggerParams[index] = {};
          if (wildcardData == null) {
            delete triggerParams[index].wildcard;
          } else {
            triggerParams[index].wildcard = wildcardData;
            delete triggerParams[index].declensions;
            delete triggerParams[index].optionalChars;
          }
          modalElement._simpleTriggerParams = triggerParams;
          reflowTriggerCards();
          onDataChange({ ...data, triggerParams });
        },
        // onParamsChange
        (newParams) => {
          if (!triggerParams[index]) triggerParams[index] = {};
          Object.assign(triggerParams[index], newParams);
          modalElement._simpleTriggerParams = triggerParams;
          reflowTriggerCards();
          onDataChange({ ...data, triggerParams });
        },
        currentParams,
        optionalIndices
      );
    });

    grid.appendChild(card);
  });

  reflowTriggerCards();
  updateParamCardStates();

  GLOBAL_PARAMS.forEach((paramKey) => {
    const btn = modalElement.querySelector(`.param-card[data-param="${paramKey}"]`);
    if (btn) {
      btn.onclick = (e) => {
        const selectedCards = grid.querySelectorAll('.trigger-card.selected');
        const selectedIndices = [...selectedCards].map((c) => parseInt(c.dataset.triggerIndex, 10));
        const firstSelectedHas = selectedIndices.length ? !!triggerParams[selectedIndices[0]]?.[paramKey] : false;
        const add = selectedIndices.length > 0 ? !firstSelectedHas : false;
        applyParamToSelected(paramKey, add);
      };
    }
  });

  ['wordBoundaries', 'requireSpaceAfter'].forEach((paramKey) => {
    const btn = modalElement.querySelector(`.param-card[data-param="${paramKey}"]`);
    if (btn) {
      btn.onclick = (e) => {
        e.preventDefault();
        btn.classList.toggle('param-card-active');
      };
    }
  });

  // Обработчик для кнопки "Опц.(?)" — открывает попап выбора символов
  const optionalBtn = modalElement.querySelector('.param-card[data-param="optionalChars"]');
  if (optionalBtn) {
    optionalBtn.onclick = () => {
      const selectedCards = grid.querySelectorAll('.trigger-card.selected');
      if (selectedCards.length === 0) {
        showError('Выберите триггер для применения опциональных символов');
        return;
      }
      if (selectedCards.length > 1) {
        showError('Опциональные символы применяются только к одному триггеру. Выберите один.');
        return;
      }
      const index = parseInt(selectedCards[0].dataset.triggerIndex, 10);
      const text = triggers[index];
      if (!text || !text.trim()) {
        showError('Триггер пуст');
        return;
      }
      const currentParams = triggerParams[index] || {};
      const currentIndices = Array.isArray(currentParams.optionalChars) ? currentParams.optionalChars : [];
      
      // Проверка совместимости
      const incompatible = getIncompatibleParams('optionalChars');
      const activeKeys = getActiveParamKeys(currentParams);
      const conflicting = incompatible.filter((k) => activeKeys.includes(k));
      if (conflicting.length > 0) {
        const labelConf = conflicting.map((k) => PARAM_INFO[k]?.label || k).join('», «');
        showError(`«Опц.(?)» и «${labelConf}» несовместимы. Сначала снимите «${labelConf}».`, 5000);
        return;
      }
      
      openOptionalCharsPopup(
        selectedCards[0],
        text,
        (indices) => {
          if (!triggerParams[index]) triggerParams[index] = {};
          if (indices && indices.length > 0) {
            // Удаляем несовместимые параметры
            incompatible.forEach((inc) => delete triggerParams[index][inc]);
            triggerParams[index].optionalChars = indices;
          } else {
            delete triggerParams[index].optionalChars;
          }
          modalElement._simpleTriggerParams = triggerParams;
          reflowTriggerCards();
          updateParamCardStates();
          onDataChange({ ...data, triggerParams });
        },
        currentIndices
      );
    };
  }

  modalElement.querySelector('#pool-select-all')?.addEventListener('click', () => {
    grid.querySelectorAll('.trigger-card').forEach((c) => c.classList.add('selected'));
    updateParamCardStates();
  });
  modalElement.querySelector('#pool-deselect-all')?.addEventListener('click', () => {
    grid.querySelectorAll('.trigger-card').forEach((c) => c.classList.remove('selected'));
    updateParamCardStates();
  });

  modalElement.querySelector('#pool-clear-all-params')?.addEventListener('click', () => {
    const wordBoundariesCard = modalElement.querySelector('.param-card[data-param="wordBoundaries"]');
    const requireSpaceCard = modalElement.querySelector('.param-card[data-param="requireSpaceAfter"]');
    triggerParams.splice(0, triggerParams.length, ...triggers.map(() => ({})));
    modalElement._simpleTriggerParams = triggerParams;
    if (wordBoundariesCard) wordBoundariesCard.classList.add('param-card-active');
    if (requireSpaceCard) requireSpaceCard.classList.remove('param-card-active');
    grid.querySelectorAll('.trigger-card').forEach((c) => c.classList.remove('selected'));
    reflowTriggerCards();
    updateParamCardStates();
    const newGlobal = { wordBoundaries: true, requireSpaceAfter: false };
    onDataChange({ ...data, global: newGlobal, triggerParams });
  });
}

// ═══════════════════════════════════════════════════════════════════
// СБОР ДАННЫХ
// ═══════════════════════════════════════════════════════════════════

function collectSimpleSettings(modalElement, triggers) {
  const wordBoundariesCard = modalElement.querySelector('.simple-settings-v2 .param-card[data-param="wordBoundaries"]');
  const requireSpaceCard = modalElement.querySelector('.simple-settings-v2 .param-card[data-param="requireSpaceAfter"]');
  const wordBoundaries = wordBoundariesCard?.classList.contains('param-card-active') !== false;
  const requireSpaceAfter = !!requireSpaceCard?.classList.contains('param-card-active');
  const triggerParams = (modalElement._simpleTriggerParams || []).slice();

  for (let i = 0; i < triggers.length; i++) {
    if (!triggerParams[i]) triggerParams[i] = {};
  }

  return {
    global: {
      wordBoundaries,
      requireSpaceAfter
    },
    triggerParams
  };
}

// Формат для конвертера: преобразуем в совместимый с parameterApplier
export function simpleDataToConverterParams(data, triggers) {
  if (!data || !triggers?.length) return {};
  const { global = {}, triggerParams = [] } = data;
  return {
    _simpleV2: true,
    global,
    triggerParams
  };
}

// ═══════════════════════════════════════════════════════════════════
// ОТКРЫТИЕ МОДАЛКИ
// ═══════════════════════════════════════════════════════════════════

export function openSimpleSettingsModal(triggers, currentParams, onSave) {
  const existing = document.getElementById(`${SIMPLE_SETTINGS_MODAL_ID}-overlay`);
  if (existing) existing.remove();

  const arr = (triggers || []).filter((t) => (t || '').trim() !== '');
  const data = normalizeParams(currentParams, arr.length);

  const content = generateSimpleSettingsContent(arr, data);

  const modal = createModal({
    id: SIMPLE_SETTINGS_MODAL_ID,
    title: 'Простые триггеры — параметры',
    content,
    size: 'simple-large',
    closeOnOverlay: false,
    buttons: [
      { text: 'Отмена', type: 'secondary', onClick: () => closeModal(SIMPLE_SETTINGS_MODAL_ID) },
      {
        text: 'Применить',
        type: 'primary',
        onClick: () => {
          const modalEl = document.getElementById(SIMPLE_SETTINGS_MODAL_ID);
          const collected = collectSimpleSettings(modalEl, arr);
          const out = simpleDataToConverterParams(collected, arr);
          if (typeof onSave === 'function') onSave(out, arr);
          closeModal(SIMPLE_SETTINGS_MODAL_ID);
        }
      }
    ]
  });

  document.body.appendChild(modal);
  const modalElement = document.getElementById(SIMPLE_SETTINGS_MODAL_ID);
  if (modalElement) {
    const header = modalElement.querySelector('.modal-header');
    if (header) makeDraggableByHeader(modalElement, header);
    let currentData = { ...data };
    initSimpleSettingsModal(modalElement, arr, currentData, (next) => {
      currentData = next;
    });
  }
  openModal(SIMPLE_SETTINGS_MODAL_ID);
}

export function openSettingsPanel() {
  const textarea = document.getElementById('simple-triggers-textarea');
  const text = textarea ? textarea.value.trim() : '';
  const triggers = text ? text.split(/\n|,/).map((t) => t.trim()).filter(Boolean) : [];
  openSimpleSettingsModal(triggers, {}, () => {});
}

export function saveSettingsData(settingsData) {
  if (typeof settingsData === 'object' && settingsData !== null) {
    console.log('Параметры простых триггеров сохранены:', settingsData);
  }
}

export default {
  openSettingsPanel,
  openSimpleSettingsModal,
  saveSettingsData,
  simpleDataToConverterParams
};
