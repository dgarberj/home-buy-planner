import { ALL_MUNICIPALITIES } from "../../data/localMarket";
import type { DtiResult } from "../../engine/lending";
import { money, pct } from "../../lib/format";
import { Callout, Card, Field, InfoTip, MoneyInput, SectionTitle, Select } from "../ui";

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
  return (
    <Card
      title="What a lender will allow"
      subtitle="A different question from the rest of this app, and the one that decides whether you get the loan."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Town" hint="Sets the tax rate and the median price tested.">
          <Select value={townName} onChange={setTownName}>
            {ALL_MUNICIPALITIES.filter((m) => m.medianPrice).map((m) => (
              <option key={`${m.countyKey}-${m.name}`} value={m.name}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Credit card minimums"
          hint="Underwriters use the statement minimum even if you clear the balance every month."
        >
          <MoneyInput value={revolvingMinimums} step={25} onChange={setRevolving} />
        </Field>
        <div>
          <SectionTitle>Back-end DTI</SectionTitle>
          <p
            className={`whitespace-nowrap text-3xl font-semibold tabular-nums ${DTI_TEXT_COLOUR[dti.verdict]}`}
          >
            {pct(dti.backEnd, 1)}
          </p>
          <p className="mt-1 text-xs capitalize text-slate-500">{dti.verdict}</p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <tbody>
            <tr className="border-b border-slate-100">
              <th scope="row" className="py-2 text-left font-normal text-slate-600">
                Gross monthly income
              </th>
              <td className="py-2 text-right tabular-nums">
                {money(grossMonthlyIncome)}
              </td>
            </tr>
            <tr className="border-b border-slate-100">
              <th scope="row" className="py-2 text-left font-normal text-slate-600">
                Proposed housing on {money(price)}
                <InfoTip text="Principal, interest, tax, insurance and mortgage insurance. Upkeep is excluded, because a lender excludes it — which is exactly why their maximum is not a safe maximum." />
              </th>
              <td className="py-2 text-right tabular-nums">{money(lenderHousing)}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <th scope="row" className="py-2 text-left font-normal text-slate-600">
                Support payments
                <InfoTip text="Counted as debt, not as a living cost. Fannie Mae includes support with more than ten months remaining." />
              </th>
              <td className="py-2 text-right tabular-nums text-amber-700">
                {money(supportPaid)}
              </td>
            </tr>
            <tr className="border-b border-slate-100">
              <th scope="row" className="py-2 text-left font-normal text-slate-600">
                Car and other instalment debts
              </th>
              <td className="py-2 text-right tabular-nums">{money(instalmentDebts)}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <th scope="row" className="py-2 text-left font-normal text-slate-600">
                Credit card minimums
              </th>
              <td className="py-2 text-right tabular-nums">
                {money(revolvingMinimums)}
              </td>
            </tr>
            <tr>
              <th scope="row" className="py-2 text-left font-medium text-slate-900">
                Total counted against you
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
            <strong>
              Support payments alone use {pct(dti.supportShare, 1)} of your ratio
            </strong>{" "}
            before a mortgage is even considered.{" "}
          </>
        )}
        That leaves {money(dti.headroomAt.conservative)} of housing payment at
        the comfortable 36% limit, {money(dti.headroomAt.manual)} at 45%, and{" "}
        {money(dti.headroomAt.automated)} at the 50% automated ceiling.
      </Callout>
    </Card>
  );
}
