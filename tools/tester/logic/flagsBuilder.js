/**
 * RegexHelper — Тестер: сборка строки флагов для RegExp (Python emulated)
 * g, i, m, s, u. При ascii (a) не добавляем u. Extended (x) в RegExp не передаётся — обрабатывается препроцессингом.
 * @file tools/tester/logic/flagsBuilder.js
 */

/**
 * Собирает строку флагов для new RegExp(pattern, flags).
 * a (ascii) имеет приоритет над u: при a не передаём u.
 *
 * @param {{ g?: boolean, m?: boolean, i?: boolean, s?: boolean, u?: boolean, x?: boolean, a?: boolean }} flagsState
 * @returns {string} — строка флагов, например "gim" или "gmsu"
 */
export function buildFlagsString(flagsState) {
  const parts = [];
  if (flagsState.g) parts.push('g');
  if (flagsState.i) parts.push('i');
  if (flagsState.m) parts.push('m');
  if (flagsState.s) parts.push('s');
  // u только если не включён a (ascii имеет приоритет)
  if (flagsState.u && !flagsState.a) parts.push('u');
  return parts.join('');
}
