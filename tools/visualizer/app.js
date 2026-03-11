/**
 * RegexHelper — Визуализатор
 * Интеграция с regexper-static (локальный бандл в assets/libs/regexper/)
 * @file tools/visualizer/app.js
 *
 * Если в консоли ошибка "Unexpected token '<' (at app.js:567:1)" — из корня проекта выполнить: node temp/temp-trim.js
 */

import { showError, showSuccess } from '../../shared/ui/notifications.js';

/**
 * Имя файла диаграммы по спецификации: diagram_DD-MM-YYYY_HH-mm (для экспорта и тестов).
 */
export function formatDiagramFilename() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

/**
 * Кодирование regex для location.hash в формате regexper (_setHash).
 * Нужно для сабмита и для автотестов.
 * @param {string} expr — строка регулярного выражения
 * @returns {string} — строка для location.hash (без ведущего #)
 */
export function encodeRegexForHash(expr) {
  return encodeURIComponent(expr)
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

/** Последнее сообщение об ошибке, для которого уже показан тост (чтобы не дублировать при повторных вызовах syncViewFromRegexper). */
let lastShownVisualizerError = '';
/** Тост для has-error уже запланирован (один таймер на одну «попытку»). */
let errorToastScheduled = false;
/** В этой попытке (сабмит) тост по has-error уже показан — не показывать повторно даже при нескольких срабатываниях таймера. */
let errorToastShownThisAttempt = false;
/** ID таймера отложенного показа тоста при has-error. */
let errorToastTimeoutId = 0;

// Вкладки визуализатора
const MAX_VISUALIZER_TABS = 20;
let visualizerTabs = [];
let activeTabId = null;
let tabsContainerEl = null;
let tabAddBtnEl = null;
let tabIdCounter = 1;
let visualizerInputEl = null;
let visualizerFormEl = null;

function buildTabTitle(pattern) {
  const text = String(pattern ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return 'Новая диаграмма';
  const maxLen = 40;
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

function createTab(pattern) {
  return {
    id: String(tabIdCounter++),
    pattern: String(pattern ?? ''),
    title: buildTabTitle(pattern),
  };
}

function renderTabs() {
  if (!tabsContainerEl) return;
  tabsContainerEl.innerHTML = '';
  for (const tab of visualizerTabs) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'visualizer-tab' + (tab.id === activeTabId ? ' visualizer-tab-active' : '');
    btn.setAttribute('data-tab-id', tab.id);

    const titleSpan = document.createElement('span');
    titleSpan.className = 'visualizer-tab-title';
    titleSpan.textContent = tab.title;
    btn.appendChild(titleSpan);

    if (visualizerTabs.length > 1) {
      const closeSpan = document.createElement('span');
      closeSpan.className = 'visualizer-tab-close';
      closeSpan.setAttribute('aria-label', 'Закрыть вкладку');
      closeSpan.textContent = '×';
      btn.appendChild(closeSpan);
    }

    tabsContainerEl.appendChild(btn);
  }
}

function resetTabsToSingleEmpty() {
  visualizerTabs = [createTab('')];
  activeTabId = visualizerTabs[0].id;
  renderTabs();
}

function updateActiveTabPattern(pattern) {
  const value = String(pattern ?? '');
  if (!activeTabId || !visualizerTabs.length) {
    if (visualizerTabs.length >= MAX_VISUALIZER_TABS) return;
    const tab = createTab(value);
    visualizerTabs.push(tab);
    activeTabId = tab.id;
  } else {
    const tab = visualizerTabs.find((t) => t.id === activeTabId);
    if (!tab) {
      if (visualizerTabs.length >= MAX_VISUALIZER_TABS) return;
      const newTab = createTab(value);
      visualizerTabs.push(newTab);
      activeTabId = newTab.id;
    } else {
      tab.pattern = value;
      tab.title = buildTabTitle(value);
    }
  }
  renderTabs();
}

function addNewTab(initialPattern = '') {
  if (visualizerTabs.length >= MAX_VISUALIZER_TABS) {
    showError('Слишком много вкладок диаграммы, закройте ненужные');
    return null;
  }
  const tab = createTab(initialPattern);
  visualizerTabs.push(tab);
  activeTabId = tab.id;
  renderTabs();
  return tab;
}

function findTabById(id) {
  return visualizerTabs.find((t) => t.id === id) || null;
}

function setActiveTab(id, options = {}) {
  const { triggerVisualize = false, inputEl, formEl } = options;
  if (!id) return;
  const tab = findTabById(id);
  if (!tab) return;
  activeTabId = id;
  renderTabs();
  if (inputEl) {
    inputEl.value = tab.pattern;
  }
  if (triggerVisualize && tab.pattern && formEl) {
    const evt = new Event('submit', { bubbles: true, cancelable: true });
    formEl.dispatchEvent(evt);
  }
}

function closeTab(id, { inputEl, formEl }) {
  if (!id || !visualizerTabs.length) return;
  if (visualizerTabs.length === 1) {
    visualizerTabs[0].pattern = '';
    visualizerTabs[0].title = buildTabTitle('');
    activeTabId = visualizerTabs[0].id;
    renderTabs();
    if (inputEl) inputEl.value = '';
    return;
  }
  const idx = visualizerTabs.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const wasActive = visualizerTabs[idx].id === activeTabId;
  visualizerTabs.splice(idx, 1);
  if (!visualizerTabs.length) {
    resetTabsToSingleEmpty();
    if (inputEl) inputEl.value = '';
    return;
  }
  if (wasActive) {
    const nextIdx = Math.max(0, idx - 1);
    const nextTab = visualizerTabs[nextIdx];
    activeTabId = nextTab.id;
    renderTabs();
    if (inputEl) inputEl.value = nextTab.pattern;
    if (formEl && nextTab.pattern) {
      const evt = new Event('submit', { bubbles: true, cancelable: true });
      formEl.dispatchEvent(evt);
    }
  } else {
    renderTabs();
  }
}

/**
 * Синхронизация нашего UI с состоянием regexper.
 * Regexper устанавливает state на document.body (root), поэтому наблюдаем body.
 */
function syncViewFromRegexper(bodyEl) {
  const placeholder = document.getElementById('visualizer-diagram-placeholder');
  const loadingEl = document.getElementById('visualizer-loading');
  const viewport = document.getElementById('visualizer-diagram-viewport');
  const exportActions = document.getElementById('visualizer-export-actions');
  const diagramArea = document.getElementById('visualizer-diagram-area');
  const errorEl = document.getElementById('error');

  if (!bodyEl) return;

  // Когда в hash id секции (#visualizer), не показывать «диаграмму» regexper (заглушка «visualizer»), а нашу подсказку
  const hashValue = location.hash.slice(1);
  if (isSectionHash(hashValue)) {
    if (placeholder) placeholder.classList.remove('hidden');
    if (loadingEl) { loadingEl.style.setProperty('display', 'none'); loadingEl.setAttribute('aria-hidden', 'true'); }
    if (viewport) viewport.style.setProperty('display', 'none');
    if (exportActions) exportActions.style.setProperty('display', 'none');
    if (diagramArea) diagramArea.classList.remove('has-diagram');
    lastShownVisualizerError = '';
    errorToastScheduled = false;
    errorToastShownThisAttempt = false;
    if (errorToastTimeoutId) clearTimeout(errorToastTimeoutId);
    errorToastTimeoutId = 0;
    return;
  }

  const classList = bodyEl.classList;

  if (classList.contains('has-results')) {
    if (placeholder) placeholder.classList.add('hidden');
    if (loadingEl) { loadingEl.style.setProperty('display', 'none'); loadingEl.setAttribute('aria-hidden', 'true'); }
    if (viewport) viewport.style.setProperty('display', 'flex');
    if (exportActions) exportActions.style.setProperty('display', 'flex');
    if (diagramArea) diagramArea.classList.add('has-diagram');
    // Не сбрасываем errorToastScheduled/lastShownVisualizerError здесь: иначе при
    // переключении has-error → has-results → has-error regexper получится несколько тостов.
    // Сброс только при новом сабмите формы или при переходе по hash секции.
  } else if (classList.contains('has-error')) {
    if (placeholder) placeholder.classList.remove('hidden');
    if (loadingEl) { loadingEl.style.setProperty('display', 'none'); loadingEl.setAttribute('aria-hidden', 'true'); }
    if (viewport) viewport.style.setProperty('display', 'none');
    if (diagramArea) diagramArea.classList.remove('has-diagram');
    if (!errorToastScheduled) {
      errorToastScheduled = true;
      if (errorToastTimeoutId) clearTimeout(errorToastTimeoutId);
      errorToastTimeoutId = setTimeout(() => {
        errorToastTimeoutId = 0;
        if (errorToastShownThisAttempt) return;
        const errEl = document.getElementById('error');
        const msg = errEl?.textContent?.trim();
        if (msg && msg !== lastShownVisualizerError) {
          lastShownVisualizerError = msg;
          errorToastShownThisAttempt = true;
          showError(msg);
        }
      }, 50);
    }
  } else if (classList.contains('is-loading')) {
    if (placeholder) placeholder.classList.add('hidden');
    if (loadingEl) {
      loadingEl.style.setProperty('display', 'flex');
      loadingEl.setAttribute('aria-hidden', 'false');
    }
    if (viewport) viewport.style.setProperty('display', 'flex');
    if (exportActions) exportActions.style.setProperty('display', 'flex');
    if (diagramArea) diagramArea.classList.add('has-diagram');
  } else {
    /* Промежуточное состояние (нет is-loading и нет has-results): не показывать вьюпорт, чтобы не мерцало */
    if (loadingEl) loadingEl.style.setProperty('display', 'none');
    if (loadingEl) loadingEl.setAttribute('aria-hidden', 'true');
    if (placeholder) placeholder.classList.remove('hidden');
    if (viewport) viewport.style.setProperty('display', 'none');
    if (exportActions) exportActions.style.setProperty('display', 'none');
    if (diagramArea) diagramArea.classList.remove('has-diagram');
  }

  // Сохраняем класс страницы: regexper подменяет body.className
  if (!bodyEl.classList.contains('page-wrapper')) {
    bodyEl.classList.add('page-wrapper');
  }
}

/**
 * Инициализация визуализатора
 */
/**
 * Проверка: hash совпадает с id секции (навигация), а не закодированный regex.
 * Такие hash не должны подставляться в поле ввода.
 */
function isSectionHash(hashValue) {
  const decoded = tryDecodeHash(hashValue);
  return decoded === 'visualizer' || decoded === 'converter-section' || decoded === 'history-section' || decoded === 'tester' || decoded === 'editor' || decoded === 'top';
}

function tryDecodeHash(hashValue) {
  if (!hashValue) return '';
  try {
    return decodeURIComponent(hashValue);
  } catch (e) {
    return hashValue;
  }
}

/**
 * Сброс UI панели визуализатора в начальное состояние (пустое поле, нет диаграммы).
 */
function resetVisualizerUI() {
  const input = document.getElementById('regexp-input');
  const placeholder = document.getElementById('visualizer-diagram-placeholder');
  const viewport = document.getElementById('visualizer-diagram-viewport');
  const exportActions = document.getElementById('visualizer-export-actions');
  const diagramArea = document.getElementById('visualizer-diagram-area');
  const regexpRender = document.getElementById('regexp-render');
  const errorEl = document.getElementById('error');
  const warningsEl = document.getElementById('warnings');

  const loadingEl = document.getElementById('visualizer-loading');
  if (input) input.value = '';
  if (regexpRender) regexpRender.innerHTML = '';
  if (placeholder) placeholder.classList.remove('hidden');
  if (loadingEl) loadingEl.style.setProperty('display', 'none');
  if (loadingEl) loadingEl.setAttribute('aria-hidden', 'true');
  if (viewport) viewport.style.setProperty('display', 'none');
  if (exportActions) exportActions.style.setProperty('display', 'none');
  if (diagramArea) diagramArea.classList.remove('has-diagram');
  if (errorEl) errorEl.textContent = '';
  if (warningsEl) warningsEl.textContent = '';

  document.body.classList.remove('has-results', 'has-error', 'is-loading');
  lastShownVisualizerError = '';
  errorToastScheduled = false;
  errorToastShownThisAttempt = false;
  if (errorToastTimeoutId) clearTimeout(errorToastTimeoutId);
  errorToastTimeoutId = 0;
  history.replaceState(null, '', window.location.pathname + window.location.search);
}

/**
 * Сброс панели визуализатора в начальное состояние (UI + вкладки).
 * Вызывается при загрузке страницы и при нажатии «Сбросить» в шапке и глобальном сбросе.
 */
export function resetVisualizerPanel() {
  resetVisualizerUI();
  resetTabsToSingleEmpty();
}

export function initVisualizer() {
  const input = document.getElementById('regexp-input');
  const visualizeBtn = document.getElementById('visualizer-visualize-btn');
  const clearBtn = document.getElementById('visualizer-clear-btn');
  const tabsContainer = document.getElementById('visualizer-tabs');
  const tabAddBtn = document.getElementById('visualizer-tab-add-btn');
  const diagramArea = document.getElementById('visualizer-diagram-area');
  const placeholder = document.getElementById('visualizer-diagram-placeholder');
  const viewport = document.getElementById('visualizer-diagram-viewport');
  const diagramScroll = document.getElementById('visualizer-diagram-scroll');
  const exportActions = document.getElementById('visualizer-export-actions');
  const exportSvgBtn = document.getElementById('visualizer-export-svg');
  const exportPngBtn = document.getElementById('visualizer-export-png');
  if (!input || !diagramArea) return;

  visualizerInputEl = input;
  tabsContainerEl = tabsContainer;
  tabAddBtnEl = tabAddBtn;

  // При загрузке страницы всегда сбрасываем панель визуализатора (пустое поле, без диаграммы, одна вкладка)
  resetVisualizerPanel();

  clearBtn?.addEventListener('click', () => resetVisualizerPanel());

  // При переходе по якорю секции (#visualizer, #tester, #converter-section, #history-section) — очистить поле:
  // regexper при любом hashchange подставляет decoded hash в поле ввода, поэтому для навигационных hash очищаем после них.
  window.addEventListener('hashchange', () => {
    const h = location.hash.slice(1);
    if (isSectionHash(h)) {
      [0, 50, 150].forEach(delay => setTimeout(() => { if (input) input.value = ''; }, delay));
    }
  });

  // Наблюдение за состоянием regexper (они ставят state на document.body)
  const observer = new MutationObserver(() => syncViewFromRegexper(document.body));
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  syncViewFromRegexper(document.body);

  // Fallback: показывать область диаграммы, когда внутри #regexp-render появился SVG (но не при hash секции — заглушка «visualizer»)
  const regexpRender = document.getElementById('regexp-render');
  if (regexpRender) {
    const diagramObserver = new MutationObserver(() => {
      if (isSectionHash(location.hash.slice(1))) return;
      const hasSvg = regexpRender.querySelector('.svg svg');
      if (hasSvg) {
        const area = document.getElementById('visualizer-diagram-area');
        if (placeholder) placeholder.classList.add('hidden');
        if (viewport) viewport.style.setProperty('display', 'flex');
        if (exportActions) exportActions.style.setProperty('display', 'flex');
        if (area) area.classList.add('has-diagram');
        naturalDiagramWidth = 0;
        naturalDiagramHeight = 0;
        currentZoom = 100;
        panX = 0;
        panY = 0;
        applyZoom();
        requestAnimationFrame(() => {
          if (innerEl && regexpRender.querySelector('.svg svg')) {
            const svgSize = getNaturalSvgSize();
            naturalDiagramWidth = svgSize.width;
            naturalDiagramHeight = svgSize.height;
            applyFitToView();
          }
        });
      }
    });
    diagramObserver.observe(regexpRender, { childList: true, subtree: true });
  }

  // Сабмит формы: валидация пустого поля; при ошибке загрузки скрипта — сообщение
  const form = document.getElementById('regexp-form');
  visualizerFormEl = form;

  function visualizeExpression(expr) {
    lastShownVisualizerError = '';
    errorToastScheduled = false;
    errorToastShownThisAttempt = false;
    if (errorToastTimeoutId) clearTimeout(errorToastTimeoutId);
    errorToastTimeoutId = 0;

    const value = expr?.trim();
    if (!value) {
      showError('Введите регулярное выражение');
      return false;
    }
    const regexperScript = document.getElementById('regexper-js');
    if (regexperScript?.hasAttribute('data-failed')) {
      showError('Бандл regexper не загружен. Выполните скрипт fetch-regexper-static.ps1 (см. assets/libs/regexper/README.md)');
      return false;
    }

    updateActiveTabPattern(value);

    // Regexper слушает hashchange и вызывает showExpression(_getHash()).
    const encoded = encodeRegexForHash(value);
    location.hash = encoded;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return true;
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      visualizeExpression(input?.value ?? '');
    });
  }

  // Экспорт SVG — всегда из текущего SVG с встроенными стилями,
  // чтобы файл в редакторах (Illustrator и т.п.) выглядел так же, как на экране
  exportSvgBtn?.addEventListener('click', () => {
    const svgEl = regexpRender?.querySelector('.svg');
    const svgInner = svgEl?.querySelector('svg');
    if (!svgInner) {
      showError('Сначала визуализируйте regex');
      return;
    }

    // Сериализация standalone-SVG с xmlns и встроенным стилем диаграммы
    let svgMarkup = svgInner.outerHTML;
    if (!/xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(svgMarkup)) {
      svgMarkup = svgMarkup.replace(/<svg\s/i, '<svg xmlns="http://www.w3.org/2000/svg" ');
    }
    const styleBlock = `<defs><style><![CDATA[${DIAGRAM_EXPORT_STYLES.trim()}]]></style></defs>`;
    svgMarkup = svgMarkup.replace(/(<svg[^>]*>)/i, '$1' + styleBlock);

    if (svgMarkup) {
      const blob = new Blob([svgMarkup], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagram_${formatDiagramFilename()}.svg`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('Сохранено: SVG');
      return;
    }
    showError('Сначала визуализируйте regex');
  });

  // Стили диаграммы для встраивания в SVG при экспорте PNG (иначе Image рендерит без CSS → чёрная картинка)
  const DIAGRAM_EXPORT_STYLES = `
.root path { stroke: #374151; }
.root circle { fill: #6b7280; stroke: #374151; }
.literal rect { fill: #5B8DEF; stroke: #94a3b8; stroke-width: 1; }
.escape rect, .charset-escape rect { fill: #34D399; stroke: #94a3b8; stroke-width: 1; }
.anchor rect, .any-character rect { fill: #d1d5db; stroke: #9ca3af; stroke-width: 1; }
.anchor text, .any-character text { fill: #1a1a1a; }
.escape text, .charset-escape text, .literal text { fill: #fff; }
.charset .charset-box { fill: #e5e7eb; stroke: #9ca3af; stroke-width: 1; }
.subexp .subexp-box { fill: none; stroke: #4b5563; stroke-width: 1.5; stroke-dasharray: 8 4; }
.quote, .quote text { fill: #4b5563; }
.repeat rect { fill: #d1d5db; stroke: #9ca3af; stroke-width: 1; }
.repeat text { fill: #1a1a1a; }
path { fill: none; stroke: #374151; }
text { fill: #1a1a1a; }
`;

  // Масштаб PNG по сравнению с размером SVG (для повышения «чёткости»)
  // 2 = в 2 раза больше по ширине/высоте, можно при необходимости поменять.
  const PNG_EXPORT_SCALE = 2;

  // Экспорт PNG — SVG как standalone с xmlns и встроенными стилями → Image → canvas → toBlob
  exportPngBtn?.addEventListener('click', () => {
    const svgEl = regexpRender?.querySelector('.svg');
    const svgInner = svgEl?.querySelector('svg');
    if (!svgInner) {
      showError('Сначала визуализируйте regex');
      return;
    }
    const link = document.querySelector('#visualizer-regexper-links a[data-action="download-png"]');
    if (link?.href && link.href.startsWith('blob:')) {
      link.click();
      showSuccess('Сохранено: PNG');
      return;
    }
    const w = Number(svgInner.getAttribute('width')) || parseFloat(svgInner.getAttribute('width')) || 800;
    const h = Number(svgInner.getAttribute('height')) || parseFloat(svgInner.getAttribute('height')) || 400;
    const baseWidth = Math.min(Math.max(Math.round(Number(w) || 800), 1), 8000);
    const baseHeight = Math.min(Math.max(Math.round(Number(h) || 400), 1), 8000);
    const width = Math.min(Math.max(Math.round(baseWidth * PNG_EXPORT_SCALE), 1), 8000);
    const height = Math.min(Math.max(Math.round(baseHeight * PNG_EXPORT_SCALE), 1), 8000);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    // Сериализуем <svg> с xmlns и встроенными стилями (как на экране), иначе Image рендерит без CSS
    let svgMarkup = svgInner.outerHTML;
    if (!/xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(svgMarkup)) {
      svgMarkup = svgMarkup.replace(/<svg\s/i, '<svg xmlns="http://www.w3.org/2000/svg" ');
    }
    const styleBlock = `<defs><style><![CDATA[${DIAGRAM_EXPORT_STYLES.trim()}]]></style></defs>`;
    svgMarkup = svgMarkup.replace(/(<svg[^>]*>)/i, '$1' + styleBlock);

    function doDownload(pngBlob) {
      if (!pngBlob) {
        console.error('PNG export: canvas.toBlob returned null');
        showError('Не удалось создать PNG');
        return;
      }
      const url = URL.createObjectURL(pngBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagram_${formatDiagramFilename()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('Сохранено: PNG');
    }

    let objectUrlToRevoke = null;

    function tryDraw(src) {
      img.onload = () => {
        if (objectUrlToRevoke) {
          URL.revokeObjectURL(objectUrlToRevoke);
          objectUrlToRevoke = null;
        }
        try {
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => doDownload(blob),
            'image/png',
            1
          );
        } catch (e) {
          console.error('PNG export: drawImage/toBlob failed', e);
          showError('Ошибка экспорта PNG');
        }
      };
      img.onerror = () => {
        if (src.startsWith('blob:')) {
          if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
          console.error('PNG export: Image failed to load (blob URL)');
          showError('Ошибка экспорта PNG');
        } else {
          const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
          objectUrlToRevoke = URL.createObjectURL(blob);
          tryDraw(objectUrlToRevoke);
        }
      };
      img.src = src;
    }

    tryDraw('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMarkup));
  });

  // Выпадающий список «Скачать»: кнопка, по клику — меню SVG/PNG в ряд, плавное открытие
  const downloadBtn = document.getElementById('visualizer-download-btn');
  const downloadMenu = document.getElementById('visualizer-download-menu');
  function setDownloadMenuOpen(open) {
    if (downloadMenu) {
      downloadMenu.classList.toggle('is-open', open);
      downloadMenu.setAttribute('aria-hidden', String(!open));
    }
    if (downloadBtn) downloadBtn.setAttribute('aria-expanded', String(!!open));
  }
  downloadBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    setDownloadMenuOpen(!downloadMenu?.classList.contains('is-open'));
  });
  document.addEventListener('click', (e) => {
    if (downloadBtn && (e.target === downloadBtn || downloadBtn.contains(e.target))) return;
    if (downloadMenu?.classList.contains('is-open')) setDownloadMenuOpen(false);
  });
  downloadMenu?.addEventListener('click', (e) => {
    if (e.target.closest('[role="menuitem"]')) setDownloadMenuOpen(false);
  });

  // Пометить скрипт как не загруженный при ошибке (опционально: onerror на теге в index.html)
  const regexperScript = document.getElementById('regexper-js');
  if (regexperScript) {
    regexperScript.addEventListener('error', () => regexperScript.setAttribute('data-failed', '1'));
  }

  // Вкладки: обработчики кликов
  tabsContainerEl?.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const closeEl = target.closest('.visualizer-tab-close');
    const tabEl = target.closest('.visualizer-tab');
    if (!tabEl) return;
    const tabId = tabEl.getAttribute('data-tab-id');
    if (!tabId) return;
    if (closeEl) {
      closeTab(tabId, { inputEl: input, formEl: form });
      return;
    }
    setActiveTab(tabId, { triggerVisualize: true, inputEl: input, formEl: form });
  });

  tabAddBtnEl?.addEventListener('click', () => {
    const tab = addNewTab('');
    if (!tab) return;
    if (input) input.value = '';
    resetVisualizerUI();
  });

  // Zoom 25–300% — только когда есть диаграмма
  const zoomOutBtn = document.getElementById('visualizer-zoom-out');
  const zoomInBtn = document.getElementById('visualizer-zoom-in');
  const zoomValueEl = document.getElementById('visualizer-zoom-value');
  const ZOOM_TOOLTIP = 'Масштаб можно менять колёсиком мыши при зажатой клавише Ctrl';
  const MIN_ZOOM = 25;
  const MAX_ZOOM = 300;
  const ZOOM_STEP = 25;
  let currentZoom = 100;
  let panX = 0;
  let panY = 0;
  let naturalDiagramWidth = 0;
  let naturalDiagramHeight = 0;
  const innerEl = document.getElementById('regexp-render');

  function hasDiagram() {
    return regexpRender?.querySelector('.svg svg') ?? false;
  }

  /** Элемент диаграммы для масштаба (контейнер .svg или svg) */
  function getDiagramScaleEl() {
    if (!innerEl) return null;
    return innerEl.querySelector('.svg') || innerEl.querySelector('svg') || innerEl.firstElementChild;
  }

  /** Получить натуральные размеры SVG диаграммы (без padding и transform) */
  function getNaturalSvgSize() {
    const svg = innerEl?.querySelector('svg');
    if (!svg) return { width: 0, height: 0 };
    const bbox = svg.getBBox();
    if (bbox.width > 0 && bbox.height > 0) {
      return { width: bbox.width, height: bbox.height };
    }
    const vb = svg.viewBox?.baseVal;
    if (vb && vb.width > 0 && vb.height > 0) {
      return { width: vb.width, height: vb.height };
    }
    return { width: svg.clientWidth || 0, height: svg.clientHeight || 0 };
  }

  const DIAGRAM_PADDING = 36;

  function getScrollWrap() {
    return diagramScroll?.firstElementChild;
  }

  function applyZoom() {
    if (zoomValueEl) zoomValueEl.textContent = `${currentZoom}%`;
    const scrollWrap = getScrollWrap();
    if (!scrollWrap) return;
    const scale = currentZoom / 100;
    scrollWrap.style.transformOrigin = '0 0';
    scrollWrap.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }

  function applyFitToView() {
    if (!diagramScroll || !innerEl || !hasDiagram()) return;
    const svgSize = getNaturalSvgSize();
    naturalDiagramWidth = svgSize.width;
    naturalDiagramHeight = svgSize.height;
    if (naturalDiagramWidth <= 0 || naturalDiagramHeight <= 0) return;

    const totalW = naturalDiagramWidth + DIAGRAM_PADDING * 2;
    const totalH = naturalDiagramHeight + DIAGRAM_PADDING * 2;
    const vw = diagramScroll.clientWidth || diagramScroll.getBoundingClientRect().width;
    const vh = diagramScroll.clientHeight || diagramScroll.getBoundingClientRect().height;
    if (!vw || !vh) return;

    // Fit диаграммы по ширине в область просмотра.
    // Высота остаётся «натуральной» (может быть больше высоты окна),
    // поэтому ограничиваем масштаб только по ширине, не по высоте.
    const scale = Math.min(1, vw / totalW);
    currentZoom = Math.round(scale * 100);
    const scaledW = totalW * scale;
    const scaledH = totalH * scale;
    panX = (vw - scaledW) / 2;
    panY = (vh - scaledH) / 2;
    applyZoom();
  }

  function zoomAtPoint(viewportX, viewportY, deltaZoom) {
    if (!hasDiagram() || !diagramScroll) {
      showError('Сначала визуализируйте regex, чтобы изменять масштаб');
      return;
    }
    const oldZoom = currentZoom;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom + deltaZoom));
    if (newZoom === oldZoom) return;

    const scale = oldZoom / 100;
    const diagramX = (viewportX - panX) / scale;
    const diagramY = (viewportY - panY) / scale;
    const newScale = newZoom / 100;

    currentZoom = newZoom;
    panX = viewportX - diagramX * newScale;
    panY = viewportY - diagramY * newScale;
    applyZoom();
  }

  function zoomOut() {
    if (!diagramScroll) {
      showError('Сначала визуализируйте regex, чтобы изменять масштаб');
      return;
    }
    const centerX = diagramScroll.clientWidth / 2;
    const centerY = diagramScroll.clientHeight / 2;
    zoomAtPoint(centerX, centerY, -ZOOM_STEP);
  }
  function zoomIn() {
    if (!diagramScroll) {
      showError('Сначала визуализируйте regex, чтобы изменять масштаб');
      return;
    }
    const centerX = diagramScroll.clientWidth / 2;
    const centerY = diagramScroll.clientHeight / 2;
    zoomAtPoint(centerX, centerY, ZOOM_STEP);
  }
  zoomOutBtn?.addEventListener('click', zoomOut);
  zoomInBtn?.addEventListener('click', zoomIn);
  if (zoomOutBtn) zoomOutBtn.setAttribute('title', `Уменьшить. ${ZOOM_TOOLTIP}`);
  if (zoomInBtn) zoomInBtn.setAttribute('title', `Увеличить. ${ZOOM_TOOLTIP}`);
  applyZoom();

  // Масштаб по Ctrl + колёсико мыши в области диаграммы
  diagramScroll?.addEventListener('wheel', (e) => {
    if (!e.ctrlKey || !hasDiagram()) return;
    e.preventDefault();
    const rect = diagramScroll.getBoundingClientRect();
    const viewportX = e.clientX - rect.left;
    const viewportY = e.clientY - rect.top;
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    zoomAtPoint(viewportX, viewportY, delta);
  }, { passive: false });

  // Pan: ЛКМ + перетаскивание — двигаем panX/panY (как в Miro/Figma)
  let panStart = null;
  diagramScroll?.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    panStart = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      panX,
      panY
    };
    diagramScroll.style.cursor = 'grabbing';
  });
  document.addEventListener('mousemove', (e) => {
    if (panStart === null) return;
    e.preventDefault();
    const dx = e.clientX - panStart.mouseX;
    const dy = e.clientY - panStart.mouseY;
    panX = panStart.panX + dx;
    panY = panStart.panY + dy;
    applyZoom();
  });
  function stopPan() {
    if (!diagramScroll) return;
    panStart = null;
    diagramScroll.style.cursor = 'grab';
  }
  document.addEventListener('mouseup', stopPan);
  document.addEventListener('mouseleave', stopPan);

  // Полноэкранное модальное окно удалено: диаграмма всегда работает в основной области.
}

/**
 * Открывает выражение в визуализаторе: новая вкладка, авто-визуализация и скролл к секции.
 * Используется другими инструментами (конвертер, ручной редактор, история).
 * @param {string} pattern
 */
export function openInVisualizer(pattern) {
  const value = String(pattern ?? '').trim();
  if (!value) {
    showError('Нет регулярного выражения для визуализации');
    return;
  }
  const input = visualizerInputEl || document.getElementById('regexp-input');
  const form = visualizerFormEl || document.getElementById('regexp-form');
  if (!input || !form) {
    showError('Визуализатор ещё не инициализирован');
    return;
  }

  // Если активная вкладка пустая («Новая диаграмма» без содержимого) — переиспользуем её,
  // иначе создаём новую вкладку, как и раньше.
  let targetTab = null;
  if (!visualizerTabs.length || !activeTabId) {
    targetTab = addNewTab(value);
  } else {
    const activeTab = findTabById(activeTabId);
    if (!activeTab) {
      targetTab = addNewTab(value);
    } else if (!activeTab.pattern?.trim()) {
      activeTab.pattern = value;
      activeTab.title = buildTabTitle(value);
      targetTab = activeTab;
      renderTabs();
    } else {
      targetTab = addNewTab(value);
    }
  }

  if (!targetTab) {
    return;
  }

  input.value = value;

  const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(submitEvent);

  const visualizerSection = document.getElementById('visualizer');
  if (visualizerSection) {
    visualizerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}