/**
 * Diff двух строк и HTML для превью / буфера обмена (Confluence).
 * Полная таблица «Было»+«Стало» или только «Стало» — см. buildClipboardTableFragment / buildClipboardAfterOnlyFragment.
 */

import diff from '../vendor/fastDiff.js';

/** Экранирование для вставки в HTML (без DOM — работает в Node-тестах). */
export function escapeHtml(s) {
  if (s == null || s === '') return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {string} before
 * @param {string} after
 * @returns {Array<[number, string]>}
 */
export function getDiffTuples(before, after) {
  const a = before ?? '';
  const b = after ?? '';
  if (a === b) {
    return a ? [[diff.EQUAL, a]] : [];
  }
  return diff(a, b, null, false);
}

/**
 * HTML строки «Было»: удалённые фрагменты подсвечены.
 * @param {Array<[number, string]>} tuples
 * @param {(text: string) => string} esc
 */
export function buildBeforeHtml(tuples, esc = escapeHtml) {
  const parts = [];
  for (const [op, text] of tuples) {
    if (!text) continue;
    if (op === diff.INSERT) continue;
    if (op === diff.DELETE) {
      parts.push(`<span class="comparator-mark comparator-mark-del">${esc(text)}</span>`);
    } else {
      parts.push(esc(text));
    }
  }
  return parts.join('');
}

/**
 * HTML строки «Стало»: вставки подсвечены (жирный + цвет).
 */
export function buildAfterHtml(tuples, esc = escapeHtml) {
  const parts = [];
  for (const [op, text] of tuples) {
    if (!text) continue;
    if (op === diff.DELETE) continue;
    if (op === diff.INSERT) {
      parts.push(`<span class="comparator-mark comparator-mark-add">${esc(text)}</span>`);
    } else {
      parts.push(esc(text));
    }
  }
  return parts.join('');
}

/** Инлайн-стили для вставки на светлый фон (Confluence). */
const CLIP_DEL_OPEN =
  '<span style="color:#b91c1c;font-weight:400;background-color:#fef2f2;border-radius:2px;">';
const CLIP_ADD_OPEN =
  '<span style="color:#15803d;font-weight:700;background-color:#f0fdf4;border-radius:2px;">';
const CLIP_SPAN_CLOSE = '</span>';

function getClipboardTableStyles() {
  const mono =
    "font-family:Consolas,'Courier New',monospace;font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:break-word;";
  const thStyle =
    'vertical-align:top;padding:10px 12px;background:#f3f4f6;border:1px solid #e5e7eb;font-weight:600;color:#111827;width:88px;';
  const tdStyle = `vertical-align:top;padding:10px 12px;border:1px solid #e5e7eb;background:#ffffff;color:#111827;${mono}`;
  const tableStyle = 'border-collapse:collapse;width:100%;max-width:100%;table-layout:fixed;';
  return { thStyle, tdStyle, tableStyle };
}

export function buildBeforeClipboardHtml(tuples, esc = escapeHtml) {
  const parts = [];
  for (const [op, text] of tuples) {
    if (!text) continue;
    if (op === diff.INSERT) continue;
    if (op === diff.DELETE) {
      parts.push(`${CLIP_DEL_OPEN}${esc(text)}${CLIP_SPAN_CLOSE}`);
    } else {
      parts.push(esc(text));
    }
  }
  return parts.join('');
}

export function buildAfterClipboardHtml(tuples, esc = escapeHtml) {
  const parts = [];
  for (const [op, text] of tuples) {
    if (!text) continue;
    if (op === diff.DELETE) continue;
    if (op === diff.INSERT) {
      parts.push(`${CLIP_ADD_OPEN}${esc(text)}${CLIP_SPAN_CLOSE}`);
    } else {
      parts.push(esc(text));
    }
  }
  return parts.join('');
}

/**
 * Полный HTML-фрагмент: таблица для rich paste.
 * @param {string} beforePlain
 * @param {string} afterPlain
 * @param {Array<[number, string]>} tuples
 */
export function buildClipboardTableFragment(beforePlain, afterPlain, tuples) {
  const cellInnerBefore = buildBeforeClipboardHtml(tuples);
  const cellInnerAfter = buildAfterClipboardHtml(tuples);
  const { thStyle, tdStyle, tableStyle } = getClipboardTableStyles();

  return `<table style="${tableStyle}" cellpadding="0" cellspacing="0"><tbody>
<tr><th style="${thStyle}">Было</th><td style="${tdStyle}">${cellInnerBefore}</td></tr>
<tr><th style="${thStyle}">Стало</th><td style="${tdStyle}">${cellInnerAfter}</td></tr>
</tbody></table>`;
}

/**
 * Таблица для Confluence: только строка «Стало» (подсветка вставок как в полной таблице).
 * @param {Array<[number, string]>} tuples
 */
export function buildClipboardAfterOnlyFragment(tuples) {
  const cellInnerAfter = buildAfterClipboardHtml(tuples);
  const { thStyle, tdStyle, tableStyle } = getClipboardTableStyles();

  return `<table style="${tableStyle}" cellpadding="0" cellspacing="0"><tbody>
<tr><th style="${thStyle}">Стало</th><td style="${tdStyle}">${cellInnerAfter}</td></tr>
</tbody></table>`;
}

export function buildPlainFallback(beforePlain, afterPlain) {
  return `Было:\n${beforePlain ?? ''}\n\nСтало:\n${afterPlain ?? ''}`;
}

/** Plain при копировании только «Стало» — без блока «Было:». */
export function buildPlainAfterOnly(afterPlain) {
  return afterPlain ?? '';
}
