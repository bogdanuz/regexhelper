/**
 * Diff двух строк и HTML для превью / буфера обмена (Confluence).
 * Превью — две строки «Было»/«Стало»; копирование — один склееный поток с подсветкой (buildClipboardUnifiedFragment).
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

/**
 * Те же инлайн-стили, что у табличного копирования до склейки (Confluence сохранял цвет через &lt;span&gt;).
 * Удаления раньше были font-weight:400 — ставим 700, чтобы и красное/зелёное, и жирность совпадали с ожиданием.
 */
const CLIP_MERGED_DEL_OPEN =
  '<span style="color:#b91c1c;font-weight:700;background-color:#fef2f2;border-radius:2px;">';
const CLIP_MERGED_INS_OPEN =
  '<span style="color:#15803d;font-weight:700;background-color:#f0fdf4;border-radius:2px;">';
const CLIP_MERGED_MARK_CLOSE = '</span>';

/**
 * Один поток HTML: порядок сегментов как в diff, без дублирования «Было»/«Стало».
 * @param {Array<[number, string]>} tuples
 */
export function buildMergedClipboardInnerHtml(tuples, esc = escapeHtml) {
  const parts = [];
  for (const [op, text] of tuples) {
    if (!text) continue;
    if (op === diff.DELETE) {
      parts.push(`${CLIP_MERGED_DEL_OPEN}${esc(text)}${CLIP_MERGED_MARK_CLOSE}`);
    } else if (op === diff.INSERT) {
      parts.push(`${CLIP_MERGED_INS_OPEN}${esc(text)}${CLIP_MERGED_MARK_CLOSE}`);
    } else {
      parts.push(esc(text));
    }
  }
  return parts.join('');
}

/**
 * Фрагмент для rich paste: моноширинный блок, без таблицы.
 */
export function buildClipboardUnifiedFragment(tuples, esc = escapeHtml) {
  const mono =
    "font-family:Consolas,'Courier New',monospace;font-size:13px;line-height:1.55;white-space:pre-wrap;word-break:break-word;color:#111827;";
  const inner = buildMergedClipboardInnerHtml(tuples, esc);
  return `<div style="${mono}">${inner}</div>`;
}

/**
 * Plain: те же сегменты подряд (удалённое и добавленное оба видны в одной строке символов).
 */
export function buildMergedPlain(tuples) {
  const parts = [];
  for (const [, text] of tuples) {
    if (text) parts.push(text);
  }
  return parts.join('');
}
