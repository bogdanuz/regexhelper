/**
 * RegexHelper — инициализация приложения
 * @file tools/converter/app.js
 */

// ═══════════════════════════════════════════════════════════════════
// ИМПОРТЫ
// ═══════════════════════════════════════════════════════════════════

// UI
import { openWikiModal, openConfirmModal, openImportPatternModal } from './ui/modals.js';
import { initResultPanel, displayResult, clearResult } from './ui/resultPanel.js';
import { displayHistory, initFullHistoryHandlers } from './ui/historyUI.js';
import { initLayout } from './ui/layoutManager.js';
import { updateBadges } from './ui/badges.js';
import { showSuccess, showError, showInfo } from '../../shared/ui/notifications.js';
import { resetVisualizerPanel } from '../visualizer/app.js';
import { resetTesterPanel } from '../tester/app.js';
import { RESET_MODAL } from './resetModalConfig.js';
import { createWildcardPopup, createDeclensionsPopup, createOptionalCharsPopup, removeAllPopups } from './ui/inlinePopup.js';
import { initLinkedBuilder, getBuilderData, setBuilderData } from './ui/linkedBuilder.js';
import { convertLinkedBuilder } from './logic/linkedBuilderConverter.js';

// Логика
import { convert } from './logic/conversionManager.js';
import { parseSimpleTriggers } from './logic/simpleConverter.js';

// Storage
import {
  getHistory,
  clearHistory,
  saveToHistory,
  cleanHistoryOlderThan7Days,
  getSimpleTriggersText,
  saveSimpleTriggersText,
  getSimpleParams,
  saveSimpleParams,
  saveLinkedStructure
} from '../../shared/utils/storage.js';
import { STORAGE_KEYS } from '../../core/config.js';

// ═══════════════════════════════════════════════════════════════════
// ГЛОБАЛЬНОЕ СОСТОЯНИЕ
// ═══════════════════════════════════════════════════════════════════

export const AppState = {
  currentMode: 'simple', // 'simple' или 'linked'
  linkedGroups: [],
  simpleTriggersText: '',
  /** Параметры для простых триггеров (из модалки "⚙️ Настройки параметров") */
  simpleTriggersParams: {},
  /** Список триггеров на момент последнего «Применить» — при изменении списка (по словам) параметры сбрасываются */
  simpleTriggersAtLastApply: null,
  lastConversionData: null,
  settings: {
    autoSave: true,
    maxHistory: 300
  }
};

// ═══════════════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ═══════════════════════════════════════════════════════════════════

/**
 * Главная функция инициализации
 */
export function initApp() {
  console.log('RegexHelper: инициализация...');

  // 1. Инициализация layout
  initLayout();

  // 2. Инициализация UI компонентов
  initUIComponents();

  // 3. Инициализация обработчиков событий
  initEventHandlers();

  // 4. Очистка истории старше 12 ч и загрузка
  cleanHistoryOlderThan7Days();
  displayHistory();

  // 5. Загрузка сохранённых данных
  loadSavedSimpleTriggers();
  loadSavedSimpleParams();
  if (AppState.simpleTriggersAtLastApply == null) {
    AppState.simpleTriggersAtLastApply = parseSimpleTriggers(getSimpleTriggersText() || '');
  }
  // 6. Инициализация нового конструктора связанных триггеров
  const linkedBuilderRoot = document.getElementById('linked-builder-root');
  if (linkedBuilderRoot) {
    initLinkedBuilder(linkedBuilderRoot, {
      onConvert: handleConvertLinkedBuilder,
      onStateChange: () => {
        // Автосохранение обрабатывается внутри linkedBuilder
      }
    });
  }

  // 8. Подсказка для новых пользователей
  initFirstTimeHint();

  console.log('RegexHelper готов к работе');
}

/**
 * Инициализирует UI компоненты
 */
function initUIComponents() {
  // Панель результата
  initResultPanel();

  // Кнопки header
  const wikiBtn = document.getElementById('wiki-btn');
  if (wikiBtn) {
    wikiBtn.onclick = openWikiModal;
  }

  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.onclick = resetAll;
  }

  // Полная история: модалка
  initFullHistoryHandlers();

  // Навигация в шапке: подчёркивание под выбранным инструментом
  initHeaderNav();
}

/**
 * Навигация в шапке: при клике и при скролле подчёркивание переходит под активный раздел (Конвертер / История).
 */
