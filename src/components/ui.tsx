import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";

/**
Small presentational primitives shared across every panel.
*/

export function Card({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {(title || right) && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-semibold text-slate-900">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
          {right}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

/**
 * A hoverable "?" that explains an assumption in plain language.
 *
 * `placement` matters inside scrolling containers: a tooltip drawn above a
 * sticky table header gets clipped, so those callers pass "bottom".
 */
export function InfoTip({
  text,
  placement = "top",
}: {
  text: string;
  placement?: "top" | "bottom";
}) {
  const position = placement === "top" ? "bottom-full mb-2" : "top-full mt-2";
  return (
    <span className="group relative ml-1 inline-flex shrink-0 translate-y-px align-middle">
      <span
        tabIndex={0}
        role="button"
        aria-label={text}
        className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold normal-case leading-none tracking-normal text-slate-400 hover:border-slate-400 hover:text-slate-600"
      >
        ?
      </span>
      <span
        className={`pointer-events-none absolute left-1/2 z-30 w-64 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-normal normal-case leading-relaxed tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 ${position}`}
      >
        {text}
      </span>
    </span>
  );
}

export function Label({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <span className="flex items-start text-sm font-medium leading-snug text-slate-700">
      <span className="min-w-0">{children}</span>
      {hint && <InfoTip text={hint} />}
    </span>
  );
}

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

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (isChecked: boolean) => void;
  label: ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-left">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        // overflow-hidden is a belt-and-braces guard: even if the knob's
        // positioning is ever broken again, it cannot escape the pill and land
        // on top of the label beside it.
        className={`relative h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        {/*
          left-0.5 is load-bearing. Without an explicit horizontal anchor an
          absolutely positioned element falls back to its static position,
          which inherits text-align from an ancestor -- so inside any
          right-aligned container the knob started at the RIGHT edge and the
          translate then pushed it further right, off the switch entirely.

          Track 44px, knob 20px, 2px inset each side: off at x=2, on at x=22,
          so the travel is exactly 20px.
        */}
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <span className="flex items-start text-sm leading-snug text-slate-700">
        <span className="min-w-0">{label}</span>
        {hint && <InfoTip text={hint} />}
      </span>
    </label>
  );
}

export function Button({
  children,
  onClick,
  variant = "secondary",
  size = "md",
  title,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  title?: string;
  disabled?: boolean;
}) {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 border-transparent",
    secondary: "bg-white text-slate-700 hover:bg-slate-50 border-slate-300",
    ghost:
      "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-transparent",
    danger: "bg-white text-red-600 hover:bg-red-50 border-red-200",
  };
  const sizes = { sm: "px-2.5 py-1 text-xs", md: "px-3.5 py-2 text-sm" };
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border font-medium transition ${variants[variant]} ${sizes[size]} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

/**
 * A centred dialog. Closes on Escape or a click on the backdrop, and traps
 * nothing -- this is a local tool, not a component library, so the focus
 * management is deliberately minimal.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event_: KeyboardEvent) => {
      if (event_.key === "Escape") onClose();
    };
    addEventListener("keydown", onKey);
    // Stop the page scrolling behind the dialog.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event_) => event_.stopPropagation()}
        className="my-8 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg px-2 py-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
          >
            ✕
          </button>
        </header>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

/**
A coloured plain-English conclusion box.
*/
export function Callout({
  tone,
  children,
}: {
  tone: "good" | "warn" | "bad" | "neutral";
  children: ReactNode;
}) {
  const tones = {
    good: "bg-emerald-50 text-emerald-900 border-emerald-200",
    warn: "bg-amber-50 text-amber-900 border-amber-200",
    bad: "bg-red-50 text-red-900 border-red-200",
    neutral: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${tones[tone]}`}
    >
      {children}
    </div>
  );
}

/**
Big number + caption, used across the dashboard.
*/
export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  sub,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "good" | "bad";
  sub?: string;
}) {
  const toneClass = {
    good: "text-emerald-600",
    bad: "text-red-600",
    neutral: "text-slate-900",
  }[tone];
  return (
    <div>
      <div className="flex items-start text-xs font-medium uppercase tracking-wide text-slate-500">
        <span className="min-w-0">{label}</span>
        {hint && <InfoTip text={hint} />}
      </div>
      <div
        className={`mt-1 break-words text-2xl font-semibold leading-tight tabular-nums ${toneClass}`}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 break-words text-xs leading-relaxed text-slate-500">
          {sub}
        </div>
      )}
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <h3 className="mb-3 flex items-center text-xs font-semibold uppercase tracking-wider text-slate-500">
      {children}
      {hint && <InfoTip text={hint} />}
    </h3>
  );
}
