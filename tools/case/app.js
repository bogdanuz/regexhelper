/**
 * RegexHelper — инструмент «Регистр» (конвертер регистра текста)
 * @file tools/case/app.js
 */

import { CASE_MODES } from './logic/caseConverter.js';
import { initCaseUI } from './ui/caseUI.js';

const DEFAULT_MODE = CASE_MODES.LOWER;

const state = {
  currentMode: DEFAULT_MODE
};

/**
 * Сброс панели «Регистр»: очистка полей, выбор режима «нижний регистр».
 */
export function resetCasePanel() {
  const inputEl = document.getElementById('case-input');
  const outputEl = document.getElementById('case-output');
  const counterEl = document.getElementById('case-counter');
  const buttonsContainer = document.getElementById('case-buttons');

  if (inputEl) inputEl.value = '';
  if (outputEl) outputEl.value = '';
  if (counterEl) counterEl.textContent = '0 без пробелов, 0 с пробелами';

  state.currentMode = DEFAULT_MODE;
  if (buttonsContainer) {
    buttonsContainer.querySelectorAll('.btn-case').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === DEFAULT_MODE);
    });
  }
}

function openCaseModal() {
  const overlay = document.getElementById('case-modal-overlay');
  if (!overlay) return;
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeCaseModal() {
  const overlay = document.getElementById('case-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/**
 * Инициализация инструмента «Регистр».
 */
export function initCase() {
  resetCasePanel();
  initCaseUI(state);

  const openBtn = document.getElementById('nav-register-btn');
  const overlay = document.getElementById('case-modal-overlay');
  const closeBtn = document.getElementById('case-modal-close');
  const footerCloseBtn = document.getElementById('case-modal-footer-close');
  const modal = document.getElementById('case-modal');

  if (openBtn) openBtn.addEventListener('click', openCaseModal);

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeCaseModal();
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', closeCaseModal);
  if (footerCloseBtn) footerCloseBtn.addEventListener('click', closeCaseModal);
  if (modal) modal.addEventListener('click', (e) => e.stopPropagation());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay?.classList.contains('active')) closeCaseModal();
  });
}
