/**
 * UI логика Текстового помощника
 */

import { columnToRow, SEPARATORS as COL_SEPARATORS } from '../logic/columnToRow.js';
import { rowToColumn, SEPARATORS as ROW_SEPARATORS } from '../logic/rowToColumn.js';
import { removeDuplicates } from '../logic/removeDuplicates.js';
import { removeEmpty } from '../logic/removeEmpty.js';
import { addPrefixSuffix, PRESETS } from '../logic/prefixSuffix.js';
import { trimLines, TRIM_MODES } from '../logic/trim.js';
import { changeCase, CASE_MODES } from '../logic/changeCase.js';
import { formatStats } from '../logic/stats.js';
import { showSuccess } from '../../../shared/ui/notifications.js';

let modal = null;
let inputField = null;
let outputField = null;
let statsDisplay = null;
let reportDisplay = null;
let settingsPanel = null;

let currentTool = 'columnToRow';
let toolSettings = {
  columnToRow: { separator: 'commaSpace', customSeparator: '' },
  rowToColumn: { separator: 'auto', customSeparator: '', trimLines: false },
  removeDuplicates: { caseSensitive: false, showOnlyDuplicates: false },
  removeEmpty: { treatWhitespaceAsEmpty: false },
  prefixSuffix: { prefix: '', suffix: '', numbered: false },
  trim: { mode: 'both', removeDoubleSpaces: false },
  changeCase: { mode: 'upper' }
};

const TOOLS = [
  { 
    id: 'columnToRow', 
    label: 'Столбец → Строка',
    hint: 'Объединить строки в одну через разделитель'
  },
  { 
    id: 'rowToColumn', 
    label: 'Строка → Столбец',
    hint: 'Разбить строку на отдельные строки'
  },
  { 
    id: 'removeDuplicates', 
    label: 'Удалить дубликаты',
    hint: 'Оставить только уникальные строки'
  },
  { 
    id: 'removeEmpty', 
    label: 'Удалить пустые строки',
    hint: 'Убрать все пустые строки'
  },
  { 
    id: 'prefixSuffix', 
    label: 'Добавить обёртку',
    hint: 'Добавить текст в начало и конец каждой строки'
  },
  { 
    id: 'trim', 
    label: 'Убрать пробелы',
    hint: 'Удалить лишние пробелы'
  },
  { 
    id: 'changeCase', 
    label: 'Изменить регистр',
    hint: 'Изменить регистр букв'
  }
];

/**
 * Инициализация UI
 */
export function initTexthelperUI() {
  modal = document.getElementById('texthelper-modal-overlay');
  inputField = document.getElementById('texthelper-input');
  outputField = document.getElementById('texthelper-output');
  statsDisplay = document.getElementById('texthelper-stats');
  reportDisplay = document.getElementById('texthelper-report');
  settingsPanel = document.getElementById('texthelper-settings');

  if (!modal) return;

  bindEvents();
  renderToolsList();
  selectTool('columnToRow');
}

/**
 * Привязка событий
 */
function bindEvents() {
  const closeBtn = document.getElementById('texthelper-modal-close');
  const closeBtnFooter = document.getElementById('texthelper-modal-close-footer');
  const overlay = modal;
  const pasteBtn = document.getElementById('texthelper-paste-btn');
  const copyBtn = document.getElementById('texthelper-copy-btn');
  const swapBtn = document.getElementById('texthelper-swap-btn');
  const clearBtn = document.getElementById('texthelper-clear-btn');

  closeBtn?.addEventListener('click', closeModal);
  closeBtnFooter?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  pasteBtn?.addEventListener('click', handlePaste);
  copyBtn?.addEventListener('click', handleCopy);
  swapBtn?.addEventListener('click', handleSwap);
  clearBtn?.addEventListener('click', handleClear);

  inputField?.addEventListener('input', () => {
    updateStats();
    applyCurrentTool();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('active')) {
      closeModal();
    }
  });
}

/**
 * Открыть модалку
 */
export function openTexthelperModal() {
  modal?.classList.add('active');
  modal?.setAttribute('aria-hidden', 'false');
  inputField?.focus();
  updateStats();
}

/**
 * Закрыть модалку
 */
