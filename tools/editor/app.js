/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - EDITOR PANEL
 *                   Ручной редактор регулярных выражений
 * ═══════════════════════════════════════════════════════════════════
 *
 * @file tools/editor/app.js
 * @description Панель редактора: вставка в курсор, валидация (вкл/выкл), действия
 */

import { showError, showSuccess } from '../../shared/ui/notifications.js';
import { saveToHistory } from '../../shared/utils/storage.js';
import { analyzePatternForUI, parseRegexPattern } from '../converter/logic/regexParser.js';
import { convertLinkedBuilder } from '../converter/logic/linkedBuilderConverter.js';

const TOAST_INSERT_CURSOR = 'Поставьте курсор в поле редактора в то место, куда нужно вставить параметр';
const TOAST_INVERT_PARSE_ERROR = 'Не удалось разобрать выделенный фрагмент как регулярное выражение. Попробуйте воспользоваться конвертером для построения выражения.';

let validationActive = false;

// Вариант A: запоминаем последнюю позицию курсора в поле редактора
let lastEditorRef = null;
let lastSelectionStart = 0;
let lastSelectionEnd = 0;

// ═══════════════════════════════════════════════════════════════════
// ВСТАВКА В КУРСОР (по запомненной позиции)
// ═══════════════════════════════════════════════════════════════════

function getEditorTextarea() {
  return document.getElementById('editor-textarea');
}

function saveEditorSelection() {
  const ta = getEditorTextarea();
  if (!ta || document.activeElement !== ta) return;
  lastEditorRef = ta;
  lastSelectionStart = ta.selectionStart;
  lastSelectionEnd = ta.selectionEnd;
}

