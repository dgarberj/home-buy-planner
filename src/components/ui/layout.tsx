import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { InfoTip } from "./feedback";

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

// How many overlays currently want the page scroll locked. Reference-counted
// so nesting a Modal inside an open Drawer (or any other overlap) can't have
// one's close-cleanup re-enable scrolling while the other is still open.
const bodyScrollLock = { count: 0, previousOverflow: "" };

function lockBodyScroll() {
  if (bodyScrollLock.count === 0) {
    bodyScrollLock.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  bodyScrollLock.count += 1;
}

function unlockBodyScroll() {
  bodyScrollLock.count -= 1;
  if (bodyScrollLock.count === 0) {
    document.body.style.overflow = bodyScrollLock.previousOverflow;
  }
}

/**
 * Escape-to-close plus a body-scroll lock, shared by every full-screen
 * overlay (`Modal`, `Drawer`). Factored out so the two don't drift out of
 * sync with each other. Keeps `onClose` in a ref so the effect only needs
 * `isOpen` as a dependency -- an inline `onClose` handler (the common case at
 * every call site) would otherwise re-run the effect, and re-lock/re-listen,
 * on every unrelated re-render of the caller while the overlay is open.
 */
function useDismissableOverlay(isOpen: boolean, onClose: () => void) {
  const onCloseReference = useRef(onClose);
  useEffect(() => {
    onCloseReference.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event_: KeyboardEvent) => {
      if (event_.key === "Escape") onCloseReference.current();
    };
    addEventListener("keydown", onKey);
    lockBodyScroll();
    return () => {
      removeEventListener("keydown", onKey);
      unlockBodyScroll();
    };
  }, [isOpen]);
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
  useDismissableOverlay(open, onClose);

  if (!open) return null;

  // Portalled to <body> so a `fixed` overlay always escapes any ancestor
  // that happens to create its own stacking context (e.g. `backdrop-blur`
  // on the page header) -- otherwise it can paint behind later siblings
  // despite the z-index, instead of on top of the whole page.
  return createPortal(
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
    </div>,
    document.body,
  );
}

/**
 * A right-edge slide-in panel for content that is data-entry-heavy but only
 * touched occasionally. Shares `Modal`'s escape-to-close and scroll-lock
 * behaviour via `useDismissableOverlay`.
 */
export function Drawer({
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
  useDismissableOverlay(open, onClose);

  if (!open) return null;

  // See Modal's comment: portalled to <body> for the same stacking-context
  // reason -- Drawer is used inside the page header, which creates one via
  // `backdrop-blur`.
  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event_) => event_.stopPropagation()}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl"
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
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * The persistent left column: navigation plus the levers, visible at `md:`
 * and above. Sticks to the top of the viewport and scrolls its own contents
 * independently of the content pane. Hidden below `md:` -- callers are
 * expected to render a separate in-flow fallback for narrow screens.
 */
export function Sidebar({ children }: { children: ReactNode }) {
  return (
    <nav className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-[280px] md:shrink-0 md:flex-col md:gap-6 md:self-start md:overflow-y-auto md:border-r md:border-slate-200 md:px-4 md:py-6">
      {children}
    </nav>
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
