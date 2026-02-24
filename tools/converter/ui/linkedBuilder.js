/**
 * ═══════════════════════════════════════════════════════════════════
 *                    LINKED BUILDER - MAIN MODULE
 *                   Визуальный конструктор связанных триггеров
 * ═══════════════════════════════════════════════════════════════════
 *
 * @file tools/converter/ui/linkedBuilder.js
 * @description Основной модуль конструктора связанных триггеров
 * @date 2026-02-21
 */

import { showSuccess, showError, showInfo } from '../../../shared/ui/notifications.js';
import { createBadge } from './badges.js';
import { openWildcardPopup, openDeclensionsPopup, openOptionalCharsPopup, openWordBoundariesPopup, removeAllPopups } from './inlinePopup.js';
import { openConfirmModal } from './modals.js';
import { areParamsCompatible, getIncompatibleParams, isParamActive, getActiveParamKeys } from '../logic/compatibilityChecker.js';
import { wordBoundaryStartOnly, normalizeWordBoundaries } from '../logic/parameterApplier.js';

// ═══════════════════════════════════════════════════════════════════
// КОНСТАНТЫ
// ═══════════════════════════════════════════════════════════════════

/** Режимы соединителей */
export const CONNECTOR_MODES = {
  alternation: { label: '|', pattern: '|', title: 'Альтернация (ИЛИ)' },
  any: { label: '[\\s\\S]+', pattern: '[\\s\\S]+', title: 'Любое расстояние (включая переносы строк)' },
  paragraph: { label: '.+', pattern: '.+', title: 'В пределах абзаца' },
  line: { label: '[^\\n]+', pattern: '[^\\n]+', title: 'В пределах строки' },
  custom: { label: '.{min,max}', pattern: null, title: 'Своё значение (укажите диапазон)' }
};

/** Цвета рамок для вложенных групп */
const GROUP_COLORS = [
  'var(--color-primary)',    // уровень 1
  'var(--color-secondary)',  // уровень 2
  'var(--color-success)',    // уровень 3
  'var(--color-warning)'     // уровень 4+
];

/** Типы параметров триггера */
const TRIGGER_PARAMS = ['latinCyrillic', 'transliteration', 'declensions', 'optionalChars', 'wildcard', 'wordBoundaries', 'requireSpaceAfter'];

// ═══════════════════════════════════════════════════════════════════
// СОСТОЯНИЕ
// ═══════════════════════════════════════════════════════════════════

/** Данные конструктора */
let builderState = {
  elements: [],           // массив элементов верхнего уровня
  selectedIds: new Set(), // ID выбранных элементов
  lastSelectedId: null    // ID последнего выбранного (для Shift+клик)
};

/** Состояние drag & drop */
let dragState = {
  draggedId: null,        // ID перетаскиваемого элемента
  dropTargetId: null,     // ID элемента-цели
  dropPosition: null      // 'before' | 'after' | 'inside' (для групп)
};

/** DOM элементы */
let dom = {
  container: null,
  field: null,
  paramsPanel: null
};

/** Callbacks */
let callbacks = {
  onConvert: null,
  onStateChange: null
};

// ═══════════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════════

/** Генерация уникального ID */
function generateId() {
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Создание нового триггера */
function createTriggerData(text = '') {
  return {
    type: 'trigger',
    id: generateId(),
    text,
    params: {},
    connector: { mode: 'alternation' }
  };
}

/** Создание новой группы */
function createGroupData(children = []) {
  return {
    type: 'group',
    id: generateId(),
    children,
    connector: { mode: 'alternation' }
  };
}

/** Поиск элемента по ID (рекурсивно) */
function findElementById(elements, id) {
  for (const el of elements) {
    if (el.id === id) return el;
    if (el.type === 'group' && el.children) {
      const found = findElementById(el.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** Поиск родителя элемента */
function findParentArray(elements, id, parent = null) {
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].id === id) return { array: elements, index: i, parent };
    if (elements[i].type === 'group' && elements[i].children) {
      const found = findParentArray(elements[i].children, id, elements[i]);
      if (found) return found;
    }
  }
  return null;
}

/** Получить все ID элементов (рекурсивно) */
function getAllIds(elements) {
  const ids = [];
  for (const el of elements) {
    ids.push(el.id);
    if (el.type === 'group' && el.children) {
      ids.push(...getAllIds(el.children));
    }
  }
  return ids;
}

/** Проверка, являются ли выбранные элементы соседями */
function areSelectedAdjacent(elements, selectedIds) {
  if (selectedIds.size < 2) return true;
  
  const ids = Array.from(selectedIds);
  const locations = ids.map(id => findParentArray(elements, id));
  
  // Все должны быть в одном массиве (на одном уровне)
  const firstArray = locations[0]?.array;
  if (!firstArray) return false;
  if (!locations.every(loc => loc?.array === firstArray)) return false;
  
  // Индексы должны быть последовательными
  const indices = locations.map(loc => loc.index).sort((a, b) => a - b);
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) return false;
  }
  
  return true;
}

/** Получить выбранные элементы в порядке их расположения */
function getSelectedInOrder(elements, selectedIds) {
  const result = [];
  function traverse(arr) {
    for (const el of arr) {
      if (selectedIds.has(el.id)) result.push(el);
      if (el.type === 'group' && el.children) traverse(el.children);
    }
  }
  traverse(elements);
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// РЕНДЕРИНГ
// ═══════════════════════════════════════════════════════════════════

/** Получить паттерн соединителя */
function getConnectorPattern(connector) {
  if (!connector || !connector.mode) return '|';
  if (connector.mode === 'custom') {
    const min = connector.min ?? 0;
    const max = connector.max ?? 10;
    return `.{${min},${max}}`;
  }
  return CONNECTOR_MODES[connector.mode]?.pattern || '|';
}

/** Рендер бейджа параметра триггера */
function renderParamBadge(key, value) {
  const badge = document.createElement('span');
  badge.className = 'linked-chip-badge';
  badge.dataset.param = key;
  
  const labels = {
    latinCyrillic: 'Лат/Кир',
    transliteration: 'Транслит',
    declensions: 'Склон.',
    optionalChars: '(?)',
    wildcard: '\\w',
    wordBoundaries: '\\b',
    requireSpaceAfter: '\\s'
  };
  
  badge.innerHTML = `
    <span>${labels[key] || key}</span>
    <span class="linked-chip-badge-remove" title="Удалить параметр">×</span>
  `;
  
  badge.querySelector('.linked-chip-badge-remove').onclick = (e) => {
    e.stopPropagation();
    // TODO: Удаление параметра
  };
  
  return badge;
}

/** Рендер чипа триггера */
function renderChip(element, isLast = false) {
  const chip = document.createElement('div');
  chip.className = 'linked-chip';
  chip.dataset.id = element.id;
  chip.draggable = true;
  
  if (builderState.selectedIds.has(element.id)) {
    chip.classList.add('selected');
  }
  
  const isEmpty = !element.text || element.text.trim() === '';
  chip.innerHTML = `
    <div class="linked-chip-main" title="Клик — выбрать. Двойной клик — редактировать. Перетащите для перемещения.">
      <span class="linked-chip-text${isEmpty ? ' empty' : ''}">${isEmpty ? '&lt;пусто&gt;' : escapeHtml(element.text)}</span>
      <button class="linked-chip-delete" title="Удалить триггер">×</button>
    </div>
    <div class="linked-chip-badges"></div>
  `;
  
  // Бейджи параметров
  const badgesContainer = chip.querySelector('.linked-chip-badges');
  if (element.params) {
    for (const [key, value] of Object.entries(element.params)) {
      if (value && (value === true || (typeof value === 'object' && Object.keys(value).length > 0) || (Array.isArray(value) && value.length > 0))) {
        badgesContainer.appendChild(renderParamBadge(key, value));
      }
    }
  }
  
  // События
  const mainEl = chip.querySelector('.linked-chip-main');
  const textEl = chip.querySelector('.linked-chip-text');
  const deleteBtn = chip.querySelector('.linked-chip-delete');
  
  // Drag & Drop события
  chip.ondragstart = (e) => handleDragStart(e, element.id);
  chip.ondragend = handleDragEnd;
  chip.ondragover = (e) => handleDragOver(e, element.id, 'trigger');
  chip.ondragleave = handleDragLeave;
  chip.ondrop = (e) => handleDrop(e, element.id);
  
  // Клик — выбор (с debounce для отличия от dblclick)
  let clickTimeout = null;
  mainEl.onclick = (e) => {
    e.stopPropagation();
    // Не обрабатывать клик если идёт drag
    if (dragState.draggedId) return;
    // Не обрабатывать клик если текст редактируется
    if (textEl.classList.contains('editing')) return;
    // Отложить выполнение, чтобы dblclick мог отменить
    if (clickTimeout) clearTimeout(clickTimeout);
    clickTimeout = setTimeout(() => {
      handleElementClick(element.id, e.ctrlKey || e.metaKey, e.shiftKey);
      clickTimeout = null;
    }, 200);
  };
  
  // Двойной клик — редактирование
  mainEl.ondblclick = (e) => {
    e.stopPropagation();
    // Отменить одиночный клик
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
    }
    startEditingChip(chip, element);
  };
  
  // Удаление
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    deleteElement(element.id);
  };
  
  return chip;
}

