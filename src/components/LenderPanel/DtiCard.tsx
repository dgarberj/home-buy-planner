import { Trans, useTranslation } from "react-i18next";
import { ALL_MUNICIPALITIES } from "../../data/localMarket";
import type { DtiResult } from "../../engine/lending";
import { money, pct } from "../../lib/format";
import {
  Callout,
  Card,
  Field,
  InfoTip,
  MoneyInput,
  SectionTitle,
  Select,
} from "../ui";

const TONE = {
  comfortable: "good",
  workable: "good",
  tight: "warn",
  declined: "bad",
} as const;

const DTI_TEXT_COLOUR = {
  comfortable: "text-emerald-600",
  workable: "text-emerald-600",
  tight: "text-amber-600",
  declined: "text-red-600",
} as const;

const VERDICT_KEY = {
  comfortable: "lenderPanel.dti.verdict.comfortable",
  workable: "lenderPanel.dti.verdict.workable",
  tight: "lenderPanel.dti.verdict.tight",
  declined: "lenderPanel.dti.verdict.declined",
} as const;

export default function DtiCard({
  townName,
  setTownName,
  revolvingMinimums,
  setRevolving,
  grossMonthlyIncome,
  price,
  lenderHousing,
  supportPaid,
  instalmentDebts,
  dti,
}: {
  townName: string;
  setTownName: (name: string) => void;
  revolvingMinimums: number;
  setRevolving: (n: number) => void;
  grossMonthlyIncome: number;
  price: number;
  lenderHousing: number;
  supportPaid: number;
  instalmentDebts: number;
  dti: DtiResult;
}) {
  const { t } = useTranslation();
  return (
    <Card
      title={t("lenderPanel.dti.title", "What a lender will allow")}
      subtitle={t(
        "lenderPanel.dti.subtitle",
        "A different question from the rest of this app, and the one that decides whether you get the loan.",
      )}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label={t("lenderPanel.dti.town.label", "Town")}
          hint={t(
            "lenderPanel.dti.town.hint",
            "Sets the tax rate and the median price tested.",
          )}
        >
          <Select value={townName} onChange={setTownName}>
            {ALL_MUNICIPALITIES.filter((m) => m.medianPrice).map((m) => (
              <option key={`${m.countyKey}-${m.name}`} value={m.name}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={t(
            "lenderPanel.dti.creditCardMinimums.label",
            "Credit card minimums",
          )}
          hint={t(
            "lenderPanel.dti.creditCardMinimums.hint",
            "Underwriters use the statement minimum even if you clear the balance every month.",
          )}
        >
          <MoneyInput
            value={revolvingMinimums}
            step={25}
            onChange={setRevolving}
          />
        </Field>
        <div>
          <SectionTitle>
            {t("lenderPanel.dti.backEndDti", "Back-end DTI")}
          </SectionTitle>
          <p
            className={`whitespace-nowrap text-3xl font-semibold tabular-nums ${DTI_TEXT_COLOUR[dti.verdict]}`}
          >
            {pct(dti.backEnd, 1)}
          </p>
          <p className="mt-1 text-xs capitalize text-slate-500">
            {t(VERDICT_KEY[dti.verdict], dti.verdict)}
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <tbody>
            <tr className="border-b border-slate-100">
              <th
                scope="row"
                className="py-2 text-left font-normal text-slate-600"
              >
                {t(
                  "lenderPanel.dti.table.grossMonthlyIncome",
                  "Gross monthly income",
                )}
              </th>
              <td className="py-2 text-right tabular-nums">
                {money(grossMonthlyIncome)}
              </td>
            </tr>
            <tr className="border-b border-slate-100">
              <th
                scope="row"
                className="py-2 text-left font-normal text-slate-600"
              >
                {t(
                  "lenderPanel.dti.table.proposedHousing",
                  "Proposed housing on {{price}}",
                  { price: money(price) },
                )}
                <InfoTip
                  text={t(
                    "lenderPanel.dti.table.proposedHousingHint",
                    "Principal, interest, tax, insurance and mortgage insurance. Upkeep is excluded, because a lender excludes it — which is exactly why their maximum is not a safe maximum.",
                  )}
                />
              </th>
              <td className="py-2 text-right tabular-nums">
                {money(lenderHousing)}
              </td>
            </tr>
            <tr className="border-b border-slate-100">
              <th
                scope="row"
                className="py-2 text-left font-normal text-slate-600"
              >
                {t("lenderPanel.dti.table.supportPayments", "Support payments")}
                <InfoTip
                  text={t(
                    "lenderPanel.dti.table.supportPaymentsHint",
                    "Counted as debt, not as a living cost. Fannie Mae includes support with more than ten months remaining.",
                  )}
                />
              </th>
              <td className="py-2 text-right tabular-nums text-amber-700">
                {money(supportPaid)}
              </td>
            </tr>
            <tr className="border-b border-slate-100">
              <th
                scope="row"
                className="py-2 text-left font-normal text-slate-600"
              >
                {t(
                  "lenderPanel.dti.table.instalmentDebts",
                  "Car and other instalment debts",
                )}
              </th>
              <td className="py-2 text-right tabular-nums">
                {money(instalmentDebts)}
              </td>
            </tr>
            <tr className="border-b border-slate-100">
              <th
                scope="row"
                className="py-2 text-left font-normal text-slate-600"
              >
                {t(
                  "lenderPanel.dti.table.creditCardMinimums",
                  "Credit card minimums",
                )}
              </th>
              <td className="py-2 text-right tabular-nums">
                {money(revolvingMinimums)}
              </td>
            </tr>
            <tr>
              <th
                scope="row"
                className="py-2 text-left font-medium text-slate-900"
              >
                {t(
                  "lenderPanel.dti.table.totalCountedAgainstYou",
                  "Total counted against you",
                )}
              </th>
              <td className="py-2 text-right font-semibold tabular-nums">
                {money(dti.totalDebts)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout tone={TONE[dti.verdict]}>
        {dti.supportShare > 0 && (
          <>
            <Trans
              i18nKey="lenderPanel.dti.supportShare"
              components={{ b: <strong /> }}
              values={{ share: pct(dti.supportShare, 1) }}
            >
              <b>Support payments alone use {"{{share}}"} of your ratio</b>{" "}
              before a mortgage is even considered.{" "}
            </Trans>
          </>
        )}
        {t(
          "lenderPanel.dti.headroom",
          "That leaves {{conservative}} of housing payment at the comfortable 36% limit, {{manual}} at 45%, and {{automated}} at the 50% automated ceiling.",
          {
            conservative: money(dti.headroomAt.conservative),
            manual: money(dti.headroomAt.manual),
            automated: money(dti.headroomAt.automated),
          },
        )}
      </Callout>
    </Card>
  );
}
