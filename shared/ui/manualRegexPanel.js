/**
 * Общая панель для ручного редактирования regex:
 * - вставка параметров/соединителей в позицию курсора
 * - инвертирование выделенного фрагмента и добавление обратного варианта в конец через |
 *
 * Используется и в режиме «Ручной редактор», и в панели «Тестер».
 */

import { showError, showSuccess } from '../ui/notifications.js';
import { parseRegexPattern } from '../../tools/converter/logic/regexParser.js';
import { convertLinkedBuilder, buildRawInvertedRegex } from '../../tools/converter/logic/linkedBuilderConverter.js';

const DEFAULT_TOAST_INSERT_CURSOR =
  'Поставьте курсор в поле регулярного выражения в то место, куда нужно вставить параметр';
const DEFAULT_TOAST_INVERT_PARSE_ERROR =
  'Не удалось разобрать выделенный фрагмент как регулярное выражение. Попробуйте воспользоваться конвертером для построения выражения.';

/**
 * Инвертирует порядок элементов верхнего уровня (как в конвертере для группы).
 * Логика общая для редактора и тестера.
 * @param {Array} elements - массив элементов из parseRegexPattern
 * @returns {Array} новый массив с обратным порядком и перераспределёнными соединителями
 */
export function invertTopLevelElements(elements) {
  if (!Array.isArray(elements) || elements.length === 0) return elements;
  const originalConnectors = elements.map((el) => (el.connector ? { ...el.connector } : null));
  const inverted = [...elements].reverse();
  const usedConnectors = originalConnectors.slice(0, -1).reverse();
  inverted.forEach((el, i) => {
    el.connector =
      i < inverted.length - 1 ? usedConnectors[i] || { mode: 'alternation' } : { mode: 'alternation' };
  });
  return inverted;
}

/**
 * Инициализация общей панели ручного редактирования regex.
 *
 * @param {Object} options
 * @param {HTMLTextAreaElement[]} options.textareas - список textarea, между которыми переключается панель (активной считается та, где сейчас фокус / выделение).
 * @param {string} options.insertButtonsSelector - селектор для кнопок с data-insert.
 * @param {string} options.invertButtonId - id кнопки «Инвертировать выделенное».
 * @param {string} [options.toastInsertCursorMessage] - текст тоста, если нет активного поля.
 * @param {string} [options.toastInvertParseError] - текст тоста при ошибке парсинга.
 * @param {boolean} [options.showSuccessToast] - показывать ли тост об успешной инверсии (по умолчанию true).
 */