function insertParamAtStoredPosition(text) {
  const ta = getEditorTextarea();
  if (!ta) return;
  if (!lastEditorRef) {
    showError(TOAST_INSERT_CURSOR);
    return;
  }
  const start = lastSelectionStart;
  const end = lastSelectionEnd;
  const before = ta.value.slice(0, start);
  const after = ta.value.slice(end);
  ta.value = before + text + after;
  const newPos = start + text.length;
  ta.selectionStart = ta.selectionEnd = newPos;
  lastSelectionStart = lastSelectionEnd = newPos;
  lastEditorRef = ta;
  ta.focus();
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

// ═══════════════════════════════════════════════════════════════════
// ИНВЕРТИРОВАТЬ ВЫДЕЛЕННОЕ (порядок элементов наоборот, в конец через |)
// ═══════════════════════════════════════════════════════════════════

/**
 * Инвертирует порядок элементов верхнего уровня (как в конвертере для группы).
 * @param {Array} elements - массив элементов из parseRegexPattern
 * @returns {Array} новый массив с обратным порядком и перераспределёнными соединителями
 */
export function invertTopLevelElements(elements) {
  if (!Array.isArray(elements) || elements.length === 0) return elements;
  const originalConnectors = elements.map((el) => (el.connector ? { ...el.connector } : null));
  const inverted = [...elements].reverse();
  const usedConnectors = originalConnectors.slice(0, -1).reverse();
  inverted.forEach((el, i) => {
    el.connector = i < inverted.length - 1
      ? (usedConnectors[i] || { mode: 'alternation' })
      : { mode: 'alternation' };
  });
  return inverted;
}

function getInvertSelectionBtn() {
  return document.getElementById('editor-invert-selection-btn');
}

/** Показывать кнопку «Инвертировать выделенное» только при непустом выделении в поле редактора */
function updateInvertSelectionButtonVisibility() {
  const ta = getEditorTextarea();
  const btn = getInvertSelectionBtn();
  if (!ta || !btn) return;
  const hasSelection = ta.selectionStart !== ta.selectionEnd;
  btn.style.display = hasSelection ? '' : 'none';
}

function handleInvertSelection() {
  const ta = getEditorTextarea();
  const btn = getInvertSelectionBtn();
  if (!ta || !btn) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  if (start === end) {
    showError('Выделите фрагмент регулярного выражения в поле редактора');
    return;
  }
  const selectedText = ta.value.slice(start, end).trim();
  if (!selectedText) {
    showError('Выделенный фрагмент пуст после обрезки пробелов');
    return;
  }
  const parsed = parseRegexPattern(selectedText);
  if (!parsed.success) {
    showError(TOAST_INVERT_PARSE_ERROR);
    return;
  }
  if (!parsed.elements || parsed.elements.length === 0) {
    showError(TOAST_INVERT_PARSE_ERROR);
    return;
  }
  const inverted = invertTopLevelElements(parsed.elements);
  const conversion = convertLinkedBuilder(inverted);
  if (!conversion.success || conversion.result === '') {
    showError(TOAST_INVERT_PARSE_ERROR);
    return;
  }
  const currentValue = ta.value;
  const append = (currentValue ? '|' : '') + conversion.result;
  ta.value = currentValue + append;
  const newEnd = ta.value.length;
  ta.selectionStart = ta.selectionEnd = newEnd;
  lastEditorRef = ta;
  lastSelectionStart = lastSelectionEnd = newEnd;
  ta.focus();
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  updateInvertSelectionButtonVisibility();
  showSuccess('Обратный вариант добавлен в конец');
}

// ═══════════════════════════════════════════════════════════════════
// ПОДСВЕТКА ОШИБОК (overlay)
// ═══════════════════════════════════════════════════════════════════

export function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function buildHighlightHtml(text, highlights) {
  if (!highlights || highlights.length === 0) {
    return escapeHtml(text);
  }
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  let result = '';
  let lastEnd = 0;
  for (const h of sorted) {
    if (h.start > lastEnd) {
      result += escapeHtml(text.slice(lastEnd, h.start));
    }
    const fragment = text.slice(h.start, h.end);
    const className = h.type === 'error' ? 'import-highlight-error'
      : h.type === 'warning' ? 'import-highlight-warning'
      : h.type === 'success' ? 'import-highlight-success'
      : 'import-highlight-info';
    result += `<span class="${className}" title="${escapeHtml(h.message || '')}">${escapeHtml(fragment)}</span>`;
    lastEnd = h.end;
  }
  if (lastEnd < text.length) {
    result += escapeHtml(text.slice(lastEnd));
  }
  return result;
}

function getHighlightLayer() {
  return document.getElementById('editor-highlight-layer');
}

function getValidationEl() {
  return document.getElementById('editor-validation');
}

function getCheckBtn() {
  return document.getElementById('editor-check-btn');
}

/**
 * Пытается извлечь позицию ошибки из сообщения (например " at index 5" в некоторых движках)
 */
export function parseErrorIndex(message) {
  const m = (message || '').match(/(?:index|position|at)\s*(\d+)/i);
  return m ? Math.max(0, parseInt(m[1], 10)) : null;
}

/**
 * Эвристический поиск позиции ошибки по тексту сообщения и паттерну.
 * Возвращает { start, end } для подсветки одного символа или короткого фрагмента, или null.
 */
export function heuristicErrorPosition(pattern, message) {
  if (!pattern || typeof pattern !== 'string') return null;
  const msg = (message || '').toLowerCase();

  // "Nothing to repeat" — квантификатор ? * + в недопустимом месте (в начале, после |, после ( или [)
  if (msg.includes('nothing to repeat')) {
    for (let i = 0; i < pattern.length; i++) {
      const c = pattern[i];
      if (c === '\\') { i++; continue; }
      if (c === '[') {
        const close = findCharClassEnd(pattern, i);
        if (close > i) { i = close; continue; }
      }
      if ('*+?'.includes(c)) {
        const prev = pattern[i - 1];
        if (i === 0 || prev === '|' || prev === '(' || prev === '[' || prev === '^') {
          return { start: i, end: i + 1 };
        }
      }
      if (c === '{' && /^\{\d/.test(pattern.slice(i))) {
        const prev = pattern[i - 1];
        if (i === 0 || prev === '|' || prev === '(' || prev === '[') {
          const end = pattern.slice(i).match(/^\{\d+,?\d*\}/);
          return { start: i, end: i + (end ? end[0].length : 1) };
        }
      }
    }
  }

  // "Unterminated group" / незакрытая группа — ищем незакрытую ( или [
  if (msg.includes('unterminated') || msg.includes('missing )') || msg.includes('unmatched')) {
    const openParen = [];
    let i = 0;
    while (i < pattern.length) {
      const c = pattern[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '[') {
        const close = findCharClassEnd(pattern, i);
        if (close > i) { i = close + 1; continue; }
        openParen.push({ i, type: '[' });
        i++;
        continue;
      }
      if (c === '(') {
        openParen.push({ i, type: '(' });
        i++;
        continue;
      }
      if (c === ')') {
        if (openParen.length && openParen[openParen.length - 1].type === '(') openParen.pop();
        i++;
        continue;
      }
      if (c === ']') {
        if (openParen.length && openParen[openParen.length - 1].type === '[') openParen.pop();
        i++;
        continue;
      }
      i++;
    }
    if (openParen.length > 0) {
      const last = openParen[openParen.length - 1];
      return { start: last.i, end: last.i + 1 };
    }
  }

  // "Invalid group" — (? не образующий валидную группу (?: (?= (?! (?<= (?<! (?<name> (?P<
  if (msg.includes('invalid group') || msg.includes('invalid capture')) {
    const idx = pattern.indexOf('(?');
    if (idx !== -1) {
      const rest = pattern.slice(idx + 2);
      const valid = /^[=!<:]/.test(rest) || /^P</.test(rest) || /^\d+\)/.test(rest);
      if (!valid) return { start: idx, end: idx + 2 };
    }
  }

  // Квантификатор \{ — незакрытая или неверная последовательность (например \w{0,10 без })
  if (msg.includes('quantifier') || msg.includes('unterminated') || msg.includes('invalid')) {
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === '\\') { i++; continue; }
      if (pattern[i] === '[') {
        const close = findCharClassEnd(pattern, i);
        if (close > i) { i = close; continue; }
      }
      if (pattern[i] === '{') {
        const rest = pattern.slice(i + 1);
        const quant = rest.match(/^(\d+)(,(\d+))?\}/);
        if (!quant) return { start: i, end: i + 1 };
        i += 1 + quant[0].length - 1;
      }
    }
  }

  return null;
}

