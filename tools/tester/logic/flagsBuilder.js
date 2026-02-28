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
  const state = flagsState && typeof flagsState === 'object' ? flagsState : {};
  const parts = [];
  if (state.g) parts.push('g');
  if (state.i) parts.push('i');
  if (state.m) parts.push('m');
  if (state.s) parts.push('s');
  // u добавляется только если не включён a и пользователь включил чекбокс unicode (по умолчанию чекбокс включён).
  if (!state.a && state.u) parts.push('u');
  return parts.join('');
}