function initHeaderNav() {
  const headerNav = document.querySelector('.header-nav');
  const converterSection = document.getElementById('converter-section');
  const visualizerSection = document.getElementById('visualizer');
  const testerSection = document.getElementById('tester');
  const historySection = document.getElementById('history-section');
  if (!headerNav || !converterSection || !historySection) return;

  const navLinks = headerNav.querySelectorAll('.nav-link:not(.disabled)');
  const linkByHref = {};
  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href?.startsWith('#')) linkByHref[href.slice(1)] = link;
  });

  function setActiveNav(sectionId) {
    navLinks.forEach((l) => l.classList.remove('active'));
    const link = linkByHref[sectionId];
    if (link) link.classList.add('active');
  }

  // Клик по ссылке
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      const href = link.getAttribute('href');
      if (href?.startsWith('#')) setActiveNav(href.slice(1));
    });
  });

  // Скролл: какой раздел в зоне видимости — тот и активен
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        if (id && linkByHref[id]) setActiveNav(id);
      });
    },
    { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
  );
  observer.observe(converterSection);
  if (visualizerSection) observer.observe(visualizerSection);
  if (testerSection) observer.observe(testerSection);
  observer.observe(historySection);
}

/**
 * Инициализирует переключение режима панели (Простые / Связанные)
 */
function initPanelModeSwitch() {
  const triggersPanel = document.getElementById('triggers-panel');
  const modeSwitch = document.getElementById('panel-mode-switch');
  const modeIcon = document.getElementById('panel-mode-icon');
  const modeTitle = document.getElementById('panel-mode-title');
  const modeHint = document.getElementById('panel-mode-hint');
  const contentLinked = document.getElementById('panel-content-linked');
  const contentSimple = document.getElementById('panel-content-simple');

  if (!triggersPanel || !modeSwitch) return;

  // Иконки для разных режимов
  const iconLinked = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
  const iconSimple = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';

  // Подсказки
  const tooltipLinked = 'Визуальный конструктор regex: добавляйте триггеры, группируйте и соединяйте. Нажмите, чтобы переключить на простые.';
  const tooltipSimple = 'Триггеры, соединяемые через альтернацию (|), без сложных связей. Нажмите, чтобы переключить на связанные.';
  const hintLinked = 'Конструктор регулярных выражений со сложными связями. Добавляйте триггеры, группируйте их и настраивайте соединители.';
  const hintSimple = 'Слова, соединяемые через альтернацию (|). Каждое слово — с новой строки.';

  const clearSimplePanelBtn = document.getElementById('clear-simple-panel-btn');
  const clearLinkedPanelBtn = document.getElementById('clear-linked-panel-btn');

  function switchMode(newMode) {
    const currentMode = triggersPanel.dataset.mode;
    if (newMode === currentMode) return;

    triggersPanel.dataset.mode = newMode;

    if (newMode === 'simple') {
      modeIcon.innerHTML = iconSimple;
      modeTitle.textContent = 'Простые триггеры';
      modeSwitch.title = tooltipSimple;
      modeHint.textContent = hintSimple;
      contentLinked.style.display = 'none';
      contentSimple.style.display = 'flex';
      contentSimple.style.animation = 'none';
      void contentSimple.offsetHeight;
      contentSimple.style.animation = 'fadeIn 0.25s ease';
      if (clearSimplePanelBtn) clearSimplePanelBtn.style.display = 'inline-flex';
      if (clearLinkedPanelBtn) clearLinkedPanelBtn.style.display = 'none';
    } else {
      modeIcon.innerHTML = iconLinked;
      modeTitle.textContent = 'Связанные триггеры';
      modeSwitch.title = tooltipLinked;
      modeHint.textContent = hintLinked;
      contentSimple.style.display = 'none';
      contentLinked.style.display = 'flex';
      contentLinked.style.animation = 'none';
      void contentLinked.offsetHeight;
      contentLinked.style.animation = 'fadeIn 0.25s ease';
      if (clearSimplePanelBtn) clearSimplePanelBtn.style.display = 'none';
      if (clearLinkedPanelBtn) clearLinkedPanelBtn.style.display = 'inline-flex';
    }
  }

  modeSwitch.addEventListener('click', () => {
    const currentMode = triggersPanel.dataset.mode;
    const newMode = currentMode === 'linked' ? 'simple' : 'linked';
    switchMode(newMode);
  });
}

