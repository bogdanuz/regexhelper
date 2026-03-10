# Архитектура визуализатора — RegexHelper

Структура и поток данных инструмента «Визуализатор». Реализована интеграция с **regexper-static**.

**Дата создания:** 2026-02-17  
**Статус:** Реализовано. Бандл regexper в **assets/libs/regexper/**, UI и синхронизация в **tools/visualizer/app.js**.

**Документы визуализатора (docs/visualizer/):** SPECIFICATION.md, ARCHITECTURE.md (этот файл), SETUP_INSTRUCTIONS.md (установка бандла), TESTING.md. Завершённый план интеграции — archive/IMPLEMENTATION_PLAN_VISUALIZER.md. Референс: [regexper.com](https://regexper.com/), [documentation](https://regexper.com/documentation.html). **Связанные (уровень проекта):** docs/PROJECT_PRINCIPLES.md, docs/STRUCTURE.md, docs/DEPENDENCY_MAP.md.

---

## Назначение

Визуализация регулярных выражений в виде railroad-диаграмм. Референс: [regexper.com](https://regexper.com/). Спецификация: **SPECIFICATION.md**.

---

## Точка входа

- **main.js** импортирует `initVisualizer` из **tools/visualizer/app.js** и вызывает при загрузке DOM (вместе с initApp конвертера).
- **index.html**: секция `#visualizer`, внутри `#content` и `.application` (селектор инициализации regexper), форма `#regexp-form`, поле `#regexp-input`; блок **#visualizer-diagram-block** (область диаграммы + панель Скачать/зум), контейнер `#regexp-render`, строка вкладок визуализатора, шаблон `#svg-container-base`. Подключены стили visualizer.css, regexper.css, regexper-overrides.css, regexper-reset.css; скрипт **assets/libs/regexper/regexper.js** до main.js.

---

## Поток данных

1. Пользователь вводит regex в textarea или вставляет кнопкой «Вставить».
2. По клику «Визуализировать» **app.js** предотвращает отправку формы, кодирует выражение для hash (encodeRegexForHash), выставляет `location.hash` и диспатчит `hashchange`.
3. Бандл **regexper** слушает `hashchange`, декодирует hash, вызывает свой парсер/рендерер и пишет SVG в `#regexp-render`. Состояние выставляется на `document.body.className` (has-results, has-error, is-loading).
4. **app.js** наблюдает за body (MutationObserver) и за появлением SVG в `#regexp-render`, показывает/скрывает плейсхолдер, индикатор загрузки и вьюпорт, восстанавливает класс `page-wrapper` на body. При hash секции (#visualizer) всегда показывается наша подсказка, а не заглушка regexper. При загрузке страницы панель визуализатора сбрасывается (`resetVisualizerPanel`: пустое поле, очистка контейнера диаграммы, без hash); та же функция экспортирована и вызывается из конвертера при нажатии «Сбросить» в шапке (полный сброс всех инструментов, история сохраняется). **Во время построения диаграммы (is-loading):** сразу показываются белое поле (вьюпорт), по центру — анимация загрузки (три пульсирующие точки) и панель экспорта/зума внизу (без мигания при переходе к результату). **При готовой диаграмме (has-results):** анимация скрывается, отображается диаграмма, панель остаётся на месте. **При ошибке regex (has-error):** показывается ровно один тост за одну попытку: флаги `errorToastScheduled` и `errorToastShownThisAttempt`; сброс этих флагов только при сабмите формы, при переходе по hash секции и в resetVisualizerPanel (в ветке has-results сброс не выполняется, чтобы при переключении regexper has-error ↔ has-results не появлялись лишние тосты).
5. **Блок «область диаграммы + панель»:** в **index.html** область диаграммы и нижняя панель (Скачать, зум) обёрнуты в **#visualizer-diagram-block** без `max-height` в `vh`: высота секции определяется реальной высотой диаграммы. **Панель под диаграммой:** одна кнопка «Скачать» с выпадающим меню (SVG/PNG в ряд, is-open); кнопки зума (−, 100%, +). Зум при пустой диаграмме — тост. **Зум и пан как в Miro/Figma:** скроллбара нет (`overflow: hidden` у .visualizer-diagram-scroll). Масштаб и сдвиг задаются одним **transform** на обёртке: `translate(panX, panY) scale(zoom/100)` с `transform-origin: 0 0`. **Ctrl + колёсико** — зум к точке под курсором; кнопки −/+ — зум к центру вьюпорта. **Пан** — перетаскивание ЛКМ меняет panX/panY. **Fit to view:** при первой отрисовке вызывается `applyFitToView()` — диаграмма вписывается **по ширине области просмотра** (масштаб не больше 100%), центрируется по ширине; обёртка имеет размер по контенту (min-width/min-height 0), поэтому и маленькие, и большие диаграммы центрируются одинаково по ширине. **Экспорт:** SVG и PNG из текущего SVG с DIAGRAM_EXPORT_STYLES; PNG 2× (PNG_EXPORT_SCALE). Имя файла: `formatDiagramFilename()` → DD-MM-YYYY_HH-mm. **Область диаграммы:** до построения — адаптивная фиксированная минимальная высота; после построения — растёт по высоте под диаграмму без искусственных ограничений. **Поле ввода:** без max-height, resize: vertical.
6. **Вкладки визуализатора:** `app.js` управляет массивом вкладок (максимум 20) и активной вкладкой. При каждом запуске визуализации или вызове helper‑функции `openInVisualizer(pattern)` создаётся новая вкладка с заголовком по началу regex (обрезка и очистка спецсимволов). Вкладки можно закрывать; глобальный сброс (`resetVisualizerPanel()` или «Сбросить всё» в шапке) приводит визуализатор к состоянию одной пустой вкладки. При переключении вкладок диаграмма перерисовывается через regexper под содержимое выбранной вкладки.

---

## Ключевые модули

| Модуль | Назначение |
|--------|------------|
| **tools/visualizer/app.js** | initVisualizer: сброс панели при загрузке и при «Сбросить» в шапке (resetVisualizerPanel экспортирована), кнопка «Очистить» в шапке, наблюдатели body и #regexp-render, обработка hash секции, форма (submit, Вставить). Управление вкладками визуализатора (создание, переключение, закрытие, лимит 20), построение заголовков вкладок по началу regex. **Экспорт:** одна кнопка «Скачать» с выпадающим меню (SVG/PNG в ряд, класс is-open); helper `openInVisualizer(pattern)`, который из других инструментов открывает новую вкладку с диаграммой и скроллит к секции визуализатора. Закрытие меню по клику на document; клик по самой кнопке «Скачать» не закрывает меню (чтобы открытие было стабильным при программном/внешнем клике). **Зум и пан:** один transform на обёртке scroll-wrap: `translate(panX, panY) scale(zoom/100)`; зум к курсору (Ctrl+колёсико) и к центру (кнопки −/+); пан перетаскиванием. **Fit to view:** при появлении SVG вызывается `applyFitToView()` (масштаб вписывает диаграмму по ширине, не больше 100%; центрирование panX/panY). Размеры SVG — `getNaturalSvgSize()` (getBBox/viewBox), DIAGRAM_PADDING 36px. Класс has-diagram на области при отображённой диаграмме. При has-error — один тост за попытку. Экспорт: resetVisualizerPanel, encodeRegexForHash, formatDiagramFilename. |
| **assets/libs/regexper/regexper.js** | Бандл regexper-static: парсер regex → AST, рендер SVG, инициализация по `#content .application`, форма, hash, ссылки на экспорт. В проекте применён патч отступов (padding 10→16, 5→8) для «охранных полей» между элементами; при обновлении бандла патч нужно повторить — см. **SETUP_INSTRUCTIONS.md**. |
| **tools/visualizer/css/** | visualizer.css (блок **visualizer-diagram-block** без `max-height` в `vh`; область диаграммы flex: 1, min-height: 0; панель экспорта flex-shrink: 0; **visualizer-diagram-scroll** overflow: hidden; **visualizer-diagram-scroll-wrap** min-width/min-height: 0, width/height: fit-content — размер по контенту для корректного центрирования больших и маленьких диаграмм; индикатор загрузки — три точки по центру; строка вкладок визуализатора; выпадающее меню «Скачать» вправо; padding 36px), regexper-overrides.css (поле диаграммы белое, палитра с повышенным контрастом для блоков и линий, hover‑подсветка ключевых элементов), regexper-reset.css. |

---

## Зависимости

- **shared/** — notifications.js (toast при ошибках).
- **core/** — не импортируется напрямую; стили используют CSS-переменные из common.css.
- **assets/libs/regexper/** — regexper.js, regexper.css (обязательны после сборки/копирования по **SETUP_INSTRUCTIONS.md**).

---

## Интеграция в проект

- Визуализатор — отдельный инструмент; не трогает модули конвертера.
- Навигация в header: ссылка «Визуализатор» ведёт к `#visualizer`; подсветка активного раздела по скроллу — общая логика страницы.

---

## Папки

- **tools/visualizer/** — app.js, **css/** (visualizer, regexper-overrides, regexper-reset), **scripts/** (fetch-regexper-static.ps1).
- **assets/libs/regexper/** — regexper.js (с локальным патчом отступов), regexper.css (копируются скриптом или вручную; обновления только вручную, см. SETUP_INSTRUCTIONS.md).
