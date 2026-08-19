import { useTranslation } from "react-i18next";
import { CONVENTIONAL_97, pmiRateFor } from "../../../data/mortgageInsurance";
import type { HousingBudget } from "../../../engine/affordability";
import { money, pct } from "../../../lib/format";
import type {
  Assumptions,
  HomePurchaseAssumptions,
} from "../../../model/types";
import { Button, Field, MoneyInput, NumberInput, SectionTitle } from "../../ui";

export default function BudgetControls({
  assumptions,
  setAssumptions,
  reserve,
  setReserve,
  creditScore,
  setCreditScore,
  budget,
  ceilingPrice,
  typicalEffectiveTaxRate,
}: {
  assumptions: Assumptions;
  setAssumptions: (patch: { home: Partial<HomePurchaseAssumptions> }) => void;
  reserve: number;
  setReserve: (v: number) => void;
  creditScore: number;
  setCreditScore: (v: number) => void;
  budget: HousingBudget;
  ceilingPrice: number;
  typicalEffectiveTaxRate: number;
}) {
  const { t } = useTranslation();
  const home = assumptions.home;
  const pmiRate = pmiRateFor(home.downPaymentPct, creditScore);

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label={t(
            "marketPanel.budgetControls.reserve.label",
            "Reserve for saving",
          )}
          hint={t(
            "marketPanel.budgetControls.reserve.hint",
            "Held back from the housing budget each month so you keep building a buffer after moving in.",
          )}
        >
          <MoneyInput value={reserve} step={50} onChange={setReserve} />
        </Field>
        <div>
          <SectionTitle>
            {t(
              "marketPanel.budgetControls.availableForHousing",
              "Available for housing",
            )}
          </SectionTitle>
          <p className="whitespace-nowrap text-2xl font-semibold tabular-nums">
            {money(budget.monthlyBudget)}
            <span className="ml-1 text-sm font-normal text-slate-400">
              {t("marketPanel.budgetControls.perMonthSuffix", "/mo")}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {t(
              "marketPanel.budgetControls.allIn",
              "all-in: loan, tax, insurance, mortgage insurance and upkeep",
            )}
          </p>
        </div>
        <div>
          <SectionTitle>
            {t("marketPanel.budgetControls.roughCeiling", "Rough ceiling")}
          </SectionTitle>
          <p className="whitespace-nowrap text-2xl font-semibold tabular-nums">
            {money(ceilingPrice)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {t(
              "marketPanel.budgetControls.ceilingNote",
              "at a typical {{rate}} effective tax rate — higher-tax towns buy less",
              { rate: pct(typicalEffectiveTaxRate, 1) },
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-3">
        <Field
          label={t(
            "marketPanel.budgetControls.creditScore.label",
            "Credit score",
          )}
          hint={t(
            "marketPanel.budgetControls.creditScore.hint",
            "Sets the mortgage-insurance rate. The gap between 760+ and 680 is enormous on a small deposit.",
          )}
        >
          <NumberInput
            value={creditScore}
            min={580}
            max={850}
            step={10}
            onChange={setCreditScore}
          />
        </Field>
        <Field
          label={t(
            "marketPanel.budgetControls.downPayment.label",
            "Down payment",
          )}
          hint={t(
            "marketPanel.budgetControls.downPayment.hint",
            "3% is the Conventional 97 minimum. 20% avoids mortgage insurance entirely.",
          )}
        >
          <div className="flex flex-wrap gap-1.5">
            {[0.03, 0.05, 0.1, 0.2].map((dp) => (
              <button
                key={dp}
                type="button"
                onClick={() => setAssumptions({ home: { downPaymentPct: dp } })}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  Math.abs(home.downPaymentPct - dp) < 0.001
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {pct(dp, 0)}
              </button>
            ))}
          </div>
        </Field>
        <div>
          <SectionTitle>
            {t(
              "marketPanel.budgetControls.mortgageInsurance",
              "Mortgage insurance",
            )}
          </SectionTitle>
          <p className="whitespace-nowrap text-xl font-semibold tabular-nums">
            {pmiRate > 0
              ? t(
                  "marketPanel.budgetControls.pmiRate",
                  "{{rate}} of the loan a year",
                  { rate: pct(pmiRate, 2) },
                )
              : t("marketPanel.budgetControls.pmiNone", "None")}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {pmiRate > 0
              ? t(
                  "marketPanel.budgetControls.pmiAppliedBelow",
                  "Applied automatically below",
                )
              : t(
                  "marketPanel.budgetControls.pmiDepositCovered",
                  "Deposit is 20% or more",
                )}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          onClick={() =>
            setAssumptions({
              home: { pmiAnnualPct: pmiRate, pmiUpfrontPct: 0 },
            })
          }
        >
          {t(
            "marketPanel.budgetControls.savePmiRate",
            "Save this mortgage-insurance rate to assumptions",
          )}
        </Button>
        <p className="text-xs text-slate-500">
          {t(
            "marketPanel.budgetControls.conventional97Note",
            CONVENTIONAL_97.note,
          )}{" "}
          {t(
            "marketPanel.budgetControls.ratesIndicative",
            "Rates here are indicative published tables — insurers price individually on credit, debt-to-income and property type, so get a real quote before committing.",
          )}
        </p>
      </div>
    </div>
  );
}