/**
 * Инициализирует обработчики событий
 */
function initEventHandlers() {
  // Кнопка "Конвертировать" — конвертирует в зависимости от активного режима
  const convertBtn = document.getElementById('convert-btn');
  if (convertBtn) {
    convertBtn.onclick = handleConvert;
  }

  // Кнопка "Конвертировать" в панели простых триггеров (со скроллом к результату)
  const convertSimpleBtn = document.getElementById('convert-simple-btn');
  if (convertSimpleBtn) {
    convertSimpleBtn.onclick = () => {
      handleConvertSimple();
    };
  }

  // Переключение режима панели (простые / связанные)
  initPanelModeSwitch();
  
  // Кнопка "Импорт паттерна" для связанных триггеров
  const importPatternBtn = document.getElementById('import-pattern-btn');
  if (importPatternBtn) {
    importPatternBtn.onclick = handleImportPatternClick;
  }
  
  // Примечание: кнопки для связанных триггеров теперь внутри linkedBuilder.js

  // Textarea простых триггеров (авто-сохранение в localStorage с debounce; при изменении списка слов — сброс параметров и обновление карточек)
  const simpleTriggersTextarea = document.getElementById('simple-triggers-textarea');
  if (simpleTriggersTextarea) {
    let saveTimeout = null;
    let cardsTimeout = null;
    simpleTriggersTextarea.oninput = () => {
      AppState.simpleTriggersText = simpleTriggersTextarea.value;
      const current = parseSimpleTriggers(simpleTriggersTextarea.value || '');
      const last = AppState.simpleTriggersAtLastApply;
      const changed = !last || last.length !== current.length || current.some((w, i) => w !== last[i]);
      if (changed) {
        AppState.simpleTriggersParams = {};
        saveSimpleParams({});
        AppState.simpleTriggersAtLastApply = current;
      }
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        saveSimpleTriggersText(simpleTriggersTextarea.value);
        saveTimeout = null;
      }, 500);
      // Обновление карточек с debounce
      if (cardsTimeout) clearTimeout(cardsTimeout);
      cardsTimeout = setTimeout(() => {
        updateSimpleTriggerCards(current);
        cardsTimeout = null;
      }, 300);
    };
  }

  // Кнопка "Очистить панель" в шапке для простых триггеров
  const clearSimplePanelBtn = document.getElementById('clear-simple-panel-btn');
  if (clearSimplePanelBtn) {
    clearSimplePanelBtn.onclick = () => {
      const textarea = document.getElementById('simple-triggers-textarea');
      if (textarea) {
        textarea.value = '';
        AppState.simpleTriggersText = '';
        saveSimpleTriggersText('');
      }
      AppState.simpleTriggersParams = {};
      AppState.simpleTriggersAtLastApply = [];
      saveSimpleParams({});
      updateSimpleTriggerCards([]);
      updatePopupButtonStates();
      showSuccess('Панель очищена');
    };
  }

  // Инициализация встроенного UI простых триггеров
  initSimpleTriggersInlineUI();
}

// ═══════════════════════════════════════════════════════════════════
// ОБРАБОТЧИКИ КОНВЕРТАЦИИ
// ═══════════════════════════════════════════════════════════════════

/**
 * Конвертирует триггеры в зависимости от активного режима панели (простые ИЛИ связанные).
 * Комбинированная конвертация удалена.
 */
function handleConvert() {
  const triggersPanel = document.getElementById('triggers-panel');
  const mode = triggersPanel ? triggersPanel.dataset.mode : 'linked';

  if (mode === 'simple') {
    handleConvertSimple();
  } else {
    // Используем новый linkedBuilder
    const elements = getBuilderData();
    handleConvertLinkedBuilder(elements);
  }
}

/**
 * Конвертирует простые триггеры
 */
function handleConvertSimple() {
  const simpleTextarea = document.getElementById('simple-triggers-textarea');
  const simpleText = simpleTextarea ? simpleTextarea.value.trim() : '';

  if (!simpleText) {
    showError('Добавьте хотя бы один триггер');
    return;
  }

  const res = convert({
    type: 'simple',
    text: simpleText,
    params: AppState.simpleTriggersParams || {}
  });

  if (!res.success) {
    showError(res.error);
    return;
  }

  if (res.escapedToast) showInfo(res.escapedToast);

  displayHistory();
  displayResult(res.result, res.data || {});
  AppState.lastConversionData = res.data;
  showSuccess('Конвертация выполнена');

  scrollToResult();
}

