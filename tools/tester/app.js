/**
 * RegexHelper — инструмент «Тестер» (проверка regex на тестовой строке, Python emulated)
 * @file tools/tester/app.js
 */

import { initTesterUI, resetTesterLowercaseMode } from './ui/testerUI.js';

/**
 * Сброс панели «Тестер»: очистка полей ввода, сброс флагов по умолчанию (g, m), очистка результата.
 */
export function resetTesterPanel() {
  const regexInput = document.getElementById('tester-regex-input');
  const testInput = document.getElementById('tester-test-input');
  const highlightLayer = document.getElementById('tester-highlight-layer');
  const matchInfoEl = document.getElementById('tester-match-info');
  const errorEl = document.getElementById('tester-error');
  const loadingEl = document.getElementById('tester-loading');

  if (regexInput) regexInput.value = '';
  if (testInput) testInput.value = '';
  if (highlightLayer) highlightLayer.innerHTML = '';
  if (matchInfoEl) matchInfoEl.innerHTML = '';
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }
  if (loadingEl) {
    loadingEl.hidden = true;
    loadingEl.setAttribute('aria-busy', 'false');
  }

  const flags = ['g', 'm', 'i', 's', 'u', 'x', 'a'];
  flags.forEach((f) => {
    const cb = document.getElementById(`tester-flag-${f}`);
    if (cb) cb.checked = f === 'g' || f === 'm';
  });

  resetTesterLowercaseMode();
}

/**
 * Инициализация инструмента «Тестер».
 */
export function initTester() {
  initTesterUI();
}
