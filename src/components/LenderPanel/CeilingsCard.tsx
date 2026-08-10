import type { DTI_LIMITS } from "../../engine/lending";
import { money, pct } from "../../lib/format";
import { Callout, Card, Table, Td, Th } from "../ui";

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
      <Table minWidthClassName="min-w-[560px]">
        <thead>
          <tr className="border-b border-slate-200">
            <Th className="pb-2">Ceiling</Th>
            <Th align="right" className="pb-2">
              Buys
            </Th>
            <Th className="pb-2 pl-4">Which binds</Th>
          </tr>
        </thead>
        <tbody>
          {limits.map((l) => (
            <tr key={l.key} className="border-b border-slate-100">
              <Td className="py-2 capitalize text-slate-700">
                Lender at {pct(l.limit, 0)}{" "}
                <span className="text-slate-400">({l.key})</span>
              </Td>
              <Td align="right" className="py-2 tabular-nums">
                {money(l.price)}
              </Td>
              <Td className="py-2 pl-4 text-xs">
                {l.price < byBudget ? (
                  <span className="font-medium text-amber-700">the lender</span>
                ) : (
                  <span className="text-slate-500">your budget</span>
                )}
              </Td>
            </tr>
          ))}
          <tr>
            <Td className="py-2 font-medium text-slate-900">Your own budget</Td>
            <Td align="right" className="py-2 font-semibold tabular-nums">
              {money(byBudget)}
            </Td>
            <Td className="py-2 pl-4" />
          </tr>
        </tbody>
      </Table>

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
