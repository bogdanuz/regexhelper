/**
 * Сравнитель: две версии regex, превью diff, копирование для Confluence (по умолчанию только «Стало», опционально с «Было»).
 */

import {
  getDiffTuples,
  buildBeforeHtml,
  buildAfterHtml,
  buildClipboardTableFragment,
  buildClipboardAfterOnlyFragment,
  buildPlainFallback,
  buildPlainAfterOnly
} from '../logic/diffRender.js';
import { showSuccess, showError } from '../../../shared/ui/notifications.js';

let overlay = null;
let beforeEl = null;
let afterEl = null;
let previewBeforeEl = null;
let previewAfterEl = null;

let debounceTimer = null;
const DEBOUNCE_MS = 280;

export function initComparatorUI() {
  overlay = document.getElementById('comparator-modal-overlay');
  beforeEl = document.getElementById('comparator-before');
  afterEl = document.getElementById('comparator-after');
  previewBeforeEl = document.getElementById('comparator-preview-before');
  previewAfterEl = document.getElementById('comparator-preview-after');

  if (!overlay) return;

  const closeBtn = document.getElementById('comparator-modal-close');
  const closeFooter = document.getElementById('comparator-modal-close-footer');
  const copyBtn = document.getElementById('comparator-copy-btn');
  const swapBtn = document.getElementById('comparator-swap-btn');

  closeBtn?.addEventListener('click', closeComparatorModal);
  closeFooter?.addEventListener('click', closeComparatorModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeComparatorModal();
  });
  copyBtn?.addEventListener('click', handleCopy);
  swapBtn?.addEventListener('click', handleSwap);

  beforeEl?.addEventListener('input', schedulePreviewUpdate);
  afterEl?.addEventListener('input', schedulePreviewUpdate);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closeComparatorModal();
    }
  });
}

export function openComparatorModal() {
  overlay?.classList.add('active');
  overlay?.setAttribute('aria-hidden', 'false');
  beforeEl?.focus();
  updatePreviewImmediate();
}

export function closeComparatorModal() {
  if (!overlay) return;
  overlay.classList.add('closing');
  setTimeout(() => {
    overlay.classList.remove('active', 'closing');
    overlay.setAttribute('aria-hidden', 'true');
  }, 200);
}

function handleSwap() {
  if (!beforeEl || !afterEl) return;
  const t = beforeEl.value;
  beforeEl.value = afterEl.value;
  afterEl.value = t;
  schedulePreviewUpdate();
}

function schedulePreviewUpdate() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    updatePreviewImmediate();
  }, DEBOUNCE_MS);
}

function updatePreviewImmediate() {
  if (!previewBeforeEl || !previewAfterEl) return;
  const before = beforeEl?.value ?? '';
  const after = afterEl?.value ?? '';
  const tuples = getDiffTuples(before, after);
  previewBeforeEl.innerHTML = buildBeforeHtml(tuples) || '<span class="comparator-preview-empty">—</span>';
  previewAfterEl.innerHTML = buildAfterHtml(tuples) || '<span class="comparator-preview-empty">—</span>';
}

async function handleCopy() {
  const before = beforeEl?.value ?? '';
  const after = afterEl?.value ?? '';
  const tuples = getDiffTuples(before, after);
  const includeBefore =
    document.getElementById('comparator-copy-include-before')?.checked ?? false;

  const htmlFragment = includeBefore
    ? buildClipboardTableFragment(before, after, tuples)
    : buildClipboardAfterOnlyFragment(tuples);
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${htmlFragment}</body></html>`;
  const plain = includeBefore ? buildPlainFallback(before, after) : buildPlainAfterOnly(after);

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([fullHtml], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' })
        })
      ]);
      showSuccess(
        includeBefore
          ? 'Таблица «Было» и «Стало» скопирована'
          : 'Скопировано только «Стало»'
      );
      return;
    }
  } catch {
    /* fallback */
  }

  try {
    await navigator.clipboard.writeText(plain);
    showSuccess(
      includeBefore
        ? 'Скопирован только текст «Было» / «Стало» (HTML недоступен в этом браузере)'
        : 'Скопирован только текст «Стало» (HTML недоступен в этом браузере)'
    );
  } catch {
    showError('Не удалось скопировать');
  }
}
