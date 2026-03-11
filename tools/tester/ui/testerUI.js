/**
 * RegexHelper — Тестер: UI (поля, флаги, подсветка в поле Test String, Match Information, Worker + таймаут)
 * @file tools/tester/ui/testerUI.js
 */

import { showError, showSuccess } from '../../../shared/ui/notifications.js';
import { initManualRegexPanel } from '../../../shared/ui/manualRegexPanel.js';
import { buildFlagsString } from '../logic/flagsBuilder.js';
import { validatePatternForUI, filterMatchesByFalse } from '../logic/matchRunner.js';

const DEBOUNCE_MS = 180;
const LOADING_THRESHOLD_MS = 250;
const WORKER_TIMEOUT_MS = 60000;

/** Режим «нижний регистр тестируемого текста»: по умолчанию включён. */
let lowercaseModeEnabled = true;

/**
 * Экранирует HTML для безопасной вставки в innerHTML.
 * @param {string} s
 * @returns {string}
 */
function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

/**
 * Строит HTML для подсветки: разбивает строку на сегменты по indices (full match и группы).
 * @param {string} str — тестовая строка
 * @param {Array<{ index: number, fullMatch: string, indices?: number[][] }>} matches
 * @returns {string} — HTML с span'ами
 */
function buildHighlightHtml(str, matches) {
  if (!Array.isArray(matches) || !matches.length) return escapeHtml(str || '');

  const len = str.length;
  const allSegments = [];

  for (const m of matches) {
    const base = m.index;
    if (m.indices && m.indices.length) {
      const first = m.indices[0];
      if (!first || first[0] == null || first[1] == null) continue;
      if (first[0] >= first[1]) continue; // пустое совпадение — не рисуем
      let segs = [{ start: first[0], end: first[1], class: 'tester-hl-full' }];
      for (let i = 1; i < m.indices.length; i++) {
        const idx = m.indices[i];
        if (!idx || idx[0] == null || idx[1] == null) continue;
        const s = idx[0];
        const e = idx[1];
        if (s >= e) continue;
        const next = [];
        const gClass = `tester-hl-g${i}`;
        for (const seg of segs) {
          if (e <= seg.start || s >= seg.end) {
            next.push(seg);
            continue;
          }
          if (seg.start < s) next.push({ start: seg.start, end: s, class: seg.class });
          next.push({ start: s, end: e, class: gClass });
          if (e < seg.end) next.push({ start: e, end: seg.end, class: seg.class });
        }
        segs = next;
      }
      allSegments.push(...segs);
    } else {
      if (m.fullMatch && m.fullMatch.length > 0) {
        allSegments.push({ start: base, end: base + m.fullMatch.length, class: 'tester-hl-full' });
      }
    }
  }

  allSegments.sort((a, b) => a.start - b.start);

  // Рендер без перекрытий: каждый символ принадлежит не более чем одному сегменту (побеждает первый по позиции).
  const parts = [];
  let pos = 0;
  for (const seg of allSegments) {
    if (seg.end <= pos) continue;
    const start = Math.max(seg.start, pos);
    if (start >= seg.end) continue;
    if (start > pos) {
      parts.push(escapeHtml(str.slice(pos, start)));
    }
    parts.push(`<span class="${seg.class}">${escapeHtml(str.slice(start, seg.end))}</span>`);
    pos = seg.end;
  }
  if (pos < len) {
    parts.push(escapeHtml(str.slice(pos)));
  }
  return parts.join('');
}

/**
 * Match Information в формате regex101: Match N, диапазон, текст; под каждым — Группа 1, 2, … с диапазоном и текстом.
 * @param {Array<{ fullMatch: string, index: number, groups: string[], indices?: number[][] }>} matches
 * @returns {string} — HTML
 */
function buildMatchInfoHtml(matches) {
  if (!Array.isArray(matches) || !matches.length) {
    return 'Нет совпадений';
  }
  const lines = [];
  matches.forEach((m, i) => {
    const start = m.index;
    const end = m.index + m.fullMatch.length;
    const text = m.fullMatch.replace(/\s/g, '\u00B7'); // middle dot для пробелов как на regex101
    lines.push(
      `<div class="tester-match-row"><span class="tester-match-title">Совпадение ${i + 1}</span> <span class="tester-match-range">${start}-${end}</span> <span class="tester-match-text">${escapeHtml(text)}</span></div>`
    );
    if (Array.isArray(m.groups) && m.indices && m.indices.length > 1) {
      for (let g = 0; g < m.groups.length; g++) {
        const idx = m.indices[g + 1];
        if (!idx || idx[0] == null || idx[1] == null) continue;
        const gStart = idx[0];
        const gEnd = idx[1];
        const gText = m.groups[g] != null ? String(m.groups[g]).replace(/\s/g, '\u00B7') : '';
        lines.push(
          `<div class="tester-match-row tester-match-group-row"><span class="tester-match-title tester-match-group-title">Группа ${g + 1}</span> <span class="tester-match-range">${gStart}-${gEnd}</span> <span class="tester-match-text">${escapeHtml(gText)}</span></div>`
        );
      }
    }
  });
  return lines.join('');
}