/** Рендер кнопки "+" для добавления триггера */
function renderAddTriggerButton() {
  const btn = document.createElement('button');
  btn.className = 'linked-add-trigger-inline';
  btn.type = 'button';
  btn.title = 'Добавить триггер';
  btn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  `;
  
  btn.onclick = (e) => {
    e.stopPropagation();
    addTrigger();
  };
  
  return btn;
}

/** Рендер соединителя */
function renderConnector(connector, elementId) {
  const conn = document.createElement('span');
  conn.className = 'linked-connector';
  conn.dataset.forElement = elementId;
  
  // Если владелец выбран — подсветить соединитель тоже
  if (builderState.selectedIds.has(elementId)) {
    conn.classList.add('owner-selected');
  }
  
  const pattern = getConnectorPattern(connector);
  conn.innerHTML = `<span class="linked-connector-text">${escapeHtml(pattern)}</span>`;
  conn.title = `Соединитель к следующему элементу. Клик — изменить.`;
  
  conn.onclick = (e) => {
    e.stopPropagation();
    handleConnectorClick(elementId);
  };
  
  // Drag & Drop на соединитель — расширяет зону сброса
  conn.ondragover = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    if (!dragState.draggedId || dragState.draggedId === elementId) return;
    
    // При наведении на соединитель — подсветить как drop-after для владельца
    if (dragState.dropTargetId !== elementId || dragState.dropPosition !== 'after') {
      // Убрать старые классы
      if (dom.field) {
        dom.field.querySelectorAll('.drop-target, .drop-before, .drop-after, .drop-inside').forEach(el => {
          el.classList.remove('drop-target', 'drop-before', 'drop-after', 'drop-inside');
        });
      }
      
      // Подсветить соединитель
      conn.classList.add('drop-target');
      
      dragState.dropTargetId = elementId;
      dragState.dropPosition = 'after';
    }
  };
  
  conn.ondragleave = (e) => {
    conn.classList.remove('drop-target');
  };
  
  conn.ondrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    conn.classList.remove('drop-target');
    
    if (!dragState.draggedId || dragState.draggedId === elementId) {
      handleDragEnd(e);
      return;
    }
    
    // Вставить после владельца соединителя
    moveElement(dragState.draggedId, elementId, 'after');
    handleDragEnd(e);
  };
  
  return conn;
}

/** Рендер группы */
function renderGroup(element, depth = 0, isLast = false) {
  const group = document.createElement('div');
  group.className = 'linked-group';
  group.dataset.id = element.id;
  group.dataset.depth = depth;
  group.draggable = true;
  
  if (builderState.selectedIds.has(element.id)) {
    group.classList.add('selected');
  }
  
  // Цвет рамки по глубине
  const colorIndex = Math.min(depth, GROUP_COLORS.length - 1);
  group.style.borderColor = GROUP_COLORS[colorIndex];
  
  // Drag & Drop события для группы
  group.ondragstart = (e) => {
    // Предотвратить всплытие если drag начат с дочернего элемента
    if (e.target !== group) return;
    handleDragStart(e, element.id);
  };
  group.ondragend = handleDragEnd;
  group.ondragover = (e) => {
    e.stopPropagation();
    handleDragOver(e, element.id, 'group');
  };
  group.ondragleave = handleDragLeave;
  group.ondrop = (e) => {
    e.stopPropagation();
    handleDrop(e, element.id);
  };
  
  // Кнопка удаления
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'linked-group-delete';
  deleteBtn.innerHTML = '×';
  deleteBtn.title = 'Удалить группу';
  deleteBtn.draggable = false; // Кнопка не должна инициировать drag
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    deleteElement(element.id);
  };
  group.appendChild(deleteBtn);
  
  // Рендер дочерних элементов
  if (element.children) {
    element.children.forEach((child, index) => {
      const isChildLast = index === element.children.length - 1;
      
      if (child.type === 'trigger') {
        group.appendChild(renderChip(child, isChildLast));
      } else if (child.type === 'group') {
        group.appendChild(renderGroup(child, depth + 1, isChildLast));
      }
      
      // Соединитель (если не последний)
      if (!isChildLast) {
        group.appendChild(renderConnector(child.connector, child.id));
      }
    });
  }
  
  // Клик — выбор группы
  group.onclick = (e) => {
    if (dragState.draggedId) return; // Не обрабатывать клик при drag
    if (e.target === group || e.target === deleteBtn) {
      e.stopPropagation();
      handleElementClick(element.id, e.ctrlKey || e.metaKey, e.shiftKey);
    }
  };
  
  return group;
}

/** Рендер всего поля */
function renderField() {
  if (!dom.field) return;
  
  dom.field.innerHTML = '';
  
  if (builderState.elements.length === 0) {
    // Пустое состояние с кнопкой добавления
    const emptyState = document.createElement('div');
    emptyState.className = 'linked-builder-empty';
    emptyState.innerHTML = `
      <div class="linked-builder-empty-icon">📝</div>
      <div class="linked-builder-empty-text">Добавьте первый триггер</div>
      <div class="linked-builder-empty-hint">Создавайте триггеры, соединяйте их и группируйте</div>
    `;
    
    // Кнопка добавления в пустом состоянии
    const addBtn = document.createElement('button');
    addBtn.className = 'linked-add-trigger-empty';
    addBtn.type = 'button';
    addBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span>Добавить триггер</span>
    `;
    addBtn.onclick = (e) => {
      e.stopPropagation();
      addTrigger();
    };
    
    emptyState.appendChild(addBtn);
    dom.field.appendChild(emptyState);
    return;
  }
  
  // Контейнер строк
  const rowsContainer = document.createElement('div');
  rowsContainer.className = 'linked-builder-rows';
  
  const row = document.createElement('div');
  row.className = 'linked-builder-row';
  
  // Контейнер для номеров строк — изначально скрыт, покажем если будет 2+ строки
  const rowNumber = document.createElement('div');
  rowNumber.className = 'linked-builder-row-number';
  rowNumber.style.visibility = 'hidden';
  row.appendChild(rowNumber);
  
  const rowContent = document.createElement('div');
  rowContent.className = 'linked-builder-row-content';
  
  builderState.elements.forEach((element, index) => {
    const isLast = index === builderState.elements.length - 1;
    
    if (element.type === 'trigger') {
      rowContent.appendChild(renderChip(element, isLast));
    } else if (element.type === 'group') {
      rowContent.appendChild(renderGroup(element, 0, isLast));
    }
    
    // Соединитель (если не последний)
    if (!isLast) {
      rowContent.appendChild(renderConnector(element.connector, element.id));
    }
  });
  
  // Кнопка "+" для быстрого добавления триггера
  rowContent.appendChild(renderAddTriggerButton());
  
  row.appendChild(rowContent);
  rowsContainer.appendChild(row);
  dom.field.appendChild(rowsContainer);
  
  // После рендера проверяем, есть ли визуальный перенос строк
  requestAnimationFrame(() => {
    detectVisualRows(rowContent, rowNumber);
  });
  
  // Обновить панель параметров
  updateParamsPanel();
}