export function closeModal() {
  modal?.classList.add('closing');
  setTimeout(() => {
    modal?.classList.remove('active', 'closing');
    modal?.setAttribute('aria-hidden', 'true');
  }, 200);
}

/**
 * Рендер списка инструментов
 */
function renderToolsList() {
  const container = document.getElementById('texthelper-tools-list');
  if (!container) return;

  container.innerHTML = TOOLS.map(tool => `
    <button type="button" class="th-tool-btn ${tool.id === currentTool ? 'active' : ''}" data-tool="${tool.id}">
      <span class="th-tool-label">${tool.label}</span>
      <span class="th-tool-hint">${tool.hint}</span>
    </button>
  `).join('');

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.th-tool-btn');
    if (btn) {
      selectTool(btn.dataset.tool);
    }
  });
}

/**
 * Выбор инструмента
 */
function selectTool(toolId) {
  currentTool = toolId;
  
  document.querySelectorAll('.th-tool-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === toolId);
  });
  
  renderSettings();
  applyCurrentTool();
}

/**
 * Рендер настроек текущего инструмента
 */
function renderSettings() {
  if (!settingsPanel) return;

  let html = '';

  switch (currentTool) {
    case 'columnToRow':
      html = renderColumnToRowSettings();
      break;
    case 'rowToColumn':
      html = renderRowToColumnSettings();
      break;
    case 'removeDuplicates':
      html = renderRemoveDuplicatesSettings();
      break;
    case 'removeEmpty':
      html = renderRemoveEmptySettings();
      break;
    case 'prefixSuffix':
      html = renderPrefixSuffixSettings();
      break;
    case 'trim':
      html = renderTrimSettings();
      break;
    case 'changeCase':
      html = renderChangeCaseSettings();
      break;
  }

  settingsPanel.innerHTML = html;
  bindSettingsEvents();
}

function renderColumnToRowSettings() {
  const settings = toolSettings.columnToRow;
  
  return `
    <div class="th-settings-section">
      <div class="th-settings-title">Разделитель для объединения</div>
      <div class="th-separator-grid">
        ${Object.entries(COL_SEPARATORS).filter(([k]) => k !== 'custom').map(([key, val]) => `
          <button type="button" class="th-separator-btn ${settings.separator === key ? 'active' : ''}" data-sep="${key}">
            <span class="th-sep-name">${val.label}</span>
            <span class="th-sep-preview">${getPreviewForSeparator(key)}</span>
          </button>
        `).join('')}
      </div>
      <div class="th-custom-separator">
        <label class="th-label">Свой разделитель:</label>
        <input type="text" class="th-input" id="th-col-custom" value="${settings.customSeparator}" placeholder="Введите символы...">
      </div>
    </div>
    <div class="th-example">
      <div class="th-example-title">Пример:</div>
      <div class="th-example-before">яблоко<br>груша<br>банан</div>
      <div class="th-example-arrow">→</div>
      <div class="th-example-after">${getExampleResult('columnToRow', settings)}</div>
    </div>
  `;
}

function renderRowToColumnSettings() {
  const settings = toolSettings.rowToColumn;
  
  return `
    <div class="th-settings-section">
      <div class="th-settings-title">Разделитель для разбиения</div>
      <div class="th-separator-grid">
        ${Object.entries(ROW_SEPARATORS).filter(([k]) => k !== 'custom').map(([key, val]) => `
          <button type="button" class="th-separator-btn ${settings.separator === key ? 'active' : ''}" data-sep="${key}">
            <span class="th-sep-name">${val.label}</span>
          </button>
        `).join('')}
      </div>
      <div class="th-custom-separator">
        <label class="th-label">Свой разделитель:</label>
        <input type="text" class="th-input" id="th-row-custom" value="${settings.customSeparator}" placeholder="Введите символы...">
      </div>
      <label class="th-checkbox">
        <input type="checkbox" id="th-row-trim" ${settings.trimLines ? 'checked' : ''}>
        <span>Убрать пробелы по краям каждой строки</span>
      </label>
    </div>
    <div class="th-example">
      <div class="th-example-title">Пример:</div>
      <div class="th-example-before">яблоко, груша, банан</div>
      <div class="th-example-arrow">→</div>
      <div class="th-example-after">яблоко<br>груша<br>банан</div>
    </div>
  `;
}

