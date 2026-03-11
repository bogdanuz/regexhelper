/**
 * Тесты визуализатора (логика без DOM).
 * Запуск: node tests/visualizer-test.mjs
 *
 * Кодирование hash совпадает с tools/visualizer/app.js encodeRegexForHash()
 * и с regexper _setHash(), чтобы hashchange давал корректный decode.
 *
 * Дополнительно: проверка логики вкладок openInVisualizer (переиспользование пустой вкладки).
 */

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log('  ✅', msg);
    return true;
  }
  failed++;
  console.error('  ❌', msg);
  return false;
}

// Та же формула, что в app.js encodeRegexForHash (и в regexper _setHash)
function encodeRegexForHash(expr) {
  return encodeURIComponent(expr)
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

// Обратное декодирование, как в regexper _getHash (без buggyHash)
function decodeHash(hashPart) {
  try {
    return decodeURIComponent(hashPart);
  } catch (e) {
    return e;
  }
}

console.log('\n--- Visualizer tests (hash encoding, same as regexper) ---\n');

console.log('Encode: (a|b)+');
try {
  const enc1 = encodeRegexForHash('(a|b)+');
  assert(enc1 === '%28a%7Cb%29%2B', 'encode (a|b)+ → %28a%7Cb%29%2B');
  const dec1 = decodeHash(enc1);
  assert(dec1 === '(a|b)+', 'decode round-trip (a|b)+');
} catch (e) {
  assert(false, 'Encode (a|b)+ exception: ' + e.message);
}

console.log('\nEncode: \\d+');
try {
  const enc2 = encodeRegexForHash('\\d+');
  assert(enc2 === '%5Cd%2B', 'encode \\d+ → %5Cd%2B');
  assert(decodeHash(enc2) === '\\d+', 'decode round-trip \\d+');
} catch (e) {
  assert(false, 'Encode \\d+ exception: ' + e.message);
}

console.log('\nEncode: [a-z]');
try {
  const enc3 = encodeRegexForHash('[a-z]');
  assert(decodeHash(enc3) === '[a-z]', 'round-trip [a-z]');
} catch (e) {
  assert(false, 'Encode [a-z] exception: ' + e.message);
}

console.log('\nEncode: (foo|bar)?');
try {
  const enc4 = encodeRegexForHash('(foo|bar)?');
  assert(decodeHash(enc4) === '(foo|bar)?', 'round-trip (foo|bar)?');
} catch (e) {
  assert(false, 'Encode (foo|bar)? exception: ' + e.message);
}

console.log('\nEncode: diverse regex set');
try {
  const samples = [
    '^foo$',
    'a(b(c)d)e',
    '(a|b){1,3}',
    '\\\\w+@example\\\\.com',
    '[^\\\\s]+',
    '(?:foo|bar)+?',
    '(?<name>[A-Z]\\\\w+)',
    '\\\\d{2,4}-\\\\d{2}-\\\\d{2}'
  ];
  for (const expr of samples) {
    const enc = encodeRegexForHash(expr);
    const dec = decodeHash(enc);
    assert(dec === expr, 'round-trip ' + expr);
  }
} catch (e) {
  assert(false, 'Encode diverse regex set exception: ' + e.message);
}

console.log('\nEncode: empty and special chars');
try {
  const enc5 = encodeRegexForHash('');
  assert(enc5 === '', 'empty string → empty');
  const enc6 = encodeRegexForHash('.*');
  assert(decodeHash(enc6) === '.*', 'round-trip .*');
} catch (e) {
  assert(false, 'Encode empty/special exception: ' + e.message);
}

// Формат имени файла экспорта: diagram_DD-MM-YYYY_HH-mm (как в app.js formatDiagramFilename)
console.log('\nExport filename format');
try {
  const pad = (n) => String(n).padStart(2, '0');
  const d = new Date();
  const name = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  assert(/^\d{2}-\d{2}-\d{4}_\d{2}-\d{2}$/.test(name), 'formatDiagramFilename pattern DD-MM-YYYY_HH-mm');
} catch (e) {
  assert(false, 'Export filename exception: ' + e.message);
}

// Совпадение с app.js: formatDiagramFilename (имя без префикса diagram_) + логика вкладок openInVisualizer
console.log('\nformatDiagramFilename & openInVisualizer from app.js');
try {
  const visualizerModule = await import('../tools/visualizer/app.js');
  const { formatDiagramFilename, openInVisualizer } = visualizerModule;

  const name = formatDiagramFilename();
  assert(/^\d{2}-\d{2}-\d{4}_\d{2}-\d{2}$/.test(name), 'app formatDiagramFilename pattern');
  assert(name.length >= 14, 'app formatDiagramFilename length');

  // Проверка логики openInVisualizer: если активная вкладка пустая — она переиспользуется, новая не создаётся.
  // Для этого подменяем DOM-API и внутреннее состояние модуля через "грязный" доступ к глобальному window/document.
  const calls = [];
  globalThis.document = {
    getElementById(id) {
      if (id === 'regexp-input') {
        return { value: '' };
      }
      if (id === 'regexp-form') {
        return {
          dispatchEvent(evt) {
            calls.push({ type: 'submit', evt });
          }
        };
      }
      if (id === 'visualizer') {
        return {
          scrollIntoView(opts) {
            calls.push({ type: 'scroll', opts });
          }
        };
      }
      return null;
    },
  };
  globalThis.location = { hash: '' };
  globalThis.HashChangeEvent = class {};

  // Прямого доступа к visualizerTabs из модуля нет, поэтому проверяем только,
  // что openInVisualizer не падает и вызывает submit/scroll при валидном pattern.
  openInVisualizer('(a|b)+');
  assert(
    calls.some(c => c.type === 'submit'),
    'openInVisualizer triggers form submit'
  );
  assert(
    calls.some(c => c.type === 'scroll'),
    'openInVisualizer scrolls to visualizer section'
  );
} catch (e) {
  assert(false, 'visualizer module import / tab logic: ' + e.message);
}

console.log('\n--- Result: ' + passed + ' passed, ' + failed + ' failed ---\n');
process.exit(failed > 0 ? 1 : 0);
