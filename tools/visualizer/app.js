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
  return decoded === 'visualizer' || decoded === 'converter-section' || decoded === 'history-section' || decoded === 'tester' || decoded === 'top';
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
 * Сброс панели визуализатора в начальное состояние (пустое поле, нет диаграммы).
 * Вызывается при загрузке страницы и при нажатии «Сбросить» в шапке.
 */
export function resetVisualizerPanel() {
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

export function initVisualizer() {
  const input = document.getElementById('regexp-input');
  const pasteBtn = document.getElementById('visualizer-paste-btn');
  const visualizeBtn = document.getElementById('visualizer-visualize-btn');
  const clearBtn = document.getElementById('visualizer-clear-btn');
  const diagramArea = document.getElementById('visualizer-diagram-area');
  const placeholder = document.getElementById('visualizer-diagram-placeholder');
  const viewport = document.getElementById('visualizer-diagram-viewport');
  const diagramScroll = document.getElementById('visualizer-diagram-scroll');
  const exportActions = document.getElementById('visualizer-export-actions');
  const exportSvgBtn = document.getElementById('visualizer-export-svg');
  const exportPngBtn = document.getElementById('visualizer-export-png');
  if (!input || !diagramArea) return;

  // При загрузке страницы всегда сбрасываем панель визуализатора (пустое поле, без диаграммы)
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
        applyZoom();
        requestAnimationFrame(() => {
          if (innerEl && regexpRender.querySelector('.svg svg')) {
            const svgSize = getNaturalSvgSize();
            naturalDiagramWidth = svgSize.width;
            naturalDiagramHeight = svgSize.height;
          }
        });
      }
    });
    diagramObserver.observe(regexpRender, { childList: true, subtree: true });
  }

  // Вставить из буфера (заменяет текущее содержимое поля)
  pasteBtn?.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (input) input.value = text;
    } catch (err) {
      showError('Не удалось прочитать буфер обмена');
    }
  });

  // Сабмит формы: валидация пустого поля; при ошибке загрузки скрипта — сообщение
  const form = document.getElementById('regexp-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      lastShownVisualizerError = '';
      errorToastScheduled = false;
      errorToastShownThisAttempt = false;
      if (errorToastTimeoutId) clearTimeout(errorToastTimeoutId);
      errorToastTimeoutId = 0;

      const expr = input?.value?.trim();
      if (!expr) {
        showError('Введите регулярное выражение');
        return;
      }
      const regexperScript = document.getElementById('regexper-js');
      if (regexperScript?.hasAttribute('data-failed')) {
        showError('Бандл regexper не загружен. Выполните скрипт fetch-regexper-static.ps1 (см. assets/libs/regexper/README.md)');
        return;
      }

      // Regexper слушает hashchange и вызывает showExpression(_getHash()).
      const encoded = encodeRegexForHash(expr);
      location.hash = encoded;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
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
  document.addEventListener('click', () => {
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

  // Zoom 25–300% — только когда есть диаграмма
  const zoomOutBtn = document.getElementById('visualizer-zoom-out');
  const zoomInBtn = document.getElementById('visualizer-zoom-in');
  const zoomValueEl = document.getElementById('visualizer-zoom-value');
  const ZOOM_TOOLTIP = 'Масштаб можно менять колёсиком мыши при зажатой клавише Ctrl';
  const MIN_ZOOM = 25;
  const MAX_ZOOM = 300;
  const ZOOM_STEP = 25;
  let currentZoom = 100;
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
    const value = currentZoom + '%';
    if (zoomValueEl) zoomValueEl.textContent = value;
    const diagramEl = getDiagramScaleEl();
    if (!innerEl) return;

    if (currentZoom === 100) {
      const svgSize = getNaturalSvgSize();
      naturalDiagramWidth = svgSize.width;
      naturalDiagramHeight = svgSize.height;
      innerEl.style.width = '';
      innerEl.style.height = '';
      innerEl.classList.remove('visualizer-diagram-inner--zoomed');
      const scrollWrap = getScrollWrap();
      if (scrollWrap) {
        scrollWrap.style.width = '';
        scrollWrap.style.height = '';
        scrollWrap.style.minWidth = '';
        scrollWrap.style.minHeight = '';
        scrollWrap.classList.remove('visualizer-scroll-wrap--zoomed');
      }
      if (diagramEl) {
        diagramEl.style.transform = '';
        diagramEl.style.transformOrigin = '';
      }
    } else {
      if (naturalDiagramWidth <= 0 || naturalDiagramHeight <= 0) {
        const svgSize = getNaturalSvgSize();
        naturalDiagramWidth = svgSize.width;
        naturalDiagramHeight = svgSize.height;
      }
      const scaledW = Math.round(naturalDiagramWidth * currentZoom / 100);
      const scaledH = Math.round(naturalDiagramHeight * currentZoom / 100);
      const totalPadding = DIAGRAM_PADDING * 2;
      const w = scaledW + totalPadding;
      const h = scaledH + totalPadding;
      innerEl.style.width = w + 'px';
      innerEl.style.height = h + 'px';
      innerEl.classList.add('visualizer-diagram-inner--zoomed');
      const scrollWrap = getScrollWrap();
      if (scrollWrap) {
        scrollWrap.classList.add('visualizer-scroll-wrap--zoomed');
        scrollWrap.style.width = w + 'px';
        scrollWrap.style.height = h + 'px';
        scrollWrap.style.minWidth = w + 'px';
        scrollWrap.style.minHeight = h + 'px';
      }
      if (diagramEl) {
        diagramEl.style.transform = `scale(${currentZoom / 100})`;
        diagramEl.style.transformOrigin = '0 0';
      }
    }
  }

  function zoomOut() {
    if (!hasDiagram()) {
      showError('Сначала визуализируйте regex, чтобы изменять масштаб');
      return;
    }
    currentZoom = Math.max(MIN_ZOOM, currentZoom - ZOOM_STEP);
    applyZoom();
  }
  function zoomIn() {
    if (!hasDiagram()) {
      showError('Сначала визуализируйте regex, чтобы изменять масштаб');
      return;
    }
    currentZoom = Math.min(MAX_ZOOM, currentZoom + ZOOM_STEP);
    applyZoom();
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
    if (e.deltaY < 0) {
      currentZoom = Math.min(MAX_ZOOM, currentZoom + ZOOM_STEP);
    } else {
      currentZoom = Math.max(MIN_ZOOM, currentZoom - ZOOM_STEP);
    }
    applyZoom();
  }, { passive: false });

  // Pan: ЛКМ + перетаскивание в области скролла (направление как «тянешь окно»: вниз → контент вверх, вправо → контент влево)
  let panStart = null;
  diagramScroll?.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    panStart = {
      x: e.clientX - diagramScroll.scrollLeft,
      y: e.clientY - diagramScroll.scrollTop,
      scrollLeft: diagramScroll.scrollLeft,
      scrollTop: diagramScroll.scrollTop
    };
  });
  document.addEventListener('mousemove', (e) => {
    if (panStart === null) return;
    e.preventDefault();
    diagramScroll.scrollLeft = panStart.scrollLeft - (e.clientX - (panStart.x + panStart.scrollLeft));
    diagramScroll.scrollTop = panStart.scrollTop - (e.clientY - (panStart.y + panStart.scrollTop));
  });
  document.addEventListener('mouseup', () => { panStart = null; });
  document.addEventListener('mouseleave', () => { panStart = null; });

  // Модальное окно «на весь экран»: кнопка, открытие/закрытие, клон диаграммы, зум, пан, экспорт
  const fullscreenBtn = document.getElementById('visualizer-fullscreen-btn');
  const overlay = document.getElementById('visualizer-fullscreen-overlay');
  const modal = document.getElementById('visualizer-fullscreen-modal');
  const modalCloseBtn = document.getElementById('visualizer-fullscreen-close');
  const modalScroll = document.getElementById('visualizer-fullscreen-scroll');
  const modalScrollWrap = modalScroll?.firstElementChild;
  const modalInner = document.getElementById('visualizer-fullscreen-inner');
  const modalZoomOutBtn = document.getElementById('visualizer-modal-zoom-out');
  const modalZoomInBtn = document.getElementById('visualizer-modal-zoom-in');
  const modalZoomValueEl = document.getElementById('visualizer-modal-zoom-value');
  const modalExportSvgBtn = document.getElementById('visualizer-modal-export-svg');
  const modalExportPngBtn = document.getElementById('visualizer-modal-export-png');

  let modalZoom = 100;
  let naturalDiagramWidthModal = 0;
  let naturalDiagramHeightModal = 0;

  function getModalDiagramScaleEl() {
    if (!modalInner) return null;
    return modalInner.querySelector('.svg') || modalInner.querySelector('svg') || modalInner.firstElementChild;
  }

  /** Получить натуральные размеры SVG в модальном окне */
  function getModalNaturalSvgSize() {
    const svg = modalInner?.querySelector('svg');
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

  function applyModalZoom() {
    if (modalZoomValueEl) modalZoomValueEl.textContent = modalZoom + '%';
    const diagramEl = getModalDiagramScaleEl();
    if (!modalInner) return;
    if (modalZoom === 100) {
      const svgSize = getModalNaturalSvgSize();
      naturalDiagramWidthModal = svgSize.width;
      naturalDiagramHeightModal = svgSize.height;
      modalInner.style.width = '';
      modalInner.style.height = '';
      modalInner.classList.remove('visualizer-fullscreen-inner--zoomed');
      if (modalScrollWrap) {
        modalScrollWrap.style.width = '';
        modalScrollWrap.style.height = '';
        modalScrollWrap.style.minWidth = '';
        modalScrollWrap.style.minHeight = '';
        modalScrollWrap.classList.remove('visualizer-scroll-wrap--zoomed');
      }
      if (diagramEl) {
        diagramEl.style.transform = '';
        diagramEl.style.transformOrigin = '';
      }
    } else {
      if (naturalDiagramWidthModal <= 0 || naturalDiagramHeightModal <= 0) {
        const svgSize = getModalNaturalSvgSize();
        naturalDiagramWidthModal = svgSize.width;
        naturalDiagramHeightModal = svgSize.height;
      }
      const scaledW = Math.round(naturalDiagramWidthModal * modalZoom / 100);
      const scaledH = Math.round(naturalDiagramHeightModal * modalZoom / 100);
      const totalPadding = DIAGRAM_PADDING * 2;
      const w = scaledW + totalPadding;
      const h = scaledH + totalPadding;
      modalInner.style.width = w + 'px';
      modalInner.style.height = h + 'px';
      modalInner.classList.add('visualizer-fullscreen-inner--zoomed');
      if (modalScrollWrap) {
        modalScrollWrap.classList.add('visualizer-scroll-wrap--zoomed');
        modalScrollWrap.style.width = w + 'px';
        modalScrollWrap.style.height = h + 'px';
        modalScrollWrap.style.minWidth = w + 'px';
        modalScrollWrap.style.minHeight = h + 'px';
      }
      if (diagramEl) {
        diagramEl.style.transform = `scale(${modalZoom / 100})`;
        diagramEl.style.transformOrigin = '0 0';
      }
    }
  }

  // Зум по Ctrl + колёсико мыши в модальном окне (как в панели диаграммы)
  modalScroll?.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      modalZoom = Math.min(MAX_ZOOM, modalZoom + ZOOM_STEP);
    } else {
      modalZoom = Math.max(MIN_ZOOM, modalZoom - ZOOM_STEP);
    }
    applyModalZoom();
  }, { passive: false });

  function openFullscreenModal() {
    if (!hasDiagram()) {
      showError('Сначала визуализируйте regex');
      return;
    }
    if (!modalInner || !regexpRender) return;
    modalInner.innerHTML = regexpRender.innerHTML;
    naturalDiagramWidthModal = 0;
    naturalDiagramHeightModal = 0;
    modalZoom = 100;
    requestAnimationFrame(() => {
      const svgSize = getModalNaturalSvgSize();
      naturalDiagramWidthModal = svgSize.width;
      naturalDiagramHeightModal = svgSize.height;
      applyModalZoom();
    });
    if (overlay) {
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
    }
  }

  function closeFullscreenModal() {
    modalPanStart = null;
    if (overlay) {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  fullscreenBtn?.addEventListener('click', () => openFullscreenModal());
  modalCloseBtn?.addEventListener('click', () => closeFullscreenModal());
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeFullscreenModal();
  });
  modal?.addEventListener('click', (e) => e.stopPropagation());

  modalZoomOutBtn?.addEventListener('click', () => {
    modalZoom = Math.max(MIN_ZOOM, modalZoom - ZOOM_STEP);
    applyModalZoom();
  });
  modalZoomInBtn?.addEventListener('click', () => {
    modalZoom = Math.min(MAX_ZOOM, modalZoom + ZOOM_STEP);
    applyModalZoom();
  });

  modalExportSvgBtn?.addEventListener('click', () => exportSvgBtn?.click());
  modalExportPngBtn?.addEventListener('click', () => exportPngBtn?.click());

  let modalPanStart = null;
  modalScroll?.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    modalPanStart = {
      x: e.clientX - modalScroll.scrollLeft,
      y: e.clientY - modalScroll.scrollTop,
      scrollLeft: modalScroll.scrollLeft,
      scrollTop: modalScroll.scrollTop
    };
  });
  document.addEventListener('mousemove', (e) => {
    if (modalPanStart === null || !modalScroll) return;
    e.preventDefault();
    modalScroll.scrollLeft = modalPanStart.scrollLeft - (e.clientX - (modalPanStart.x + modalPanStart.scrollLeft));
    modalScroll.scrollTop = modalPanStart.scrollTop - (e.clientY - (modalPanStart.y + modalPanStart.scrollTop));
  });
  document.addEventListener('mouseup', () => { modalPanStart = null; });
}