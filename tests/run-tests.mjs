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
  'tests/case-test.mjs',
  'tests/tester-test.mjs'
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
  const doBrowser = args.includes('--browser') || args.includes('--browser-converter') || args.includes('--browser-visualizer') || args.includes('--browser-case');
  const browserWhich = args.includes('--browser-visualizer') ? 'visualizer'
    : args.includes('--browser-converter') ? 'converter'
    : args.includes('--browser-case') ? 'case'
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
