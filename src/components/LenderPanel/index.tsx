import { useMemo, useState } from "react";
import { ALL_MUNICIPALITIES, effectiveRate } from "../../data/localMarket";
import { housingBudget, maxAffordablePrice, monthlyCostOfHouse } from "../../engine/affordability";
import { DTI_LIMITS, debtToIncome, maxPriceByDti } from "../../engine/lending";
import { useProjections } from "../../store/useProjections";
import { useStore } from "../../store/useStore";
import CeilingsCard from "./CeilingsCard";
import DtiCard from "./DtiCard";

/**
 * The lender's view, which is not the same as yours.
 *
 * Everything else here asks whether you can live on what is left. A lender asks
 * what share of GROSS income the debts take, counts support payments as debt, and
 * ignores upkeep entirely. The smaller of the two answers is the one that
 * decides whether you get the loan.
 */
export default function LenderPanel() {
  const { assumptions } = useProjections();
  const settings = useStore((s) => s.settings);

  const [revolvingMinimums, setRevolving] = useState(75);
  const [townName, setTownName] = useState("Brookhaven");
  const town = ALL_MUNICIPALITIES.find((m) => m.name === townName);
  const rate = town ? effectiveRate(town) : 0.016;

  // A lender works from GROSS pay, and typically averages a steady bonus.
  const grossMonthlyIncome =
    (settings.grossAnnualSalary +
      assumptions.income.annualBonusNet / (1 - 0.3372)) /
    12;

  const supportPaid = assumptions.obligations
    .filter(
      (o) => o.label.toLowerCase().includes("support") && o.startMonth <= 1,
    )
    .reduce((sum, o) => sum + o.monthlyAmount, 0);
  const instalmentDebts = assumptions.obligations
    .filter(
      (o) => !o.label.toLowerCase().includes("support") && o.startMonth <= 1,
    )
    .reduce((sum, o) => sum + o.monthlyAmount, 0);

  const price = town?.medianPrice ?? assumptions.home.targetPrice;
  const cost = monthlyCostOfHouse(assumptions, {
    price,
    effectiveTaxRate: rate,
    insuranceMonthly: 150,
  });
  // Lenders count principal, interest, tax, insurance and PMI -- not upkeep.
  const lenderHousing =
    cost.principalAndInterest + cost.tax + cost.insurance + cost.pmi;

  const dti = debtToIncome({
    grossMonthlyIncome,
    proposedHousing: lenderHousing,
    supportPaid,
    instalmentDebts,
    revolvingMinimums,
  });

  const budget = housingBudget(assumptions, {
    atMonth: 12,
    reserveForSavings: 400,
  });
  const byBudget = maxAffordablePrice(assumptions, {
    monthlyBudget: budget.monthlyBudget,
    effectiveTaxRate: rate,
    insuranceMonthly: 150,
  });

  const limits = useMemo(
    () =>
      (Object.keys(DTI_LIMITS) as (keyof typeof DTI_LIMITS)[]).map((key) => ({
        key,
        limit: DTI_LIMITS[key],
        price: maxPriceByDti(assumptions, {
          grossMonthlyIncome,
          supportPaid,
          instalmentDebts,
          revolvingMinimums,
          effectiveTaxRate: rate,
          insuranceMonthly: 150,
          limit: DTI_LIMITS[key],
        }),
      })),
    [
      assumptions,
      grossMonthlyIncome,
      supportPaid,
      instalmentDebts,
      revolvingMinimums,
      rate,
    ],
  );

  const withoutInstalments = maxPriceByDti(assumptions, {
    grossMonthlyIncome,
    supportPaid,
    instalmentDebts: 0,
    revolvingMinimums,
    effectiveTaxRate: rate,
    insuranceMonthly: 150,
    limit: DTI_LIMITS.manual,
  });
  const withInstalments = limits.find((l) => l.key === "manual")?.price ?? 0;

  return (
    <div className="space-y-5">
      <DtiCard
        townName={townName}
        setTownName={setTownName}
        revolvingMinimums={revolvingMinimums}
        setRevolving={setRevolving}
        grossMonthlyIncome={grossMonthlyIncome}
        price={price}
        lenderHousing={lenderHousing}
        supportPaid={supportPaid}
        instalmentDebts={instalmentDebts}
        dti={dti}
      />
      <CeilingsCard
        limits={limits}
        byBudget={byBudget}
        withoutInstalments={withoutInstalments}
        withInstalments={withInstalments}
      />
    </div>
  );
}
