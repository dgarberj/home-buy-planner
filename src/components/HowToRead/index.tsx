import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";

/**
A short, non-technical explainer, folded away until someone wants it.
*/
export default function HowToRead() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span>
          <span className="text-base font-semibold text-slate-900">
            {t("app.howToRead.title", "How to read this")}
          </span>
          <span className="ml-2 text-sm text-slate-500">
            {t("app.howToRead.subtitle", "60 seconds on what the numbers mean")}
          </span>
        </span>
        <span className="text-slate-400">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-600">
          <p>
            <Trans
              i18nKey="app.howToRead.intro"
              components={{ b: <strong className="text-slate-900" /> }}
            >
              This tool answers one question:{" "}
              <b>
                when can we buy a house, and would we be okay if one of us lost
                a job?
              </b>
            </Trans>
          </p>
          <ul className="mt-3 space-y-2">
            <li>
              <Trans
                i18nKey="app.howToRead.li1"
                components={{ b: <strong className="text-slate-900" /> }}
              >
                <b>Start at the top.</b> The budget is every recurring dollar in
                and out. Change any number and everything below updates
                instantly.
              </Trans>
            </li>
            <li>
              <Trans
                i18nKey="app.howToRead.li2"
                components={{ b: <strong className="text-slate-900" /> }}
              >
                <b>Scenarios are versions of the future.</b> Each one picks a
                month to buy and whether a job loss happens. Drag the sliders —
                that is what they are for.
              </Trans>
            </li>
            <li>
              <Trans
                i18nKey="app.howToRead.li3"
                components={{ b: <strong className="text-slate-900" /> }}
              >
                <b>"House ready"</b> is the first month our savings would cover
                the down payment and closing costs. The house gets more
                expensive while we save, so waiting is not free.
              </Trans>
            </li>
            <li>
              <Trans
                i18nKey="app.howToRead.li4"
                components={{ b: <strong className="text-slate-900" /> }}
              >
                <b>"Thinnest cash"</b> is the lowest our spendable savings ever
                get. It is the resilience number. Below zero, in red, means the
                plan does not fund itself.
              </Trans>
            </li>
            <li>
              <Trans
                i18nKey="app.howToRead.li5"
                components={{ b: <strong className="text-slate-900" /> }}
              >
                <b>Commitments are different from expenses.</b> A fixed
                obligation with a known end date never inflates and never gets
                cut in a crisis — and the month it ends, money frees up for
                good.
              </Trans>
            </li>
            <li>
              <Trans
                i18nKey="app.howToRead.li6"
                components={{ b: <strong className="text-slate-900" /> }}
              >
                <b>Nothing here is a prediction.</b> It is arithmetic on the
                assumptions we typed in. Change an assumption and you get a
                different, equally confident-looking answer — which is exactly
                why it is worth playing with the extremes.
              </Trans>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
