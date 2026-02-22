/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - RESULT PANEL
 *                   Панель результата (копирование)
 * ═══════════════════════════════════════════════════════════════════
 *
 * @file ui/resultPanel.js
 * @description UI панели результата с кнопками действий
 * @date 15.02.2026
 */

import { showCopySuccess, showError, showSuccess } from '../../../shared/ui/notifications.js';

// ═══════════════════════════════════════════════════════════════════
// ОТОБРАЖЕНИЕ РЕЗУЛЬТАТА
// ═══════════════════════════════════════════════════════════════════

/**
 * Отображает результат в панели
 *
 * @param {string} result - Regex результат
 * @param {Object} data - Дополнительные данные
 */
export function displayResult(result, data = {}) {
  const resultTextarea = document.getElementById('result-textarea');
  const resultStats = document.getElementById('result-stats');

  if (!resultTextarea) return;

  resultTextarea.value = result;

  const outputHint = document.getElementById('output-hint');
  if (outputHint) {
    outputHint.textContent = 'Результат готов. Скопируйте в буфер обмена при необходимости.';
  }

  if (resultStats) {
    const stats = {
      length: result.length,
      groups: (result.match(/\(\?:/g) || []).length,
      alternations: (result.match(/\|/g) || []).length
    };

    resultStats.innerHTML = `
      <span>Длина: ${stats.length}</span> |
      <span>Группы: ${stats.groups}</span> |
      <span>Альтернации: ${stats.alternations}</span>
    `;
  }
}

/**
 * Очищает результат
 */
export function clearResult() {
  const resultTextarea = document.getElementById('result-textarea');
  if (resultTextarea) {
    resultTextarea.value = '';
  }

  const resultStats = document.getElementById('result-stats');
  if (resultStats) {
    resultStats.innerHTML = '';
  }

  const outputHint = document.getElementById('output-hint');
  if (outputHint) {
    outputHint.textContent = 'Нажмите «Конвертировать» для получения regex.';
  }
}

// ═══════════════════════════════════════════════════════════════════
// КОПИРОВАНИЕ В БУФЕР ОБМЕНА
// ═══════════════════════════════════════════════════════════════════

/**
 * Копирует результат в буфер обмена
 */
export function copyResultToClipboard() {
  const resultTextarea = document.getElementById('result-textarea');
  if (!resultTextarea || !resultTextarea.value) {
    showError('Нет результата для копирования');
    return;
  }

  navigator.clipboard.writeText(resultTextarea.value)
    .then(() => {
      showCopySuccess();
    })
    .catch(err => {
      showError('Ошибка копирования: ' + err.message);
    });
}

// ═══════════════════════════════════════════════════════════════════
// ПЕРЕХОД В ТЕСТЕР / ВИЗУАЛИЗАТОР
// ═══════════════════════════════════════════════════════════════════

/**
 * Получает результат из поля, если он есть
 * @returns {string|null}
 */
function getResultValue() {
  const resultTextarea = document.getElementById('result-textarea');
  return resultTextarea?.value?.trim() || null;
}

/**
 * Вставляет результат в тестер и переходит к нему
 */
export function sendToTester() {
  const regex = getResultValue();
  if (!regex) {
    showError('Сначала выполните конвертацию');
    return;
  }

  const testerInput = document.getElementById('tester-regex-input');
  if (testerInput) {
    testerInput.value = regex;
    testerInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const testerSection = document.getElementById('tester');
  if (testerSection) {
    testerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  
  showSuccess('Regex вставлен в тестер');
}

/**
 * Вставляет результат в визуализатор и переходит к нему
 */
export function sendToVisualizer() {
  const regex = getResultValue();
  if (!regex) {
    showError('Сначала выполните конвертацию');
    return;
  }

  const visualizerInput = document.getElementById('regexp-input');
  if (visualizerInput) {
    visualizerInput.value = regex;
    visualizerInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const visualizerSection = document.getElementById('visualizer');
  if (visualizerSection) {
    visualizerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  
  showSuccess('Regex вставлен в визуализатор');
}

// ═══════════════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ КНОПОК
// ═══════════════════════════════════════════════════════════════════

/**
 * Инициализирует кнопки панели результата
 */
export function initResultPanel() {
  const copyBtn = document.getElementById('copy-result-btn');
  if (copyBtn) {
    copyBtn.onclick = copyResultToClipboard;
  }

  const clearResultBtn = document.getElementById('clear-result-btn');
  if (clearResultBtn) {
    clearResultBtn.onclick = () => {
      clearResult();
      showSuccess('Результат очищен');
    };
  }

  const toTesterBtn = document.getElementById('to-tester-btn');
  if (toTesterBtn) {
    toTesterBtn.onclick = sendToTester;
  }

  const toVisualizerBtn = document.getElementById('to-visualizer-btn');
  if (toVisualizerBtn) {
    toVisualizerBtn.onclick = sendToVisualizer;
  }
}

export default {
  displayResult,
  clearResult,
  copyResultToClipboard,
  sendToTester,
  sendToVisualizer,
  initResultPanel
};
