# RegexHelper — Dependency Map

**Date:** February 2026 (после аудита 2026-02-22)  
**Entry point:** index.html

---

## Entry Point: index.html

### Scripts

| Order | File | Type |
|-------|------|------|
| 1 | assets/libs/regexper/regexper.js | classic (до main) |
| 2 | main.js | module (entry) |
| 3 | assets/libs/russian-nouns.min.js | classic |

### Stylesheets

| File | Linked |
|------|--------|
| core/css/common.css | ✅ |
| core/css/responsive.css | ✅ |
| tools/converter/css/converter.css | ✅ |
| tools/converter/css/badges.css | ✅ |
| tools/converter/css/modals.css | ✅ |
| tools/converter/css/history.css | ✅ |
| tools/converter/css/tooltips.css | ✅ |
| tools/converter/css/zones.css | ✅ |
| tools/converter/css/linkedBuilder.css | ✅ |
| tools/visualizer/css/visualizer.css | ✅ |
| assets/libs/regexper/regexper.css | ✅ |
| tools/visualizer/css/regexper-overrides.css | ✅ |
| tools/visualizer/css/regexper-reset.css | ✅ |
| tools/case/css/case.css | ✅ |
| tools/tester/css/tester.css | ✅ |

### Assets referenced

- assets/images/favicon/favicon.ico
- assets/images/logo.png

---

## JavaScript dependency graph (from main.js)

```
main.js
├── shared/ui/feedback.js
│   └── shared/ui/notifications.js
├── tools/converter/app.js
│   ├── tools/converter/resetModalConfig.js
│   ├── tools/visualizer/app.js  (resetVisualizerPanel при сбросе из шапки)
│   ├── tools/case/app.js        (resetCasePanel при сбросе из шапки)
│   ├── tools/tester/app.js      (resetTesterPanel при сбросе из шапки)
│   ├── tools/converter/ui/modals.js (createModal, openConfirmModal)
│   │   ├── shared/content/WIKI.js
│   │   ├── tools/converter/logic/compatibilityChecker.js
│   │   └── shared/ui/notifications.js
│   ├── tools/converter/ui/settingsUI.js
│   ├── tools/converter/ui/resultPanel.js
│   │   ├── tools/converter/logic/resultFormatter.js
│   │   └── shared/ui/notifications.js
│   ├── tools/converter/ui/historyUI.js
│   │   ├── shared/utils/storage.js → core/config.js
│   │   └── shared/ui/notifications.js
│   ├── tools/converter/ui/layoutManager.js → core/config.js
│   ├── tools/converter/ui/linkedBuilder.js (визуальный конструктор связанных триггеров)
│   │   ├── shared/ui/notifications.js
│   │   ├── tools/converter/ui/badges.js
│   │   ├── tools/converter/ui/inlinePopup.js
│   │   ├── tools/converter/ui/modals.js (openConfirmModal)
│   │   └── tools/converter/logic/compatibilityChecker.js
│   ├── tools/converter/logic/linkedBuilderConverter.js (конвертация данных linkedBuilder в regex)
│   │   ├── tools/converter/converters/autoReplace.js
│   │   └── tools/converter/logic/parameterApplier.js
│   ├── tools/converter/logic/conversionManager.js
│   │   ├── tools/converter/logic/simpleConverter.js
│   │   ├── tools/converter/logic/parameterApplier.js
│   │   ├── tools/converter/logic/regexBuilder.js
│   │   ├── tools/converter/logic/compatibilityChecker.js
│   │   ├── tools/converter/logic/resultFormatter.js
│   │   ├── tools/converter/logic/distanceBuilder.js
│   │   ├── shared/utils/storage.js
│   │   └── shared/utils/escape.js
│   └── shared/utils/storage.js
├── tools/visualizer/app.js
│   └── shared/ui/notifications.js
├── tools/case/app.js
│   ├── tools/case/logic/caseConverter.js
│   ├── tools/case/ui/caseUI.js
│   └── shared/ui/notifications.js
└── tools/tester/app.js
    ├── tools/tester/ui/testerUI.js
    │   └── shared/ui/notifications.js
    └── (worker: tools/tester/worker/matchWorker.js → tools/tester/logic/matchRunner.js)
```

