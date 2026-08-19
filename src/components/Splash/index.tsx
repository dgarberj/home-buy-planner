import { Trans, useTranslation } from "react-i18next";

/**
 * The front door. Shown once, on the very first visit -- and reopenable any
 * time after via the header link -- so first paint is a plain-language pitch
 * instead of the full Setup wall of budget, balance, and assumption inputs.
 * `App.tsx` owns *whether* this is showing (including skipping it entirely
 * for a deep link or a share link); this component only renders the pitch
 * and hands control back on `onEnter`.
 */
export default function Splash({ onEnter }: { onEnter: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 text-slate-900">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            {t("splash.title", "Home Buy Planner")}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {t("splash.headline", "When can we actually buy a house?")}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            {t(
              "splash.intro",
              "This tool answers that, plus the question that matters more: would we still be okay if one of us lost a job along the way. Type in your real numbers and it does the arithmetic instantly — no spreadsheet, no guessing.",
            )}
          </p>

          <ul className="mt-6 space-y-3 border-t border-slate-100 pt-6 text-sm text-slate-600">
            <li>
              <Trans
                i18nKey="splash.li1"
                components={{
                  b: <span className="font-semibold text-slate-900" />,
                }}
              >
                <b>Start with your budget.</b> Every recurring dollar in and
                out. Change any number and everything downstream —
                contributions, scenarios, the answer — updates instantly.
              </Trans>
            </li>
            <li>
              <Trans
                i18nKey="splash.li2"
                components={{
                  b: <span className="font-semibold text-slate-900" />,
                }}
              >
                <b>Scenarios are versions of the future.</b> Pick a month to buy
                and whether a job loss happens along the way. Add as many as you
                like and compare them side by side.
              </Trans>
            </li>
            <li>
              <Trans
                i18nKey="splash.li3"
                components={{
                  b: <span className="font-semibold text-slate-900" />,
                }}
              >
                <b>
                  "House ready" and "thinnest cash" are the two numbers that
                  matter.
                </b>{" "}
                The first month you could afford it, and the lowest your savings
                ever get along the way. Below zero, in red, means the plan
                doesn't fund itself.
              </Trans>
            </li>
            <li>
              <Trans
                i18nKey="splash.li4"
                components={{
                  b: <span className="font-semibold text-slate-900" />,
                }}
              >
                <b>Nothing here is a prediction.</b> It's arithmetic on the
                assumptions you type in — which is exactly why it's worth
                playing with the extremes.
              </Trans>
            </li>
          </ul>

          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onEnter}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              {t("splash.openPlanner", "Open the planner")}
            </button>
            <p className="text-xs text-slate-400">
              {t(
                "splash.privacyNote",
                "Your numbers stay saved in this browser only.",
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