function getFlagsState() {
  return {
    g: document.getElementById('tester-flag-g')?.checked ?? true,
    m: document.getElementById('tester-flag-m')?.checked ?? true,
    i: document.getElementById('tester-flag-i')?.checked ?? false,
    s: document.getElementById('tester-flag-s')?.checked ?? false,
    u: document.getElementById('tester-flag-u')?.checked ?? false,
    x: document.getElementById('tester-flag-x')?.checked ?? false,
    a: document.getElementById('tester-flag-a')?.checked ?? false,
  };
}

const MSG_NO_RESULT =
  'Ошибка при проверке регулярного выражения. Попробуйте упростить выражение или обновить страницу.';
const MSG_REGEX_INVALID = 'Неверное регулярное выражение, исправьте ошибку.';
const MSG_WORKER = MSG_NO_RESULT;
const WORKER_ERROR_MARKER = 'Worker error. Try again.';
const TIMEOUT_PREFIX = 'Регулярное выражение слишком сложное';

/**
 * Строит HTML для оверлея поля regex: подсветка одного или нескольких мест ошибки.
 * @param {string} pattern — строка паттерна
 * @param {number[] | number | undefined} errorIndices — индексы символов ошибки (или один индекс)
 * @returns {string} — HTML
 */
function buildRegexOverlayHtml(pattern, errorIndices) {
  const text = String(pattern ?? '');
  const len = text.length;
  const indices =
    errorIndices == null
      ? []
      : Array.isArray(errorIndices)
        ? errorIndices.filter((i) => typeof i === 'number' && i >= 0 && i < len)
        : [errorIndices].filter((i) => typeof i === 'number' && i >= 0 && i < len);
  const set = new Set(indices);
  if (set.size === 0) return escapeHtml(text);

  const parts = [];
  for (let i = 0; i < len; i++) {
    if (set.has(i)) {
      parts.push('<span class="tester-regex-err-pos">' + escapeHtml(text[i]) + '</span>');
    } else {
      parts.push(escapeHtml(text[i]));
    }
  }
  return parts.join('');
}

/**
 * Обновляет UI по результату: подсветка в слое, Match Information, ошибка, тост, оверлей regex.
 * @param {{ matches?: Array, error?: string, errorIndex?: number, errorIndices?: number[] }} result
 * @param {string} str
 * @param {HTMLElement} highlightLayer
 * @param {HTMLElement} matchInfoEl
 * @param {HTMLElement} errorEl
 * @param {boolean} showToast
 * @param {HTMLElement} [regexErrorEl]
 * @param {HTMLElement} [regexWrap]
 * @param {HTMLElement} [regexOverlayLayer]
 * @param {string} [pattern] — текущий паттерн (для оверлея)
 * @param {string} [effectiveFlagsStr] — фактическая строка флагов (например "gmu") для отображения
 */
function applyResult(
  result,
  str,
  highlightLayer,
  matchInfoEl,
  errorEl,
  showToast = true,
  regexErrorEl,
  regexWrap,
  regexOverlayLayer,
  pattern,
  effectiveFlagsStr
) {
  const setError = (displayMessage) => {
    if (errorEl) {
      errorEl.textContent = displayMessage;
      errorEl.hidden = false;
    }
    if (regexErrorEl) {
      regexErrorEl.textContent = displayMessage;
      regexErrorEl.hidden = false;
    }
    if (regexWrap) regexWrap.classList.add('tester-has-error');
    if (showToast) showError(displayMessage);
  };
  /** Только под полем regex (не под тестовым текстом), одно сообщение. */
  const setRegexErrorOnly = (displayMessage) => {
    if (errorEl) errorEl.hidden = true;
    if (regexErrorEl) {
      regexErrorEl.textContent = displayMessage;
      regexErrorEl.hidden = false;
    }
    if (regexWrap) regexWrap.classList.add('tester-has-error');
    if (showToast) showError(displayMessage);
  };
  const clearError = () => {
    if (errorEl) errorEl.hidden = true;
    if (regexErrorEl) regexErrorEl.hidden = true;
    if (regexWrap) regexWrap.classList.remove('tester-has-error');
  };
  const setRegexOverlay = (html) => {
    if (regexOverlayLayer) regexOverlayLayer.innerHTML = html;
  };

  if (!result || typeof result !== 'object') {
    setError(MSG_NO_RESULT);
    setRegexOverlay(escapeHtml(pattern ?? ''));
    if (highlightLayer) highlightLayer.innerHTML = escapeHtml(str || '');
    if (matchInfoEl) matchInfoEl.innerHTML = '';
    return;
  }
  if (result.error) {
    if (highlightLayer) highlightLayer.innerHTML = escapeHtml(str || '');
    if (matchInfoEl) matchInfoEl.innerHTML = '';
    const indices = result.errorIndices ?? (result.errorIndex != null ? [result.errorIndex] : []);

    if (result.error === WORKER_ERROR_MARKER) {
      setRegexErrorOnly(MSG_WORKER);
      setRegexOverlay(escapeHtml(pattern ?? ''));
    } else if (result.error.startsWith(TIMEOUT_PREFIX)) {
      setRegexErrorOnly(result.error);
      setRegexOverlay(escapeHtml(pattern ?? ''));
    } else {
      console.error('Regex error:', result.error);
      setRegexErrorOnly(MSG_REGEX_INVALID);
      setRegexOverlay(buildRegexOverlayHtml(pattern ?? '', indices));
    }
    return;
  }
  clearError();
  setRegexOverlay(escapeHtml(pattern ?? ''));
  const matches = Array.isArray(result.matches) ? result.matches : [];
  if (highlightLayer) highlightLayer.innerHTML = buildHighlightHtml(str, matches);
  if (matchInfoEl) {
    const flagsLine = effectiveFlagsStr ? `<div class="tester-flags-used">Флаги: <code>${escapeHtml(effectiveFlagsStr)}</code></div>` : '';
    matchInfoEl.innerHTML = flagsLine + buildMatchInfoHtml(matches);
  }
}