### Flat list (active modules)

**Root:** main.js  

**Core:** core/config.js, core/icons.js  

**Shared:** shared/utils/storage.js, shared/utils/validation.js, shared/utils/escape.js, shared/content/WIKI.js, shared/ui/notifications.js, shared/ui/feedback.js  

**Tools/converter:**
- tools/converter/app.js
- tools/converter/resetModalConfig.js
- tools/converter/logic/: simpleConverter, linkedBuilderConverter, parameterApplier, regexBuilder, distanceBuilder, resultFormatter, compatibilityChecker, conversionManager, **regexParser** (обратный конвертер)
- tools/converter/converters/: autoReplace, declensions, latinCyrillic, optionalChars, wildcard, transliteration
- tools/converter/ui/: linkedBuilder, linkedBuilderUI, modals, settingsUI, resultPanel, historyUI, layoutManager, badges, inlinePopup

**Tools/visualizer:** tools/visualizer/app.js  

**Tools/case:** tools/case/app.js, tools/case/logic/caseConverter.js, tools/case/ui/caseUI.js  

**Tools/tester:** tools/tester/app.js, tools/tester/logic/patternPreprocess.js, tools/tester/logic/flagsBuilder.js, tools/tester/logic/matchRunner.js, tools/tester/worker/matchWorker.js, tools/tester/ui/testerUI.js  

**External (index.html):** assets/libs/regexper/regexper.js, assets/libs/russian-nouns.min.js  

---

## Удалённые модули (аудит 2026-02-21)

Следующие модули удалены как неиспользуемые после перехода на linkedBuilder:

| Файл | Причина удаления |
|------|------------------|
| tools/converter/ui/groupManager.js | Заменён на linkedBuilder.js |
| tools/converter/ui/triggerManager.js | Заменён на linkedBuilder.js |
| tools/converter/ui/dragDrop.js | Встроено в linkedBuilder.js |
| tools/converter/ui/distanceDropdown.js | Заменён на inline popup в linkedBuilder |
| tools/converter/logic/linkedConverter.js | Заменён на linkedBuilderConverter.js |
| tools/converter/converters/prefix.js | Функционал заменён параметром \w |

---

## Tests

- **tests/test.html** — браузерные тесты (235+ тестов, 5 вкладок)
- **tests/p0-logic-test.mjs** — Node тесты логики (137 тестов)
- **tests/converter-reference-test.mjs** — референсные тесты
- **tests/visualizer-test.mjs**, **tests/texthelper-test.mjs**, **tests/tester-test.mjs** — тесты инструментов

---

## Инструменты

### Регистр

- **main.js** → `initCase` из **tools/case/app.js**
- **tools/converter/app.js** → `resetCasePanel` (при «Сбросить»)
- Модальное окно по кнопке «Регистр» в навигации
- **Стили:** tools/case/css/case.css

### Тестер

- **main.js** → `initTester` из **tools/tester/app.js**
- **tools/converter/app.js** → `resetTesterPanel` (при «Сбросить»)
- Секция #tester на странице
- **Стили:** tools/tester/css/tester.css

### Визуализатор

- **main.js** → `initVisualizer` из **tools/visualizer/app.js**
- Бандл **assets/libs/regexper/regexper.js** (с патчем отступов)
- **Стили:** tools/visualizer/css/

### Форма обратной связи (Feedback)

- **main.js** → `initFeedback` из **shared/ui/feedback.js**
- Кнопка «Фидбек» в хедере → модальное окно `#feedback-modal-overlay`
- Отправка на Supabase Edge Function: `https://teuatabseokbnjlxkahn.supabase.co/functions/v1/feedback`
- **Стили:** tools/converter/css/modals.css (секция FEEDBACK MODAL)

---

_End of dependency map._