function renderRemoveDuplicatesSettings() {
  const settings = toolSettings.removeDuplicates;
  
  return `
    <div class="th-settings-section">
      <div class="th-settings-title">Параметры</div>
      <div class="th-checkboxes">
        <label class="th-checkbox">
          <input type="checkbox" id="th-dup-case" ${settings.caseSensitive ? 'checked' : ''}>
          <span>Учитывать регистр</span>
          <span class="th-checkbox-hint">(Яблоко ≠ яблоко)</span>
        </label>
        <label class="th-checkbox">
          <input type="checkbox" id="th-dup-only" ${settings.showOnlyDuplicates ? 'checked' : ''}>
          <span>Показать только дубликаты</span>
          <span class="th-checkbox-hint">(вместо уникальных)</span>
        </label>
      </div>
    </div>
    <div class="th-example">
      <div class="th-example-title">Пример:</div>
      <div class="th-example-before">яблоко<br>груша<br>яблоко<br>банан</div>
      <div class="th-example-arrow">→</div>
      <div class="th-example-after">яблоко<br>груша<br>банан</div>
    </div>
  `;
}

function renderRemoveEmptySettings() {
  const settings = toolSettings.removeEmpty;
  
  return `
    <div class="th-settings-section">
      <div class="th-settings-title">Параметры</div>
      <div class="th-checkboxes">
        <label class="th-checkbox">
          <input type="checkbox" id="th-empty-whitespace" ${settings.treatWhitespaceAsEmpty ? 'checked' : ''}>
          <span>Строки из пробелов тоже удалять</span>
          <span class="th-checkbox-hint">(строки с пробелами и табами)</span>
        </label>
      </div>
    </div>
    <div class="th-example">
      <div class="th-example-title">Пример:</div>
      <div class="th-example-before">яблоко<br><br>груша<br><br>банан</div>
      <div class="th-example-arrow">→</div>
      <div class="th-example-after">яблоко<br>груша<br>банан</div>
    </div>
  `;
}

function renderPrefixSuffixSettings() {
  const settings = toolSettings.prefixSuffix;
  
  return `
    <div class="th-settings-section">
      <div class="th-settings-title">Готовые варианты</div>
      <div class="th-presets-grid">
        ${Object.entries(PRESETS).map(([key, val]) => `
          <button type="button" class="th-preset-btn" data-preset="${key}">
            <span class="th-preset-example">${val.prefix}текст${val.suffix}</span>
          </button>
        `).join('')}
      </div>
    </div>
    <div class="th-settings-section">
      <div class="th-settings-title">Свои значения</div>
      <div class="th-prefix-suffix-inputs">
        <div class="th-input-group">
          <label class="th-label">Префикс (начало):</label>
          <input type="text" class="th-input" id="th-prefix" value="${settings.prefix}" placeholder="Добавить в начало...">
        </div>
        <div class="th-input-group">
          <label class="th-label">Суффикс (конец):</label>
          <input type="text" class="th-input" id="th-suffix" value="${settings.suffix}" placeholder="Добавить в конец...">
        </div>
      </div>
      <label class="th-checkbox">
        <input type="checkbox" id="th-numbered" ${settings.numbered ? 'checked' : ''}>
        <span>Нумерация строк (1. 2. 3. ...)</span>
      </label>
    </div>
    <div class="th-example">
      <div class="th-example-title">Результат:</div>
      <div class="th-example-after">${settings.numbered ? '1. ' : settings.prefix}текст${settings.numbered ? '' : settings.suffix}</div>
    </div>
  `;
}

function renderTrimSettings() {
  const settings = toolSettings.trim;
  
  return `
    <div class="th-settings-section">
      <div class="th-settings-title">Где убирать пробелы</div>
      <div class="th-radio-group">
        ${Object.entries(TRIM_MODES).map(([key, label]) => `
          <label class="th-radio">
            <input type="radio" name="th-trim-mode" value="${key}" ${settings.mode === key ? 'checked' : ''}>
            <span>${label}</span>
          </label>
        `).join('')}
      </div>
      <label class="th-checkbox">
        <input type="checkbox" id="th-trim-double" ${settings.removeDoubleSpaces ? 'checked' : ''}>
        <span>Убрать двойные пробелы внутри строк</span>
        <span class="th-checkbox-hint">("привет    мир" → "привет мир")</span>
      </label>
    </div>
    <div class="th-example">
      <div class="th-example-title">Пример:</div>
      <div class="th-example-before">"  &nbsp;&nbsp;яблоко  &nbsp;&nbsp;"</div>
      <div class="th-example-arrow">→</div>
      <div class="th-example-after">"яблоко"</div>
    </div>
  `;
}

