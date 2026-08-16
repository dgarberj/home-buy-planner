import { useTranslation } from "react-i18next";
import type { DTI_LIMITS } from "../../engine/lending";
import { money, pct } from "../../lib/format";
import { Callout, Card, Table, Td, Th } from "../ui";

const LIMIT_KEY_LABEL: Record<keyof typeof DTI_LIMITS, string> = {
  conservative: "lenderPanel.ceilings.limitKey.conservative",
  manual: "lenderPanel.ceilings.limitKey.manual",
  automated: "lenderPanel.ceilings.limitKey.automated",
};

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
  const { t } = useTranslation();
  return (
    <Card
      title={t("lenderPanel.ceilings.title", "Two different ceilings")}
      subtitle={t(
        "lenderPanel.ceilings.subtitle",
        "Yours is about what you can live on. Theirs is about gross income. The smaller one governs.",
      )}
    >
      <Table minWidthClassName="min-w-[560px]">
        <thead>
          <tr className="border-b border-slate-200">
            <Th className="pb-2">
              {t("lenderPanel.ceilings.table.ceiling", "Ceiling")}
            </Th>
            <Th align="right" className="pb-2">
              {t("lenderPanel.ceilings.table.buys", "Buys")}
            </Th>
            <Th className="pb-2 pl-4">
              {t("lenderPanel.ceilings.table.whichBinds", "Which binds")}
            </Th>
          </tr>
        </thead>
        <tbody>
          {limits.map((l) => (
            <tr key={l.key} className="border-b border-slate-100">
              <Td className="py-2 capitalize text-slate-700">
                {t("lenderPanel.ceilings.table.lenderAt", "Lender at {{pct}}", {
                  pct: pct(l.limit, 0),
                })}{" "}
                <span className="text-slate-400">
                  ({t(LIMIT_KEY_LABEL[l.key], l.key)})
                </span>
              </Td>
              <Td align="right" className="py-2 tabular-nums">
                {money(l.price)}
              </Td>
              <Td className="py-2 pl-4 text-xs">
                {l.price < byBudget ? (
                  <span className="font-medium text-amber-700">
                    {t("lenderPanel.ceilings.table.theLender", "the lender")}
                  </span>
                ) : (
                  <span className="text-slate-500">
                    {t("lenderPanel.ceilings.table.yourBudget", "your budget")}
                  </span>
                )}
              </Td>
            </tr>
          ))}
          <tr>
            <Td className="py-2 font-medium text-slate-900">
              {t("lenderPanel.ceilings.table.yourOwnBudget", "Your own budget")}
            </Td>
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
            {t(
              "lenderPanel.ceilings.timing.headline",
              "Timing the application is worth {{amount}}",
              { amount: money(withoutInstalments - withInstalments) },
            )}
          </strong>{" "}
          {t(
            "lenderPanel.ceilings.timing.body",
            "of house. Instalment debts with ten or fewer payments left are generally excluded from DTI, so applying once the car loan is nearly done raises what you qualify for from {{withInstalments}} to {{withoutInstalments}} — without changing anything about your finances.",
            {
              withInstalments: money(withInstalments),
              withoutInstalments: money(withoutInstalments),
            },
          )}
        </Callout>
      )}

      <Callout tone="neutral">
        <strong>
          {t("lenderPanel.ceilings.notPreapproval.headline", "This is not a pre-approval.")}
        </strong>{" "}
        {t(
          "lenderPanel.ceilings.notPreapproval.body",
          "An underwriter looks at pay stubs, tax returns and a credit pull, and applies overlays this model knows nothing about. Treat it as a way to avoid falling in love with a house a lender will refuse.",
        )}
      </Callout>
    </Card>
  );
}
