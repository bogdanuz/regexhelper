/**
 * RegexHelper — Тестер: Web Worker для запуска regex (не блокирует UI, можно прервать по таймауту)
 * @file tools/tester/worker/matchWorker.js
 */

import { runMatch } from '../logic/matchRunner.js';

self.onmessage = (e) => {
  const { pattern, flagsState, str } = e.data;
  try {
    const result = runMatch(pattern, flagsState, str);
    self.postMessage(result);
  } catch (err) {
    self.postMessage({ error: String(err.message) });
  }
};
