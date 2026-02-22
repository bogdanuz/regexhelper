/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - HISTORY UI
 *                   UI истории конвертаций
 * ═══════════════════════════════════════════════════════════════════
 *
 * @file ui/historyUI.js
 * @description Отображение и управление историей (коллапсируемая панель + модалка)
 * @date 16.02.2026
 */

import {
  getHistory,
  getRecentHistory,
  deleteFromHistory,
  clearHistory
} from '../../../shared/utils/storage.js';
import { showSuccess, showInfo, showError } from '../../../shared/ui/notifications.js';
import { openConfirmModal } from './modals.js';

const PANEL_HISTORY_COUNT = 6;
const MODAL_HISTORY_MAX = 300;

/**
 * Отображает последние 6 карточек в коллапсируемой панели
 */
export function displayHistory() {
  const history = getRecentHistory(PANEL_HISTORY_COUNT);
  const container = document.getElementById('history-container');

  if (!container) return;

  if (history.length === 0) {
    container.innerHTML = '<p class="empty-message">История пуста. Выполните конвертацию, чтобы увидеть результаты.</p>';
    return;
  }

  container.innerHTML = history.map(item => createHistoryCard(item, true)).join('');
  initHistoryHandlers();
}

/**
 * Создает карточку истории со стилизованными кнопками
 * @param {Object} item - Элемент истории
 * @param {boolean} collapsed - Свернутый вид результата
 */
