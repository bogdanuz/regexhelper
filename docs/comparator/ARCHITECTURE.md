# Сравнитель — архитектура

Инструмент для **посимвольного сравнения двух версий одного regex**: в **превью** — таблица с двумя строками «Было» и «Стало» (подсветка удалённого и добавленного). В **буфер обмена** для Confluence попадает **один склееный блок** (не таблица): порядок сегментов как в diff; удаления/вставки — `<span>` с теми же цветами/фонами, что в старом табличном копировании (`#b91c1c` / `#15803d`, фоны `#fef2f2` / `#f0fdf4`), внутри — `<strong>…</strong>` для жирного. Plain — те же сегменты подряд (`buildMergedPlain`).

Перед склейкой для буфера применяется **`normalizeTuplesForClipboardMerge`**: если подряд идут `DELETE` и `INSERT`, с **конца** текста удаления срезаются пробельные символы (`\s` в смысле ECMAScript). Иначе пробел из старой версии (например между словами «ручная кладь») попадал бы между последним символом удаления и вставкой и давал бы в Confluence артефакт вроде `ручная .{0,3}`. **Превью** в таблице «Было»/«Стало» по-прежнему строится из **исходных** кортежей diff без этой нормализации.

## Назначение

- Поля **Было** / **Стало** — редактируемые `textarea`.
- **Превью** — обновляется с debounce (~280 ms); diff через алгоритм из vendored **fast-diff** (на базе Google diff-match-patch, Apache 2.0): `tools/comparator/vendor/fastDiff.js`.
- **Копировать для Confluence** — одна кнопка; `ClipboardItem` с `text/html` (обёртка `<div>` + моноширинный стиль) и `text/plain` (склееный текст).
- **Очистить** (`#comparator-clear-btn`) — обнуляет оба поля и превью; то же выполняет **`clearComparatorPanel()`** при подтверждении **«Сбросить все»** в шапке (`tools/converter/app.js` → `resetAll`).

## Структура

```
tools/comparator/
├── app.js                 # initComparator(), кнопка #comparator-btn
├── logic/
│   └── diffRender.js      # getDiffTuples, normalizeTuplesForClipboardMerge, buildBeforeHtml, buildAfterHtml, buildClipboardUnifiedFragment, buildMergedPlain, buildMergedClipboardInnerHtml, escapeHtml
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
- В буфере: `<span style="color; background">` + внутри `<strong>текст</strong>` — цвет на span, жирность отдельно (у Confluence `font-weight` на span часто теряется).