/** Определить визуальные строки и показать номера при 2+ строках */
function detectVisualRows(rowContent, rowNumberEl) {
  if (!rowContent || !rowNumberEl) return;
  
  // Удалить старые маркеры строк и индикаторы продолжения
  rowContent.querySelectorAll('.linked-row-marker, .linked-row-continue').forEach(m => m.remove());
  
  // Получаем только чипы, группы и соединители (не маркеры и не кнопку +)
  const children = Array.from(rowContent.children).filter(
    c => c.classList.contains('linked-chip') || 
         c.classList.contains('linked-group') || 
         c.classList.contains('linked-connector')
  );
  if (children.length === 0) return;
  
  // Определяем визуальные строки по ЦЕНТРУ элемента (не top)
  // Это нужно потому что группы выше чипов, но они на одной линии
  const rowContentRect = rowContent.getBoundingClientRect();
  let lastCenterY = null;
  let rowCount = 0;
  const rowStarts = []; // { row, element, centerY, lastElement }
  let currentRowElements = [];
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const rect = child.getBoundingClientRect();
    // Используем центр элемента по вертикали
    const centerY = rect.top + rect.height / 2 - rowContentRect.top;
    
    // Если это новая строка (центр значительно отличается от предыдущего)
    // row-gap = 32px, значит разница между центрами строк будет минимум ~40px
    if (lastCenterY === null || Math.abs(centerY - lastCenterY) > 25) {
      // Проверяем, действительно ли это новая строка (centerY значительно больше)
      if (lastCenterY === null || centerY > lastCenterY + 25) {
        // Сохраняем последний элемент предыдущей строки
        if (rowCount > 0 && currentRowElements.length > 0) {
          rowStarts[rowCount - 1].lastElement = currentRowElements[currentRowElements.length - 1];
        }
        rowCount++;
        lastCenterY = centerY;
        currentRowElements = [child];
        rowStarts.push({ row: rowCount, element: child, centerY, lastElement: null });
      }
    } else {
      currentRowElements.push(child);
    }
  }
  // Сохраняем последний элемент последней строки
  if (rowCount > 0 && currentRowElements.length > 0) {
    rowStarts[rowCount - 1].lastElement = currentRowElements[currentRowElements.length - 1];
  }
  
  // Показать номера только если 2+ визуальных строк
  if (rowCount >= 2) {
    rowNumberEl.style.visibility = 'visible';
    rowContent.classList.add('has-multiple-rows');
    
    // Добавить маркеры для всех строк
    for (const rs of rowStarts) {
      const marker = document.createElement('div');
      marker.className = 'linked-row-marker';
      marker.textContent = rs.row;
      // Позиционируем маркер по центру строки
      marker.style.top = `${rs.centerY - 9}px`;
      rowContent.appendChild(marker);
      
      // Добавить индикатор "продолжение →" для всех строк кроме последней
      if (rs.row < rowCount && rs.lastElement) {
        const continueIndicator = document.createElement('div');
        continueIndicator.className = 'linked-row-continue';
        continueIndicator.innerHTML = `продолжение <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>`;
        // Позиционируем после последнего элемента строки
        const lastRect = rs.lastElement.getBoundingClientRect();
        const leftPos = lastRect.right - rowContentRect.left + 12;
        continueIndicator.style.left = `${leftPos}px`;
        continueIndicator.style.top = `${rs.centerY - 8}px`;
        rowContent.appendChild(continueIndicator);
      }
    }
  } else {
    rowNumberEl.style.visibility = 'hidden';
    rowContent.classList.remove('has-multiple-rows');
  }
}

/** Экранирование HTML */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ═══════════════════════════════════════════════════════════════════
// РЕДАКТИРОВАНИЕ
// ═══════════════════════════════════════════════════════════════════

/** Начать редактирование чипа */
function startEditingChip(chipEl, element) {
  const textEl = chipEl.querySelector('.linked-chip-text');
  if (!textEl) return;
  
  // Убираем placeholder текст перед редактированием
  textEl.contentEditable = 'true';
  textEl.textContent = element.text || '';
  textEl.classList.add('editing');
  textEl.classList.remove('empty');
  textEl.focus();
  
  // Выделить весь текст если есть
  if (element.text) {
    const range = document.createRange();
    range.selectNodeContents(textEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  
  // Остановить всплытие кликов во время редактирования
  textEl.onclick = (e) => {
    e.stopPropagation();
  };
  
  const finishEditing = () => {
    textEl.contentEditable = 'false';
    textEl.classList.remove('editing');
    textEl.onclick = null; // Убрать обработчик после редактирования
    const newText = textEl.textContent.trim();
    element.text = newText;
    if (newText) {
      textEl.textContent = newText;
      textEl.classList.remove('empty');
    } else {
      textEl.textContent = '<пусто>';
      textEl.classList.add('empty');
    }
    saveState();
  };
  
  textEl.onblur = finishEditing;
  textEl.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      textEl.blur();
    }
    if (e.key === 'Escape') {
      textEl.textContent = element.text || '';
      textEl.blur();
    }
  };
}

// ═══════════════════════════════════════════════════════════════════
// ВЫБОР ЭЛЕМЕНТОВ
// ═══════════════════════════════════════════════════════════════════

/** Обработка клика по элементу */
function handleElementClick(id, ctrlKey, shiftKey) {
  if (ctrlKey) {
    // Ctrl+клик — toggle выбор
    if (builderState.selectedIds.has(id)) {
      builderState.selectedIds.delete(id);
    } else {
      builderState.selectedIds.add(id);
    }
    builderState.lastSelectedId = id;
  } else if (shiftKey && builderState.lastSelectedId) {
    // Shift+клик — выбрать диапазон
    selectRange(builderState.lastSelectedId, id);
  } else {
    // Обычный клик — выбрать только этот
    builderState.selectedIds.clear();
    builderState.selectedIds.add(id);
    builderState.lastSelectedId = id;
  }
  
  renderField();
}

/** Выбрать диапазон элементов */
function selectRange(fromId, toId) {
  const allIds = getAllIds(builderState.elements);
  const fromIndex = allIds.indexOf(fromId);
  const toIndex = allIds.indexOf(toId);
  
  if (fromIndex === -1 || toIndex === -1) return;
  
  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  
  builderState.selectedIds.clear();
  for (let i = start; i <= end; i++) {
    builderState.selectedIds.add(allIds[i]);
  }
}

/** Сбросить выбор */
function clearSelection() {
  builderState.selectedIds.clear();
  builderState.lastSelectedId = null;
  renderField();
}

/** Клик по соединителю */
function handleConnectorClick(elementId) {
  // Выбрать элемент и показать панель соединителей
  builderState.selectedIds.clear();
  builderState.selectedIds.add(elementId);
  builderState.lastSelectedId = elementId;
  renderField();
  
  // TODO: Подсветить секцию соединителей в панели
}

// ═══════════════════════════════════════════════════════════════════
// ДЕЙСТВИЯ
// ═══════════════════════════════════════════════════════════════════

/** Добавить новый триггер */
function addTrigger(afterId = null) {
  const newTrigger = createTriggerData('');
  
  if (afterId) {
    // Вставить после указанного элемента
    const location = findParentArray(builderState.elements, afterId);
    if (location) {
      location.array.splice(location.index + 1, 0, newTrigger);
    } else {
      builderState.elements.push(newTrigger);
    }
  } else {
    // Добавить в конец
    builderState.elements.push(newTrigger);
  }
  
  // Выбрать новый триггер и начать редактирование
  builderState.selectedIds.clear();
  builderState.selectedIds.add(newTrigger.id);
  builderState.lastSelectedId = newTrigger.id;
  
  renderField();
  saveState();
  
  // Начать редактирование
  setTimeout(() => {
    const chipEl = dom.field.querySelector(`[data-id="${newTrigger.id}"]`);
    if (chipEl) {
      const element = findElementById(builderState.elements, newTrigger.id);
      if (element) startEditingChip(chipEl, element);
    }
  }, 50);
}

/** Удалить элемент */
function deleteElement(id) {
  const location = findParentArray(builderState.elements, id);
  if (!location) return;
  
  const element = location.array[location.index];
  const isGroup = element.type === 'group';
  
  const doDelete = () => {
    location.array.splice(location.index, 1);
    builderState.selectedIds.delete(id);
    
    renderField();
    saveState();
    showSuccess(isGroup ? 'Группа удалена' : 'Триггер удалён');
  };
  
  if (isGroup) {
    openConfirmModal({
      title: 'Удалить группу',
      message: 'Удалить группу и все элементы внутри?',
      onConfirm: doDelete
    });
  } else {
    doDelete();
  }
}