/**
 * Инициализация UI Тестера.
 */
export function initTesterUI() {
  const regexInput = document.getElementById('tester-regex-input');
  const regexFalseInput = document.getElementById('tester-regex-false-input');
  const testInput = document.getElementById('tester-test-input');
  const highlightLayer = document.getElementById('tester-highlight-layer');
  const matchInfoEl = document.getElementById('tester-match-info');
  const errorEl = document.getElementById('tester-error');
  const regexErrorEl = document.getElementById('tester-regex-error');
  const regexFalseErrorEl = document.getElementById('tester-regex-false-error');
  const selectionStatsEl = document.getElementById('tester-selection-stats');
  const regexWrap = regexInput?.closest('.tester-regex-wrap') ?? null;
  const regexOverlayLayer = document.getElementById('tester-regex-highlight-layer');
  const loadingEl = document.getElementById('tester-loading');

  let syncHighlightSize = () => {};

  let debounceTimer = 0;
  let loadingTimer = 0;
  let loadingShown = false;
  let worker = null;
  let workerTimeoutId = 0;
  let workerSeq = 0;

  const numberFormatter =
    typeof Intl !== 'undefined' && Intl.NumberFormat
      ? new Intl.NumberFormat('ru-RU')
      : { format: (n) => String(n) };

  function hideSelectionStats() {
    if (!selectionStatsEl) return;
    selectionStatsEl.hidden = true;
    selectionStatsEl.textContent = '';
  }

  // Создание правой панели параметров для полей TRUE/FALSE (визуально как в ручном редакторе)
  (function setupTesterEditorPanel() {
    if (!regexInput || !regexFalseInput) return;
    const panelBody = regexInput.closest('.tester-panel-body');
    const trueRow = regexInput.closest('.tester-regex-row');
    const falseRow = regexFalseInput.closest('.tester-regex-row');
    if (!panelBody || !trueRow || !falseRow) return;

    const container = document.createElement('div');
    container.className = 'tester-regex-and-panel';

    const mainCol = document.createElement('div');
    mainCol.className = 'tester-regex-main';

    // Вынести существующие строки TRUE/FALSE внутрь новой колонки
    panelBody.insertBefore(container, trueRow);
    container.appendChild(mainCol);
    mainCol.appendChild(trueRow);
    mainCol.appendChild(falseRow);

    const panelCol = document.createElement('div');
    panelCol.className = 'tester-editor-panel';
    container.appendChild(panelCol);

    const header = document.createElement('div');
    header.className = 'tester-editor-header';
    panelCol.appendChild(header);

    const invertBtn = document.createElement('button');
    invertBtn.type = 'button';
    invertBtn.className = 'btn-secondary editor-invert-selection-btn';
    invertBtn.id = 'tester-invert-selection-btn';
    invertBtn.title =
      'Выделите фрагмент regex в поле TRUE или FALSE и нажмите — в конец поля добавится обратный вариант через |';
    invertBtn.textContent = 'Инвертировать выделенное';
    header.appendChild(invertBtn);

    const paramsWrap = document.createElement('div');
    paramsWrap.className = 'tester-editor-params';
    panelCol.appendChild(paramsWrap);

    function createButton(text, insert, title, extraClass = '') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `editor-param-btn tester-editor-param-btn${extraClass ? ' ' + extraClass : ''}`;
      btn.setAttribute('data-insert', insert);
      if (title) btn.title = title;
      btn.textContent = text;
      return btn;
    }

    // Параметры триггера
    const groupParams = document.createElement('div');
    groupParams.className = 'editor-params-group';
    paramsWrap.appendChild(groupParams);

    const paramsTitle = document.createElement('span');
    paramsTitle.className = 'editor-params-group-title';
    paramsTitle.textContent = 'Параметры триггера';
    groupParams.appendChild(paramsTitle);

    const paramsRow1 = document.createElement('div');
    paramsRow1.className = 'editor-params-row editor-params-row-3';
    paramsRow1.appendChild(createButton('(?)', '?', 'Опциональный символ'));
    paramsRow1.appendChild(createButton('(\\w)', '\\w', 'Один буквенно-цифровой символ'));
    paramsRow1.appendChild(
      createButton('(\\w{0,10})', '\\w{0,10}', 'От 0 до 10 буквенно-цифровых'),
    );
    groupParams.appendChild(paramsRow1);

    const paramsRow2 = document.createElement('div');
    paramsRow2.className = 'editor-params-row editor-params-row-2';
    paramsRow2.appendChild(createButton('(\\b)', '\\b', 'Граница слова'));
    paramsRow2.appendChild(createButton('(\\s)', '\\s', 'Пробел после'));
    groupParams.appendChild(paramsRow2);

    // Соединители
    const groupConnectors = document.createElement('div');
    groupConnectors.className = 'editor-params-group';
    paramsWrap.appendChild(groupConnectors);

    const connectorsTitle = document.createElement('span');
    connectorsTitle.className = 'editor-params-group-title';
    connectorsTitle.textContent = 'Соединители';
    groupConnectors.appendChild(connectorsTitle);

    const connRow1 = document.createElement('div');
    connRow1.className = 'editor-params-row editor-params-row-3';
    connRow1.appendChild(createButton('|', '|', 'Альтернация (ИЛИ)'));
    connRow1.appendChild(createButton('[\\s\\S]+', '[\\s\\S]+', 'Любое расстояние'));
    connRow1.appendChild(createButton('.{0,10}', '.{0,10}', 'Своё расстояние 0–10'));
    groupConnectors.appendChild(connRow1);

    const connRow2 = document.createElement('div');
    connRow2.className = 'editor-params-row editor-params-row-3';

    const lbMain = document.createElement('button');
    lbMain.type = 'button';
    lbMain.className = 'editor-param-btn tester-editor-param-btn';
    lbMain.id = 'tester-lookbehind-btn';
    lbMain.title =
      'Шаблоны lookbehind: выбрать пресет для контекста слева (например, исключить «не слово»)';
    lbMain.textContent = 'Lookbehind';
    connRow2.appendChild(lbMain);

    connRow2.appendChild(createButton('.+', '.+', 'В пределах абзаца'));
    connRow2.appendChild(createButton('[^\\n]+', '[^\\n]+', 'В пределах строки'));
    groupConnectors.appendChild(connRow2);

    // Скобки
    const groupBrackets = document.createElement('div');
    groupBrackets.className = 'editor-params-group';
    paramsWrap.appendChild(groupBrackets);

    const bracketsTitle = document.createElement('span');
    bracketsTitle.className = 'editor-params-group-title';
    bracketsTitle.textContent = 'Скобки';
    groupBrackets.appendChild(bracketsTitle);

    const brRow = document.createElement('div');
    brRow.className = 'editor-params-row editor-params-row-2';
    brRow.appendChild(
      createButton('Откр. скобка (', '(', 'Открывающая скобка', 'editor-param-btn-label'),
    );
    brRow.appendChild(
      createButton('Закр. скобка )', ')', 'Закрывающая скобка', 'editor-param-btn-label'),
    );
    groupBrackets.appendChild(brRow);

    // После построения панели и переноса полей инициализируем общую логику вставки/инверсии
    initManualRegexPanel({
      textareas: [regexInput, regexFalseInput].filter(Boolean),
      insertButtonsSelector: '.tester-editor-param-btn[data-insert]',
      invertButtonId: 'tester-invert-selection-btn',
      toastInsertCursorMessage:
        'Поставьте курсор в поле TRUE или FALSE, куда нужно вставить параметр',
      showSuccessToast: true,
    });

    let activeRegexTextarea = regexInput;
    [regexInput, regexFalseInput].forEach((ta) => {
      if (!ta) return;
      ta.addEventListener('focus', () => {
        activeRegexTextarea = ta;
      });
    });

    if (lbMain) {
      setupLookbehindPopupForTester(lbMain, () => activeRegexTextarea || regexInput);
    }
  })();

  function updateSelectionStats() {
    if (!selectionStatsEl || !testInput) return;
    const start = testInput.selectionStart ?? 0;
    const end = testInput.selectionEnd ?? 0;
    if (start === end) {
      hideSelectionStats();
      return;
    }
    const from = Math.min(start, end);
    const to = Math.max(start, end);
    const selected = testInput.value.slice(from, to);
    if (!selected) {
      hideSelectionStats();
      return;
    }
    const total = selected.length;
    let spaces = 0;
    for (let i = 0; i < selected.length; i++) {
      if (selected[i] === ' ') spaces++;
    }
    const noSpaces = total - spaces;
    selectionStatsEl.textContent = `Символов всего: ${numberFormatter.format(
      total
    )} • Без пробелов: ${numberFormatter.format(noSpaces)} • Пробелов: ${numberFormatter.format(
      spaces
    )}`;
    selectionStatsEl.hidden = false;
  }

  /** Версия воркера — при изменении логики тестера увеличить, чтобы браузер не использовал кэш. */
  const WORKER_VERSION = 4;
  function createWorker() {
    try {
      const workerUrl = new URL('../worker/matchWorker.js', import.meta.url);
      workerUrl.searchParams.set('v', String(WORKER_VERSION));
      return new Worker(workerUrl, { type: 'module' });
    } catch (e) {
      return null;
    }
  }

  async function runWithWorkerOrSync() {
    const patternTrue = regexInput?.value ?? '';
    const patternFalseRaw = regexFalseInput?.value ?? '';
    const str = testInput?.value ?? '';
    const flags = getFlagsState();
    const seq = ++workerSeq;
    const useFalse =
      !!patternFalseRaw && (!regexFalseErrorEl || regexFalseErrorEl.hidden === true);

    if (!loadingShown) {
      loadingTimer = window.setTimeout(() => {
        loadingShown = true;
        if (loadingEl) {
          loadingEl.hidden = false;
          loadingEl.setAttribute('aria-busy', 'true');
        }
      }, LOADING_THRESHOLD_MS);
    }

    const effectiveFlagsStr = buildFlagsString(flags);
    function finish(result, fromTimeout = false, flagsStr = effectiveFlagsStr) {
      if (loadingTimer) {
        clearTimeout(loadingTimer);
        loadingTimer = 0;
      }
      if (loadingShown && loadingEl) {
        loadingEl.hidden = true;
        loadingEl.setAttribute('aria-busy', 'false');
        loadingShown = false;
      }
      const hasFalseEnabled = useFalse;

      if (
        !result ||
        typeof result !== 'object' ||
        Object.prototype.hasOwnProperty.call(result, 'matches') ||
        (Object.prototype.hasOwnProperty.call(result, 'error') &&
          !Object.prototype.hasOwnProperty.call(result, 'trueResult'))
      ) {
        applyResult(
          result,
          str,
          highlightLayer,
          matchInfoEl,
          errorEl,
          !fromTimeout,
          regexErrorEl,
          regexWrap,
          regexOverlayLayer,
          patternTrue,
          flagsStr
        );
      } else {
        const { trueResult, falseResult } = result;
        if (!trueResult || typeof trueResult !== 'object') {
          applyResult(
            { error: MSG_NO_RESULT },
            str,
            highlightLayer,
            matchInfoEl,
            errorEl,
            !fromTimeout,
            regexErrorEl,
            regexWrap,
            regexOverlayLayer,
            patternTrue,
            flagsStr
          );
        } else if (trueResult.error) {
          applyResult(
            trueResult,
            str,
            highlightLayer,
            matchInfoEl,
            errorEl,
            !fromTimeout,
            regexErrorEl,
            regexWrap,
            regexOverlayLayer,
            patternTrue,
            flagsStr
          );
        } else {
          const trueMatches = Array.isArray(trueResult.matches) ? trueResult.matches : [];
          let falseMatches = [];

          const cleanedTrueMatches =
            hasFalseEnabled && falseResult && !falseResult.error
              ? (() => {
                  const fm = Array.isArray(falseResult.matches) ? falseResult.matches : [];
                  falseMatches = fm;
                  return filterMatchesByFalse(trueMatches, fm);
                })()
              : trueMatches;

          const displayResult = { matches: cleanedTrueMatches };
          applyResult(
            displayResult,
            str,
            highlightLayer,
            matchInfoEl,
            errorEl,
            !fromTimeout,
            regexErrorEl,
            regexWrap,
            regexOverlayLayer,
            patternTrue,
            flagsStr
          );

          if (matchInfoEl && hasFalseEnabled) {
            let html = '';
            if (flagsStr) {
              html += `<div class="tester-flags-used">Флаги: <code>${escapeHtml(
                flagsStr
              )}</code></div>`;
            }
            html += `<div><strong>Совпадения TRUE (после исключения FALSE)</strong></div>`;
            html += buildMatchInfoHtml(cleanedTrueMatches);
            html += `<div style="margin-top: 0.5em;"><strong>Совпадения FALSE (исключения)</strong></div>`;
            html += buildMatchInfoHtml(falseMatches);
            matchInfoEl.innerHTML = html;
          }
        }
      }
      if (highlightLayer && testInput) {
        syncHighlightSize();
        highlightLayer.scrollTop = testInput.scrollTop;
        highlightLayer.scrollLeft = testInput.scrollLeft;
      }
      if (regexOverlayLayer && regexInput) {
        regexOverlayLayer.scrollTop = regexInput.scrollTop;
        regexOverlayLayer.scrollLeft = regexInput.scrollLeft;
      }
    }

    if (!worker) worker = createWorker();
    if (!worker) {
      const { runMatch } = await import('../logic/matchRunner.js');
      const trueResult = runMatch(patternTrue, flags, str);
      if (useFalse && patternFalseRaw) {
        const falseResult = runMatch(patternFalseRaw, flags, str);
        finish({ trueResult, falseResult });
      } else {
        finish(trueResult);
      }
      return;
    }

    worker.onmessage = (e) => {
      if (workerTimeoutId) {
        clearTimeout(workerTimeoutId);
        workerTimeoutId = 0;
      }
      if (seq !== workerSeq) return;
      finish(e.data);
    };
    worker.onerror = () => {
      if (workerTimeoutId) clearTimeout(workerTimeoutId);
      workerTimeoutId = 0;
      if (seq !== workerSeq) return;
      worker = null;
      finish({ error: 'Worker error. Try again.' });
    };

    worker.postMessage({
      patternTrue,
      patternFalse: useFalse ? patternFalseRaw : '',
      flagsState: flags,
      str,
    });

    workerTimeoutId = window.setTimeout(() => {
      workerTimeoutId = 0;
      if (worker) {
        worker.terminate();
        worker = null;
      }
      if (seq !== workerSeq) return;
      finish(
        {
          error:
            'Регулярное выражение слишком сложное. Упростите паттерн выражения или сократите текст.',
        },
        true
      );
      showError('Регулярное выражение слишком сложное. Упростите паттерн выражения или сократите текст.');
    }, WORKER_TIMEOUT_MS);
  }

  function schedule() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      debounceTimer = 0;
      const pattern = regexInput?.value ?? '';
      const validation = validatePatternForUI(pattern, getFlagsState());
      if (!validation.valid) {
        if (regexErrorEl) {
          regexErrorEl.textContent = MSG_REGEX_INVALID;
          regexErrorEl.hidden = false;
        }
        if (errorEl) errorEl.hidden = true;
        if (regexWrap) regexWrap.classList.add('tester-has-error');
        if (regexOverlayLayer) {
          regexOverlayLayer.innerHTML = buildRegexOverlayHtml(pattern, validation.errorIndices);
        }
        if (highlightLayer) highlightLayer.innerHTML = escapeHtml(testInput?.value ?? '');
        if (matchInfoEl) matchInfoEl.innerHTML = '';
        return;
      }
      if (regexErrorEl) regexErrorEl.hidden = true;
      if (regexWrap) regexWrap.classList.remove('tester-has-error');
      if (regexOverlayLayer) regexOverlayLayer.innerHTML = escapeHtml(pattern);

      const falsePatternRaw = regexFalseInput?.value ?? '';
      if (regexFalseErrorEl) {
        regexFalseErrorEl.textContent = '';
        regexFalseErrorEl.hidden = true;
      }
      if (falsePatternRaw) {
        const falseValidation = validatePatternForUI(falsePatternRaw, getFlagsState());
        if (!falseValidation.valid && regexFalseErrorEl) {
          regexFalseErrorEl.textContent = MSG_REGEX_INVALID;
          regexFalseErrorEl.hidden = false;
        }
      }

      runWithWorkerOrSync();
    }, DEBOUNCE_MS);
  }

  if (highlightLayer && testInput) {
    syncHighlightSize = () => {
      highlightLayer.style.width = testInput.clientWidth + 'px';
      highlightLayer.style.height = testInput.clientHeight + 'px';
    };
    syncHighlightSize();
    const ro = new ResizeObserver(syncHighlightSize);
    ro.observe(testInput);
    testInput.addEventListener('scroll', () => {
      highlightLayer.scrollTop = testInput.scrollTop;
      highlightLayer.scrollLeft = testInput.scrollLeft;
    });
  }

  if (regexOverlayLayer && regexInput) {
    regexInput.addEventListener('scroll', () => {
      regexOverlayLayer.scrollTop = regexInput.scrollTop;
      regexOverlayLayer.scrollLeft = regexInput.scrollLeft;
    });
    const syncRegexOverlay = () => {
      regexOverlayLayer.innerHTML = escapeHtml(regexInput.value ?? '');
    };
    regexInput.addEventListener('input', () => {
      syncRegexOverlay();
      schedule();
    });
    regexInput.addEventListener('change', () => {
      syncRegexOverlay();
      schedule();
    });
  } else {
    if (regexInput) regexInput.addEventListener('input', schedule);
    if (regexInput) regexInput.addEventListener('change', schedule);
  }
  if (testInput) {
    testInput.addEventListener('input', () => {
      if (lowercaseModeEnabled) {
        const val = testInput.value;
        const lower = val.toLowerCase();
        if (val !== lower) {
          const start = testInput.selectionStart;
          const end = testInput.selectionEnd;
          testInput.value = lower;
          testInput.setSelectionRange(start, end);
        }
      }
      schedule();
    });
    testInput.addEventListener('change', schedule);
    testInput.addEventListener('paste', (e) => {
      if (!lowercaseModeEnabled) return;
      e.preventDefault();
      const raw = (e.clipboardData || window.clipboardData)?.getData?.('text');
      const inserted = (raw ?? '').toLowerCase();
      const start = testInput.selectionStart;
      const end = testInput.selectionEnd;
      const val = testInput.value;
      testInput.value = val.slice(0, start) + inserted + val.slice(end);
      testInput.setSelectionRange(start + inserted.length, start + inserted.length);
      schedule();
    });
    const handleSelectionChange = () => {
      updateSelectionStats();
    };
    testInput.addEventListener('select', handleSelectionChange);
    testInput.addEventListener('keyup', handleSelectionChange);
    testInput.addEventListener('mouseup', handleSelectionChange);
    testInput.addEventListener('blur', () => {
      hideSelectionStats();
    });
  }

  document.getElementById('tester-flag-g')?.addEventListener('change', schedule);
  document.getElementById('tester-flag-m')?.addEventListener('change', schedule);
  document.getElementById('tester-flag-i')?.addEventListener('change', schedule);
  document.getElementById('tester-flag-s')?.addEventListener('change', schedule);
  document.getElementById('tester-flag-u')?.addEventListener('change', schedule);
  document.getElementById('tester-flag-x')?.addEventListener('change', schedule);
  document.getElementById('tester-flag-a')?.addEventListener('change', schedule);

  const flagsToggle = document.getElementById('tester-flags-toggle');
  const flagsDropdown = document.getElementById('tester-flags-dropdown');
  if (flagsToggle && flagsDropdown) {
    flagsToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = flagsDropdown.hidden;
      flagsDropdown.hidden = !open;
      flagsToggle.setAttribute('aria-expanded', String(!open));
    });
    document.addEventListener('click', () => {
      flagsDropdown.hidden = true;
      flagsToggle.setAttribute('aria-expanded', 'false');
    });
    flagsDropdown.addEventListener('click', (e) => e.stopPropagation());
  }

  const lowercaseBtn = document.getElementById('tester-lowercase-btn');
  const lowercaseStateEl = lowercaseBtn?.querySelector('.tester-lowercase-state');
  function updateLowercaseButton() {
    if (!lowercaseBtn || !lowercaseStateEl) return;
    lowercaseStateEl.textContent = lowercaseModeEnabled ? 'включен' : 'выключен';
    lowercaseBtn.classList.toggle('tester-lowercase-btn-on', lowercaseModeEnabled);
  }
  if (lowercaseBtn) {
    lowercaseBtn.addEventListener('click', () => {
      lowercaseModeEnabled = !lowercaseModeEnabled;
      if (lowercaseModeEnabled && testInput) {
        testInput.value = testInput.value.toLowerCase();
        schedule();
      }
      updateLowercaseButton();
    });
    updateLowercaseButton();
  }

  if (regexOverlayLayer && regexInput) {
    regexOverlayLayer.innerHTML = escapeHtml(regexInput.value ?? '');
  }

  // Кнопка «Очистить» тестер
  const testerClearBtn = document.getElementById('tester-clear-btn');
  if (testerClearBtn) {
    testerClearBtn.addEventListener('click', () => {
      if (regexInput) regexInput.value = '';
      if (testInput) testInput.value = '';
      if (highlightLayer) highlightLayer.innerHTML = '';
      if (matchInfoEl) matchInfoEl.innerHTML = 'Нет совпадений';
      if (errorEl) errorEl.hidden = true;
      if (regexErrorEl) regexErrorEl.hidden = true;
      if (regexWrap) regexWrap.classList.remove('tester-has-error');
      if (regexOverlayLayer) regexOverlayLayer.innerHTML = '';
      hideSelectionStats();
      showSuccess('Тестер очищен');
    });
  }

  runWithWorkerOrSync();
}