export function findCharClassEnd(pattern, start) {
  if (pattern[start] !== '[') return -1;
  let i = start + 1;
  while (i < pattern.length) {
    if (pattern[i] === '\\') { i += 2; continue; }
    if (pattern[i] === ']') return i;
    i++;
  }
  return -1;
}

function showValidationError(message, highlights, pattern) {
  const layer = getHighlightLayer();
  const validationEl = getValidationEl();
  const btn = getCheckBtn();
  const ta = getEditorTextarea();
  const text = pattern || '';
  let effectiveHighlights = highlights && highlights.length > 0 ? highlights : [];
  if (effectiveHighlights.length === 0 && text.length > 0) {
    const index = parseErrorIndex(message);
    if (index != null && index < text.length) {
      effectiveHighlights = [{ start: index, end: Math.min(index + 1, text.length), type: 'error', message }];
    } else {
      const heuristic = heuristicErrorPosition(text, message);
      if (heuristic) {
        const start = Math.max(0, Math.min(heuristic.start, text.length));
        const end = Math.max(start, Math.min(heuristic.end, text.length));
        if (start < end) effectiveHighlights = [{ start, end, type: 'error', message }];
      }
      if (effectiveHighlights.length === 0) {
        effectiveHighlights = [{ start: 0, end: Math.min(1, text.length), type: 'error', message }];
      }
    }
  }
  if (layer) {
    layer.innerHTML = buildHighlightHtml(text, effectiveHighlights);
    layer.style.display = 'block';
    layer.setAttribute('aria-hidden', 'false');
  }
  if (ta) ta.classList.add('validation-showing');
  if (validationEl) {
    validationEl.innerHTML = `
      <span class="validation-icon" title="${escapeHtml(message)}">❌</span>
      <span class="validation-text">Исправьте ошибку.</span>
      <span class="editor-validation-reminder">Чтобы снять подсветку, нажмите кнопку «Проверить» ещё раз.</span>
    `;
    validationEl.className = 'editor-validation validation-error';
  }
  if (btn) {
    btn.classList.add('is-active');
    btn.setAttribute('title', 'Выключить подсветку ошибок');
  }
  validationActive = true;
  syncEditorScroll();
}