export function initManualRegexPanel(options) {
  const {
    textareas,
    insertButtonsSelector,
    invertButtonId,
    toastInsertCursorMessage = DEFAULT_TOAST_INSERT_CURSOR,
    toastInvertParseError = DEFAULT_TOAST_INVERT_PARSE_ERROR,
    showSuccessToast = true,
  } = options || {};

  const controlledTextareas = Array.isArray(textareas) ? textareas.filter(Boolean) : [];
  if (!controlledTextareas.length) return;

  let activeTextarea = null;
  let lastSelectionStart = 0;
  let lastSelectionEnd = 0;

  function updateSelectionFromActive() {
    if (!activeTextarea) return;
    lastSelectionStart = activeTextarea.selectionStart ?? 0;
    lastSelectionEnd = activeTextarea.selectionEnd ?? lastSelectionStart;
    updateInvertButtonVisibility();
  }

  function handleTextareaFocus(ta) {
    activeTextarea = ta;
    updateSelectionFromActive();
  }

  function handleSelectionChange(ta) {
    if (document.activeElement !== ta) return;
    activeTextarea = ta;
    updateSelectionFromActive();
  }

  function getInvertButton() {
    return invertButtonId ? document.getElementById(invertButtonId) : null;
  }

  function setInvertButtonVisuallyHidden(hidden) {
    const btn = getInvertButton();
    if (!btn) return;
    if (hidden) {
      btn.style.visibility = 'hidden';
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0';
      btn.setAttribute('aria-hidden', 'true');
      btn.setAttribute('tabindex', '-1');
    } else {
      btn.style.visibility = '';
      btn.style.pointerEvents = '';
      btn.style.opacity = '';
      btn.removeAttribute('aria-hidden');
      btn.removeAttribute('tabindex');
    }
  }

  function updateInvertButtonVisibility() {
    const btn = getInvertButton();
    if (!btn || !activeTextarea) return;
    const hasSelection =
      typeof activeTextarea.selectionStart === 'number' &&
      typeof activeTextarea.selectionEnd === 'number' &&
      activeTextarea.selectionStart !== activeTextarea.selectionEnd;
    setInvertButtonVisuallyHidden(!hasSelection);
  }

  function insertAtStoredPosition(text) {
    if (!activeTextarea) {
      showError(toastInsertCursorMessage);
      return;
    }
    const ta = activeTextarea;
    const start = lastSelectionStart;
    const end = lastSelectionEnd;
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);
    ta.value = before + text + after;
    const newPos = start + text.length;
    ta.selectionStart = ta.selectionEnd = newPos;
    lastSelectionStart = lastSelectionEnd = newPos;
    ta.focus();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function handleInvertSelectionClick() {
    const ta = activeTextarea;
    const btn = getInvertButton();
    if (!ta || !btn) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    if (start === end) {
      showError('Выделите фрагмент регулярного выражения в поле');
      return;
    }
    const selectedText = ta.value.slice(start, end).trim();
    if (!selectedText) {
      showError('Выделенный фрагмент пуст после обрезки пробелов');
      return;
    }
    const parsed = parseRegexPattern(selectedText, { forManualEditorInvert: true });
    if (!parsed.success || !parsed.elements || parsed.elements.length === 0) {
      showError(toastInvertParseError);
      return;
    }
    const inverted = invertTopLevelElements(parsed.elements);
    const conversion =
      typeof parsed.sourceString === 'string'
        ? buildRawInvertedRegex(inverted, parsed.sourceString)
        : convertLinkedBuilder(inverted);
    if (!conversion.success || !conversion.result) {
      showError(toastInvertParseError);
      return;
    }
    const currentValue = ta.value;
    const append = (currentValue ? '|' : '') + conversion.result;
    ta.value = currentValue + append;
    const newEnd = ta.value.length;
    ta.selectionStart = ta.selectionEnd = newEnd;
    activeTextarea = ta;
    lastSelectionStart = lastSelectionEnd = newEnd;
    ta.focus();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    updateInvertButtonVisibility();
    if (showSuccessToast) {
      showSuccess('Обратный вариант добавлен в конец');
    }
  }

  controlledTextareas.forEach((ta) => {
    if (!ta) return;
    ta.addEventListener('focus', () => handleTextareaFocus(ta));
    ['select', 'keyup', 'mouseup'].forEach((ev) => {
      ta.addEventListener(ev, () => handleSelectionChange(ta));
    });
    document.addEventListener('selectionchange', () => {
      if (document.activeElement === ta) handleSelectionChange(ta);
    });
  });

  if (insertButtonsSelector) {
    document.querySelectorAll(insertButtonsSelector).forEach((btn) => {
      const insert = btn.getAttribute('data-insert');
      if (insert == null) return;
      btn.addEventListener('click', () => {
        insertAtStoredPosition(insert);
      });
    });
  }

  const invertBtn = getInvertButton();
  if (invertBtn) {
    // Место в разметке резервируется: скрыто через visibility, без display:none (нет «прыжка» шапки)
    setInvertButtonVisuallyHidden(true);
    invertBtn.addEventListener('click', handleInvertSelectionClick);
    updateInvertButtonVisibility();
  }
}

export default {
  initManualRegexPanel,
  invertTopLevelElements,
};