/**
 * Сброс режима «нижний регистр» в состояние по умолчанию (включен).
 * Вызывается из resetTesterPanel().
 */
export function resetTesterLowercaseMode() {
  lowercaseModeEnabled = true;
  const btn = document.getElementById('tester-lowercase-btn');
  const stateEl = btn?.querySelector('.tester-lowercase-state');
  if (stateEl) stateEl.textContent = 'включен';
  if (btn) btn.classList.add('tester-lowercase-btn-on');
}

function setupLookbehindPopupForTester(triggerButton, getActiveTextarea) {
  const presets = [
    {
      id: 'no-ne-word-before',
      title: 'Нет слова «не» перед словом',
      description:
        'Исключает случаи, где перед словом есть отдельное слово «не». Ловит «крс», пропускает «не крс».',
      template: '(?<!\\bне\\b)\\b{WORD}\\b',
      code: '(?<!\\bне\\b)\\bСЛОВО\\b',
    },
    {
      id: 'require-ne-word-before',
      title: 'Только если перед словом есть «не»',
      description: 'Ловит слово, только когда прямо перед ним отдельное слово «не» и пробел.',
      template: '(?<=\\bне\\s)\\b{WORD}\\b',
      code: '(?<=\\bне\\s)\\bСЛОВО\\b',
    },
    {
      id: 'no-ne-space-before',
      title: 'Нет «не » сразу перед словом',
      description: 'Исключает точную последовательность «не » перед словом. Подходит для конструкции «не крс».',
      template: '(?<!не\\s){WORD}',
      code: '(?<!не\\s)СЛОВО',
    },
    {
      id: 'require-ne-space-before',
      title: 'Только если есть «не » сразу перед словом',
      description: 'Ловит слово, только если перед ним ровно «не» и один пробел.',
      template: '(?<=не\\s){WORD}',
      code: '(?<=не\\s)СЛОВО',
    },
    {
      id: 'after-space',
      title: 'Символ после пробела',
      description:
        'Ищет символ, который сразу следует за любым пробельным символом (пробел, таб, перенос строки).',
      template: '(?<=\\s){CHAR}',
      code: '(?<=\\s)СИМВОЛ',
    },
    {
      id: 'not-after-space',
      title: 'Символ не после пробела',
      description: 'Ищет символ, перед которым нет пробела или другого пробельного символа.',
      template: '(?<!\\s){CHAR}',
      code: '(?<!\\s)СИМВОЛ',
    },
    {
      id: 'after-digit',
      title: 'Символ после цифры',
      description: 'Ищет символ, который сразу следует за цифрой слева.',
      template: '(?<=\\d){CHAR}',
      code: '(?<=\\d)СИМВОЛ',
    },
    {
      id: 'not-after-digit',
      title: 'Символ не после цифры',
      description: 'Ищет символ, перед которым не стоит цифра.',
      template: '(?<!\\d){CHAR}',
      code: '(?<!\\d)СИМВОЛ',
    },
  ];

  let popupEl = null;

  function closePopup() {
    if (popupEl) {
      popupEl.remove();
      popupEl = null;
      document.removeEventListener('click', handleDocumentClick, true);
    }
  }

  function handleDocumentClick(e) {
    if (!popupEl) return;
    if (popupEl.contains(e.target) || e.target === triggerButton) return;
    closePopup();
  }

  function insertTemplate(template, useCharPlaceholder = false) {
    const ta = getActiveTextarea();
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? start;
    const value = ta.value || '';
    const selected = value.slice(start, end);
    const placeholder = useCharPlaceholder ? '{CHAR}' : '{WORD}';
    const fallback = useCharPlaceholder ? 'СИМВОЛ' : 'СЛОВО';
    const insertText = template.replace(placeholder, selected || fallback);
    const before = value.slice(0, start);
    const after = value.slice(end);
    ta.value = before + insertText + after;
    const newPos = start + insertText.length;
    ta.selectionStart = ta.selectionEnd = newPos;
    ta.focus();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function openPopup() {
    closePopup();
    const rect = triggerButton.getBoundingClientRect();
    popupEl = document.createElement('div');
    popupEl.className = 'lb-popup';
    popupEl.innerHTML = `
      <div class="lb-popup-header">Lookbehind — контекст слева</div>
      <div class="lb-popup-list"></div>
    `;
    const listEl = popupEl.querySelector('.lb-popup-list');
    presets.forEach((p) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'lb-popup-item';
      item.title = p.description;
      item.innerHTML = `
        <div class="lb-popup-item-title">${escapeHtml(p.title)}</div>
        <div class="lb-popup-item-code"><code>${escapeHtml(p.code)}</code></div>
      `;
      item.addEventListener('click', () => {
        const useChar = p.template.includes('{CHAR}');
        insertTemplate(p.template, useChar);
        closePopup();
      });
      listEl.appendChild(item);
    });

    document.body.appendChild(popupEl);
    const popupRect = popupEl.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 8;
    let left = rect.left + window.scrollX;
    const maxRight = left + popupRect.width;
    const viewportWidth = document.documentElement.clientWidth;
    if (maxRight > viewportWidth - 12) {
      left = Math.max(12, viewportWidth - popupRect.width - 12);
    }
    popupEl.style.top = `${top}px`;
    popupEl.style.left = `${left}px`;

    window.setTimeout(() => {
      document.addEventListener('click', handleDocumentClick, true);
    }, 0);
  }

  triggerButton.addEventListener('click', (e) => {
    e.stopPropagation();
    if (popupEl) {
      closePopup();
    } else {
      openPopup();
    }
  });
}