/**
 * Конвертирует связанные триггеры из нового конструктора LinkedBuilder
 * @param {Array} elements - данные из LinkedBuilder
 */
function handleConvertLinkedBuilder(elements) {
  const conversion = convertLinkedBuilder(elements);
  
  if (!conversion.success) {
    showError(conversion.error || 'Ошибка конвертации');
    return;
  }
  
  const result = conversion.result;
  const stats = conversion.stats;
  
  // Извлекаем список триггеров для отображения в истории
  const triggers = extractTriggersFromElements(elements);
  
  const combinedData = {
    type: 'linked',
    result,
    stats,
    elements,
    triggers
  };
  
  // Сохраняем в историю (всегда, как в простых триггерах)
  const historyId = Date.now().toString();
  saveToHistory({
    id: historyId,
    date: new Date().toISOString(),
    type: 'linked',
    result,
    triggers: triggers.slice(0, 10), // Макс 10 для отображения
    params: {}
  });
  
  displayHistory();
  displayResult(result, combinedData);
  AppState.lastConversionData = combinedData;
  
  showSuccess(`Конвертация выполнена! Триггеров: ${stats.triggersCount}, групп: ${stats.groupsCount}`);
  scrollToResult();
}

/**
 * Извлекает текст триггеров из структуры LinkedBuilder (рекурсивно)
 * @param {Array} elements - массив элементов
 * @returns {Array<string>} - массив текстов триггеров
 */
function extractTriggersFromElements(elements) {
  const triggers = [];
  
  function extract(arr) {
    if (!Array.isArray(arr)) return;
    for (const el of arr) {
      if (el.type === 'trigger' && el.text && el.text.trim()) {
        triggers.push(el.text.trim());
      } else if (el.type === 'group' && el.children) {
        extract(el.children);
      }
    }
  }
  
  extract(elements);
  return triggers;
}

/**
 * Скролл к панели результата
 */
