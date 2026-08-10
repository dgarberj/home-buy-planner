import type { DTI_LIMITS } from "../../engine/lending";
import { money, pct } from "../../lib/format";
import { Callout, Card } from "../ui";

export default function CeilingsCard({
  limits,
  byBudget,
  withoutInstalments,
  withInstalments,
}: {
  limits: { key: keyof typeof DTI_LIMITS; limit: number; price: number }[];
  byBudget: number;
  withoutInstalments: number;
  withInstalments: number;
}) {
  return (
    <Card
      title="Two different ceilings"
      subtitle="Yours is about what you can live on. Theirs is about gross income. The smaller one governs."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ceiling
              </th>
              <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Buys
              </th>
              <th className="pb-2 pl-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Which binds
              </th>
            </tr>
          </thead>
          <tbody>
            {limits.map((l) => (
              <tr key={l.key} className="border-b border-slate-100">
                <td className="py-2 capitalize text-slate-700">
                  Lender at {pct(l.limit, 0)}{" "}
                  <span className="text-slate-400">({l.key})</span>
                </td>
                <td className="py-2 text-right tabular-nums">{money(l.price)}</td>
                <td className="py-2 pl-4 text-xs">
                  {l.price < byBudget ? (
                    <span className="font-medium text-amber-700">the lender</span>
                  ) : (
                    <span className="text-slate-500">your budget</span>
                  )}
                </td>
              </tr>
            ))}
            <tr>
              <td className="py-2 font-medium text-slate-900">Your own budget</td>
              <td className="py-2 text-right font-semibold tabular-nums">
                {money(byBudget)}
              </td>
              <td className="py-2 pl-4" />
            </tr>
          </tbody>
        </table>
      </div>

      {withoutInstalments > withInstalments + 1_000 && (
        <Callout tone="good">
          <strong>
            Timing the application is worth{" "}
            {money(withoutInstalments - withInstalments)}
          </strong>{" "}
          of house. Instalment debts with ten or fewer payments left are
          generally excluded from DTI, so applying once the car loan is nearly
          done raises what you qualify for from {money(withInstalments)} to{" "}
          {money(withoutInstalments)} — without changing anything about your
          finances.
        </Callout>
      )}

      <Callout tone="neutral">
        <strong>This is not a pre-approval.</strong> An underwriter looks at
        pay stubs, tax returns and a credit pull, and applies overlays this
        model knows nothing about. Treat it as a way to avoid falling in love
        with a house a lender will refuse.
      </Callout>
    </Card>
  );
}
