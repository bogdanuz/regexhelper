/**
 * RegexHelper — инструмент «Тестер» (проверка regex на тестовой строке, Python emulated)
 * @file tools/tester/app.js
 */

import { initTesterUI, resetTesterLowercaseMode } from './ui/testerUI.js';

/** Флаги по умолчанию для эмуляции Python/regex101: g, m, u. */
const DEFAULT_TESTER_FLAGS = ['g', 'm', 'u'];

/**
 * Сброс панели «Тестер»: очистка полей ввода, сброс флагов по умолчанию (g, m, u), очистка результата.
 */
export function resetTesterPanel() {
  const regexInput = document.getElementById('tester-regex-input');
  const regexFalseInput = document.getElementById('tester-regex-false-input');
  const testInput = document.getElementById('tester-test-input');
  const highlightLayer = document.getElementById('tester-highlight-layer');
  const matchInfoEl = document.getElementById('tester-match-info');
  const errorEl = document.getElementById('tester-error');
  const loadingEl = document.getElementById('tester-loading');
  const regexErrorEl = document.getElementById('tester-regex-error');
  const regexFalseErrorEl = document.getElementById('tester-regex-false-error');

  if (regexInput) regexInput.value = '';
  if (regexFalseInput) regexFalseInput.value = '';
  if (testInput) testInput.value = '';
  if (highlightLayer) highlightLayer.innerHTML = '';
  if (matchInfoEl) matchInfoEl.innerHTML = '';
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }
  if (regexErrorEl) {
    regexErrorEl.textContent = '';
    regexErrorEl.hidden = true;
  }
  if (regexFalseErrorEl) {
    regexFalseErrorEl.textContent = '';
    regexFalseErrorEl.hidden = true;
  }
  if (loadingEl) {
    loadingEl.hidden = true;
    loadingEl.setAttribute('aria-busy', 'false');
  }

  const flags = ['g', 'm', 'i', 's', 'u', 'x', 'a'];
  flags.forEach((f) => {
    const cb = document.getElementById(`tester-flag-${f}`);
    if (cb) cb.checked = DEFAULT_TESTER_FLAGS.includes(f);
  });

  resetTesterLowercaseMode();
}

/**
 * Инициализация инструмента «Тестер».
 */
export function initTester() {
  initTesterUI();
}
