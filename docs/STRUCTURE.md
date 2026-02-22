# Структура репозитория — RegexHelper

Полное описание структуры (2026-02-22): что где лежит и как это работает.

---

## Дерево (итоговое)

```
regexhelper/
├── index.html              # Страница приложения
├── main.js                 # Точка входа (ES-модуль): импорт converter + visualizer + case + tester
├── tests/                  # Все тесты: Node (.mjs) и браузер (test.html)
│   ├── run-tests.mjs       # Единый запуск: node tests/run-tests.mjs (Node и/или --browser)
│   ├── test.html           # Страница браузерных тестов (пять вкладок, 235+ тестов)
│   ├── p0-logic-test.mjs   # Node тесты логики (137 тестов)
│   ├── converter-reference-test.mjs
│   ├── visualizer-test.mjs
│   ├── case-test.mjs
│   └── tester-test.mjs
│
├── core/                   # Ядро: конфиг, иконки, общие стили
│   ├── config.js
│   ├── icons.js
│   └── css/
│       ├── common.css
│       └── responsive.css
│
├── shared/                 # Общее для инструментов
│   ├── utils/
│   │   ├── storage.js
│   │   ├── validation.js
│   │   └── escape.js
│   ├── content/
│   │   └── WIKI.js
│   └── ui/
│       ├── notifications.js
│       └── feedback.js     # Форма обратной связи (Supabase Edge Function + Telegram)
│
├── tools/
│   ├── converter/          # Приложение конвертера
│   │   ├── app.js          # Инициализация: UI + logic
│   │   ├── resetModalConfig.js   # Текст модалки сброса
│   │   ├── logic/          # Бизнес-логика
│   │   │   ├── simpleConverter.js
│   │   │   ├── linkedBuilderConverter.js   # Конвертер для linkedBuilder
│   │   │   ├── parameterApplier.js
│   │   │   ├── regexBuilder.js
│   │   │   ├── distanceBuilder.js
│   │   │   ├── resultFormatter.js
│   │   │   ├── compatibilityChecker.js
│   │   │   ├── conversionManager.js
│   │   │   └── regexParser.js              # Обратный конвертер (импорт паттернов)
│   │   ├── converters/     # Правила преобразования
│   │   │   ├── autoReplace.js
│   │   │   ├── declensions.js
│   │   │   ├── latinCyrillic.js
│   │   │   ├── optionalChars.js
│   │   │   ├── wildcard.js
│   │   │   └── transliteration.js
│   │   ├── ui/             # Интерфейс конвертера
│   │   │   ├── linkedBuilder.js      # Визуальный конструктор связанных триггеров
│   │   │   ├── linkedBuilderUI.js    # UI компоненты linkedBuilder
│   │   │   ├── modals.js
│   │   │   ├── settingsUI.js
│   │   │   ├── resultPanel.js
│   │   │   ├── historyUI.js
│   │   │   ├── layoutManager.js
│   │   │   ├── badges.js
│   │   │   └── inlinePopup.js
│   │   └── css/            # Стили конвертера
│   │       ├── converter.css
│   │       ├── linkedBuilder.css
│   │       ├── badges.css
│   │       ├── modals.css
│   │       ├── history.css
│   │       ├── tooltips.css
│   │       └── zones.css
│   ├── visualizer/         # Визуализатор railroad-диаграмм
│   │   ├── app.js
│   │   ├── css/            # visualizer.css, regexper-overrides.css, regexper-reset.css
│   │   └── scripts/        # fetch-regexper-static.ps1
│   ├── case/               # Регистр — конвертер регистра текста
│   │   ├── app.js
│   │   ├── logic/          # caseConverter.js
│   │   ├── ui/             # caseUI.js
│   │   └── css/            # case.css
│   └── tester/             # Тестер — проверка regex на тестовой строке
│       ├── app.js
│       ├── logic/          # patternPreprocess.js, flagsBuilder.js, matchRunner.js
│       ├── worker/         # matchWorker.js (Web Worker)
│       ├── ui/             # testerUI.js
│       └── css/            # tester.css
│
├── assets/
│   ├── libs/               # russian-nouns.min.js, regexper/ (regexper.js, regexper.css)
│   └── images/             # favicon, logo
│
└── docs/                   # Документация
    ├── STRUCTURE.md        # Этот файл
    ├── STATUS.md           # Текущий статус проекта
    ├── DEPENDENCY_MAP.md   # Граф зависимостей
    ├── PROJECT_PRINCIPLES.md
    ├── USER_REGEX_EXAMPLES_REFERENCE.md
    ├── LINKED_TRIGGERS_REDESIGN_PLAN.md
    ├── converter/          # Документы конвертера
    ├── visualizer/         # Документы визуализатора
    ├── case/               # Документы Регистр
    └── tester/             # Документы Тестер
```

---

## Как это работает

### Загрузка приложения

1. Браузер открывает **index.html**.
2. **index.html** подключает стили и скрипты.
3. **main.js** импортирует и вызывает `initApp`, `initVisualizer`, `initCase`, `initTester`, `initFeedback`.
4. Каждый инструмент инициализируется независимо.

### Импорты (правила путей)

- Из **tools/converter/app.js** в core: `../../core/config.js`, в shared: `../../shared/utils/...`.
- Из **tools/converter/ui/*.js** в logic: `../logic/...`, в core: `../../../core/config.js`.
- Из **tools/converter/logic/*.js** в converters: `../converters/...`.

Граф по файлам: **docs/DEPENDENCY_MAP.md**.

### Тесты

- **tests/test.html** — браузерная страница (235+ тестов, 5 вкладок)
- **tests/run-tests.mjs** — единый скрипт запуска
- **tests/p0-logic-test.mjs** — тесты логики конвертера (137 тестов)
- **tests/converter-reference-test.mjs** — референсные тесты
- **tests/visualizer-test.mjs**, **tests/case-test.mjs**, **tests/tester-test.mjs** — тесты инструментов

---

## Навигация по документации (docs/)

**С чего начать:** STRUCTURE.md (этот файл), PROJECT_PRINCIPLES.md, DEPENDENCY_MAP.md.

**По инструментам:** docs/converter/, docs/visualizer/, docs/case/, docs/tester/.

**Эталон примеров regex:** USER_REGEX_EXAMPLES_REFERENCE.md.

---

## Удалённые файлы (аудит 2026-02-21)

Следующие файлы удалены после перехода на linkedBuilder:
- `tools/converter/ui/groupManager.js`
- `tools/converter/ui/triggerManager.js`
- `tools/converter/ui/dragDrop.js`
- `tools/converter/ui/distanceDropdown.js`
- `tools/converter/logic/linkedConverter.js`
- `tools/converter/converters/prefix.js`
- `archive/` (вся папка)
- `temp/` (вся папка)

---

## Принципы разработки

- **docs/PROJECT_PRINCIPLES.md** — полный текст принципов.
- Каждый инструмент — отдельная папка в **tools/**. Модули других инструментов **не трогаем**.

---

Эта структура зафиксирована после аудита 2026-02-22. Изменения отражать в **docs/DEPENDENCY_MAP.md**.
