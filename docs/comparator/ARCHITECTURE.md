# Сравнитель — архитектура

Инструмент для **посимвольного сравнения двух версий одного regex**: в **превью** — таблица с двумя строками «Было» и «Стало» (подсветка удалённого и добавленного). В **буфер обмена** для Confluence попадает **один склееный блок** (не таблица): порядок сегментов как в diff, общий текст без дублирования целых полей; удалённые фрагменты — `<strong>` + красноватый текст и фон, вставки — `<strong>` + зелёный текст и фон, неизменённое — обычный текст. Plain — те же сегменты подряд (`buildMergedPlain`).

## Назначение

- Поля **Было** / **Стало** — редактируемые `textarea`.
- **Превью** — обновляется с debounce (~280 ms); diff через алгоритм из vendored **fast-diff** (на базе Google diff-match-patch, Apache 2.0): `tools/comparator/vendor/fastDiff.js`.
- **Копировать для Confluence** — одна кнопка; `ClipboardItem` с `text/html` (обёртка `<div>` + моноширинный стиль) и `text/plain` (склееный текст).

## Структура

```
tools/comparator/
├── app.js                 # initComparator(), кнопка #comparator-btn
├── logic/
│   └── diffRender.js      # getDiffTuples, buildBeforeHtml, buildAfterHtml, buildClipboardUnifiedFragment, buildMergedPlain, buildMergedClipboardInnerHtml, escapeHtml
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
- В буфере: инлайн-стили на `<strong>` — `font-weight:700`, контрастные `color` и `background-color` для лучшей совместимости с визуальным редактором Confluence.
