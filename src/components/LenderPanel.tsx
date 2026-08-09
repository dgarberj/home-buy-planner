import { useMemo, useState } from 'react';
import { ALL_MUNICIPALITIES, effectiveRate } from '../data/localMarket';
import { housingBudget, maxAffordablePrice, monthlyCostOfHouse } from '../engine/affordability';
import { DTI_LIMITS, debtToIncome, maxPriceByDti } from '../engine/lending';
import { money, pct } from '../lib/format';
import { useProjections } from '../store/useProjections';
import { useStore } from '../store/useStore';
import { Callout, Card, Field, InfoTip, MoneyInput, SectionTitle, Select } from './ui';

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
  const [townName, setTownName] = useState('Brookhaven');
  const town = ALL_MUNICIPALITIES.find((m) => m.name === townName);
  const rate = town ? effectiveRate(town) : 0.016;

  // A lender works from GROSS pay, and typically averages a steady bonus.
  const grossMonthlyIncome =
    (settings.grossAnnualSalary + assumptions.income.annualBonusNet / (1 - 0.3372)) / 12;

  const supportPaid = assumptions.obligations
    .filter((o) => o.label.toLowerCase().includes('support') && o.startMonth <= 1)
    .reduce((sum, o) => sum + o.monthlyAmount, 0);
  const instalmentDebts = assumptions.obligations
    .filter((o) => !o.label.toLowerCase().includes('support') && o.startMonth <= 1)
    .reduce((sum, o) => sum + o.monthlyAmount, 0);

  const price = town?.medianPrice ?? assumptions.home.targetPrice;
  const cost = monthlyCostOfHouse(assumptions, {
    price,
    effectiveTaxRate: rate,
    insuranceMonthly: 150,
  });
  // Lenders count principal, interest, tax, insurance and PMI -- not upkeep.
  const lenderHousing = cost.principalAndInterest + cost.tax + cost.insurance + cost.pmi;

  const dti = debtToIncome({
    grossMonthlyIncome,
    proposedHousing: lenderHousing,
    supportPaid,
    instalmentDebts,
    revolvingMinimums,
  });

  const budget = housingBudget(assumptions, { atMonth: 12, reserveForSavings: 400 });
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
    [assumptions, grossMonthlyIncome, supportPaid, instalmentDebts, revolvingMinimums, rate],
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
  const withInstalments = limits.find((l) => l.key === 'manual')?.price ?? 0;

  const TONE = {
    comfortable: 'good',
    workable: 'good',
    tight: 'warn',
    declined: 'bad',
  } as const;

  return (
    <div className="space-y-5">
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
              className={`whitespace-nowrap text-3xl font-semibold tabular-nums ${
                dti.verdict === 'declined'
                  ? 'text-red-600'
                  : dti.verdict === 'tight'
                    ? 'text-amber-600'
                    : 'text-emerald-600'
              }`}
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
                <td className="py-2 text-slate-600">Gross monthly income</td>
                <td className="py-2 text-right tabular-nums">{money(grossMonthlyIncome)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-600">
                  Proposed housing on {money(price)}
                  <InfoTip text="Principal, interest, tax, insurance and mortgage insurance. Upkeep is excluded, because a lender excludes it — which is exactly why their maximum is not a safe maximum." />
                </td>
                <td className="py-2 text-right tabular-nums">{money(lenderHousing)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-600">
                  Support payments
                  <InfoTip text="Counted as debt, not as a living cost. Fannie Mae includes support with more than ten months remaining." />
                </td>
                <td className="py-2 text-right tabular-nums text-amber-700">
                  {money(supportPaid)}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-600">Car and other instalment debts</td>
                <td className="py-2 text-right tabular-nums">{money(instalmentDebts)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-600">Credit card minimums</td>
                <td className="py-2 text-right tabular-nums">{money(revolvingMinimums)}</td>
              </tr>
              <tr>
                <td className="py-2 font-medium text-slate-900">Total counted against you</td>
                <td className="py-2 text-right font-semibold tabular-nums">
                  {money(dti.totalDebts)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <Callout tone={TONE[dti.verdict]}>
          <strong>Support payments alone uses {pct(dti.supportShare, 1)} of your ratio</strong> before a
          mortgage is even considered. That leaves {money(dti.headroomAt.conservative)} of housing
          payment at the comfortable 36% limit, {money(dti.headroomAt.manual)} at 45%, and{' '}
          {money(dti.headroomAt.automated)} at the 50% automated ceiling.
        </Callout>
      </Card>

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
                    Lender at {pct(l.limit, 0)} <span className="text-slate-400">({l.key})</span>
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
                <td className="py-2 text-right font-semibold tabular-nums">{money(byBudget)}</td>
                <td className="py-2 pl-4" />
              </tr>
            </tbody>
          </table>
        </div>

        {withoutInstalments > withInstalments + 1_000 && (
          <Callout tone="good">
            <strong>Timing the application is worth {money(withoutInstalments - withInstalments)}</strong>{' '}
            of house. Instalment debts with ten or fewer payments left are generally excluded from
            DTI, so applying once the car loan is nearly done raises what you qualify for from{' '}
            {money(withInstalments)} to {money(withoutInstalments)} — without changing anything about
            your finances.
          </Callout>
        )}

        <Callout tone="neutral">
          <strong>This is not a pre-approval.</strong> An underwriter looks at pay stubs, tax
          returns and a credit pull, and applies overlays this model knows nothing about. Treat it
          as a way to avoid falling in love with a house a lender will refuse.
        </Callout>
      </Card>
    </div>
  );
}