/** Сгруппировать выбранные элементы */
function groupSelected() {
  if (builderState.selectedIds.size < 2) {
    showError('Выберите 2 или более элементов для группировки (Ctrl+клик)');
    return;
  }
  
  if (!areSelectedAdjacent(builderState.elements, builderState.selectedIds)) {
    showError('Можно группировать только соседние элементы. Переместите элементы рядом и попробуйте снова.');
    return;
  }
  
  // Получить выбранные элементы в порядке их расположения
  const selectedElements = getSelectedInOrder(builderState.elements, builderState.selectedIds);
  if (selectedElements.length === 0) return;
  
  // Найти где они находятся
  const firstLocation = findParentArray(builderState.elements, selectedElements[0].id);
  if (!firstLocation) return;
  
  // Сохранить индексы ДО удаления (важно для правильной позиции вставки)
  const indicesToRemove = selectedElements.map(el => {
    const loc = findParentArray(builderState.elements, el.id);
    return loc?.index;
  }).filter(i => i !== undefined);
  
  // Запомнить минимальный индекс — туда вставим группу
  const insertIndex = Math.min(...indicesToRemove);
  
  // Удалить элементы с конца (чтобы индексы не сбивались)
  const sortedIndicesDesc = [...indicesToRemove].sort((a, b) => b - a);
  const removedElements = [];
  for (const idx of sortedIndicesDesc) {
    removedElements.unshift(firstLocation.array.splice(idx, 1)[0]);
  }
  
  // Сохранить коннектор последнего элемента (он определяет связь группы со следующим элементом)
  const lastElement = removedElements[removedElements.length - 1];
  const lastConnector = lastElement?.connector ? { ...lastElement.connector } : { mode: 'alternation' };
  
  // Создать новую группу с коннектором последнего элемента
  const newGroup = createGroupData(removedElements);
  newGroup.connector = lastConnector;
  
  // Вставить группу на место первого выбранного элемента
  firstLocation.array.splice(insertIndex, 0, newGroup);
  
  // Выбрать новую группу
  builderState.selectedIds.clear();
  builderState.selectedIds.add(newGroup.id);
  builderState.lastSelectedId = newGroup.id;
  
  renderField();
  saveState();
  showSuccess('Элементы сгруппированы');
}

/** Разгруппировать выбранную группу */
function ungroupSelected() {
  if (builderState.selectedIds.size !== 1) {
    showError('Выберите одну группу для разгруппировки');
    return;
  }
  
  const id = Array.from(builderState.selectedIds)[0];
  const element = findElementById(builderState.elements, id);
  
  if (!element || element.type !== 'group') {
    showError('Выберите группу для разгруппировки');
    return;
  }
  
  const location = findParentArray(builderState.elements, id);
  if (!location) return;
  
  // Удалить группу
  location.array.splice(location.index, 1);
  
  // Вставить дочерние элементы на её место
  location.array.splice(location.index, 0, ...element.children);
  
  // Выбрать первый из извлечённых элементов
  builderState.selectedIds.clear();
  if (element.children.length > 0) {
    builderState.selectedIds.add(element.children[0].id);
    builderState.lastSelectedId = element.children[0].id;
  }
  
  renderField();
  saveState();
  showSuccess('Группа разгруппирована');
}

/** Дублировать выбранный элемент/группу */
function duplicateSelected() {
  if (builderState.selectedIds.size !== 1) {
    showError('Выберите один элемент для дублирования');
    return;
  }
  
  const id = Array.from(builderState.selectedIds)[0];
  const element = findElementById(builderState.elements, id);
  if (!element) return;
  
  const location = findParentArray(builderState.elements, id);
  if (!location) return;
  
  // Глубокое копирование с новыми ID
  const clone = deepCloneWithNewIds(element);
  
  // Вставить после оригинала
  location.array.splice(location.index + 1, 0, clone);
  
  // Выбрать клон
  builderState.selectedIds.clear();
  builderState.selectedIds.add(clone.id);
  builderState.lastSelectedId = clone.id;
  
  renderField();
  saveState();
  showSuccess('Элемент дублирован');
}

/** Глубокое копирование с новыми ID */
function deepCloneWithNewIds(element) {
  const clone = { ...element, id: generateId() };
  if (clone.type === 'group' && clone.children) {
    clone.children = clone.children.map(child => deepCloneWithNewIds(child));
  }
  if (clone.params) {
    clone.params = { ...clone.params };
  }
  if (clone.connector) {
    clone.connector = { ...clone.connector };
  }
  return clone;
}

/** Инвертировать выбранную группу */
function invertSelected() {
  if (builderState.selectedIds.size !== 1) {
    showError('Выберите одну группу для инвертирования');
    return;
  }
  
  const id = Array.from(builderState.selectedIds)[0];
  const element = findElementById(builderState.elements, id);
  
  if (!element || element.type !== 'group') {
    showError('Выберите группу для инвертирования');
    return;
  }
  
  // Сохранить соединители ДО реверса: [conn1, conn2, ..., connN-1, null/default]
  // conn[i] — соединитель от элемента i к элементу i+1
  const originalConnectors = element.children.map(c => c.connector ? { ...c.connector } : null);
  
  // Инвертировать порядок детей
  element.children.reverse();
  
  // Перераспределить соединители:
  // До инверсии: A —conn0→ B —conn1→ C (у C соединитель не используется)
  // После инверсии: C —conn1→ B —conn0→ A (у A соединитель не используется)
  // Соединители тоже реверсируются (без последнего) и сдвигаются
  const usedConnectors = originalConnectors.slice(0, -1).reverse();
  
  element.children.forEach((child, i) => {
    if (i < element.children.length - 1) {
      // Используем реверсированный соединитель
      child.connector = usedConnectors[i] || { mode: 'alternation' };
    } else {
      // Последний элемент — соединитель по умолчанию (не используется)
      child.connector = { mode: 'alternation' };
    }
  });
  
  renderField();
  saveState();
  showSuccess('Порядок элементов инвертирован');
}

// ═══════════════════════════════════════════════════════════════════
// DRAG & DROP
// ═══════════════════════════════════════════════════════════════════

/** Начало перетаскивания */
function handleDragStart(e, elementId) {
  dragState.draggedId = elementId;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', elementId);
  
  // Добавить класс к перетаскиваемому элементу
  const el = e.target.closest('[data-id]');
  if (el) {
    setTimeout(() => el.classList.add('dragging'), 0);
  }
}

/** Конец перетаскивания */
function handleDragEnd(e) {
  // Убрать классы со всех элементов
  if (dom.field) {
    dom.field.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    dom.field.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
    dom.field.querySelectorAll('.drop-before').forEach(el => el.classList.remove('drop-before'));
    dom.field.querySelectorAll('.drop-after').forEach(el => el.classList.remove('drop-after'));
    dom.field.querySelectorAll('.drop-inside').forEach(el => el.classList.remove('drop-inside'));
  }
  
  dragState.draggedId = null;
  dragState.dropTargetId = null;
  dragState.dropPosition = null;
}

/** Элемент над целью (определение позиции) */
function handleDragOver(e, elementId, elementType) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  if (!dragState.draggedId || dragState.draggedId === elementId) return;
  
  // Нельзя перетаскивать внутрь себя (группы)
  const draggedElement = findElementById(builderState.elements, dragState.draggedId);
  if (draggedElement?.type === 'group') {
    const allChildIds = getAllIds(draggedElement.children || []);
    if (allChildIds.includes(elementId)) return;
  }
  
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const width = rect.width;
  
  let position;
  if (elementType === 'group') {
    // Для групп: лево = before, право = after, центр = inside
    // Расширенные зоны: 35% | 30% | 35% (было 25% | 50% | 25%)
    if (x < width * 0.35) {
      position = 'before';
    } else if (x > width * 0.65) {
      position = 'after';
    } else {
      position = 'inside';
    }
  } else {
    // Для триггеров: лево = before, право = after (50/50)
    position = x < width / 2 ? 'before' : 'after';
  }
  
  // Обновить визуальную индикацию
  if (dragState.dropTargetId !== elementId || dragState.dropPosition !== position) {
    // Убрать старые классы
    if (dom.field) {
      dom.field.querySelectorAll('.drop-target, .drop-before, .drop-after, .drop-inside').forEach(el => {
        el.classList.remove('drop-target', 'drop-before', 'drop-after', 'drop-inside');
      });
    }
    
    // Добавить новые классы
    const targetEl = e.currentTarget;
    targetEl.classList.add('drop-target', `drop-${position}`);
    
    dragState.dropTargetId = elementId;
    dragState.dropPosition = position;
  }
}

