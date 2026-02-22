/**
 * Конвертер regex AST (regexpp) в railroad-диаграммы.
 * Референс: regexper.com
 * @file logic/regexToRailroad.js
 */

/**
 * Конвертирует regexpp AST в railroad components (Sequence, Choice, Terminal, etc.).
 * Использует глобальный railroad (railroad-diagrams UMD).
 * @param {object} ast - результат parseRegExpLiteral (RegExpLiteral с pattern)
 * @returns {object} railroad Diagram
 */
export function astToRailroad(ast) {
  const rd = window.railroad || window;
  const Diagram = rd.Diagram || rd.default?.Diagram || window.Diagram;
  const Sequence = rd.Sequence || rd.default?.Sequence || window.Sequence;
  const Choice = rd.Choice || rd.default?.Choice || window.Choice;
  const Optional = rd.Optional || rd.default?.Optional || window.Optional;
  const OneOrMore = rd.OneOrMore || rd.default?.OneOrMore || window.OneOrMore;
  const ZeroOrMore = rd.ZeroOrMore || rd.default?.ZeroOrMore || window.ZeroOrMore;
  const Terminal = rd.Terminal || rd.default?.Terminal || window.Terminal;
  const NonTerminal = rd.NonTerminal || rd.default?.NonTerminal || window.NonTerminal;
  const Skip = rd.Skip || rd.default?.Skip || window.Skip;

  function escapeChar(code) {
    if (code === 0x0A) return '\\n';
    if (code === 0x0D) return '\\r';
    if (code === 0x09) return '\\t';
    if (code === 0x0B) return '\\v';
    if (code === 0x0C) return '\\f';
    if (code === 0x08) return '\\b';
    if (code < 32 || (code >= 127 && code < 256)) return '\\x' + code.toString(16).padStart(2, '0');
    const ch = String.fromCodePoint(code);
    if (/[\[\]\\^$.|?*+(){}]/.test(ch)) return '\\' + ch;
    return ch;
  }

  function convertElement(el) {
    if (!el) return NonTerminal('ε');
    switch (el.type) {
      case 'Character':
        return Terminal('"' + escapeChar(el.value) + '"');
      case 'CharacterSet':
        return NonTerminal(el.raw || (el.kind || 'character set'));
      case 'CharacterClass':
        return NonTerminal(el.raw || '[character class]');
      case 'CharacterClassRange':
        return NonTerminal(escapeChar(el.min.value) + '-' + escapeChar(el.max.value));
      case 'Group':
        return convertPattern({ alternatives: el.alternatives });
      case 'CapturingGroup':
        return convertPattern({ alternatives: el.alternatives });
      case 'Quantifier':
        const innerComp = convertElement(el.element);
        if (el.min === 0 && el.max === 1) return Optional(innerComp);
        if (el.min === 0 && el.max === Infinity) return ZeroOrMore(innerComp);
        if (el.min === 1 && el.max === Infinity) return OneOrMore(innerComp);
        return NonTerminal('{' + el.min + ',' + (el.max === Infinity ? '' : el.max) + '}' + (el.greedy ? '' : '?'));
      case 'LookaheadAssertion':
      case 'LookbehindAssertion':
        return NonTerminal(el.negate ? 'negative ' + el.type.replace('Assertion', '') : el.type.replace('Assertion', ''));
      case 'BoundaryAssertion':
        return NonTerminal(el.kind || el.raw || 'boundary');
      case 'Backreference':
        return NonTerminal('backref ' + (el.ref || el.raw));
      default:
        return NonTerminal(el.raw || el.type || '?');
    }
  }

  function convertAlternative(alt) {
    if (!alt.elements || alt.elements.length === 0) return Skip ? Skip() : NonTerminal('ε');
    if (alt.elements.length === 1) return convertElement(alt.elements[0]);
    return Sequence(...alt.elements.map(convertElement));
  }

  function convertPattern(node) {
    const alts = node.alternatives || [];
    if (alts.length === 0) return Skip ? Skip() : NonTerminal('ε');
    const converted = alts.map(a => convertAlternative(a));
    if (converted.length === 1) return converted[0];
    return Choice(...converted);
  }

  const pattern = ast.pattern || ast;
  const body = convertPattern(pattern);
  if (!Diagram || typeof Diagram !== 'function') {
    throw new Error('railroad-diagrams не загружена');
  }
  return Diagram(body);
}