function renderChangeCaseSettings() {
  const settings = toolSettings.changeCase;
  
  return `
    <div class="th-settings-section">
      <div class="th-settings-title">Выберите регистр</div>
      <div class="th-case-grid">
        ${Object.entries(CASE_MODES).map(([key, val]) => `
          <button type="button" class="th-case-btn ${settings.mode === key ? 'active' : ''}" data-case="${key}">
            <span class="th-case-label">${val.label}</span>
            <span class="th-case-desc">${val.description}</span>
          </button>
        `).join('')}
      </div>
    </div>
    <div class="th-example">
      <div class="th-example-title">Пример:</div>
      <div class="th-example-before">Привет Мир</div>
      <div class="th-example-arrow">→</div>
      <div class="th-example-after">${getCaseExample(settings.mode)}</div>
    </div>
  `;
}

function getPreviewForSeparator(key) {
  const previews = {
    space: 'а б в',
    comma: 'а,б,в',
    commaSpace: 'а, б, в',
    semicolon: 'а;б;в',
    semicolonSpace: 'а; б; в',
    tab: 'а→б→в',
    pipe: 'а|б|в',
    pipeSpaces: 'а | б | в'
  };
  return previews[key] || '';
}

function getExampleResult(tool, settings) {
  if (tool === 'columnToRow') {
    const sep = settings.separator === 'custom' ? settings.customSeparator : COL_SEPARATORS[settings.separator]?.value || ', ';
    return `яблоко${sep}груша${sep}банан`;
  }
  return '';
}

function getCaseExample(mode) {
  const examples = {
    upper: 'ПРИВЕТ МИР',
    lower: 'привет мир',
    title: 'Привет Мир',
    sentence: 'Привет мир',
    inverted: 'пРИВЕТ мИР'
  };
  return examples[mode] || 'Привет Мир';
}

/**
 * Привязка событий настроек
 */
function bindSettingsEvents() {
  // Separator buttons
  document.querySelectorAll('.th-separator-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sep = btn.dataset.sep;
      if (currentTool === 'columnToRow') {
        toolSettings.columnToRow.separator = sep;
      } else if (currentTool === 'rowToColumn') {
        toolSettings.rowToColumn.separator = sep;
      }
      renderSettings();
      applyCurrentTool();
    });
  });

  // Custom separators
  const colCustom = document.getElementById('th-col-custom');
  const rowCustom = document.getElementById('th-row-custom');
  
  colCustom?.addEventListener('input', (e) => {
    toolSettings.columnToRow.customSeparator = e.target.value;
    toolSettings.columnToRow.separator = 'custom';
    applyCurrentTool();
  });

  rowCustom?.addEventListener('input', (e) => {
    toolSettings.rowToColumn.customSeparator = e.target.value;
    toolSettings.rowToColumn.separator = 'custom';
    applyCurrentTool();
  });

  // Row trim
  const rowTrim = document.getElementById('th-row-trim');
  rowTrim?.addEventListener('change', (e) => {
    toolSettings.rowToColumn.trimLines = e.target.checked;
    applyCurrentTool();
  });

  // Duplicates
  const dupCase = document.getElementById('th-dup-case');
  const dupOnly = document.getElementById('th-dup-only');
  
  dupCase?.addEventListener('change', (e) => {
    toolSettings.removeDuplicates.caseSensitive = e.target.checked;
    applyCurrentTool();
  });

  dupOnly?.addEventListener('change', (e) => {
    toolSettings.removeDuplicates.showOnlyDuplicates = e.target.checked;
    applyCurrentTool();
  });

  // Empty
  const emptyWhitespace = document.getElementById('th-empty-whitespace');
  emptyWhitespace?.addEventListener('change', (e) => {
    toolSettings.removeEmpty.treatWhitespaceAsEmpty = e.target.checked;
    applyCurrentTool();
  });

  // Prefix/Suffix presets
  document.querySelectorAll('.th-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = PRESETS[btn.dataset.preset];
      if (preset) {
        toolSettings.prefixSuffix.prefix = preset.prefix;
        toolSettings.prefixSuffix.suffix = preset.suffix;
        toolSettings.prefixSuffix.numbered = false;
        renderSettings();
        applyCurrentTool();
      }
    });
  });

  // Prefix/Suffix inputs
  const prefix = document.getElementById('th-prefix');
  const suffix = document.getElementById('th-suffix');
  const numbered = document.getElementById('th-numbered');

  prefix?.addEventListener('input', (e) => {
    toolSettings.prefixSuffix.prefix = e.target.value;
    applyCurrentTool();
  });

  suffix?.addEventListener('input', (e) => {
    toolSettings.prefixSuffix.suffix = e.target.value;
    applyCurrentTool();
  });

  numbered?.addEventListener('change', (e) => {
    toolSettings.prefixSuffix.numbered = e.target.checked;
    renderSettings();
    applyCurrentTool();
  });

  // Trim
  const trimDouble = document.getElementById('th-trim-double');
  trimDouble?.addEventListener('change', (e) => {
    toolSettings.trim.removeDoubleSpaces = e.target.checked;
    applyCurrentTool();
  });

  document.querySelectorAll('input[name="th-trim-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      toolSettings.trim.mode = e.target.value;
      applyCurrentTool();
    });
  });

  // Case buttons
  document.querySelectorAll('.th-case-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      toolSettings.changeCase.mode = btn.dataset.case;
      renderSettings();
      applyCurrentTool();
    });
  });
}