/** Покидание зоны сброса */
function handleDragLeave(e) {
  // Проверяем, что реально покинули элемент (а не перешли на дочерний)
  const relatedTarget = e.relatedTarget;
  const currentTarget = e.currentTarget;
  
  if (!currentTarget.contains(relatedTarget)) {
    currentTarget.classList.remove('drop-target', 'drop-before', 'drop-after', 'drop-inside');
  }
}

/** Сброс элемента */
function handleDrop(e, targetId) {
  e.preventDefault();
  e.stopPropagation();
  
  if (!dragState.draggedId || !targetId || dragState.draggedId === targetId) {
    handleDragEnd(e);
    return;
  }
  
  const position = dragState.dropPosition || 'after';
  
  // Выполнить перемещение
  moveElement(dragState.draggedId, targetId, position);
  
  handleDragEnd(e);
}

/** Переместить элемент */
function moveElement(sourceId, targetId, position) {
  // Найти исходный элемент и удалить его
  const sourceLocation = findParentArray(builderState.elements, sourceId);
  if (!sourceLocation) return;
  
  const sourceElement = sourceLocation.array[sourceLocation.index];
  
  // Нельзя перемещать группу внутрь себя или своих детей
  if (sourceElement.type === 'group' && position === 'inside') {
    const allChildIds = getAllIds(sourceElement.children || []);
    if (allChildIds.includes(targetId) || sourceId === targetId) {
      showError('Нельзя переместить группу внутрь себя');
      return;
    }
  }
  
  // Удалить из текущей позиции
  sourceLocation.array.splice(sourceLocation.index, 1);
  
  // Найти целевое место ПОСЛЕ удаления (индексы могли измениться)
  const targetLocation = findParentArray(builderState.elements, targetId);
  if (!targetLocation) {
    // Откат — вернуть элемент на место
    sourceLocation.array.splice(sourceLocation.index, 0, sourceElement);
    return;
  }
  
  const targetElement = targetLocation.array[targetLocation.index];
  
  if (position === 'inside' && targetElement.type === 'group') {
    // Вставить внутрь группы (в конец)
    targetElement.children.push(sourceElement);
  } else if (position === 'before') {
    targetLocation.array.splice(targetLocation.index, 0, sourceElement);
  } else {
    // 'after'
    targetLocation.array.splice(targetLocation.index + 1, 0, sourceElement);
  }
  
  // Обновить выбор
  builderState.selectedIds.clear();
  builderState.selectedIds.add(sourceId);
  builderState.lastSelectedId = sourceId;
  
  renderField();
  saveState();
}

/** Применить соединитель к выбранным элементам */
function applyConnector(mode, min = 0, max = 10) {
  if (builderState.selectedIds.size === 0) {
    showError('Выберите элемент для применения соединителя');
    return;
  }
  
  for (const id of builderState.selectedIds) {
    const element = findElementById(builderState.elements, id);
    if (element) {
      element.connector = { mode, min, max };
    }
  }
  
  renderField();
  saveState();
}

/** Применить параметр к выбранным триггерам */
function applyParam(paramKey, value) {
  if (builderState.selectedIds.size === 0) {
    showError('Выберите триггер(ы) для применения параметра');
    return;
  }
  
  let applied = 0;
  let removedConflicts = [];
  
  for (const id of builderState.selectedIds) {
    const element = findElementById(builderState.elements, id);
    if (element && element.type === 'trigger') {
      if (!element.params) element.params = {};
      
      // Если отключаем параметр — без проверок
      if (value === null || value === false) {
        delete element.params[paramKey];
        applied++;
        continue;
      }
      
      // Автоматически снять конфликтующие параметры (как в простых триггерах)
      const incompatible = getIncompatibleParams(paramKey);
      for (const inc of incompatible) {
        if (isParamActive(inc, element.params[inc])) {
          removedConflicts.push(inc);
          delete element.params[inc];
        }
      }
      
      element.params[paramKey] = value;
      applied++;
    }
  }
  
  if (applied === 0) {
    showError('Параметры применяются только к триггерам, не к группам');
    return;
  }
  
  // Уведомить о снятых конфликтах
  if (removedConflicts.length > 0) {
    const paramLabels = {
      latinCyrillic: 'Лат/Кир',
      transliteration: 'Транслит',
      declensions: 'Склонения',
      optionalChars: '(?)',
      wildcard: '(\\w)',
      wordBoundaries: '(\\b)',
      requireSpaceAfter: '(\\s)'
    };
    const uniqueConflicts = [...new Set(removedConflicts)];
    const conflictNames = uniqueConflicts.map(p => paramLabels[p] || p).join(', ');
    showSuccess(`Снято: ${conflictNames}`);
  }
  
  renderField();
  updateParamsPanel();
  saveState();
}

/** Очистить панель */
function clearAll() {
  if (builderState.elements.length === 0) return;
  
  openConfirmModal({
    title: 'Очистить панель',
    message: 'Удалить все триггеры и группы?',
    onConfirm: () => {
      builderState.elements = [];
      builderState.selectedIds.clear();
      builderState.lastSelectedId = null;
      
      renderField();
      saveState();
      showSuccess('Панель очищена');
    }
  });
}

/** Удалить выбранные триггеры */
function deleteSelectedTriggers() {
  const selectedElements = Array.from(builderState.selectedIds)
    .map(id => findElementById(builderState.elements, id))
    .filter(Boolean);
  
  const selectedTriggers = selectedElements.filter(el => el.type === 'trigger');
  
  if (selectedTriggers.length < 2) {
    showError('Выберите 2 или более триггеров для удаления');
    return;
  }
  
  openConfirmModal({
    title: 'Удалить триггеры',
    message: `Удалить ${selectedTriggers.length} выбранных триггеров?`,
    onConfirm: () => {
      for (const trigger of selectedTriggers) {
        const location = findParentArray(builderState.elements, trigger.id);
        if (location) {
          location.array.splice(location.index, 1);
        }
      }
      
      builderState.selectedIds.clear();
      builderState.lastSelectedId = null;
      
      renderField();
      saveState();
      showSuccess(`Удалено ${selectedTriggers.length} триггеров`);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// ПАНЕЛЬ ПАРАМЕТРОВ
// ═══════════════════════════════════════════════════════════════════

/** Обновить панель параметров */
function updateParamsPanel() {
  if (!dom.paramsPanel) return;
  
  const hasSelection = builderState.selectedIds.size > 0;
  const selectedElements = Array.from(builderState.selectedIds)
    .map(id => findElementById(builderState.elements, id))
    .filter(Boolean);
  
  const selectedTriggers = selectedElements.filter(el => el.type === 'trigger');
  const selectedGroups = selectedElements.filter(el => el.type === 'group');
  const singleElementSelected = selectedElements.length === 1;
  const singleTriggerSelected = singleElementSelected && selectedElements[0]?.type === 'trigger';
  const singleGroupSelected = singleElementSelected && selectedElements[0]?.type === 'group';
  
  // Показать/скрыть секцию действий (при выборе любого одного элемента)
  const actionsSection = dom.paramsPanel.querySelector('.linked-element-actions');
  if (actionsSection) {
    actionsSection.style.display = singleElementSelected ? 'flex' : 'none';
  }
  
  // Обновить заголовок секции действий
  const actionsTitle = dom.paramsPanel.querySelector('#lb-actions-title');
  if (actionsTitle) {
    if (singleTriggerSelected) {
      actionsTitle.textContent = 'Действия с триггером';
    } else if (singleGroupSelected) {
      actionsTitle.textContent = 'Действия с группой';
    }
  }
  
  // Кнопки Инвертировать и Разгруппировать — только для групп
  const invertBtn = dom.paramsPanel.querySelector('#lb-invert');
  const ungroupBtn = dom.paramsPanel.querySelector('#lb-ungroup');
  if (invertBtn) {
    invertBtn.style.display = singleGroupSelected ? '' : 'none';
  }
  if (ungroupBtn) {
    ungroupBtn.style.display = singleGroupSelected ? '' : 'none';
  }
  
  // Показать/скрыть кнопку "Удалить триггеры" в тулбаре (при 2+ выбранных триггерах)
  const deleteSelectedBtn = dom.container?.querySelector('#lb-delete-selected');
  if (deleteSelectedBtn) {
    const showDeleteSelected = selectedTriggers.length >= 2;
    deleteSelectedBtn.style.display = showDeleteSelected ? '' : 'none';
  }
}

// ═══════════════════════════════════════════════════════════════════
// СОХРАНЕНИЕ / ЗАГРУЗКА
// ═══════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'regexhelper_linked_builder';

/** Сохранить состояние */
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(builderState.elements));
  } catch (e) {
    console.error('Failed to save linked builder state:', e);
  }
  
  if (callbacks.onStateChange) {
    callbacks.onStateChange(builderState.elements);
  }
}

/** Загрузить состояние */
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      builderState.elements = JSON.parse(saved);
      return;
    }
    
    // Попробовать мигрировать из старого формата
    const oldKey = 'regexhelper_linked_structure';
    const oldSaved = localStorage.getItem(oldKey);
    if (oldSaved) {
      const oldStructure = JSON.parse(oldSaved);
      if (oldStructure?.groups?.length > 0) {
        builderState.elements = migrateFromOldFormat(oldStructure);
        saveState();
        console.log('LinkedBuilder: migrated from old format');
      }
    }
  } catch (e) {
    console.error('Failed to load linked builder state:', e);
    builderState.elements = [];
  }
}

