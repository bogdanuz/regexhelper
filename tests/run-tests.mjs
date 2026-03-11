#!/usr/bin/env node
/**
 * Единый запуск тестов: Node и/или браузер (Playwright).
 * Использование (из корня репозитория):
 *   node tests/run-tests.mjs              — только Node
 *   node tests/run-tests.mjs --browser     — только браузер
 *   node tests/run-tests.mjs --browser-converter | --browser-visualizer | --browser-case | --browser-tester
 *   node tests/run-tests.mjs --node --browser — Node, затем браузер
 * Требуется для браузера: npm install && npx playwright install chromium
 */

import { spawn } from 'child_process';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const NODE_TESTS = [
  'tests/p0-logic-test.mjs',
  'tests/converter-reference-test.mjs',
  'tests/visualizer-test.mjs',
  'tests/texthelper-test.mjs',
  'tests/tester-test.mjs',
  'tests/editor-test.mjs'
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function runNode(script) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [script], { cwd: ROOT, stdio: 'inherit', shell: true });
    proc.on('close', code => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
    proc.on('error', reject);
  });
}

function staticServer(req, res) {
  const urlPath = req.url === '/' ? '/tests/test.html' : req.url.replace(/^\//, '').split('?')[0];
  const path = join(ROOT, urlPath);
  if (!path.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  if (!existsSync(path)) {
    res.writeHead(404).end();
    return;
  }
  try {
    const data = readFileSync(path);
    const mime = MIME[extname(path)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime }).end(data);
  } catch (e) {
    res.writeHead(500).end(String(e.message));
  }
}

async function runBrowserTests(which) {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch (e) {
    console.error('Установите Playwright: npm install && npx playwright install chromium');
    process.exit(2);
  }
  const { chromium } = playwright;
  const server = createServer(staticServer);
  server.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let anyFailed = false;

  try {
    await page.goto(`${base}/tests/test.html`, { waitUntil: 'networkidle' });

    if (which === 'converter' || which === 'all') {
      await page.click('button[data-panel="panel-converter"]');
      await page.waitForSelector('#panel-converter', { state: 'visible' });
      await page.waitForTimeout(300);
      await page.click('#run-btn-converter');
      await page.waitForFunction(
        () => document.getElementById('stat-total')?.textContent !== undefined && document.getElementById('stat-total')?.textContent !== '0',
        { timeout: 120000 }
      );
      await page.waitForTimeout(500);
      const failed = await page.textContent('#stat-failed');
      const total = await page.textContent('#stat-total');
      const passed = await page.textContent('#stat-passed');
      if (failed !== '0') {
        console.error('\n--- Converter browser tests: FAILED ---');
        console.error(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
        const output = await page.textContent('#test-output');
        if (output) console.error(output.slice(0, 4000));
        anyFailed = true;
      } else {
        console.log(`Converter browser: ${passed}/${total} passed.`);
      }
    }

    if (which === 'visualizer' || which === 'all') {
      await page.click('button[data-panel="panel-visualizer"]');
      await page.waitForSelector('#panel-visualizer', { state: 'visible' });
      await page.waitForTimeout(300);
      await page.waitForFunction(
        () => {
          const iframe = document.getElementById('visualizer-app-iframe');
          return iframe && iframe.contentDocument && iframe.contentDocument.getElementById('regexp-input');
        },
        { timeout: 15000 }
      ).catch(() => null);
      await page.waitForTimeout(500);
      await page.click('#run-btn-visualizer');
      await page.waitForFunction(
        () => document.getElementById('stat-total-vis')?.textContent !== undefined && document.getElementById('stat-total-vis')?.textContent !== '0',
        { timeout: 90000 }
      );
      await page.waitForTimeout(500);
      const failed = await page.textContent('#stat-failed-vis');
      const total = await page.textContent('#stat-total-vis');
      const passed = await page.textContent('#stat-passed-vis');
      if (failed !== '0') {
        console.error('\n--- Visualizer browser tests: FAILED ---');
        console.error(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
        const output = await page.textContent('#test-output-visualizer');
        if (output) console.error(output.slice(0, 3000));
        anyFailed = true;
      } else {
        console.log(`Visualizer browser: ${passed}/${total} passed.`);
      }
    }

    if (which === 'case' || which === 'all') {
      await page.click('button[data-panel="panel-case"]');
      await page.waitForSelector('#panel-case', { state: 'visible' });
      await page.waitForTimeout(300);
      await page.click('#run-btn-case');
      await page.waitForFunction(
        () => document.getElementById('stat-total-case')?.textContent !== undefined && document.getElementById('stat-total-case')?.textContent !== '0',
        { timeout: 30000 }
      );
      await page.waitForTimeout(500);
      const failed = await page.textContent('#stat-failed-case');
      const total = await page.textContent('#stat-total-case');
      const passed = await page.textContent('#stat-passed-case');
      if (failed !== '0') {
        console.error('\n--- Регистр browser tests: FAILED ---');
        console.error(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
        const output = await page.textContent('#test-output-case');
        if (output) console.error(output.slice(0, 3000));
        anyFailed = true;
      } else {
        console.log(`Регистр browser: ${passed}/${total} passed.`);
      }
    }

    if (which === 'tester' || which === 'all') {
      await page.click('button[data-panel="panel-tester"]');
      await page.waitForSelector('#panel-tester', { state: 'visible' });
      await page.waitForTimeout(300);
      await page.click('#run-btn-tester');
      await page.waitForFunction(
        () => document.getElementById('stat-total-tester')?.textContent !== undefined && document.getElementById('stat-total-tester')?.textContent !== '0',
        { timeout: 60000 }
      );
      await page.waitForTimeout(500);
      const failed = await page.textContent('#stat-failed-tester');
      const total = await page.textContent('#stat-total-tester');
      const passed = await page.textContent('#stat-passed-tester');
      if (failed !== '0') {
        console.error('\n--- Тестер browser tests: FAILED ---');
        console.error(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
        const output = await page.textContent('#test-output-tester');
        if (output) console.error(output.slice(0, 3000));
        anyFailed = true;
      } else {
        console.log(`Тестер browser: ${passed}/${total} passed.`);
      }

      // Дополнительные UI-тесты: панель тестера (статистика выделения, панель параметров, инверсия)
      const testerPage = await browser.newPage();
      try {
        await testerPage.goto(`${base}/index.html#tester`, { waitUntil: 'networkidle' });
        await testerPage.waitForSelector('#tester-test-input');
        await testerPage.waitForSelector('#tester-selection-stats', { state: 'attached' });

        // Заполняем тестовый текст и выделяем всё содержимое
        await testerPage.evaluate(() => {
          const ta = document.getElementById('tester-test-input');
          if (!ta) return;
          ta.value = 'ab c\nd ';
          ta.focus();
          ta.setSelectionRange(0, ta.value.length);
          ta.dispatchEvent(new Event('select', { bubbles: true }));
        });
        await testerPage.waitForTimeout(150);

        const statsState = await testerPage.$eval('#tester-selection-stats', (el) => ({
          hidden: el.hidden,
          text: el.textContent.trim(),
        }));

        const expected =
          'Символов всего: 7 • Без пробелов: 5 • Пробелов: 2';

        if (statsState.hidden) {
          console.error('Tester UI: selection stats should be visible when text is selected');
          anyFailed = true;
        } else if (statsState.text !== expected) {
          console.error(
            'Tester UI: selection stats text mismatch',
            '\n  actual:   ',
            statsState.text,
            '\n  expected: ',
            expected
          );
          anyFailed = true;
        } else {
          console.log('Tester UI: selection stats visible and text OK');
        }

        // При потере фокуса (уход с поля тестового текста) панель должна скрываться
        await testerPage.evaluate(() => {
          const regexInput = document.getElementById('tester-regex-input');
          if (regexInput) regexInput.focus();
        });
        await testerPage.waitForTimeout(150);

        const hiddenAfterBlur = await testerPage.$eval(
          '#tester-selection-stats',
          (el) => el.hidden
        );
        if (!hiddenAfterBlur) {
          console.error('Tester UI: selection stats should be hidden after blur');
          anyFailed = true;
        } else {
          console.log('Tester UI: selection stats hides on blur OK');
        }

        // Панель параметров тестера: вставка параметра (\w) в поле TRUE
        await testerPage.evaluate(() => {
          const trueInput = document.getElementById('tester-regex-input');
          if (trueInput) {
            trueInput.value = 'abc';
            trueInput.focus();
            trueInput.setSelectionRange(trueInput.value.length, trueInput.value.length);
          }
        });
        await testerPage.waitForTimeout(100);
        const hasTesterParamBtn = await testerPage.$('.tester-editor-param-btn[data-insert="\\\\w"]');
        if (!hasTesterParamBtn) {
          console.error('Tester UI: param button (\\w) for TRUE/FALSE not found');
          anyFailed = true;
        } else {
          await testerPage.click('.tester-editor-param-btn[data-insert="\\\\w"]');
          await testerPage.waitForTimeout(100);
          const trueAfterInsert = await testerPage.$eval('#tester-regex-input', (el) => el.value);
          if (!trueAfterInsert.endsWith('abc\\w')) {
            console.error('Tester UI: param insert into TRUE failed, value=', trueAfterInsert);
            anyFailed = true;
          } else {
            console.log('Tester UI: param insert into TRUE OK');
          }
        }

        // Панель параметров тестера: вставка параметра (\b) в поле FALSE
        await testerPage.evaluate(() => {
          const falseInput = document.getElementById('tester-regex-false-input');
          if (falseInput) {
            falseInput.value = 'x';
            falseInput.focus();
            falseInput.setSelectionRange(falseInput.value.length, falseInput.value.length);
          }
        });
        await testerPage.waitForTimeout(100);
        const hasFalseParamBtn = await testerPage.$('.tester-editor-param-btn[data-insert="\\\\b"]');
        if (!hasFalseParamBtn) {
          console.error('Tester UI: param button (\\b) not found for FALSE');
          anyFailed = true;
        } else {
          await testerPage.click('.tester-editor-param-btn[data-insert="\\\\b"]');
          await testerPage.waitForTimeout(100);
          const falseAfterInsert = await testerPage.$eval('#tester-regex-false-input', (el) => el.value);
          if (!falseAfterInsert.endsWith('x\\b')) {
            console.error('Tester UI: param insert into FALSE failed, value=', falseAfterInsert);
            anyFailed = true;
          } else {
            console.log('Tester UI: param insert into FALSE OK');
          }
        }

        // Инверсия выделенного: кнопка скрыта без выделения и появляется при выделении
        const hasInvertBtnTester = await testerPage.$('#tester-invert-selection-btn');
        if (!hasInvertBtnTester) {
          console.error('Tester UI: #tester-invert-selection-btn not found');
          anyFailed = true;
        } else {
          const hiddenNoSelection = await testerPage.$eval(
            '#tester-invert-selection-btn',
            (el) => el.style.display === 'none',
          );
          if (!hiddenNoSelection) {
            console.error('Tester UI: invert button should be hidden when no selection');
            anyFailed = true;
          } else {
            console.log('Tester UI: invert button hidden without selection OK');
          }

          // Выделяем TRUE, проверяем появление кнопки и инверсию
          await testerPage.evaluate(() => {
            const ta = document.getElementById('tester-regex-input');
            if (!ta) return;
            ta.value = 'a|b';
            ta.focus();
            ta.setSelectionRange(0, ta.value.length);
            ta.dispatchEvent(new Event('select', { bubbles: true }));
          });
          await testerPage.waitForTimeout(120);
          const visibleWithSelectionTrue = await testerPage.$eval(
            '#tester-invert-selection-btn',
            (el) => el.style.display !== 'none',
          );
          if (!visibleWithSelectionTrue) {
            console.error('Tester UI: invert button should be visible when TRUE selection exists');
            anyFailed = true;
          } else {
            console.log('Tester UI: invert button visible with TRUE selection OK');
          }

          await testerPage.click('#tester-invert-selection-btn');
          await testerPage.waitForTimeout(150);
          const trueAfterInvert = await testerPage.$eval('#tester-regex-input', (el) => el.value);
          if (trueAfterInvert !== 'a|b|b|a') {
            console.error('Tester UI: invert selection for TRUE failed, value=', trueAfterInvert);
            anyFailed = true;
          } else {
            console.log('Tester UI: invert selection for TRUE OK (a|b -> a|b|b|a)');
          }

          // Теперь выделяем FALSE и убеждаемся, что инверсия применяется к FALSE
          await testerPage.evaluate(() => {
            const ta = document.getElementById('tester-regex-false-input');
            if (!ta) return;
            ta.value = 'x|y';
            ta.focus();
            ta.setSelectionRange(0, ta.value.length);
            ta.dispatchEvent(new Event('select', { bubbles: true }));
          });
          await testerPage.waitForTimeout(120);
          const visibleWithSelectionFalse = await testerPage.$eval(
            '#tester-invert-selection-btn',
            (el) => el.style.display !== 'none',
          );
          if (!visibleWithSelectionFalse) {
            console.error('Tester UI: invert button should be visible when FALSE selection exists');
            anyFailed = true;
          } else {
            console.log('Tester UI: invert button visible with FALSE selection OK');
          }

          await testerPage.click('#tester-invert-selection-btn');
          await testerPage.waitForTimeout(150);
          const falseAfterInvert = await testerPage.$eval('#tester-regex-false-input', (el) => el.value);
          if (falseAfterInvert !== 'x|y|y|x') {
            console.error('Tester UI: invert selection for FALSE failed, value=', falseAfterInvert);
            anyFailed = true;
          } else {
            console.log('Tester UI: invert selection for FALSE OK (x|y -> x|y|y|x)');
          }
        }
      } catch (e) {
        console.error('Tester UI: exception during selection stats test:', e);
        anyFailed = true;
      } finally {
        await testerPage.close();
      }
    }

    if (which === 'editor' || which === 'all') {
      const editorPage = await browser.newPage();
      try {
        await editorPage.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
        await editorPage.waitForSelector('#editor-textarea');

        // Для проверки кнопки «В редактор» переключаемся в режим триггеров, чтобы панель результата была видна
        await editorPage.evaluate(() => {
          if (typeof window.__regexhelper_setConstructorMode === 'function') {
            window.__regexhelper_setConstructorMode('linked', false);
          }
        });
        await editorPage.waitForTimeout(200);

        // Проверка: кнопка «В редактор» переносит результат
        await editorPage.evaluate(() => {
          const ta = document.getElementById('result-textarea');
          if (ta) ta.value = 'abc123';
        });
        await editorPage.click('#to-editor-btn');
        await editorPage.waitForTimeout(200);
        const editorValue = await editorPage.$eval('#editor-textarea', el => el.value);
        if (editorValue !== 'abc123') {
          console.error('Editor browser tests: sendToEditor failed, value=', editorValue);
          anyFailed = true;
        } else {
          console.log('Editor browser: sendToEditor OK');
        }

        // При отправке в редактор активируется таб «Ручной редактор», а панель триггеров скрывается
        const activeTabText = await editorPage.$eval('.constructor-tab.constructor-tab-active', (el) => el.textContent.trim());
        const triggersVisible = await editorPage.$eval('#triggers-panel', (el) => getComputedStyle(el).display !== 'none');
        if (activeTabText !== 'Ручной редактор' || triggersVisible) {
          console.error('Editor browser tests: constructor mode/tab after sendToEditor invalid', { activeTabText, triggersVisible });
          anyFailed = true;
        } else {
          console.log('Editor browser: constructor tab & visibility after sendToEditor OK');
        }

        // Проверка: вставка параметра (\w) в позицию курсора
        await editorPage.click('#editor-textarea');
        await editorPage.keyboard.type('test');
        await editorPage.click('button.editor-param-btn[data-insert="\\\\w"]');
        const editorValue2 = await editorPage.$eval('#editor-textarea', el => el.value);
        if (!editorValue2.endsWith('test\\w')) {
          console.error('Editor browser tests: param insert failed, value=', editorValue2);
          anyFailed = true;
        } else {
          console.log('Editor browser: param insert OK');
        }

        // Проверка: подсветка синтаксической ошибки и её снятие
        await editorPage.$eval('#editor-textarea', el => { el.value = '('; });
        await editorPage.click('#editor-check-btn');
        await editorPage.waitForTimeout(300);
        const hasErrorClass = await editorPage.$eval('#editor-validation', el => el.classList.contains('validation-error'));
        const highlightHtml = await editorPage.$eval('#editor-highlight-layer', el => el.innerHTML);
        if (!hasErrorClass || !highlightHtml || !highlightHtml.includes('import-highlight-error')) {
          console.error('Editor browser tests: validation highlight failed');
          anyFailed = true;
        } else {
          console.log('Editor browser: validation highlight OK');
        }
        await editorPage.click('#editor-check-btn');
        await editorPage.waitForTimeout(200);
        const highlightAfterOff = await editorPage.$eval('#editor-highlight-layer', el => el.innerHTML);
        if (highlightAfterOff && highlightAfterOff.trim().length > 0) {
          console.error('Editor browser tests: validation toggle off failed');
          anyFailed = true;
        } else {
          console.log('Editor browser: validation toggle off OK');
        }

        // Сохранить в историю из редактора (type manual)
        await editorPage.$eval('#editor-textarea', el => { el.value = 'saved-regex-from-editor'; });
        await editorPage.click('#editor-save-to-history-btn');
        await editorPage.waitForTimeout(300);
        const historyAfterSave = await editorPage.evaluate(async () => {
          const { getHistory } = await import('./shared/utils/storage.js');
          const h = getHistory();
          const first = h[0];
          return first ? { type: first.type, result: first.result } : null;
        });
        if (!historyAfterSave || historyAfterSave.type !== 'manual' || historyAfterSave.result !== 'saved-regex-from-editor') {
          console.error('Editor browser tests: save to history (manual) failed', historyAfterSave);
          anyFailed = true;
        } else {
          console.log('Editor browser: save to history (manual) OK');
        }

        // «В редактор» с карточки истории полностью заменяет содержимое
        await editorPage.$eval('#editor-textarea', el => { el.value = 'old-content'; });
        await editorPage.evaluate(async () => {
          const { saveToHistory, clearHistory } = await import('./shared/utils/storage.js');
          const { displayHistory } = await import('./tools/converter/ui/historyUI.js');
          clearHistory();
          saveToHistory({
            id: 'br-to-editor',
            date: new Date().toISOString(),
            triggers: [],
            params: {},
            result: 'new-from-history',
            type: 'manual'
          });
          displayHistory();
        });
        await editorPage.waitForTimeout(200);
        const toEditorBtn = await editorPage.$('.history-card [data-action="to-editor"]');
        if (toEditorBtn) {
          await toEditorBtn.click();
          await editorPage.waitForTimeout(300);
          const editorAfter = await editorPage.$eval('#editor-textarea', el => el.value);
          if (editorAfter !== 'new-from-history') {
            console.error('Editor browser tests: to-editor from history replace failed, value=', editorAfter);
            anyFailed = true;
          } else {
            console.log('Editor browser: to-editor from history (replace) OK');
          }
        } else {
          console.error('Editor browser tests: no history card to-editor button found');
          anyFailed = true;
        }

        // Кнопка «Инвертировать выделенное»: скрыта без выделения, по клику добавляет обратный вариант в конец
        const invertBtn = await editorPage.$('#editor-invert-selection-btn');
        if (!invertBtn) {
          console.error('Editor browser tests: #editor-invert-selection-btn not found');
          anyFailed = true;
        } else {
          await editorPage.evaluate(() => {
            const ta = document.getElementById('editor-textarea');
            ta.value = '';
            ta.focus();
            ta.setSelectionRange(0, 0);
            ta.dispatchEvent(new Event('select', { bubbles: true }));
          });
          await editorPage.waitForTimeout(50);
          const hiddenWhenEmpty = await editorPage.$eval('#editor-invert-selection-btn', (el) => el.style.display === 'none');
          if (!hiddenWhenEmpty) {
            console.error('Editor browser tests: invert button should be hidden when no selection');
            anyFailed = true;
          } else {
            console.log('Editor browser: invert button hidden when no selection OK');
          }

          await editorPage.evaluate(() => {
            const ta = document.getElementById('editor-textarea');
            ta.value = 'a|b';
            ta.focus();
            ta.setSelectionRange(0, 3);
            ta.dispatchEvent(new Event('select', { bubbles: true }));
          });
          await editorPage.waitForTimeout(100);
          const visibleWithSelection = await editorPage.$eval('#editor-invert-selection-btn', (el) => el.style.display !== 'none');
          if (!visibleWithSelection) {
            console.error('Editor browser tests: invert button should be visible when text selected');
            anyFailed = true;
          } else {
            console.log('Editor browser: invert button visible when selection OK');
          }

          await editorPage.click('#editor-invert-selection-btn');
          await editorPage.waitForTimeout(200);
          const valueAfterInvert = await editorPage.$eval('#editor-textarea', (el) => el.value);
          if (valueAfterInvert !== 'a|b|b|a') {
            console.error('Editor browser tests: invert selection failed, value=', valueAfterInvert);
            anyFailed = true;
          } else {
            console.log('Editor browser: invert selection append OK (a|b -> a|b|b|a)');
          }

          // Ручной редактор: инверт без автозамен — не добавляет [ьъ] к «пульт»
          await editorPage.evaluate(() => {
            const ta = document.getElementById('editor-textarea');
            ta.value = 'пульт.{0,10}сч[её]тчик';
            ta.focus();
            ta.setSelectionRange(0, ta.value.length);
            ta.dispatchEvent(new Event('select', { bubbles: true }));
          });
          await editorPage.waitForTimeout(100);
          await editorPage.click('#editor-invert-selection-btn');
          await editorPage.waitForTimeout(200);
          const valueRawInvert = await editorPage.$eval('#editor-textarea', (el) => el.value);
          const expectedRaw = 'пульт.{0,10}сч[её]тчик|сч[её]тчик.{0,10}пульт';
          if (valueRawInvert !== expectedRaw) {
            console.error('Editor browser tests: raw invert failed, value=', valueRawInvert, 'expected', expectedRaw);
            anyFailed = true;
          } else if (valueRawInvert.includes('пул[ьъ]т')) {
            console.error('Editor browser tests: raw invert must not add [ьъ] to пульт');
            anyFailed = true;
          } else {
            console.log('Editor browser: raw invert (no auto-replace) OK');
          }
        }

        // Кнопка «Жёсткая перезагрузка» использует forceReload (без навигации в тестах)
        await editorPage.evaluate(() => {
          window.__REGEXHELPER_FORCE_RELOAD_TEST_ONLY__ = true;
          window.__REGEXHELPER_FORCE_RELOAD_CALLED__ = false;
        });
        const hardReloadExists = await editorPage.$('#hard-reload-btn');
        if (!hardReloadExists) {
          console.error('Header tests: #hard-reload-btn not found');
          anyFailed = true;
        } else {
          await editorPage.evaluate(() => document.getElementById('hard-reload-btn').click());
          await editorPage.waitForTimeout(200);
          const called = await editorPage.evaluate(() => !!window.__REGEXHELPER_FORCE_RELOAD_CALLED__);
          if (!called) {
            console.error('Header tests: hard reload button did not trigger forceReload (test flag)');
            anyFailed = true;
          } else {
            console.log('Header tests: hard reload button wired to forceReload OK');
          }
        }

        // Уведомление об обновлении: кнопка «Обновить» также использует forceReload
        await editorPage.evaluate(() => {
          window.__REGEXHELPER_FORCE_RELOAD_TEST_ONLY__ = true;
          window.__REGEXHELPER_FORCE_RELOAD_CALLED__ = false;
        });
        await editorPage.evaluate(async () => {
          const { showUpdateAvailable } = await import('./shared/ui/notifications.js');
          showUpdateAvailable();
        });
        await editorPage.waitForSelector('.notification-update [data-action="refresh"]', { timeout: 5000 });
        await editorPage.click('.notification-update [data-action="refresh"]');
        await editorPage.waitForTimeout(200);
        const calledFromToast = await editorPage.evaluate(() => !!window.__REGEXHELPER_FORCE_RELOAD_CALLED__);
        if (!calledFromToast) {
          console.error('Header tests: update toast refresh did not trigger forceReload (test flag)');
          anyFailed = true;
        } else {
          console.log('Header tests: update toast refresh wired to forceReload OK');
        }

        // Визуализатор: отправка результата из панели «Результат» в новую вкладку визуализатора
        // Сначала убеждаемся, что активен режим триггеров, чтобы панель результата была видна
        await editorPage.evaluate(() => {
          if (typeof window.__regexhelper_setConstructorMode === 'function') {
            window.__regexhelper_setConstructorMode('linked', false);
          }
          const ta = document.getElementById('result-textarea');
          if (ta) ta.value = '(a|b)+';
        });
        await editorPage.waitForTimeout(200);
        await editorPage.click('#to-visualizer-btn');
        await editorPage.waitForTimeout(300);
        const visInputValue = await editorPage.$eval('#regexp-input', (el) => el.value);
        const visTabsInfo = await editorPage.$eval('#visualizer-tabs', (el) => {
          const tabs = el.querySelectorAll('.visualizer-tab');
          return {
            count: tabs.length,
            firstTitle: tabs[0]?.textContent?.trim() || '',
          };
        });
        if (visInputValue !== '(a|b)+') {
          console.error('Visualizer browser tests: to-visualizer from result did not set input, value=', visInputValue);
          anyFailed = true;
        } else if (!visTabsInfo || visTabsInfo.count < 1) {
          console.error('Visualizer browser tests: no visualizer tabs created after to-visualizer');
          anyFailed = true;
        } else {
          console.log('Visualizer browser: to-visualizer creates tab and sets input OK');
        }

        // Визуализатор: отправка из ручного редактора в новую вкладку визуализатора
        await editorPage.evaluate(() => {
          if (typeof window.__regexhelper_setConstructorMode === 'function') {
            window.__regexhelper_setConstructorMode('editor', false);
          }
          const ta = document.getElementById('editor-textarea');
          if (ta) ta.value = 'abc123';
        });
        await editorPage.waitForTimeout(200);
        await editorPage.click('#editor-to-visualizer-btn');
        await editorPage.waitForTimeout(300);
        const visInputAfterEditor = await editorPage.$eval('#regexp-input', (el) => el.value);
        const visTabsCountAfterEditor = await editorPage.$eval('#visualizer-tabs', (el) => el.querySelectorAll('.visualizer-tab').length);
        if (visInputAfterEditor !== 'abc123') {
          console.error('Visualizer browser tests: editor-to-visualizer did not set input, value=', visInputAfterEditor);
          anyFailed = true;
        } else if (visTabsCountAfterEditor < 2) {
          console.warn('Visualizer browser tests: expected at least 2 tabs after two sends, got', visTabsCountAfterEditor);
        } else {
          console.log('Visualizer browser: editor-to-visualizer creates additional tab OK');
        }

        // Вкладки визуализатора: кнопка «Новая диаграмма» создаёт пустую вкладку
        const tabsMetaBefore = await editorPage.$eval('#visualizer-tabs', (el) => el.querySelectorAll('.visualizer-tab').length);
        await editorPage.click('#visualizer-tab-add-btn');
        await editorPage.waitForTimeout(150);
        const tabsMetaAfter = await editorPage.$eval('#visualizer-tabs', (el) => el.querySelectorAll('.visualizer-tab').length);
        if (!(tabsMetaAfter > tabsMetaBefore)) {
          console.error('Visualizer browser tests: + Новая диаграмма did not add a tab (before=', tabsMetaBefore, 'after=', tabsMetaAfter, ')');
          anyFailed = true;
        } else {
          console.log('Visualizer browser: + Новая диаграмма adds a tab OK');
        }
      } catch (e) {
        console.error('Editor browser tests exception:', e.message);
        anyFailed = true;
      } finally {
        await editorPage.close();
      }
    }

  } catch (e) {
    console.error('Run error:', e.message);
    anyFailed = true;
  } finally {
    await browser.close();
    server.close();
  }
  return anyFailed;
}

async function main() {
  const args = process.argv.slice(2);
  const doNode = args.length === 0 || args.includes('--node');
  const doBrowser = args.includes('--browser') || args.includes('--browser-converter') || args.includes('--browser-visualizer') || args.includes('--browser-case') || args.includes('--browser-editor');
  const browserWhich = args.includes('--browser-visualizer') ? 'visualizer'
    : args.includes('--browser-converter') ? 'converter'
    : args.includes('--browser-case') ? 'case'
    : args.includes('--browser-editor') ? 'editor'
    : args.includes('--browser-tester') ? 'tester'
    : doBrowser ? 'all' : null;

  let failed = false;

  if (doNode) {
    console.log('\n=== Node tests ===\n');
    for (let i = 0; i < NODE_TESTS.length; i++) {
      const t = NODE_TESTS[i];
      console.log(`[${i + 1}/${NODE_TESTS.length}] ${t}`);
      try {
        await runNode(t);
      } catch (e) {
        failed = true;
        console.error(`\n✗ ${t} failed\n`);
      }
    }
    console.log('\n=== Node done ===\n');
  }

  if (browserWhich) {
    console.log('=== Browser tests ===\n');
    const browserFailed = await runBrowserTests(browserWhich);
    if (browserFailed) failed = true;
    console.log('\n=== Browser done ===\n');
  }

  if (failed) {
    console.log('Some tests failed.');
    process.exit(1);
  }
  console.log('All tests passed.');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