function createHistoryCard(item, collapsed = true) {
  const date = new Date(item.date).toLocaleString('ru-RU');
  const triggersList = item.triggers || [];
  const triggersPreview = triggersList.slice(0, 5).join(', ');
  const triggersFull = triggersList.join(', ');
  const triggersTitle = escapeHtml(triggersFull).replace(/"/g, '&quot;');
  const result = item.result || '';
  const resultEscaped = escapeHtml(result);
  const typeLabel = item.type === 'simple' ? 'Простые' : 'Связанные';

  return `
    <div class="history-card" data-id="${item.id}" data-type="${item.type || 'simple'}">
      <div class="history-card-header">
        <div class="history-card-header-left">
          <span class="history-date">${date}</span>
          <button type="button" class="btn-icon btn-history-expand" data-action="expand" data-id="${item.id}" title="Открыть в отдельном окне" aria-label="Открыть в отдельном окне">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          </button>
        </div>
        <span class="history-type">${typeLabel}</span>
      </div>
      <div class="history-triggers" title="${triggersTitle || 'Триггеры'}">${escapeHtml(triggersPreview)}${triggersList.length > 5 ? '…' : ''}</div>
      <div class="history-result ${collapsed ? 'history-result-collapsed' : ''}">
        <code>${resultEscaped}</code>
      </div>
      <div class="history-actions">
        <button type="button" class="btn-history-action btn-history-copy" data-action="copy" data-id="${item.id}" title="Копировать результат">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Копировать
        </button>
        <button type="button" class="btn-history-action btn-history-delete" data-action="delete" data-id="${item.id}" title="Удалить">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Удалить
        </button>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Инициализирует обработчики кнопок истории (Копировать / Экспорт / Удалить / Развернуть).
 * Селекторы только по карточкам истории, чтобы не перехватывать кнопки «Удалить» у групп/подгрупп.
 */
function initHistoryHandlers() {
  document.querySelectorAll('.history-card [data-action="copy"]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const item = getHistory().find(i => i.id === id) || getRecentHistory(MODAL_HISTORY_MAX).find(i => i.id === id);
      if (item) {
        navigator.clipboard.writeText(item.result);
        showSuccess('Скопировано');
      }
    };
  });

  document.querySelectorAll('.history-card [data-action="delete"]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const isInFullModal = btn.closest('#history-grid-full');
      openConfirmModal({
        title: 'Удаление из истории',
        message: 'Удалить эту запись из истории конвертаций?',
        onConfirm: () => {
          deleteFromHistory(id);
          displayHistory();
          if (isInFullModal) refreshFullHistoryGrid();
          showSuccess('Удалено из истории');
        }
      });
    };
  });

  document.querySelectorAll('.history-card [data-action="expand"]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const item = getHistory().find(i => i.id === id) || getRecentHistory(MODAL_HISTORY_MAX).find(i => i.id === id);
      if (item) openExpandHistoryModal(item);
    };
  });
}

/** Модалка «Развернуть карточку истории» — одна на всё приложение, переиспользуется */
let expandHistoryOverlay = null;

/**
 * Открывает модальное окно с полным содержимым записи истории (регулярное выражение на весь экран + кнопки)
 * @param {Object} item - Элемент истории
 */
function openExpandHistoryModal(item) {
  const content = item.result || '';

  if (expandHistoryOverlay && document.body.contains(expandHistoryOverlay)) {
    expandHistoryOverlay.querySelector('.expand-history-textarea').value = content;
    expandHistoryOverlay.dataset.historyId = item.id;
    expandHistoryOverlay.style.display = 'flex';
    return;
  }

  expandHistoryOverlay = document.createElement('div');
  expandHistoryOverlay.className = 'modal-overlay expand-result-overlay expand-history-overlay';
  expandHistoryOverlay.style.cssText = 'display:flex;align-items:center;justify-content:center;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;';
  expandHistoryOverlay.dataset.historyId = item.id;
  expandHistoryOverlay.innerHTML = `
    <div class="modal modal-extra-large expand-content-modal" style="max-width:90vw;max-height:85vh;display:flex;flex-direction:column;">
      <div class="modal-header">
        <h3 class="modal-title">История</h3>
        <button type="button" class="btn-icon btn-close-modal" title="Закрыть" aria-label="Закрыть"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div class="modal-body modal-scrollable expand-content-body" style="flex:1;min-height:200px;">
        <textarea class="expand-history-textarea expand-result-textarea" readonly></textarea>
      </div>
      <div class="modal-footer expand-content-footer">
        <button type="button" class="btn-secondary btn-expand-history-copy" title="Копировать результат">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Копировать
        </button>
        <button type="button" class="btn-secondary btn-danger btn-expand-history-delete" title="Удалить из истории">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Удалить
        </button>
        <button type="button" class="btn-secondary btn-modal-close">Закрыть</button>
      </div>
    </div>
  `;

  const textareaEl = expandHistoryOverlay.querySelector('.expand-history-textarea');
  textareaEl.value = content;

  const closeModal = () => {
    expandHistoryOverlay.style.display = 'none';
  };

  expandHistoryOverlay.querySelector('.btn-close-modal').onclick = closeModal;
  expandHistoryOverlay.querySelector('.modal-footer .btn-modal-close').onclick = closeModal;
  expandHistoryOverlay.onclick = (e) => { if (e.target === expandHistoryOverlay) closeModal(); };

  expandHistoryOverlay.querySelector('.btn-expand-history-copy').onclick = () => {
    const val = expandHistoryOverlay.querySelector('.expand-history-textarea').value;
    if (!val) { showInfo('Нечего копировать'); return; }
    navigator.clipboard.writeText(val).then(() => showSuccess('Скопировано')).catch(err => showError('Ошибка копирования: ' + err.message));
  };

  expandHistoryOverlay.querySelector('.btn-expand-history-delete').onclick = () => {
    const id = expandHistoryOverlay.dataset.historyId;
    openConfirmModal({
      title: 'Удаление из истории',
      message: 'Удалить эту запись из истории конвертаций?',
      onConfirm: () => {
        deleteFromHistory(id);
        closeModal();
        displayHistory();
        refreshFullHistoryGrid();
        showSuccess('Удалено из истории');
      }
    });
  };

  document.body.appendChild(expandHistoryOverlay);
}

/**
 * Обновляет сетку и счётчик в модалке полной истории
 */
function refreshFullHistoryGrid() {
  const countEl = document.getElementById('history-count');
  const gridEl = document.getElementById('history-grid-full');
  if (!gridEl) return;
  const history = getHistory().slice(0, MODAL_HISTORY_MAX);
  if (countEl) countEl.textContent = history.length;
  // FIFO: getHistory() возвращает [новые…, старые], сверху — последние, вниз — старые
  gridEl.innerHTML = history.length === 0
    ? '<p class="empty-message">История пуста. Выполните конвертацию, чтобы увидеть результаты.</p>'
    : history.map(item => createHistoryCard(item, true)).join('');
  initHistoryHandlers();
}

// ═══════════════════════════════════════════════════════════════════
// КОЛЛАПСИРУЕМАЯ ПАНЕЛЬ
// ═══════════════════════════════════════════════════════════════════

function initHistoryToggle() {
  const toggleBtn = document.getElementById('toggle-history-btn');
  const wrapper = document.getElementById('history-grid-wrapper');
  if (!toggleBtn || !wrapper) return;

  toggleBtn.addEventListener('click', () => {
    const isCollapsed = wrapper.classList.toggle('collapsed');
    toggleBtn.classList.toggle('collapsed', isCollapsed);
  });
}

// ═══════════════════════════════════════════════════════════════════
// ПОЛНАЯ ИСТОРИЯ (МОДАЛКА)
// ═══════════════════════════════════════════════════════════════════

function openFullHistoryModal() {
  const overlay = document.getElementById('modal-full-history');
  if (!overlay) return;
  refreshFullHistoryGrid();
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeFullHistoryModal() {
  const overlay = document.getElementById('modal-full-history');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/**
 * Инициализирует кнопки и открытие модалки полной истории
 */
export function initFullHistoryHandlers() {
  initHistoryToggle();

  const btnShowAll = document.querySelector('.btn-show-all-history');
  if (btnShowAll) {
    btnShowAll.onclick = openFullHistoryModal;
  }

  const overlay = document.getElementById('modal-full-history');
  if (overlay) {
    overlay.onclick = (e) => {
      if (e.target === overlay) closeFullHistoryModal();
    };
  }

  const modal = overlay?.querySelector('.modal');
  const closeBtn = modal?.querySelector('.btn-close-modal');
  if (closeBtn) closeBtn.onclick = closeFullHistoryModal;

  const footerCloseBtn = modal?.querySelector('.modal-footer .btn-modal-close');
  if (footerCloseBtn) footerCloseBtn.onclick = closeFullHistoryModal;

  const clearBtn = document.getElementById('clear-full-history-btn');
  if (clearBtn) {
    clearBtn.onclick = () => {
      openConfirmModal({
        title: 'Очистить всю историю',
        message: 'Удалить ВСЕ записи из истории? Действие необратимо.',
        onConfirm: () => {
          clearHistory();
          closeFullHistoryModal();
          displayHistory();
          showSuccess('История очищена');
        }
      });
    };
  }
}

export default {
  displayHistory,
  initFullHistoryHandlers
};