/**
 * Миграция из старого формата (groupManager) в новый
 * @param {Object} oldStructure - { groups: [...] }
 * @returns {Array} новый формат элементов
 */
function migrateFromOldFormat(oldStructure) {
  const elements = [];
  
  if (!oldStructure?.groups) return elements;
  
  oldStructure.groups.forEach((group, groupIndex) => {
    // Сначала обработать directTriggers если есть
    const directTriggers = group.directTriggers?.triggers || [];
    const directParams = group.directTriggers?.triggerParams || [];
    
    directTriggers.forEach((text, i) => {
      if (!text || !text.trim()) return;
      
      const trigger = createTriggerData(text.trim());
      trigger.params = directParams[i] || {};
      
      // Соединитель к следующему
      trigger.connector = { mode: 'alternation' };
      
      elements.push(trigger);
    });
    
    // Потом subgroups
    const subgroups = group.subgroups || [];
    
    subgroups.forEach((sg, sgIndex) => {
      const sgTriggers = sg.triggers || [];
      const sgParams = sg.triggerParams || [];
      
      if (sgTriggers.length === 0) return;
      
      // Если одна подгруппа с одним триггером — не создаём группу
      if (sgTriggers.length === 1) {
        const text = sgTriggers[0];
        if (!text || !text.trim()) return;
        
        const trigger = createTriggerData(text.trim());
        trigger.params = sgParams[0] || {};
        trigger.connector = migrateConnector(sg.distanceValue || sg.distanceToNext);
        
        elements.push(trigger);
      } else {
        // Создаём группу из триггеров подгруппы
        const children = [];
        
        sgTriggers.forEach((text, i) => {
          if (!text || !text.trim()) return;
          
          const trigger = createTriggerData(text.trim());
          trigger.params = sgParams[i] || {};
          
          // Внутренний соединитель (альтернация по умолчанию)
          trigger.connector = { mode: 'alternation' };
          
          children.push(trigger);
        });
        
        if (children.length > 0) {
          const newGroup = createGroupData(children);
          newGroup.connector = migrateConnector(sg.distanceValue || sg.distanceToNext);
          elements.push(newGroup);
        }
      }
    });
    
    // Соединитель между группами
    if (groupIndex < oldStructure.groups.length - 1 && elements.length > 0) {
      const lastEl = elements[elements.length - 1];
      lastEl.connector = migrateConnector(group.distanceValue);
    }
  });
  
  return elements;
}

/**
 * Конвертирует старый формат connector/distance в новый
 * @param {Object|string} oldDistance
 * @returns {Object}
 */
function migrateConnector(oldDistance) {
  if (!oldDistance) return { mode: 'alternation' };
  
  // Если это объект с mode
  if (typeof oldDistance === 'object' && oldDistance.mode) {
    const modeMap = {
      'alternation': 'alternation',
      'empty': 'alternation',
      'any': 'any',
      'paragraph': 'paragraph',
      'line': 'line',
      'custom': 'custom'
    };
    return {
      mode: modeMap[oldDistance.mode] || 'alternation',
      min: oldDistance.min ?? 0,
      max: oldDistance.max ?? 10
    };
  }
  
  // Если это строка (паттерн)
  if (typeof oldDistance === 'string') {
    if (oldDistance === '|' || oldDistance === '') return { mode: 'alternation' };
    if (oldDistance.includes('[\\s\\S]')) return { mode: 'any' };
    if (oldDistance === '.+') return { mode: 'paragraph' };
    if (oldDistance.includes('[^\\n]')) return { mode: 'line' };
    
    // Попробовать распарсить .{min,max}
    const match = oldDistance.match(/\.?\{(\d+),(\d+)\}/);
    if (match) {
      return { mode: 'custom', min: parseInt(match[1], 10), max: parseInt(match[2], 10) };
    }
  }
  
  return { mode: 'alternation' };
}

// ═══════════════════════════════════════════════════════════════════
// ОБРАБОТКА ПАРАМЕТРОВ
// ═══════════════════════════════════════════════════════════════════

/**
 * Обработчик клика по кнопке параметра
 * @param {string} param - ключ параметра
 * @param {HTMLElement} btn - кнопка
 * @param {Event} e - событие
 */
function handleParamClick(param, btn, e) {
  if (builderState.selectedIds.size === 0) {
    showError('Выберите триггер(ы) для применения параметра');
    return;
  }
  
  // Получаем выбранные триггеры (не группы)
  const selectedTriggers = Array.from(builderState.selectedIds)
    .map(id => findElementById(builderState.elements, id))
    .filter(el => el && el.type === 'trigger');
  
  if (selectedTriggers.length === 0) {
    showError('Параметры применяются только к триггерам, не к группам');
    return;
  }
  
  // Проверяем, активен ли параметр у всех выбранных
  const allHaveParam = selectedTriggers.every(t => t.params && t.params[param]);
  
  // Для declensions, wildcard и optionalChars — показываем popup
  if (param === 'declensions') {
    handleDeclensionsClick(btn, selectedTriggers, allHaveParam);
    return;
  }
  
  if (param === 'wildcard') {
    handleWildcardClick(btn, selectedTriggers, allHaveParam);
    return;
  }
  
  if (param === 'optionalChars') {
    handleOptionalCharsClick(btn, selectedTriggers, allHaveParam);
    return;
  }
  
  if (param === 'wordBoundaries') {
    handleWordBoundariesClick(btn, selectedTriggers, allHaveParam);
    return;
  }
  
  // Для остальных параметров — toggle
  if (allHaveParam) {
    // Выключить
    applyParam(param, null);
  } else {
    // Включить
    applyParam(param, true);
  }
}

/**
 * Обработчик клика по "Склонения"
 */
function handleDeclensionsClick(btn, selectedTriggers, allHaveParam) {
  // Если уже активно — выключить
  if (allHaveParam) {
    applyParam('declensions', null);
    return;
  }
  
  // Если выбрано несколько триггеров — сразу применить авто
  if (selectedTriggers.length > 1) {
    applyParam('declensions', { mode: 'auto' });
    showSuccess('Склонения (авто) применены');
    return;
  }
  
  // Один триггер — показать popup
  const trigger = selectedTriggers[0];
  const triggerText = trigger.text || '';
  
  // Находим DOM элемент чипа
  const chipEl = dom.field.querySelector(`[data-id="${trigger.id}"]`);
  
  openDeclensionsPopup(
    chipEl || btn,
    triggerText,
    (result) => {
      if (result === null) {
        applyParam('declensions', null);
        return;
      }
      // result = { mode: 'auto' } или { mode: 'exact', stem: '...', endings: [...] }
      applyParam('declensions', result);
      showSuccess(result.mode === 'auto' ? 'Склонения (авто) применены' : 'Точные окончания применены');
    },
    trigger.params?.declensions || null,
    { hideDisableButton: true }
  );
}

/**
 * Обработчик клика по "Опциональные символы (?)"
 */
