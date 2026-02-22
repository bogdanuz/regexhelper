/**
 * RegexHelper — UI панели «Регистр»
 * @file tools/case/ui/caseUI.js
 */

import { applyCase, CASE_MODES } from '../logic/caseConverter.js';
import { showSuccess, showError } from '../../../shared/ui/notifications.js';

const DEFAULT_MODE = CASE_MODES.LOWER;

/**
 * Обновить вывод и счётчик символов по текущему вводу и выбранному режиму.
 * @param {HTMLTextAreaElement} inputEl
 * @param {HTMLTextAreaElement} outputEl
 * @param {HTMLParagraphElement} counterEl
 * @param {string} mode
 */
function syncOutputAndCounter(inputEl, outputEl, counterEl, mode) {
  const text = inputEl.value;
  const result = applyCase(text, mode);
  outputEl.value = result;

  const withSpaces = text.length;
  const withoutSpaces = text.replace(/\s/g, '').length;
  counterEl.textContent = `${withoutSpaces} без пробелов, ${withSpaces} с пробелами`;
}

/**
 * Инициализация UI панели «Регистр».
 * @param {{ currentMode: string }} state — объект состояния (currentMode)
 */
export function initCaseUI(state) {
  const inputEl = document.getElementById('case-input');
  const outputEl = document.getElementById('case-output');
  const counterEl = document.getElementById('case-counter');
  const buttonsContainer = document.getElementById('case-buttons');
  const pasteBtn = document.getElementById('case-paste-btn');
  const clearBtn = document.getElementById('case-clear-btn');
  const copyBtn = document.getElementById('case-copy-btn');

  if (!inputEl || !outputEl || !counterEl || !buttonsContainer) return;

  state.currentMode = state.currentMode ?? DEFAULT_MODE;

  function setActiveButton(mode) {
    buttonsContainer.querySelectorAll('.btn-case').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
  }

  function updateFromInput() {
    syncOutputAndCounter(inputEl, outputEl, counterEl, state.currentMode);
  }

  setActiveButton(state.currentMode);
  updateFromInput();

  inputEl.addEventListener('input', updateFromInput);

  buttonsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-case');
    if (!btn) return;
    const mode = btn.getAttribute('data-mode');
    if (!mode) return;
    state.currentMode = mode;
    setActiveButton(mode);
    updateFromInput();
  });

  pasteBtn?.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      inputEl.value = text;
      updateFromInput();
    } catch (err) {
      showError('Не удалось прочитать буфер обмена');
    }
  });

  clearBtn?.addEventListener('click', () => {
    inputEl.value = '';
    updateFromInput();
  });

  copyBtn?.addEventListener('click', () => {
    const val = outputEl.value;
    if (!val) return;
    navigator.clipboard.writeText(val).then(() => showSuccess('Скопировано')).catch((err) => showError('Ошибка копирования: ' + err.message));
  });
}
