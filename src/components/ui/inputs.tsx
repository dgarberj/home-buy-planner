import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { money } from "../../lib/format";
import { Label } from "./feedback";

// Mirrors the standard HTML/React `disabled` attribute name used
// throughout this file.
// eslint-disable-next-line unicorn/consistent-boolean-name
function inputClass(disabled?: boolean) {
  return `w-full rounded-lg border px-3 py-2 text-sm tabular-nums outline-none transition ${
    disabled
      ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500"
      : "border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
  }`;
}

/**
 * Browsers park the number spinner inside the field's right edge, on top of the
 * text. Long money values then disappear underneath it. Reserving the space and
 * setting a floor width fixes it without hiding the arrows, which are useful
 * for nudging a figure.
 */
const NUMBER_ROOM = "min-w-[7.5rem] pr-9";
/**
 * The dense table variant (Budget, Balances) has too little width for the
 * padding trick above to reliably clear the spinner across browsers -- the
 * arrows themselves eat a bigger share of a ~90px field, so digits still
 * ended up underneath them. Hiding the spinner here instead of chasing more
 * padding fixes it outright; these tables still have the up/down keys.
 */
const NUMBER_ROOM_INLINE =
  "min-w-[5rem] pr-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/**
Borderless until hovered -- used inside dense editable tables.
*/
export const INLINE_INPUT =
  "w-full rounded-md border border-transparent px-2 py-1.5 text-sm tabular-nums outline-none hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100";

/**
 * Keeps the text you are typing intact while still storing a number.
 *
 * A naively controlled `<input type="number">` fights the user: typing "6." or
 * clearing the box parses to something different from what is on screen, React
 * rewrites the DOM, and the keystroke is swallowed. So we hold the raw text
 * while the field has focus and only push valid numbers upstream.
 */
function useNumericText(
  value: number,
  toText: (n: number) => string,
  parse: (s: string) => number,
  onChange: (n: number) => void,
) {
  const [text, setText] = useState(() => toText(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    // Re-sync from props whenever the field is not being edited. Deliberate
    // sync-with-external-state effect, not a derived-during-render value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!focused) setText(toText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused]);

  return {
    value: text,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onChange: (event_: ChangeEvent<HTMLInputElement>) => {
      setText(event_.target.value);
      const parsed = parse(event_.target.value);
      if (Number.isFinite(parsed)) onChange(parsed);
    },
  };
}

/**
A dollar amount. Stores a plain number.
*/
export function MoneyInput({
  value,
  onChange,
  disabled,
  step = 50,
  variant = "boxed",
  align = "left",
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  step?: number;
  variant?: "boxed" | "inline";
  align?: "left" | "right";
}) {
  const bind = useNumericText(value, String, Number.parseFloat, onChange);
  const base = variant === "inline" ? INLINE_INPUT : inputClass(disabled);
  return (
    <div className="relative">
      <span
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm text-slate-400 ${
          variant === "inline" ? "left-2" : "left-3"
        }`}
      >
        $
      </span>
      <input
        type="number"
        step={step}
        disabled={disabled}
        {...bind}
        className={`${base} ${
          variant === "inline"
            ? `pl-5 ${NUMBER_ROOM_INLINE}`
            : `pl-6 ${NUMBER_ROOM}`
        } ${align === "right" ? "text-right" : ""}`}
      />
    </div>
  );
}

/**
Displays a percentage but stores a decimal (4.5 on screen -> 0.045 in state).
*/
export function PercentInput({
  value,
  onChange,
  disabled,
  step = 0.1,
}: {
  value: number;
  onChange: (decimal: number) => void;
  disabled?: boolean;
  step?: number;
}) {
  const bind = useNumericText(
    value,
    (n) => String(Number((n * 100).toFixed(4))),
    // parseFloat, not Number(), so a partial in-progress value while typing
    // (e.g. "12.") still parses instead of going NaN.
    // eslint-disable-next-line unicorn/prefer-number-coercion
    (s) => Number.parseFloat(s) / 100,
    onChange,
  );
  return (
    <div className="relative">
      <input
        type="number"
        step={step}
        disabled={disabled}
        {...bind}
        className={`${inputClass(disabled)} min-w-[7.5rem] pr-14`}
      />
      <span className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 text-sm text-slate-400">
        %
      </span>
    </div>
  );
}

/**
 * A `PercentInput` with a computed dollar-per-month figure shown in gray
 * underneath -- for elections entered as a share of an annual figure (e.g. a
 * 401(k) contribution as a percent of salary) where the reader still wants
 * to see the actual dollar amount that implies.
 */
export function PercentInputWithMonthly({
  value,
  onChange,
  annualBasis,
  disabled,
}: {
  value: number;
  onChange: (decimal: number) => void;
  /**
  The annual dollar figure this percentage is a share of, e.g. gross salary.
  */
  annualBasis: number;
  disabled?: boolean;
}) {
  return (
    <div>
      <PercentInput value={value} onChange={onChange} disabled={disabled} />
      <p className="mt-1 text-xs text-slate-400">
        {money((value * annualBasis) / 12)}/mo
      </p>
    </div>
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  variant = "boxed",
  align = "left",
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  variant?: "boxed" | "inline";
  align?: "left" | "right";
}) {
  const bind = useNumericText(value, String, Number.parseFloat, onChange);
  const roomClass =
    variant === "inline"
      ? `${INLINE_INPUT} ${NUMBER_ROOM_INLINE}`
      : `${inputClass()} ${NUMBER_ROOM}`;
  const alignClass = align === "right" ? "text-right" : "";
  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      {...bind}
      className={`${roomClass} ${alignClass}`}
    />
  );
}

/**
 * A select with the native arrow replaced.
 *
 * The browser draws its own arrow inside the right edge, which sat on top of
 * long option text. `appearance-none` removes it; the chevron below is drawn
 * where there is room for it.
 */
export function Select({
  value,
  onChange,
  children,
  disabled,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        disabled={disabled}
        onChange={(event_) => onChange(event_.target.value)}
        className={`${inputClass(disabled)} min-w-[7rem] cursor-pointer appearance-none pr-9`}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/**
A date or year-month field, styled to match everything else.
*/
export function DateInput({
  value,
  onChange,
  type = "date",
  variant = "boxed",
}: {
  value: string;
  onChange: (v: string) => void;
  type?: "date" | "month";
  variant?: "boxed" | "inline";
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event_) => onChange(event_.target.value)}
      className={`${variant === "inline" ? INLINE_INPUT : inputClass()} min-w-[9.5rem] cursor-pointer`}
    />
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event_) => onChange(event_.target.value)}
      className={inputClass()}
    />
  );
}

/**
Label above, control below. The standard row used by every form.
*/
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <Label hint={hint}>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

/**
A range slider with a live read-out -- the main "play with it" control.
*/
export function Slider({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
  accent = "#2563eb",
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
  display: string;
  accent?: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="min-w-0">
          <Label hint={hint}>{label}</Label>
        </span>
        <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event_) => onChange(event_.target.valueAsNumber)}
        style={{ accentColor: accent }}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200"
      />
    </div>
  );
}