function handleOptionalCharsClick(btn, selectedTriggers, allHaveParam) {
  // Если уже активно — выключить
  if (allHaveParam) {
    applyParam('optionalChars', null);
    return;
  }
  
  // Опциональные символы применяются только к одному триггеру
  if (selectedTriggers.length > 1) {
    showError('Опциональные символы применяются только к одному триггеру. Выберите один триггер.');
    return;
  }
  
  const trigger = selectedTriggers[0];
  const triggerText = trigger.text || '';
  
  if (!triggerText.trim()) {
    showError('Триггер пуст');
    return;
  }
  
  // Находим DOM элемент чипа
  const chipEl = dom.field.querySelector(`[data-id="${trigger.id}"]`);
  
  // Текущие индексы (если уже были выбраны)
  const currentIndices = Array.isArray(trigger.params?.optionalChars) ? trigger.params.optionalChars : [];
  
  openOptionalCharsPopup(
    chipEl || btn,
    triggerText,
    (indices) => {
      if (!indices || indices.length === 0) {
        applyParam('optionalChars', null);
        return;
      }
      applyParam('optionalChars', indices);
      showSuccess(`Опциональные символы применены: ${indices.length} символ(ов)`);
    },
    currentIndices
  );
}

/**
 * Обработчик клика по "Границы слова (\b)"
 */
function handleWordBoundariesClick(btn, selectedTriggers, allHaveParam) {
  // Если уже активно — выключить
  if (allHaveParam) {
    applyParam('wordBoundaries', null);
    return;
  }
  
  // Проверяем, есть ли у триггеров wildcard или declensions
  const hasWildcardOrDeclensions = selectedTriggers.some(t => wordBoundaryStartOnly(t.params || {}));
  
  // Если есть wildcard/declensions — сразу применяем start с уведомлением
  if (hasWildcardOrDeclensions) {
    applyParam('wordBoundaries', { mode: 'start' });
    showInfo('При склонениях или \\w границы слова ставятся только в начале');
    return;
  }
  
  // Если выбрано несколько триггеров — применить both по умолчанию
  if (selectedTriggers.length > 1) {
    applyParam('wordBoundaries', { mode: 'both' });
    showSuccess('Границы слова применены');
    return;
  }
  
  // Один триггер — показать popup
  const trigger = selectedTriggers[0];
  const triggerText = trigger.text || '';
  
  // Находим DOM элемент чипа
  const chipEl = dom.field.querySelector(`[data-id="${trigger.id}"]`);
  
  // Текущие настройки (нормализуем)
  const currentWb = normalizeWordBoundaries(trigger.params?.wordBoundaries);
  
  openWordBoundariesPopup(
    chipEl || btn,
    triggerText,
    (result) => {
      if (result === null) {
        applyParam('wordBoundaries', null);
        return;
      }
      applyParam('wordBoundaries', result);
      const modeLabels = { start: 'в начале', end: 'в конце', both: 'с обеих сторон' };
      showSuccess(`Границы слова (${modeLabels[result.mode] || result.mode}) применены`);
    },
    currentWb,
    { hideDisableButton: true }
  );
}

/**
 * Показать popup для custom connector (.{min,max})
 */
