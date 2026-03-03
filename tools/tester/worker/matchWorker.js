/**
 * RegexHelper — Тестер: Web Worker для запуска regex (не блокирует UI, можно прервать по таймауту)
 * @file tools/tester/worker/matchWorker.js
 */

import { runMatch } from '../logic/matchRunner.js';

self.onmessage = (e) => {
  const { pattern, patternTrue, patternFalse, flagsState, str } = e.data || {};
  const mainPattern = typeof patternTrue === 'string' ? patternTrue : pattern;

  try {
    if (typeof mainPattern !== 'string') {
      self.postMessage({ error: 'Pattern is not a string' });
      return;
    }

    const trueResult = runMatch(mainPattern, flagsState, str);

    if (typeof patternFalse === 'string' && patternFalse.length > 0) {
      const falseResult = runMatch(patternFalse, flagsState, str);
      self.postMessage({ trueResult, falseResult });
      return;
    }

    self.postMessage(trueResult);
  } catch (err) {
    self.postMessage({ error: String(err.message) });
  }
};
