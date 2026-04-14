# Сравнитель — архитектура

Инструмент для **посимвольного сравнения двух версий одного regex**: подсветка удалённого (строка «Было») и добавленного (строка «Стало»), превью в виде таблицы и копирование **HTML-таблицы** с инлайн-стилями для вставки в Confluence (визуальный редактор). В буфер по умолчанию уходит **одна строка «Стало»**; полная двухстрочная таблица — при включённом чекбоксе в подвале модалки (`#comparator-copy-include-before`).

## Назначение

- Поля **Было** / **Стало** — редактируемые `textarea`.
- **Превью** — обновляется с debounce (~280 ms); diff через алгоритм из vendored **fast-diff** (на базе Google diff-match-patch, Apache 2.0): `tools/comparator/vendor/fastDiff.js`.
- **Копировать для Confluence** — `ClipboardItem` с `text/html` и `text/plain`.
  - По умолчанию (чекбокс **«Копировать также строку „Было“»** снят): в HTML — однострочная таблица только с **«Стало»** и подсветкой вставок; в plain — только текст новой версии (`buildClipboardAfterOnlyFragment`, `buildPlainAfterOnly`).
  - Если чекбокс **включён**: как раньше — две строки **«Было»** и **«Стало»** в таблице; plain — `Было:\n…\n\nСтало:\n…` (`buildClipboardTableFragment`, `buildPlainFallback`).

## Структура

```
tools/comparator/
├── app.js                 # initComparator(), кнопка #comparator-btn
├── logic/
│   └── diffRender.js      # getDiffTuples, build*Html, buildClipboardTableFragment, buildClipboardAfterOnlyFragment, buildPlain*, escapeHtml
├── ui/
│   └── comparatorUI.js    # модалка, swap, превью, копирование
├── css/
│   └── comparator.css
└── vendor/
    └── fastDiff.js        # ESM-обёртка (export default)
```

## Интеграция

- **index.html:** кнопка `#comparator-btn`, модалка `#comparator-modal-overlay`, стили `tools/comparator/css/comparator.css`.
- **main.js:** `initComparator` из `tools/comparator/app.js`.
- **Тесты Node:** `tests/comparator-test.mjs`.
- **Тесты браузера:** `tests/test.html` — сценарии Сравнителя идут как `testCase('Текст-помощник', 'Сравнитель: …')` в блоке после тестов текстового помощника (единая группа в отчёте вкладки «Конвертер»).

## Разметка превью и буфера

- В превью классы: `comparator-mark-del`, `comparator-mark-add` (цвета темы сайта).
- В буфере для светлого фона: инлайн `color` / `background-color` / для вставок `font-weight:700`.