function hideValidationState() {
  const layer = getHighlightLayer();
  const validationEl = getValidationEl();
  const btn = getCheckBtn();
  const ta = getEditorTextarea();
  if (layer) {
    layer.innerHTML = '';
    layer.style.display = 'none';
    layer.setAttribute('aria-hidden', 'true');
  }
  if (ta) ta.classList.remove('validation-showing');
  if (validationEl) {
    validationEl.innerHTML = '';
    validationEl.className = 'editor-validation';
  }
  if (btn) {
    btn.classList.remove('is-active');
    btn.setAttribute('title', 'Проверить синтаксис (вкл/выкл)');
  }
  validationActive = false;
}

function runValidation() {
  const ta = getEditorTextarea();
  const pattern = ta ? ta.value : '';
  if (!pattern.trim()) {
    showError('Введите выражение для проверки');
    return;
  }
  const analysis = analyzePatternForUI(pattern);
  if (!analysis.summary.valid) {
    const message = analysis.warnings && analysis.warnings[0] ? analysis.warnings[0].message : 'Ошибка синтаксиса';
    showValidationError(message, analysis.highlights || [], pattern);
    return;
  }
  showSuccess('Синтаксис корректен');
  hideValidationState();
}

function toggleCheck() {
  if (validationActive) {
    hideValidationState();
    return;
  }
  runValidation();
}

// Синхронизация скролла highlight layer с textarea
function syncEditorScroll() {
  const ta = getEditorTextarea();
  const layer = getHighlightLayer();
  if (!ta || !layer) return;
  layer.scrollTop = ta.scrollTop;
  layer.scrollLeft = ta.scrollLeft;
}

// ═══════════════════════════════════════════════════════════════════
// ДЕЙСТВИЯ: КОПИРОВАТЬ, В ТЕСТЕР, В ВИЗУАЛИЗАТОР, ОЧИСТИТЬ
// ═══════════════════════════════════════════════════════════════════

function getEditorValue() {
  const ta = getEditorTextarea();
  return ta ? ta.value.trim() : '';
}

function copyEditor() {
  const value = getEditorValue();
  if (!value) {
    showError('Нет текста для копирования');
    return;
  }
  navigator.clipboard.writeText(getEditorTextarea().value)
    .then(() => showSuccess('Скопировано в буфер обмена'))
    .catch((err) => showError('Ошибка копирования: ' + err.message));
}