function showCustomConnectorPopup(btn) {
  if (builderState.selectedIds.size === 0) {
    showError('Выберите элемент для применения соединителя');
    return;
  }
  
  removeAllPopups();
  
  const popup = document.createElement('div');
  popup.className = 'inline-popup custom-connector-popup';
  popup.style.cssText = `
    position: absolute;
    z-index: 1000;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-medium);
    padding: var(--spacing-m);
    box-shadow: var(--shadow-medium);
    min-width: 200px;
  `;
  
  popup.innerHTML = `
    <div class="popup-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-s);">
      <h4 style="margin: 0; font-size: 14px;">Своё расстояние</h4>
      <button type="button" class="popup-close" style="border: none; background: none; cursor: pointer; padding: 4px;">×</button>
    </div>
    <div class="popup-content">
      <div style="display: flex; gap: var(--spacing-s); align-items: center; margin-bottom: var(--spacing-s);">
        <label style="font-size: 13px;">Min:</label>
        <input type="number" id="custom-min" value="0" min="0" max="999" style="width: 60px; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: var(--radius-small); background: var(--bg-input); color: var(--text-primary);">
        <label style="font-size: 13px;">Max:</label>
        <input type="number" id="custom-max" value="10" min="0" max="999" style="width: 60px; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: var(--radius-small); background: var(--bg-input); color: var(--text-primary);">
      </div>
      <div style="font-size: 12px; color: var(--text-muted); margin-bottom: var(--spacing-s);">
        Результат: <code style="font-family: var(--font-mono);">.{<span id="preview-min">0</span>,<span id="preview-max">10</span>}</code>
      </div>
    </div>
    <div class="popup-footer" style="display: flex; gap: var(--spacing-xs); justify-content: flex-end;">
      <button class="btn-secondary" data-action="cancel" style="padding: 6px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-small); background: var(--bg-primary); cursor: pointer;">Отмена</button>
      <button class="btn-primary" data-action="apply" style="padding: 6px 12px; border: none; border-radius: var(--radius-small); background: var(--color-primary); color: white; cursor: pointer;">Применить</button>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // Позиционирование с учётом границ экрана
  const btnRect = btn.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();
  
  let top = btnRect.bottom + 8;
  let left = btnRect.left;
  
  // Проверяем, не выходит ли за правый край экрана
  if (left + popupRect.width > window.innerWidth - 16) {
    left = window.innerWidth - popupRect.width - 16;
  }
  
  // Проверяем, не выходит ли за нижний край экрана
  if (top + popupRect.height > window.innerHeight - 16) {
    // Показать сверху от кнопки
    top = btnRect.top - popupRect.height - 8;
  }
  
  // Минимальные отступы
  if (left < 16) left = 16;
  if (top < 16) top = 16;
  
  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;
  
  // Обработчики
  const minInput = popup.querySelector('#custom-min');
  const maxInput = popup.querySelector('#custom-max');
  const previewMin = popup.querySelector('#preview-min');
  const previewMax = popup.querySelector('#preview-max');
  
  const updatePreview = () => {
    previewMin.textContent = minInput.value;
    previewMax.textContent = maxInput.value;
  };
  
  minInput.oninput = updatePreview;
  maxInput.oninput = updatePreview;
  
  popup.querySelector('.popup-close').onclick = () => popup.remove();
  popup.querySelector('[data-action="cancel"]').onclick = () => popup.remove();
  popup.querySelector('[data-action="apply"]').onclick = () => {
    const min = parseInt(minInput.value, 10) || 0;
    const max = parseInt(maxInput.value, 10) || 10;
    applyConnector('custom', min, max);
    popup.remove();
    showSuccess(`Соединитель .{${min},${max}} применён`);
  };
  
  // Закрытие по клику вне popup
  setTimeout(() => {
    document.addEventListener('click', function closePopup(e) {
      if (!popup.contains(e.target) && e.target !== btn) {
        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    });
  }, 100);
}

/**
 * Обработчик клика по "\w"
 */
function handleWildcardClick(btn, selectedTriggers, allHaveParam) {
  // Если уже активно — выключить
  if (allHaveParam) {
    applyParam('wildcard', null);
    return;
  }
  
  // Находим DOM элемент первого чипа
  const firstTrigger = selectedTriggers[0];
  const chipEl = dom.field.querySelector(`[data-id="${firstTrigger.id}"]`);
  
  openWildcardPopup(
    chipEl || btn,
    firstTrigger.text || '',
    (result) => {
      if (result === null) {
        applyParam('wildcard', null);
        return;
      }
      // result = { mode: 'auto' } или { mode: 'range', min: N, max: M }
      applyParam('wildcard', result);
      const label = result.mode === 'auto' ? '\\w' : `\\w{${result.min},${result.max}}`;
      showSuccess(`Любой символ (${label}) применён`);
    },
    firstTrigger.params?.wildcard || null,
    { hideDisableButton: true }
  );
}

// ═══════════════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ
// ═══════════════════════════════════════════════════════════════════

/**
 * Инициализация конструктора
 * @param {HTMLElement} container - контейнер для конструктора
 * @param {Object} options - опции
 */
export function initLinkedBuilder(container, options = {}) {
  if (!container) {
    console.error('LinkedBuilder: container not found');
    return;
  }
  
  callbacks.onConvert = options.onConvert || null;
  callbacks.onStateChange = options.onStateChange || null;
  
  // Создать HTML структуру
  container.innerHTML = `
    <div class="linked-builder-container">
      <div class="linked-builder-workspace">
        <div class="linked-builder-toolbar">
          <button class="linked-toolbar-btn primary" id="lb-add-trigger" title="Добавить новый триггер">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Триггер
          </button>
          <button class="linked-toolbar-btn" id="lb-group" title="Сгруппировать: объединяет выбранные соседние элементы в скобки. Выберите несколько элементов (Ctrl+клик или Shift+клик) и нажмите эту кнопку.">
            Сгруппировать ( )
          </button>
          <button class="linked-toolbar-btn danger" id="lb-delete-selected" style="display:none" title="Удалить выбранные триггеры">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Удалить
          </button>
        </div>
        <div class="linked-builder-field" id="lb-field"></div>
        <div class="linked-workspace-hint">Ctrl+клик — выбор нескольких · Shift+клик — выбрать диапазон</div>
      </div>
      <div class="linked-builder-params" id="lb-params">
        <div class="linked-params-section">
          <div class="linked-params-title">Параметры триггера</div>
          <div class="linked-params-grid">
            <button class="linked-param-btn" data-param="latinCyrillic" title="Лат/Кир: заменяет визуально похожие латинские и кириллические буквы (а↔a, о↔o, е↔e и др.) на группы [аa], [оo]. Полезно для поиска текста с намеренными подменами букв.">Лат/Кир</button>
            <button class="linked-param-btn" data-param="transliteration" title="Транслит: генерирует все возможные варианты транслитерации каждой буквы. Например, «roblox» → [рr][оo][бb][лl][оo](кс|x). Охватывает написание и латиницей, и кириллицей.">Транслит</button>
            <button class="linked-param-btn" data-param="declensions" title="Склонения: «Авто» — существительные, прилагательные, причастия; «Точные окончания» — ваши варианты. Глаголы и краткие формы не поддерживаются — используйте точные окончания или \w.">Склонения</button>
          </div>
          <div class="linked-params-grid linked-params-grid-secondary">
            <button class="linked-param-btn" data-param="optionalChars" title="Опциональные символы (?): делает выбранные символы в триггере необязательными. Пример: пасс?ивный. Несовместим с Лат/Кир, Транслит, Склонения, \w.">(?)</button>
            <button class="linked-param-btn" data-param="wildcard" title="Любой символ (\\w): добавляет после слова символ \\w (один буквенно-цифровой символ) или \\w{min,max} (диапазон). Удобно для поиска слов с суффиксами.">(&#92;w)</button>
            <button class="linked-param-btn" data-param="wordBoundaries" title="Границы слова (\\b): обрамляет триггер символами \\b, чтобы искать только целые слова. Если активны склонения/wildcard, \\b ставится только в начале.">(&#92;b)</button>
            <button class="linked-param-btn" data-param="requireSpaceAfter" title="Пробел после (\\s): добавляет \\s+ в конец триггера, требуя пробел или пробелы после слова. Полезно для разделения слов в потоке текста.">(&#92;s)</button>
          </div>
          <div class="linked-params-hint">Выберите триггер(ы) и нажмите на параметр. Повторный клик отключает.</div>
        </div>
        
        <div class="linked-params-section">
          <div class="linked-params-title">Соединители</div>
          <div class="linked-params-grid">
            <button class="linked-connector-btn linked-param-btn" data-connector="alternation" title="Альтернация (|): ИЛИ — совпадение с любым из вариантов. По умолчанию.">|</button>
            <button class="linked-connector-btn linked-param-btn" data-connector="any" title="Любое расстояние ([\\s\\S]+): между элементами может быть любой текст, включая переносы строк.">[&#92;s&#92;S]+</button>
            <button class="linked-connector-btn linked-param-btn" data-connector="paragraph" title="В пределах абзаца (.+): между элементами любой текст, но без переноса строки.">.+</button>
            <button class="linked-connector-btn linked-param-btn" data-connector="line" title="В пределах строки ([^\\n]+): текст до конца строки (без переноса).">[^&#92;n]+</button>
            <button class="linked-connector-btn linked-param-btn" data-connector="custom" title="Своё расстояние (.{min,max}): точное количество символов между элементами. Укажите min и max.">.{,}</button>
          </div>
          <div class="linked-params-hint">Соединитель определяет связь со следующим элементом (триггер или группа)</div>
        </div>
        
        <div class="linked-params-section linked-element-actions">
          <div class="linked-params-title" id="lb-actions-title">Действия</div>
          <div class="linked-actions-grid">
            <button class="linked-action-btn duplicate" id="lb-duplicate" title="Создать копию выбранного элемента (триггера или группы)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Дубль
            </button>
            <button class="linked-action-btn invert" id="lb-invert" title="Инвертировать: меняет порядок элементов внутри группы на обратный. Соединители также инвертируются вместе с элементами.">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4"/></svg>
              Инверт
            </button>
            <button class="linked-action-btn" id="lb-ungroup" title="Извлечь элементы из группы (разгруппировать)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Разгруп.
            </button>
            <button class="linked-action-btn danger" id="lb-delete" title="Удалить выбранный элемент">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Удалить
            </button>
          </div>
        </div>
        
        <div class="linked-params-section linked-convert-section">
          <button class="linked-convert-btn" id="lb-convert" title="Конвертировать триггеры в regex">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Конвертировать
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Сохранить ссылки на DOM
  dom.container = container;
  dom.field = container.querySelector('#lb-field');
  dom.paramsPanel = container.querySelector('#lb-params');
  
  // Клик по пустому месту в поле — снять выделение
  dom.field.onclick = (e) => {
    // Если клик был по самому полю или по пустому месту (не по элементу)
    if (e.target === dom.field || 
        e.target.classList.contains('linked-builder-rows') ||
        e.target.classList.contains('linked-builder-row') ||
        e.target.classList.contains('linked-builder-row-content') ||
        e.target.classList.contains('linked-builder-row-number') ||
        e.target.classList.contains('linked-row-marker') ||
        e.target.classList.contains('linked-row-continue') ||
        e.target.classList.contains('linked-builder-empty')) {
      clearSelection();
    }
  };
  
  // Обработчики кнопок
  container.querySelector('#lb-add-trigger').onclick = () => addTrigger();
  container.querySelector('#lb-group').onclick = groupSelected;
  container.querySelector('#lb-delete-selected').onclick = deleteSelectedTriggers;
  container.querySelector('#lb-duplicate').onclick = duplicateSelected;
  container.querySelector('#lb-invert').onclick = invertSelected;
  container.querySelector('#lb-ungroup').onclick = ungroupSelected;
  container.querySelector('#lb-delete').onclick = () => {
    if (builderState.selectedIds.size === 1) {
      deleteElement(Array.from(builderState.selectedIds)[0]);
    }
  };
  container.querySelector('#lb-convert').onclick = () => {
    if (callbacks.onConvert) {
      callbacks.onConvert(builderState.elements);
    }
  };
  
  // Кнопка "Очистить панель" в шапке (index.html)
  const clearLinkedPanelBtn = document.getElementById('clear-linked-panel-btn');
  if (clearLinkedPanelBtn) {
    clearLinkedPanelBtn.onclick = clearAll;
  }
  
  // Обработчики параметров
  container.querySelectorAll('[data-param]').forEach(btn => {
    btn.onclick = (e) => {
      const param = btn.dataset.param;
      handleParamClick(param, btn, e);
    };
  });
  
  // Обработчики соединителей
  container.querySelectorAll('[data-connector]').forEach(btn => {
    btn.onclick = () => {
      const mode = btn.dataset.connector;
      if (mode === 'custom') {
        showCustomConnectorPopup(btn);
      } else {
        applyConnector(mode);
      }
    };
  });
  
  // Загрузить сохранённое состояние
  loadState();
  renderField();
}

/** Получить текущие данные */
export function getBuilderData() {
  return builderState.elements;
}

/** Установить данные */
export function setBuilderData(elements) {
  builderState.elements = elements || [];
  builderState.selectedIds.clear();
  builderState.lastSelectedId = null;
  renderField();
  saveState();
}

export default {
  initLinkedBuilder,
  getBuilderData,
  setBuilderData,
  CONNECTOR_MODES
};
