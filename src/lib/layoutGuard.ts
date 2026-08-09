/**
 * A guard against one specific layout bug that has bitten this app more than
 * once, and that nothing else catches.
 *
 * An absolutely positioned element with no `left` / `right` / `inset` falls
 * back to its *static position*, which inherits `text-align` from an ancestor.
 * Inside a right-aligned container it therefore anchors to the RIGHT edge, and
 * any `translate-x` then pushes it further right — off its parent and on top of
 * whatever sits beside it. That is exactly how the toggle knob ended up
 * overlapping its own label.
 *
 * It type-checks. It lints. It only shows up when you look at the screen. So
 * this is checked at the source level instead.
 *
 * The detection lives here, apart from the test that feeds it real files, so
 * the logic itself can be tested against known-good and known-bad snippets.
 */

export interface LayoutOffence {
  line: number;
  text: string;
}

/**
Tailwind utilities (and raw CSS) that pin an element horizontally.
*/
const HORIZONTAL_ANCHOR =
  /\b(?:left|right|inset|start|end)-|\b(?:left|right|inset)\s*:/;

/**
`absolute` as a Tailwind class, not the word inside prose or an identifier.
*/
const ABSOLUTE_CLASS = /(?:^|['"`\s{])absolute(?:['"`\s}]|$)/;

/**
Lines that are clearly comments rather than markup.
*/
function isComment(line: string): boolean {
  const t = line.trim();
  return (
    t.startsWith("//") ||
    t.startsWith("*") ||
    t.startsWith("/*") ||
    t.startsWith("{/*")
  );
}

/**
 * How many following lines to consider part of the same class expression.
 *
 * The formatter wraps long template literals, so an anchor chosen by a ternary
 * routinely lands a line or two below the `absolute` that it belongs to:
 *
 *     className={`... absolute top-1/2 ... ${
 *       variant === 'inline' ? 'left-2' : 'left-3'
 *     }`}
 *
 * A strict line-by-line check flags that as an offence, which it is not. Three
 * lines is enough for every wrapping style in this codebase. The trade-off is
 * that an unrelated `left-` immediately below could mask a genuine offence --
 * acceptable for a heuristic whose job is to catch an obvious, repeated mistake.
 */
const LOOKAHEAD_LINES = 3;

/**
 * Find every place that applies `absolute` without also pinning the element
 * horizontally.
 */
export function findUnanchoredAbsolutes(
  source: string,
  lookahead = LOOKAHEAD_LINES,
): LayoutOffence[] {
  const lines = source.split("\n");

  return lines
    .map((text, index) => ({ line: index + 1, text, index: index }))
    .filter(({ text }) => ABSOLUTE_CLASS.test(text) && !isComment(text))
    .filter(({ index }) => {
      // Look at the declaration and the lines the formatter may have wrapped
      // it onto.
      const window = lines.slice(index, index + 1 + lookahead).join("\n");
      return !HORIZONTAL_ANCHOR.test(window);
    })
    .map(({ line, text }) => ({ line, text }));
}