function scrollToResult() {
  const resultPanel = document.getElementById('result-panel');
  if (resultPanel) {
    resultPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Обработчик клика по кнопке "Импорт паттерна"
 */
function handleImportPatternClick() {
  const currentElements = getBuilderData();
  const hasElements = currentElements && currentElements.length > 0;
  
  openImportPatternModal({
    hasElements,
    onImport: (elements) => {
      setBuilderData(elements);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// ВСТРОЕННЫЙ UI ПРОСТЫХ ТРИГГЕРОВ
// ═══════════════════════════════════════════════════════════════════

/**
 * Инициализирует встроенный UI для простых триггеров (без модалки)
 */
function initSimpleTriggersInlineUI() {
  // Кнопки параметров — все индивидуальные (применяются к выбранным триггерам)
  const paramButtons = document.querySelectorAll('.param-card-inline');
  paramButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const param = btn.dataset.param;
      if (!param) return;

      if (param === 'declensions' || param === 'wildcard' || param === 'optionalChars') {
        // Склонения, \w, (?) — открываем popup для выбранных триггеров
        handlePopupParam(param, btn, e);
      } else {
        // Все остальные параметры — toggle для выбранных триггеров
        applyParamToSelectedTriggers(param, btn);
      }
    });
  });

  // Кнопки управления выборкой
  const selectAllBtn = document.getElementById('pool-select-all');
  const deselectAllBtn = document.getElementById('pool-deselect-all');
  const clearParamsBtn = document.getElementById('pool-clear-all-params');

  if (selectAllBtn) {
    selectAllBtn.onclick = () => {
      const cards = document.querySelectorAll('#simple-triggers-grid .trigger-card');
      cards.forEach(card => card.classList.add('selected'));
      updatePopupButtonStates();
    };
  }

  if (deselectAllBtn) {
    deselectAllBtn.onclick = () => {
      const cards = document.querySelectorAll('#simple-triggers-grid .trigger-card');
      cards.forEach(card => card.classList.remove('selected'));
      updatePopupButtonStates();
    };
  }

  if (clearParamsBtn) {
    clearParamsBtn.onclick = () => {
      AppState.simpleTriggersParams = { triggerParams: [], _simpleV2: true };
      saveSimpleParams(AppState.simpleTriggersParams);
      const textarea = document.getElementById('simple-triggers-textarea');
      const triggers = parseSimpleTriggers(textarea?.value || '');
      updateSimpleTriggerCards(triggers);
      updatePopupButtonStates();
      showInfo('Параметры сброшены');
    };
  }

  // Инициализация карточек при загрузке
  const textarea = document.getElementById('simple-triggers-textarea');
  if (textarea && textarea.value.trim()) {
    const triggers = parseSimpleTriggers(textarea.value);
    updateSimpleTriggerCards(triggers);
  }
  
  // Инициализация подсказки о выборе
  updatePopupButtonStates();
}


/**
 * Обрабатывает параметры, требующие popup (склонения, wildcard)
 */
function handlePopupParam(paramKey, btn, event) {
  const grid = document.getElementById('simple-triggers-grid');
  if (!grid) return;

  const selected = grid.querySelectorAll('.trigger-card.selected');
  if (selected.length === 0) {
    showInfo('Выберите хотя бы один триггер');
    return;
  }

  const indices = [...selected].map(el => parseInt(el.dataset.triggerIndex, 10));
  const textarea = document.getElementById('simple-triggers-textarea');
  const triggers = parseSimpleTriggers(textarea?.value || '');

  // Получаем текущие параметры
  let triggerParams = AppState.simpleTriggersParams.triggerParams || [];
  
  // Проверяем, у всех ли выбранных есть этот параметр (для toggle-логики)
  const allHaveParam = indices.every(i => {
    const params = triggerParams[i] || {};
    return isParamActiveForTrigger(params, paramKey);
  });

  // Если у всех выбранных уже есть параметр — выключаем его (toggle)
  if (allHaveParam) {
    applyPopupParamToSelected(paramKey, null, indices, triggers);
    return;
  }

  // Берём первый выбранный триггер для предпросмотра
  const firstIndex = indices[0];
  const triggerText = triggers[firstIndex] || '';
  const currentParams = triggerParams[firstIndex] || {};

  // Создаём временный элемент-якорь для позиционирования popup
  const anchorEl = selected[0];

  if (paramKey === 'declensions') {
    // Склонения: если выбрано несколько триггеров — сразу применяем «Автоматически»
    if (indices.length > 1) {
      applyPopupParamToSelected('declensions', { mode: 'auto' }, indices, triggers);
      showInfo('Склонения (авто) применены к выбранным триггерам');
    } else {
      // Один триггер — открываем popup с выбором режима
      const currentDecl = typeof currentParams.declensions === 'object' ? currentParams.declensions : null;
      const popup = createDeclensionsPopup(anchorEl, triggerText, (declensionData) => {
        applyPopupParamToSelected('declensions', declensionData, indices, triggers);
      }, currentDecl, { hideDisableButton: true });
      document.body.appendChild(popup);
    }
  } else if (paramKey === 'wildcard') {
    // \w — всегда открываем popup (мин/макс можно применить ко всем)
    const currentWildcard = typeof currentParams.wildcard === 'object' ? currentParams.wildcard : null;
    const popup = createWildcardPopup(anchorEl, triggerText, (wildcardData) => {
      applyPopupParamToSelected('wildcard', wildcardData, indices, triggers);
    }, currentWildcard, { hideDisableButton: true });
    document.body.appendChild(popup);
  } else if (paramKey === 'optionalChars') {
    // (?) — применяется только к одному триггеру (индексы зависят от текста)
    if (indices.length > 1) {
      showInfo('Опциональные символы применяются только к одному триггеру. Выберите один.');
      return;
    }
    const currentIndices = Array.isArray(currentParams.optionalChars) ? currentParams.optionalChars : [];
    const popup = createOptionalCharsPopup(anchorEl, triggerText, (optionalIndices) => {
      applyPopupParamToSelected('optionalChars', optionalIndices && optionalIndices.length > 0 ? optionalIndices : null, indices, triggers);
    }, currentIndices);
    document.body.appendChild(popup);
  }
}

/**
 * Применяет результат popup к выбранным триггерам
 */
function applyPopupParamToSelected(paramKey, data, indices, triggers) {
  let triggerParams = AppState.simpleTriggersParams.triggerParams || [];

  // Расширяем массив, если нужно
  while (triggerParams.length < triggers.length) {
    triggerParams.push({});
  }

  indices.forEach(i => {
    if (!triggerParams[i]) triggerParams[i] = {};

    if (data === null) {
      // Выключить параметр
      delete triggerParams[i][paramKey];
    } else {
      // Установить параметр
      triggerParams[i][paramKey] = data;

      // Взаимоисключение: wildcard ↔ declensions ↔ optionalChars ↔ latinCyrillic ↔ transliteration
      if (paramKey === 'wildcard') {
        delete triggerParams[i].declensions;
        delete triggerParams[i].optionalChars;
      } else if (paramKey === 'declensions') {
        delete triggerParams[i].wildcard;
        delete triggerParams[i].optionalChars;
      } else if (paramKey === 'optionalChars') {
        delete triggerParams[i].wildcard;
        delete triggerParams[i].declensions;
        delete triggerParams[i].latinCyrillic;
        delete triggerParams[i].transliteration;
      }
    }
  });

  AppState.simpleTriggersParams = {
    ...AppState.simpleTriggersParams,
    triggerParams,
    _simpleV2: true
  };
  saveSimpleParams(AppState.simpleTriggersParams);
  updateSimpleTriggerCards(triggers);
  updatePopupButtonStates();
}

/**
 * Проверяет, активен ли параметр у триггера
 */
function isParamActiveForTrigger(params, paramKey) {
  if (!params) return false;
  if (paramKey === 'declensions') {
    return params.declensions && (params.declensions === true || params.declensions.mode);
  }
  if (paramKey === 'wildcard') {
    return params.wildcard && params.wildcard.mode;
  }
  if (paramKey === 'optionalChars') {
    return Array.isArray(params.optionalChars) && params.optionalChars.length > 0;
  }
  return !!params[paramKey];
}

/**
 * Обновляет состояние всех кнопок параметров на основе выбранных триггеров.
 * Три состояния:
 * - active: параметр есть у ВСЕХ выбранных триггеров
 * - partial: параметр есть у НЕКОТОРЫХ выбранных триггеров (пунктирная рамка)
 * - (без класса): параметра нет ни у одного выбранного триггера
 */
function updatePopupButtonStates() {
  const triggerParams = AppState.simpleTriggersParams.triggerParams || [];
  const grid = document.getElementById('simple-triggers-grid');
  if (!grid) return;

  const selected = grid.querySelectorAll('.trigger-card.selected');
  const indices = [...selected].map(el => parseInt(el.dataset.triggerIndex, 10));

  // Все кнопки параметров
  const allParamButtons = document.querySelectorAll('.param-card-inline[data-param]');
  
  allParamButtons.forEach(btn => {
    const paramKey = btn.dataset.param;
    
    // Убираем старые классы состояния
    btn.classList.remove('active', 'partial');
    
    if (indices.length === 0) {
      // Нет выбранных триггеров — кнопки без подсветки
      return;
    }
    
    // Считаем, у скольких выбранных триггеров есть этот параметр
    const countWithParam = indices.filter(i => {
      const params = triggerParams[i] || {};
      return isParamActiveForTrigger(params, paramKey);
    }).length;
    
    if (countWithParam === indices.length) {
      // У ВСЕХ выбранных есть параметр — активное состояние
      btn.classList.add('active');
    } else if (countWithParam > 0) {
      // У НЕКОТОРЫХ выбранных есть параметр — частичное состояние
      btn.classList.add('partial');
    }
    // Если countWithParam === 0, кнопка остаётся без подсветки
  });
  
  // Обновляем подсказку о выборе
  updateSelectionHint(indices.length);
}

/**
 * Обновляет подсказку о текущем выборе триггеров
 */
function updateSelectionHint(selectedCount) {
  let hint = document.getElementById('selection-hint');
  
  if (!hint) {
    // Создаём элемент подсказки, если его нет
    const paramsSection = document.querySelector('.simple-triggers-params-section');
    if (!paramsSection) return;
    
    hint = document.createElement('div');
    hint.id = 'selection-hint';
    hint.className = 'selection-hint';
    paramsSection.appendChild(hint);
  }
  
  if (selectedCount === 0) {
    hint.textContent = 'Выберите триггеры, чтобы применить параметры';
    hint.className = 'selection-hint hint-empty';
  } else if (selectedCount === 1) {
    hint.textContent = `Выбран 1 триггер — кнопки показывают его параметры`;
    hint.className = 'selection-hint hint-single';
  } else {
    hint.innerHTML = `Выбрано ${selectedCount} триггеров — <span class="hint-legend"><span class="hint-all">яркая</span> = у всех, <span class="hint-partial">пунктир</span> = у части</span>`;
    hint.className = 'selection-hint hint-multiple';
  }
}

/**
 * Применяет параметр к выбранным триггерам
 */
function applyParamToSelectedTriggers(paramKey, btn) {
  const grid = document.getElementById('simple-triggers-grid');
  if (!grid) return;

  const selected = grid.querySelectorAll('.trigger-card.selected');
  if (selected.length === 0) {
    showInfo('Выберите хотя бы один триггер');
    return;
  }

  const indices = [...selected].map(el => parseInt(el.dataset.triggerIndex, 10));
  let triggerParams = AppState.simpleTriggersParams.triggerParams || [];
  const textarea = document.getElementById('simple-triggers-textarea');
  const triggers = parseSimpleTriggers(textarea?.value || '');

  // Расширяем массив, если нужно
  while (triggerParams.length < triggers.length) {
    triggerParams.push({});
  }

  // Проверяем, все ли выбранные уже имеют этот параметр
  const allHaveParam = indices.every(i => triggerParams[i]?.[paramKey]);
  const newValue = !allHaveParam;

  indices.forEach(i => {
    if (!triggerParams[i]) triggerParams[i] = {};
    if (newValue) {
      triggerParams[i][paramKey] = true;
      // Взаимоисключение: transliteration ↔ latinCyrillic
      if (paramKey === 'transliteration') {
        delete triggerParams[i].latinCyrillic;
      } else if (paramKey === 'latinCyrillic') {
        delete triggerParams[i].transliteration;
      }
    } else {
      delete triggerParams[i][paramKey];
    }
  });

  AppState.simpleTriggersParams = {
    ...AppState.simpleTriggersParams,
    triggerParams,
    _simpleV2: true
  };
  saveSimpleParams(AppState.simpleTriggersParams);
  updateSimpleTriggerCards(triggers);
  updatePopupButtonStates();
}

/**
 * Обновляет карточки триггеров во встроенном UI
 * Сохраняет выделение при обновлении
 */
function updateSimpleTriggerCards(triggers) {
  const grid = document.getElementById('simple-triggers-grid');
  const emptyHint = document.getElementById('triggers-empty-hint');
  if (!grid) return;

  if (triggers.length === 0) {
    grid.innerHTML = '';
    if (emptyHint) emptyHint.style.display = 'block';
    return;
  }
  if (emptyHint) emptyHint.style.display = 'none';

  // Сохраняем выбранные индексы перед перерисовкой
  const selectedIndices = new Set(
    [...grid.querySelectorAll('.trigger-card.selected')]
      .map(el => parseInt(el.dataset.triggerIndex, 10))
  );

  const triggerParams = AppState.simpleTriggersParams?.triggerParams || [];
  const PARAM_COLORS = {
    latinCyrillic: '#f59e0b',
    transliteration: '#EC4899',
    declensions: '#8b5cf6',
    optionalChars: '#10b981',
    wildcard: '#A78BFA',
    wordBoundaries: '#3b82f6',
    requireSpaceAfter: '#06b6d4'
  };

  grid.innerHTML = triggers.map((trigger, i) => {
    const params = triggerParams[i] || {};
    const badges = [];
    if (params.latinCyrillic) badges.push({ label: 'Лат/Кир', color: PARAM_COLORS.latinCyrillic });
    if (params.transliteration) badges.push({ label: 'Транслит', color: PARAM_COLORS.transliteration });
    
    // Склонения: поддержка объекта { mode: 'auto' | 'exact' }
    if (params.declensions) {
      if (typeof params.declensions === 'object' && params.declensions.mode === 'exact') {
        badges.push({ label: 'Склон.(точн.)', color: PARAM_COLORS.declensions });
      } else {
        badges.push({ label: 'Склон.', color: PARAM_COLORS.declensions });
      }
    }
    
    // Wildcard: { mode: 'auto' | 'range' }
    if (params.wildcard && params.wildcard.mode) {
      if (params.wildcard.mode === 'range') {
        badges.push({ label: `\\w{${params.wildcard.min},${params.wildcard.max}}`, color: PARAM_COLORS.wildcard });
      } else {
        badges.push({ label: '\\w+', color: PARAM_COLORS.wildcard });
      }
    }
    
    if (params.optionalChars?.length) badges.push({ label: 'Опц.', color: PARAM_COLORS.optionalChars });
    if (params.wordBoundaries) badges.push({ label: '\\b', color: PARAM_COLORS.wordBoundaries });
    if (params.requireSpaceAfter) badges.push({ label: '\\s', color: PARAM_COLORS.requireSpaceAfter });

    const badgesHtml = badges.map(b =>
      `<span class="trigger-badge" style="background:${b.color}20;color:${b.color};border-color:${b.color}60">${b.label}</span>`
    ).join('');

    // Восстанавливаем класс selected, если индекс был выбран
    const selectedClass = selectedIndices.has(i) ? ' selected' : '';

    return `
      <div class="trigger-card${selectedClass}" data-trigger-index="${i}">
        <span class="trigger-text">${escapeHtml(trigger)}</span>
        <div class="trigger-badges">${badgesHtml}</div>
      </div>
    `;
  }).join('');

  // Обработчики выбора карточек
  grid.querySelectorAll('.trigger-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.detail === 2) return; // Игнорируем двойной клик
      card.classList.toggle('selected');
      updatePopupButtonStates();
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}



// ═══════════════════════════════════════════════════════════════════
// ЗАГРУЗКА ИЗ localStorage
// ═══════════════════════════════════════════════════════════════════

function loadSavedSimpleTriggers() {
  const text = getSimpleTriggersText();
  if (!text) return;
  const textarea = document.getElementById('simple-triggers-textarea');
  if (textarea) {
    textarea.value = text;
    AppState.simpleTriggersText = text;
    // Обновляем карточки после загрузки
    const triggers = parseSimpleTriggers(text);
    setTimeout(() => updateSimpleTriggerCards(triggers), 100);
  }
}

function loadSavedSimpleParams() {
  const params = getSimpleParams();
  if (params && Object.keys(params).length > 0) {
    AppState.simpleTriggersParams = params;
  }
}


// ═══════════════════════════════════════════════════════════════════
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ═══════════════════════════════════════════════════════════════════

/**
 * Сброс всех инструментов (конвертер + визуализатор). История конвертаций не затрагивается.
 */
function resetAll() {
  openConfirmModal({
    title: RESET_MODAL.title,
    message: RESET_MODAL.message,
    onConfirm: () => {
      // Очистка простых триггеров
      const simpleTextarea = document.getElementById('simple-triggers-textarea');
      if (simpleTextarea) {
        simpleTextarea.value = '';
      }
      saveSimpleTriggersText('');
      saveSimpleParams({});

      // Очистка связанных триггеров (новый конструктор)
      import('./ui/linkedBuilder.js').then(module => {
        if (module.setBuilderData) {
          module.setBuilderData([]);
        }
      });
      // Очистка старого localStorage (для обратной совместимости)
      saveLinkedStructure({ groups: [] });

      // Очистка результата
      clearResult();

      // Сброс состояния конвертера
      AppState.simpleTriggersText = '';
      AppState.simpleTriggersParams = {};
      AppState.simpleTriggersAtLastApply = [];
      AppState.linkedGroups = [];
      AppState.lastConversionData = null;

      // Сброс панели визуализатора (поле, диаграмма, hash)
      resetVisualizerPanel();

      // Сброс панели «Тестер»
      resetTesterPanel();

      showSuccess('Все инструменты сброшены');
    }
  });
}

/**
 * Подсказка для новых пользователей: показывается при первом визите, закрывается по клику.
 */
function initFirstTimeHint() {
  const hintEl = document.getElementById('first-time-hint');
  const closeBtn = document.getElementById('first-time-hint-close');
  if (!hintEl || !closeBtn) return;

  const dismissed = localStorage.getItem(STORAGE_KEYS.HINT_DISMISSED) === '1';
  if (dismissed) {
    hintEl.classList.add('hidden');
    return;
  }

  closeBtn.onclick = () => {
    hintEl.classList.add('first-time-hint-dismissed');
    localStorage.setItem(STORAGE_KEYS.HINT_DISMISSED, '1');
    setTimeout(() => {
      hintEl.style.display = 'none';
    }, 200);
  };
}

// ═══════════════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════════════

export default {
  initApp,
  AppState
};