function sendEditorToTester() {
  const value = getEditorValue();
  if (!value) {
    showError('Введите выражение в редакторе');
    return;
  }
  const testerInput = document.getElementById('tester-regex-input');
  if (testerInput) {
    testerInput.value = value;
    testerInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const section = document.getElementById('tester');
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showSuccess('Выражение вставлено в тестер');
}

function sendEditorToVisualizer() {
  const value = getEditorValue();
  if (!value) {
    showError('Введите выражение в редакторе');
    return;
  }
  const visualizerInput = document.getElementById('regexp-input');
  if (visualizerInput) {
    visualizerInput.value = value;
    visualizerInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const section = document.getElementById('visualizer');
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showSuccess('Выражение вставлено в визуализатор');
}

function clearEditor() {
  const ta = getEditorTextarea();
  if (ta) ta.value = '';
  hideValidationState();
  showSuccess('Поле редактора очищено');
}

async function saveEditorToHistory() {
  const value = getEditorValue();
  if (!value) {
    showError('Введите регулярное выражение, чтобы сохранить его в историю');
    return;
  }
  saveToHistory({
    id: Date.now().toString(),
    date: new Date().toISOString(),
    triggers: [],
    params: {},
    result: getEditorTextarea().value,
    type: 'manual'
  });
  const { displayHistory } = await import('../converter/ui/historyUI.js');
  displayHistory();
  showSuccess('Сохранено в историю');
}

// ═══════════════════════════════════════════════════════════════════
// ПРИЁМ ИЗ ПАНЕЛИ РЕЗУЛЬТАТА («В редактор»)
// ═══════════════════════════════════════════════════════════════════

/**
 * Полностью заменяет содержимое поля редактора (не добавляет к существующему).
 * @param {string} value - Новое регулярное выражение
 */
export function setEditorContent(value) {
  const ta = getEditorTextarea();
  if (!ta) return;
  const text = value != null ? String(value) : '';
  ta.value = text;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  hideValidationState();
}

// ═══════════════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ
// ═══════════════════════════════════════════════════════════════════

export function initEditor() {
  const ta = getEditorTextarea();
  const highlightLayer = getHighlightLayer();

  // Запоминание позиции курсора при фокусе и изменении выделения в поле редактора
  if (ta) {
    ta.addEventListener('focus', saveEditorSelection);
    ta.addEventListener('select', saveEditorSelection);
    ta.addEventListener('keyup', saveEditorSelection);
    ta.addEventListener('mouseup', saveEditorSelection);
    document.addEventListener('selectionchange', () => {
      if (document.activeElement === ta) saveEditorSelection();
    });
    // Видимость кнопки «Инвертировать выделенное» при изменении выделения
    [ 'focus', 'select', 'mouseup', 'keyup' ].forEach((ev) => {
      ta.addEventListener(ev, updateInvertSelectionButtonVisibility);
    });
  }

  // Кнопки вставки (data-insert) — вставка по запомненной позиции (вариант A)
  document.querySelectorAll('.editor-param-btn[data-insert]').forEach((btn) => {
    const insert = btn.getAttribute('data-insert');
    if (insert == null) return;
    btn.addEventListener('click', () => {
      insertParamAtStoredPosition(insert);
    });
  });

  // Проверить (toggle)
  const checkBtn = getCheckBtn();
  if (checkBtn) {
    checkBtn.addEventListener('click', toggleCheck);
  }

  // Скролл: синхронизировать overlay с textarea при показе ошибок
  if (ta && highlightLayer) {
    ta.addEventListener('scroll', () => {
      if (validationActive) syncEditorScroll();
    });
  }

  // Копировать, В тестер, В визуализатор, Очистить
  const copyBtn = document.getElementById('editor-copy-btn');
  if (copyBtn) copyBtn.addEventListener('click', copyEditor);

  const toTesterBtn = document.getElementById('editor-to-tester-btn');
  if (toTesterBtn) toTesterBtn.addEventListener('click', sendEditorToTester);

  const toVisualizerBtn = document.getElementById('editor-to-visualizer-btn');
  if (toVisualizerBtn) toVisualizerBtn.addEventListener('click', sendEditorToVisualizer);

  const clearBtn = document.getElementById('editor-clear-btn');
  if (clearBtn) clearBtn.addEventListener('click', clearEditor);

  const saveToHistoryBtn = document.getElementById('editor-save-to-history-btn');
  if (saveToHistoryBtn) saveToHistoryBtn.addEventListener('click', saveEditorToHistory);

  // Кнопка «Инвертировать выделенное» — видна только при выделении в поле
  const invertBtn = getInvertSelectionBtn();
  if (invertBtn) {
    invertBtn.addEventListener('click', handleInvertSelection);
    updateInvertSelectionButtonVisibility();
  }

  // Изначально подсветка скрыта
  if (highlightLayer) {
    highlightLayer.style.display = 'none';
  }
}

export default { initEditor, setEditorContent };
