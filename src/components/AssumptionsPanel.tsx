import { deriveBudgetTotals, deriveStartingBalances } from '../lib/derive';
import {
  SECOND_INCOME_OPTIONS,
  SS_CREDIT_2026,
  netMonthlyFromGross,
} from '../data/secondIncomeOptions';
import { money, monthLabel, pct } from '../lib/format';
import { useStore } from '../store/useStore';
import {
  Card,
  DateInput,
  Field,
  Slider,
  MoneyInput,
  NumberInput,
  PercentInput,
  SectionTitle,
  TextInput,
  Toggle,
} from './ui';

/**
 * Every dial in the model, grouped the way a person thinks about them.
 * Income/expense totals and starting balances can either be typed here or
 * driven by the Budget and Balances tabs -- the toggles say which.
 */
/** Quick horizon presets. The long ones are what make the retirement view work. */
const HORIZON_PRESETS: { label: string; months: (age: number) => number }[] = [
  { label: '5 years', months: () => 60 },
  { label: '10 years', months: () => 120 },
  { label: 'To 60', months: (age) => (60 - age) * 12 + 1 },
  { label: 'To 65', months: (age) => (65 - age) * 12 + 1 },
  { label: 'To 67', months: (age) => (67 - age) * 12 + 1 },
  { label: 'To 70', months: (age) => (70 - age) * 12 + 1 },
];

const CANDIDATE_AGES = [50, 55, 60, 62, 65, 67, 70, 75];

