import type { ReactNode } from "react";

/**
 * Pins a cell to the left edge of its scrolling table. Deliberately carries
 * no background color -- a sticky cell must be opaque or the columns
 * scrolling underneath bleed through, but the right color (plain white on a
 * Card, or a row's own highlight tint) differs per table, so callers always
 * pass it via `className`.
 */
const STICKY = "sticky left-0 shadow-[2px_0_4px_-2px_rgba(15,23,42,0.12)]";

/**
Scrolling table shell. `minWidthClassName` forces the table wider than its
container so narrow viewports scroll instead of squeezing. `scroll` picks
the wrapper's overflow -- "x" (the default) for a plain horizontal scroll,
"both" for a table that also clips vertically (pair with a `max-h-*` in
`className`). Kept as a prop rather than folded into `className` so the two
never collide: `overflow-x-auto` and `overflow-auto` both set `overflow-x`,
and which one wins when both classes are present depends on Tailwind's
generated stylesheet order, not on the order they're written here.
*/
export function Table({
  minWidthClassName,
  scroll = "x",
  className = "",
  children,
}: {
  minWidthClassName: string;
  scroll?: "x" | "both";
  className?: string;
  children: ReactNode;
}) {
  const overflow = scroll === "both" ? "overflow-auto" : "overflow-x-auto";
  return (
    <div className={`${overflow} ${className}`}>
      <table className={`w-full text-sm ${minWidthClassName}`}>
        {children}
      </table>
    </div>
  );
}

export function Th({
  sticky,
  align = "left",
  className = "",
  children,
}: {
  sticky?: boolean;
  align?: "left" | "right";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <th
      className={[
        "text-xs font-semibold uppercase tracking-wider text-slate-500",
        align === "right" ? "text-right" : "text-left",
        sticky ? `${STICKY} z-20` : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </th>
  );
}

export function Td({
  sticky,
  align = "left",
  className = "",
  children,
}: {
  sticky?: boolean;
  align?: "left" | "right";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <td
      className={[
        align === "right" ? "text-right" : "text-left",
        sticky ? `${STICKY} z-10` : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </td>
  );
}