/**
 * Применить текущий инструмент
 */
function applyCurrentTool() {
  const input = inputField?.value || '';
  let result = { result: '', report: '' };

  switch (currentTool) {
    case 'columnToRow': {
      const s = toolSettings.columnToRow;
      result = columnToRow(input, s.separator, s.customSeparator);
      break;
    }
    case 'rowToColumn': {
      const s = toolSettings.rowToColumn;
      result = rowToColumn(input, s.separator, s.customSeparator, s.trimLines);
      break;
    }
    case 'removeDuplicates': {
      const s = toolSettings.removeDuplicates;
      result = removeDuplicates(input, s.caseSensitive, s.showOnlyDuplicates);
      break;
    }
    case 'removeEmpty': {
      const s = toolSettings.removeEmpty;
      result = removeEmpty(input, s.treatWhitespaceAsEmpty);
      break;
    }
    case 'prefixSuffix': {
      const s = toolSettings.prefixSuffix;
      result = addPrefixSuffix(input, s.prefix, s.suffix, s.numbered);
      break;
    }
    case 'trim': {
      const s = toolSettings.trim;
      result = trimLines(input, s.mode, s.removeDoubleSpaces);
      break;
    }
    case 'changeCase': {
      const s = toolSettings.changeCase;
      result = changeCase(input, s.mode);
      break;
    }
  }

  if (outputField) {
    outputField.value = result.result;
  }
  if (reportDisplay) {
    reportDisplay.textContent = result.report;
  }
}

/**
 * Обновить статистику
 */
function updateStats() {
  if (statsDisplay && inputField) {
    statsDisplay.textContent = formatStats(inputField.value);
  }
}

/**
 * Вставить из буфера
 */
async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText();
    if (inputField) {
      inputField.value = text;
      updateStats();
      applyCurrentTool();
    }
  } catch (err) {
    console.error('Failed to paste:', err);
  }
}

/**
 * Копировать результат
 */
async function handleCopy() {
  try {
    const text = outputField?.value || '';
    if (!text) {
      return;
    }
    await navigator.clipboard.writeText(text);
    showSuccess('Скопировано');
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}

/**
 * Поменять местами ввод и вывод
 */
function handleSwap() {
  if (inputField && outputField) {
    const temp = outputField.value;
    inputField.value = temp;
    updateStats();
    applyCurrentTool();
  }
}

/**
 * Очистить поля
 */
function handleClear() {
  if (inputField) {
    inputField.value = '';
  }
  if (outputField) {
    outputField.value = '';
  }
  if (reportDisplay) {
    reportDisplay.textContent = '';
  }
  updateStats();
}