export default function AssumptionsPanel() {
  const { assumptions, setAssumptions, budget, balances, settings, setSettings } = useStore();
  const a = assumptions;
  const fromBudget = settings.useBudgetTotals;
  const fromBalances = settings.useLatestBalances;
  const totals = deriveBudgetTotals(budget);
  const starting = deriveStartingBalances(balances);

  return (
    <div className="space-y-5">
      <Card
        title="Where the numbers come from"
        subtitle="Turn these off if you'd rather type totals directly instead of itemising."
      >
        <div className="space-y-3">
          <Toggle
            checked={fromBudget}
            onChange={(v) => setSettings({ useBudgetTotals: v })}
            label={
              <>
                Use the <strong>Budget</strong> tab for income, expenses and rent
              </>
            }
            hint="When on, the four totals below are added up from your budget line items and can't be edited here."
          />
          <Toggle
            checked={fromBalances}
            onChange={(v) => setSettings({ useLatestBalances: v })}
            label={
              <>
                Use the newest <strong>Balances</strong> snapshot for starting balances
              </>
            }
            hint="When on, the projection starts from the most recent snapshot you logged. Checking + savings + investments count as available cash."
          />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Income">
          <SectionTitle>Take-home pay</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Monthly take-home (combined)"
              hint="What actually lands in the bank each month after tax and deductions, for both of you together."
            >
              <MoneyInput
                value={fromBudget ? totals.income : a.income.monthlyTakeHome}
                disabled={fromBudget}
                onChange={(v) => setAssumptions({ income: { monthlyTakeHome: v } })}
              />
            </Field>
            <Field
              label="Annual raise"
              hint="Average pay rise per year. 3% is a common long-run assumption; use 0% to be deliberately pessimistic."
            >
              <PercentInput
                value={a.income.growthAnnual}
                onChange={(v) => setAssumptions({ income: { growthAnnual: v } })}
              />
            </Field>
          </div>
          {fromBudget && (
            <p className="mt-3 text-xs text-slate-500">
              Added up from {budget.filter((b) => b.type === 'income').length} income line items in
              the Budget tab.
            </p>
          )}
        </Card>

        <Card title="Expenses">
          <SectionTitle>Monthly spending, excluding housing</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Fixed costs"
              hint="Bills that are the same every month: insurance, car payment, loan payments, subscriptions."
            >
              <MoneyInput
                value={fromBudget ? totals.fixed : a.expenses.fixedMonthly}
                disabled={fromBudget}
                onChange={(v) => setAssumptions({ expenses: { fixedMonthly: v } })}
              />
            </Field>
            <Field
              label="Variable costs"
              hint="Spending that moves around: groceries, dining, shopping, travel."
            >
              <MoneyInput
                value={fromBudget ? totals.variable : a.expenses.variableMonthly}
                disabled={fromBudget}
                onChange={(v) => setAssumptions({ expenses: { variableMonthly: v } })}
              />
            </Field>
            <Field
              label="Current rent"
              hint="Tracked separately because it disappears the month you buy, replaced by the mortgage payment."
            >
              <MoneyInput
                value={fromBudget ? totals.rent : a.expenses.currentRentMonthly}
                disabled={fromBudget}
                onChange={(v) => setAssumptions({ expenses: { currentRentMonthly: v } })}
              />
            </Field>
            <Field
              label="Annual inflation"
              hint="How fast expenses and rent grow each year. Applied to everything except the mortgage payment, which is fixed."
            >
              <PercentInput
                value={a.expenses.inflationAnnual}
                onChange={(v) => setAssumptions({ expenses: { inflationAnnual: v } })}
              />
            </Field>
          </div>
        </Card>

        <Card title="Retirement">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Current balance"
              hint="Total across all retirement accounts today: 401(k)s, IRAs, and so on."
            >
              <MoneyInput
                value={fromBalances && starting.asOf ? starting.retirement : a.retirement.currentBalance}
                disabled={fromBalances && !!starting.asOf}
                step={1000}
                onChange={(v) => setAssumptions({ retirement: { currentBalance: v } })}
              />
            </Field>
            <Field
              label="Annual return"
              hint="Long-run average growth. 7% is a common stock-heavy assumption; drop it to 5% for a more cautious view."
            >
              <PercentInput
                value={a.retirement.returnAnnual}
                onChange={(v) => setAssumptions({ retirement: { returnAnnual: v } })}
              />
            </Field>
            <Field
              label="Your contribution / month"
              hint="What you put in each month. This comes out of your take-home cash, so it reduces what's left to save for the house."
            >
              <MoneyInput
                value={a.retirement.employeeMonthly}
                onChange={(v) => setAssumptions({ retirement: { employeeMonthly: v } })}
              />
            </Field>
            <Field
              label="Employer match / month"
              hint="Free money from your employer. It grows the retirement balance but does not reduce your take-home pay."
            >
              <MoneyInput
                value={a.retirement.employerMatchMonthly}
                onChange={(v) => setAssumptions({ retirement: { employerMatchMonthly: v } })}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Toggle
              checked={a.retirement.contributionsGrowWithIncome}
              onChange={(v) => setAssumptions({ retirement: { contributionsGrowWithIncome: v } })}
              label="Contributions grow with pay rises"
              hint="Over five years this barely matters. Over thirty it matters enormously — a flat contribution becomes trivially small after decades of raises."
            />
          </div>
        </Card>

        <Card title="Savings & investments">
          <SectionTitle hint="This is the pot the down payment comes out of. It is split in two because, over decades, where the surplus sits matters more than almost anything else.">
            Money outside retirement
          </SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Cash today"
              hint="Checking plus high-yield savings. The money you could spend this week."
            >
              <MoneyInput
                value={fromBalances && starting.asOf ? starting.cash : a.savings.cashBalance}
                disabled={fromBalances && !!starting.asOf}
                step={1000}
                onChange={(v) => setAssumptions({ savings: { cashBalance: v } })}
              />
            </Field>
            <Field
              label="Invested today"
              hint="Taxable brokerage. Not retirement accounts — those are tracked separately."
            >
              <MoneyInput
                value={
                  fromBalances && starting.asOf ? starting.investments : a.savings.investmentBalance
                }
                disabled={fromBalances && !!starting.asOf}
                step={1000}
                onChange={(v) => setAssumptions({ savings: { investmentBalance: v } })}
              />
            </Field>
            <Field
              label="Return on cash"
              hint="What a high-yield savings account pays. Low, but the money is there when you need it."
            >
              <PercentInput
                value={a.savings.cashReturnAnnual}
                onChange={(v) => setAssumptions({ savings: { cashReturnAnnual: v } })}
              />
            </Field>
            <Field
              label="Return on investments"
              hint="Long-run average on the invested pool. Keep it below the retirement return if this money is less aggressively invested."
            >
              <PercentInput
                value={a.savings.investmentReturnAnnual}
                onChange={(v) => setAssumptions({ savings: { investmentReturnAnnual: v } })}
              />
            </Field>
            <Field
              label="Emergency fund (months)"
              hint="How many months of total outgoings to keep in cash before investing the rest. Everything above this gets swept into investments each month; shortfalls sell investments to cover them."
            >
              <NumberInput
                value={a.savings.cashBufferMonths}
                min={0}
                max={36}
                onChange={(v) => setAssumptions({ savings: { cashBufferMonths: v } })}
              />
            </Field>
            <div className="flex items-end">
              <p className="text-xs text-slate-500">
                Today that buffer target is about{' '}
                <strong className="text-slate-700">
                  {money(
                    a.savings.cashBufferMonths *
                      ((fromBudget ? totals.fixed + totals.variable : a.expenses.fixedMonthly + a.expenses.variableMonthly) +
                        (fromBudget ? totals.rent : a.expenses.currentRentMonthly)),
                  )}
                </strong>
                . It rises with inflation, and jumps when the mortgage replaces rent.
              </p>
            </div>
          </div>
          {fromBalances && starting.asOf && (
            <p className="mt-3 text-xs text-slate-500">
              From your snapshot dated {starting.asOf}: {money(starting.liquid)} available in total.
            </p>
          )}
        </Card>

        <Card title="Home purchase" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Target price (today)"
              hint="What the kind of house you want costs right now. The model grows this by the appreciation rate while you save, so waiting means a bigger down payment."
            >
              <MoneyInput
                value={a.home.targetPrice}
                step={5000}
                onChange={(v) => setAssumptions({ home: { targetPrice: v } })}
              />
            </Field>
            <Field
              label="Down payment"
              hint="Percent of the purchase price you put down. 20% avoids mortgage insurance."
            >
              <PercentInput
                value={a.home.downPaymentPct}
                step={0.5}
                onChange={(v) => setAssumptions({ home: { downPaymentPct: v } })}
              />
            </Field>
            <Field
              label="Closing costs"
              hint="Fees due at closing, on top of the down payment. Usually 2-5% of the price."
            >
              <PercentInput
                value={a.home.closingCostPct}
                step={0.25}
                onChange={(v) => setAssumptions({ home: { closingCostPct: v } })}
              />
            </Field>
            <Field
              label="Mortgage rate"
              hint="The quoted annual rate on the loan. Fixed for the life of the loan in this model."
            >
              <PercentInput
                value={a.home.mortgageRateAnnual}
                step={0.125}
                onChange={(v) => setAssumptions({ home: { mortgageRateAnnual: v } })}
              />
            </Field>
            <Field label="Mortgage term (years)" hint="30 is standard. A 15-year loan costs more each month but builds equity much faster.">
              <NumberInput
                value={a.home.mortgageTermYears}
                min={5}
                max={40}
                onChange={(v) => setAssumptions({ home: { mortgageTermYears: v } })}
              />
            </Field>
            <Field
              label="Tax + insurance + HOA / month"
              hint="Everything in the monthly housing payment that isn't loan principal and interest. Held flat over time, since it's an estimate anyway."
            >
              <MoneyInput
                value={a.home.taxInsuranceHoaMonthly}
                onChange={(v) => setAssumptions({ home: { taxInsuranceHoaMonthly: v } })}
              />
            </Field>
            <Field
              label="Home appreciation / year"
              hint="How fast house prices rise. This cuts both ways: it grows your equity after you buy, but raises the price while you're still saving."
            >
              <PercentInput
                value={a.home.appreciationAnnual}
                onChange={(v) => setAssumptions({ home: { appreciationAnnual: v } })}
              />
            </Field>
            <Field
              label="Upkeep / year"
              hint="Maintenance and repairs, as a percent of what the house is worth. 1% a year is the usual rule of thumb. You never get a bill for this, which is exactly why leaving it out makes buying look better than it is."
            >
              <PercentInput
                value={a.home.maintenanceAnnualPct}
                step={0.25}
                onChange={(v) => setAssumptions({ home: { maintenanceAnnualPct: v } })}
              />
            </Field>
            <Field
              label="Mortgage insurance / year"
              hint="PMI, as a percent of the original loan. Charged only while you owe more than the threshold below, so a 20% down payment never pays any."
            >
              <PercentInput
                value={a.home.pmiAnnualPct}
                step={0.05}
                onChange={(v) => setAssumptions({ home: { pmiAnnualPct: v } })}
              />
            </Field>
            <Field
              label="Mortgage insurance drops at"
              hint="Loan-to-value ratio at which PMI falls away. Conventionally 80% — reached by paying down the loan, by the house appreciating, or both."
            >
              <PercentInput
                value={a.home.pmiRemovedAtLtv}
                step={1}
                onChange={(v) => setAssumptions({ home: { pmiRemovedAtLtv: v } })}
              />
            </Field>
          </div>
          {1 - a.home.downPaymentPct > a.home.pmiRemovedAtLtv &&
            (a.home.pmiAnnualPct > 0 || a.home.pmiUpfrontPct > 0) &&
            (() => {
              const loan = a.home.targetPrice * (1 - a.home.downPaymentPct);
              const monthly = (loan * a.home.pmiAnnualPct) / 12;
              const upfront = loan * a.home.pmiUpfrontPct;
              const cashNeeded =
                a.home.targetPrice * (a.home.downPaymentPct + a.home.closingCostPct) + upfront;
              return (
                <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                  <strong>{pct(a.home.downPaymentPct, 0)} down triggers mortgage insurance.</strong>{' '}
                  On today&rsquo;s target price that is {money(monthly)} a month
                  {upfront > 0 && <> plus {money(upfront)} upfront at closing</>}, on top of a{' '}
                  {money(loan)} loan. All in, you would need{' '}
                  <strong>{money(cashNeeded)}</strong> on the day. The monthly premium falls away
                  once you owe less than {pct(a.home.pmiRemovedAtLtv, 0)} of what the house is
                  worth — sooner if it appreciates.
                </div>
              );
            })()}
        </Card>

        <Card
          title="A second income"
          subtitle="A partner returning to work — and the childcare that comes with it."
          className="lg:col-span-2"
        >
          <Toggle
            checked={a.secondIncome.enabled}
            onChange={(v) => setAssumptions({ secondIncome: { enabled: v } })}
            label={<strong>Include a second income in every calculation</strong>}
            hint="Flows through the dashboard, the affordability table and the waiting analysis. Off by default so the baseline stays honest."
          />
          {a.secondIncome.enabled && (
            <>
              <div className="mt-4">
                <SectionTitle hint="Real 2026 wage data for the Philadelphia metro. Take-home is at the marginal rate — a second income stacks on the first, so every dollar is taxed at the top of your bracket.">
                  Start from a realistic option
                </SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {SECOND_INCOME_OPTIONS.filter((o) => o.grossAnnual > 0).map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      title={`${o.hoursNote} — ${o.note}`}
                      onClick={() =>
                        setAssumptions({
                          secondIncome: {
                            monthlyTakeHome: Math.round(netMonthlyFromGross(o.grossAnnual)),
                            additionalCostsMonthly: o.costsMonthly,
                          },
                        })
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-xs transition hover:bg-slate-50"
                    >
                      <span className="block font-medium text-slate-900">{o.label}</span>
                      <span className="block text-slate-500">
                        {money(o.grossAnnual)} gross · {money(netMonthlyFromGross(o.grossAnnual))}/mo
                        net
                        {o.costsMonthly > 0 && ` · ${money(o.costsMonthly)} childcare`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Who" hint="Just a label for the month-by-month table.">
                  <TextInput
                    value={a.secondIncome.label}
                    onChange={(v) => setAssumptions({ secondIncome: { label: v } })}
                  />
                </Field>
                <Field
                  label="Take-home / month"
                  hint="After tax. This is what actually lands in the account, not the salary."
                >
                  <MoneyInput
                    value={a.secondIncome.monthlyTakeHome}
                    onChange={(v) => setAssumptions({ secondIncome: { monthlyTakeHome: v } })}
                  />
                </Field>
                <Field
                  label="Childcare & costs of working"
                  hint="Childcare, commuting, a second car. Charged only while the second income is running. This number decides whether the early years are worth it, so get real quotes."
                >
                  <MoneyInput
                    value={a.secondIncome.additionalCostsMonthly}
                    onChange={(v) =>
                      setAssumptions({ secondIncome: { additionalCostsMonthly: v } })
                    }
                  />
                </Field>
                <Field
                  label="Costs stop after month"
                  hint="Typically when the youngest reaches school age. Set 0 to run them for the whole projection."
                >
                  <NumberInput
                    value={a.secondIncome.additionalCostsEndMonth ?? 0}
                    min={0}
                    max={settings.horizonMonths}
                    onChange={(v) =>
                      setAssumptions({ secondIncome: { additionalCostsEndMonth: v > 0 ? v : null } })
                    }
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Slider
                  label="Starts in"
                  hint="Drag it. Because childcare usually ends on a fixed date, going back earlier can buy more months of net loss rather than fewer."
                  value={a.secondIncome.startMonth}
                  min={1}
                  max={Math.min(settings.horizonMonths, 120)}
                  onChange={(v) => setAssumptions({ secondIncome: { startMonth: v } })}
                  display={`${monthLabel(settings.startDate, a.secondIncome.startMonth)} · month ${a.secondIncome.startMonth}`}
                />
              </div>

              <div className="mt-4 space-y-3">
                <Toggle
                  checked={a.secondIncome.growsWithIncome}
                  onChange={(v) => setAssumptions({ secondIncome: { growsWithIncome: v } })}
                  label="Rises with pay rises"
                />
                <Toggle
                  checked={a.secondIncome.affectedByJobLoss}
                  onChange={(v) => setAssumptions({ secondIncome: { affectedByJobLoss: v } })}
                  label="Also cut if the main earner loses their job"
                  hint="Normally off — a different employer means a different risk. Turn it on only if both work somewhere the same shock would hit."
                />
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
                <strong className="text-slate-900">Social Security credits.</strong> In 2026 four
                credits — a full year — costs only{' '}
                {money(SS_CREDIT_2026.fullYearEarnings)} of earnings, and forty credits (ten years)
                earns a benefit in her own right. Part-time work clears that threshold just as
                completely as full-time, so <em>building Social Security is not a reason to choose
                full-time over part-time</em>. The reasons to prefer full-time are the pay and the
                career progression, not the credits.
              </div>

              {(() => {
                const net = a.secondIncome.monthlyTakeHome - a.secondIncome.additionalCostsMonthly;
                return (
                  <div
                    className={`mt-4 rounded-xl px-4 py-3 text-xs leading-relaxed ${
                      net < 0 ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'
                    }`}
                  >
                    <strong>
                      {net < 0
                        ? `While childcare runs this costs you ${money(Math.abs(net))} a month.`
                        : `While childcare runs this adds ${money(net)} a month.`}
                    </strong>{' '}
                    {money(a.secondIncome.monthlyTakeHome)} in, {money(a.secondIncome.additionalCostsMonthly)} out.
                    Once the costs stop, the full {money(a.secondIncome.monthlyTakeHome)} lands on
                    the bottom line — a swing of{' '}
                    {money(a.secondIncome.additionalCostsMonthly)} in a single month.
                    {net < 0 && (
                      <>
                        {' '}
                        And note it does <em>not</em> protect you against a job loss while that is
                        true: you would still be paying more for childcare than the second wage
                        brings in.
                      </>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </Card>

        <Card
          title="Someone moving in"
          subtitle="A relative contributing to household costs, if you buy somewhere with room for them."
          className="lg:col-span-2"
        >
          <Toggle
            checked={a.coResident.enabled}
            onChange={(v) => setAssumptions({ coResident: { enabled: v } })}
            label="Include a co-resident's contribution"
            hint="Their income is treated differently from a pay rise: it does not stop if you lose your job, but it only starts once you own a house with space for them."
          />
          {a.coResident.enabled && (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Who" hint="Just a label, so you can tell it apart on the month-by-month table.">
                  <TextInput
                    value={a.coResident.label}
                    onChange={(v) => setAssumptions({ coResident: { label: v } })}
                  />
                </Field>
                <Field
                  label="Contribution / month"
                  hint="What they would put towards household costs each month."
                >
                  <MoneyInput
                    value={a.coResident.monthlyAmount}
                    onChange={(v) => setAssumptions({ coResident: { monthlyAmount: v } })}
                  />
                </Field>
                <Field
                  label="Extra house price for the space"
                  hint="What a house with a separate living space — in-law suite, finished basement, first-floor bedroom — costs above your target price. This is the real cost of the arrangement, and the model charges it in full."
                >
                  <MoneyInput
                    value={a.coResident.homePricePremium}
                    step={5000}
                    onChange={(v) => setAssumptions({ coResident: { homePricePremium: v } })}
                  />
                </Field>
                <Field
                  label="Stops after month (blank = never)"
                  hint="Leave at 0 to run for the whole projection."
                >
                  <NumberInput
                    value={a.coResident.endMonth ?? 0}
                    min={0}
                    max={settings.horizonMonths}
                    onChange={(v) => setAssumptions({ coResident: { endMonth: v > 0 ? v : null } })}
                  />
                </Field>
              </div>
              <div className="mt-4 space-y-3">
                <Toggle
                  checked={a.coResident.requiresHomePurchase}
                  onChange={(v) => setAssumptions({ coResident: { requiresHomePurchase: v } })}
                  label="Only once we own a suitable house"
                  hint="On means nothing arrives while renting — which is exactly why this changes the buy-early calculation."
                />
                <Toggle
                  checked={a.coResident.growsWithInflation}
                  onChange={(v) => setAssumptions({ coResident: { growsWithInflation: v } })}
                  label="Rises with inflation"
                  hint="Fixed, non-wage income often carries a cost-of-living adjustment."
                />
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
                <strong className="text-slate-900">The trade-off in one line.</strong> The
                contribution is worth {money(a.coResident.monthlyAmount)} a month, but only after
                you buy — and the extra {money(a.coResident.homePricePremium)} of house costs you{' '}
                {money(
                  (a.coResident.homePricePremium *
                    (a.home.downPaymentPct + a.home.closingCostPct)),
                )}{' '}
                more at closing, which pushes the purchase further out. Long run it usually pays
                for itself; short run it makes the deposit harder.
              </div>
            </>
          )}
        </Card>

        <Card
          title="If someone loses their job"
          subtitle="These apply only to scenarios where the job-loss switch is on."
          className="lg:col-span-2"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Starts in month" hint="How many months from now the income stops. Each scenario can override this.">
              <NumberInput
                value={a.jobLoss.startMonth}
                min={1}
                max={settings.horizonMonths}
                onChange={(v) => setAssumptions({ jobLoss: { startMonth: v } })}
              />
            </Field>
            <Field label="Lasts (months)" hint="How long until income is back to normal.">
              <NumberInput
                value={a.jobLoss.durationMonths}
                min={0}
                max={settings.horizonMonths}
                onChange={(v) => setAssumptions({ jobLoss: { durationMonths: v } })}
              />
            </Field>
            <Field
              label="Income still coming in"
              hint="Share of normal take-home you'd still have: severance, unemployment, and the other salary. 0% means all income stops."
            >
              <PercentInput
                value={a.jobLoss.incomeReplacementPct}
                step={5}
                onChange={(v) => setAssumptions({ jobLoss: { incomeReplacementPct: v } })}
              />
            </Field>
            <Field
              label="Spending cut back by"
              hint="How much you'd trim from normal spending while the income is down. Housing is never cut — rent and mortgage still have to be paid."
            >
              <PercentInput
                value={a.jobLoss.expenseCutPct}
                step={5}
                onChange={(v) => setAssumptions({ jobLoss: { expenseCutPct: v } })}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Toggle
              checked={a.jobLoss.pauseRetirementContributions}
              onChange={(v) => setAssumptions({ jobLoss: { pauseRetirementContributions: v } })}
              label="Pause retirement contributions during the gap"
              hint="Both your contribution and the employer match stop, since they come with the job. This frees up cash but slows retirement growth."
            />
          </div>
        </Card>

        <Card
          title="You, and how far ahead to look"
          subtitle="Retirement milestones are measured from your age, so this is what makes the long view mean anything."
          className="lg:col-span-2"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Your age" hint="Placeholder until you set it. Every retirement milestone below is measured from this.">
              <NumberInput
                value={a.household.primaryAge}
                min={18}
                max={90}
                onChange={(v) => setAssumptions({ household: { primaryAge: v } })}
              />
            </Field>
            <Field label="Partner's age" hint="Shown alongside the milestones for context. It does not change any of the maths.">
              <NumberInput
                value={a.household.partnerAge}
                min={18}
                max={90}
                onChange={(v) => setAssumptions({ household: { partnerAge: v } })}
              />
            </Field>
            <Field label="Starting month" hint="Month 1 of the projection. Used to label months with real dates.">
              <DateInput
                type="month"
                value={settings.startDate}
                onChange={(v) => setSettings({ startDate: v })}
              />
            </Field>
            <Field
              label="Project ahead (months)"
              hint="How far the model runs. Long enough to outlive the mortgage is what makes the buy-early comparison honest."
            >
              <NumberInput
                value={settings.horizonMonths}
                min={12}
                max={720}
                step={12}
                onChange={(v) => setSettings({ horizonMonths: v })}
              />
            </Field>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <SectionTitle hint="Quick presets. The short windows are for the house decision; the long ones are for the retirement question.">
              How far ahead
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
              {HORIZON_PRESETS.map((preset) => {
                const months = preset.months(a.household.primaryAge);
                const activePreset = settings.horizonMonths === months;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    disabled={months <= 12}
                    onClick={() => setSettings({ horizonMonths: months })}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      activePreset
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {preset.label}
                    <span className="ml-1.5 text-slate-400">
                      {months > 12 ? `${Math.round(months / 12)}y` : '—'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <SectionTitle hint="The ages the dashboard reports net worth, retirement and home equity at. Only ages inside the projection window can be shown.">
              Milestone ages
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
              {CANDIDATE_AGES.map((age) => {
                const selected = settings.milestoneAges.includes(age);
                const reachable =
                  age > a.household.primaryAge &&
                  (age - a.household.primaryAge) * 12 + 1 <= settings.horizonMonths;
                return (
                  <button
                    key={age}
                    type="button"
                    onClick={() =>
                      setSettings({
                        milestoneAges: selected
                          ? settings.milestoneAges.filter((x) => x !== age)
                          : [...settings.milestoneAges, age].sort((x, y) => x - y),
                      })
                    }
                    title={reachable ? undefined : 'Outside the current projection window'}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                    } ${reachable ? '' : 'opacity-40'}`}
                  >
                    {age}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Faded ages fall outside the projection window — stretch the window to include them.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
