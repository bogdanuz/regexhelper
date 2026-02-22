/**
 * RegexHelper — Тестер: UI (поля, флаги, подсветка в поле Test String, Match Information, Worker + таймаут)
 * @file tools/tester/ui/testerUI.js
 */

import { showError, showSuccess } from '../../../shared/ui/notifications.js';

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
  pattern
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
  if (matchInfoEl) matchInfoEl.innerHTML = buildMatchInfoHtml(matches);
}

/**
 * Инициализация UI Тестера.
 */
export function initTesterUI() {
  const regexInput = document.getElementById('tester-regex-input');
  const testInput = document.getElementById('tester-test-input');
  const highlightLayer = document.getElementById('tester-highlight-layer');
  const matchInfoEl = document.getElementById('tester-match-info');
  const errorEl = document.getElementById('tester-error');
  const regexErrorEl = document.getElementById('tester-regex-error');
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

  function createWorker() {
    try {
      return new Worker(new URL('../worker/matchWorker.js', import.meta.url), { type: 'module' });
    } catch (e) {
      return null;
    }
  }

  async function runWithWorkerOrSync() {
    const pattern = regexInput?.value ?? '';
    const str = testInput?.value ?? '';
    const flags = getFlagsState();
    const seq = ++workerSeq;

    if (!loadingShown) {
      loadingTimer = window.setTimeout(() => {
        loadingShown = true;
        if (loadingEl) {
          loadingEl.hidden = false;
          loadingEl.setAttribute('aria-busy', 'true');
        }
      }, LOADING_THRESHOLD_MS);
    }

    function finish(result, fromTimeout = false) {
      if (loadingTimer) {
        clearTimeout(loadingTimer);
        loadingTimer = 0;
      }
      if (loadingShown && loadingEl) {
        loadingEl.hidden = true;
        loadingEl.setAttribute('aria-busy', 'false');
        loadingShown = false;
      }
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
        pattern
      );
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
      const result = runMatch(pattern, flags, str);
      finish(result);
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

    worker.postMessage({ pattern, flagsState: flags, str });

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
