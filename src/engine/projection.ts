import type {
  Assumptions,
  JobLossAssumptions,
  MonthlyResult,
  ScenarioConfig,
  ScenarioSummary,
} from '../model/types';
import {
  compound,
  monthlyGeometric,
  monthlyNominal,
  monthlyPayment,
  remainingBalance,
} from './finance';

/**
 * ============================================================================
 *  The projection engine.
 * ============================================================================
 *
 * `runProjection` is a pure function: same inputs -> same outputs, no state, no
 * randomness, no dependency on React or the browser. It is the one part of this
 * app that has to be numerically right, so it lives on its own and is tested
 * against hand-computed values in `projection.test.ts`.
 *
 * Modelling decisions worth knowing (all of them are deliberate):
 *
 *  1. Month 1 is "this month" -- no growth applied. Month 13 has had exactly one
 *     year of raises/inflation/returns.
 *  1b. A bonus lands as a lump in one calendar month a year, not smeared across
 *     twelve. Smearing it would hide the eleven months where that money is not
 *     actually in the account, which is precisely when a buffer gets tested.
 *  2. The target house appreciates while we save for it. Waiting means a bigger
 *     down payment, which is the whole point of comparing buy-early vs buy-late.
 *  3. Rent inflates at the general expense inflation rate.
 *  4. Property tax / insurance / HOA is held flat in nominal terms. It is an
 *     estimate anyway, and holding it flat keeps the model easy to explain.
 *  5. Liquid savings is allowed to go negative. That is not a bug -- it is the
 *     model telling us the plan doesn't fund itself. The UI flags it in red.
 *  6. During a job loss the employer match stops with the job (both stop
 *     together when `pauseRetirementContributions` is set).
 *  7. Savings live in two pools. Cash is held to a buffer target of N months of
 *     total outgoings; anything above that is swept into investments at the
 *     higher return. Shortfalls drain cash first, then sell investments. Over a
 *     five-year window this barely moves the answer; over thirty it dominates
 *     it, which is the whole reason the split exists.
 *  8. Retirement contributions can grow with income. A flat contribution over
 *     thirty years of raises is a materially wrong model, so this defaults on.
 *  8b. Employer money comes in two shapes: a regular per-paycheque match, and
 *     an annual lump such as a profit share or an HSA seed. Both grow the
 *     balance without touching take-home. The lump is modelled as landing in
 *     its actual month, because averaging it away hides it.
 *  9. Owning costs more than the mortgage. Upkeep accrues every month as a
 *     share of the home's value, and PMI is charged until the loan-to-value
 *     ratio clears the threshold. Both are easy to omit from a rent-vs-buy
 *     comparison, and omitting them flatters buying.
 *  9b. A second earner returning to work is modelled with the costs that come
 *     with it. Childcare routinely eats most of a modest salary until the child
 *     reaches school age, so the net effect is often negative for a few years
 *     and strongly positive afterwards. Netting them into one figure would hide
 *     the whole shape of it.
 *  9c. The HSA is counted inside the retirement balance, so paying medical
 *     bills from it -- or reimbursing yourself for past ones, which the IRS
 *     allows with no deadline -- moves money from long-term compounding into
 *     present-day cash. Both directions are tax-free; the trade is growth
 *     against liquidity.
 *  9d. Down-payment assistance reduces the cash you need at closing, but it is
 *     modelled as a LIEN rather than a gift. K-FIT is forgiven at 10% a year,
 *     so equity climbs as the lien melts; K-DATE is deferred, so it sits
 *     against your equity until you sell. Treating either as free money on day
 *     one would overstate net worth by the whole amount.
 * 10. A co-resident's contribution is contingent on owning. It starts at the
 *     buy month, carries a house-price premium for the extra space, and -- the
 *     part that matters -- does NOT stop during a job loss, because it need
 *     not depend on your employment at all.
 * 11. Fixed obligations -- a court-ordered or contractual payment, a loan with
 *     a known end date -- neither inflate nor get cut during a job loss. See
 *     TimedObligation for why both of those matter. The month one ends is a
 *     genuine step change in the plan.
 *
 * What this model deliberately does NOT do: it projects accumulation only. It
 * does not model drawing down in retirement, taxes on withdrawal, Social
 * Security, or required distributions. "Net worth at 65" means what you have
 * built by then, not what it will support.
 */

/** Resolve shared job-loss assumptions against a scenario's overrides. */
function resolveJobLoss(base: JobLossAssumptions, scenario: ScenarioConfig): JobLossAssumptions {
  return { ...base, ...(scenario.jobLossOverride ?? {}) };
}

/** Is month `m` inside this scenario's job-loss window? */
function isJobLossActive(m: number, scenario: ScenarioConfig, jl: JobLossAssumptions): boolean {
  if (!scenario.hasJobLoss) return false;
  if (jl.durationMonths <= 0) return false;
  return m >= jl.startMonth && m < jl.startMonth + jl.durationMonths;
}

/** Total fixed obligations due in month `m`. Never inflated, never cut. */
export function obligationsDue(assumptions: Assumptions, m: number): number {
  let total = 0;
  for (const o of assumptions.obligations) {
    if (m < o.startMonth) continue;
    if (o.endMonth !== null && m > o.endMonth) continue;
    total += o.monthlyAmount;
  }
  return total;
}

/** Age of the primary person in month `m`. Month 1 is their age today. */
export function ageAtMonth(assumptions: Assumptions, m: number): number {
  return assumptions.household.primaryAge + (m - 1) / 12;
}

/**
 * The first month in which the primary person has reached `targetAge`.
 * Returns null if that never happens inside `months`.
 */
export function monthForAge(
  assumptions: Assumptions,
  targetAge: number,
  months: number,
): number | null {
  const m = Math.round((targetAge - assumptions.household.primaryAge) * 12) + 1;
  if (m < 1 || m > months) return null;
  return m;
}

/**
 * Price of the target house in month `m`, having appreciated from today.
 * Month 1 == today's price.
 */
export function homePriceAtMonth(assumptions: Assumptions, m: number): number {
  const appr = monthlyGeometric(assumptions.home.appreciationAnnual);
  // A house with a separate living space costs more. That premium is the price
  // of the co-resident's contribution, and the comparison only means anything
  // if both sides are counted.
  const { coResident } = assumptions;
  const premium = coResident.enabled ? coResident.homePricePremium : 0;
  return compound(assumptions.home.targetPrice + premium, appr, m - 1);
}

/**
 * Cash you have to hand over to buy in month `m`: down payment, closing costs,
 * and -- if the down payment is small enough to need mortgage insurance -- the
 * upfront premium on top.
 */
export function cashRequiredToBuy(assumptions: Assumptions, m: number): number {
  const { downPaymentPct, closingCostPct, pmiUpfrontPct, pmiRemovedAtLtv } = assumptions.home;
  const price = homePriceAtMonth(assumptions, m);
  const loanShare = 1 - downPaymentPct;
  // A big enough deposit avoids mortgage insurance entirely.
  const needsMortgageInsurance = loanShare > pmiRemovedAtLtv;
  const upfront = needsMortgageInsurance ? loanShare * pmiUpfrontPct : 0;
  const gross = price * (downPaymentPct + closingCostPct + upfront);

  // Assistance is money you do not have to bring on the day.
  const { assistanceRepayment, assistancePctOfPrice, assistanceMaxAmount } = assumptions.home;
  const assistanceRaw = assistanceRepayment === 'none' ? 0 : price * assistancePctOfPrice;
  const assistance =
    assistanceMaxAmount === null ? assistanceRaw : Math.min(assistanceRaw, assistanceMaxAmount);

  return Math.max(0, gross - assistance);
}

/**
 * Project a single scenario forward month by month.
 *
 * @param assumptions the shared household model
 * @param scenario    which house-buying / job-loss variant to run
 * @param months      horizon length (60 = five years)
 */
export function runProjection(
  assumptions: Assumptions,
  scenario: ScenarioConfig,
  months: number,
): MonthlyResult[] {
  const { income, expenses, retirement, savings, home } = assumptions;
  const jl = resolveJobLoss(assumptions.jobLoss, scenario);

  const incomeGrowth = monthlyGeometric(income.growthAnnual);
  const inflation = monthlyGeometric(expenses.inflationAnnual);
  const retirementReturn = monthlyGeometric(retirement.returnAnnual);
  const cashReturn = monthlyGeometric(savings.cashReturnAnnual);
  const investmentReturn = monthlyGeometric(savings.investmentReturnAnnual);
  const appreciation = monthlyGeometric(home.appreciationAnnual);

  const mortgageRate = monthlyNominal(home.mortgageRateAnnual);
  const termMonths = Math.round(home.mortgageTermYears * 12);

  // --- Purchase terms are locked in at the buy month -----------------------
  const buyMonth = scenario.buyMonth;
  const purchasePrice = buyMonth === null ? 0 : homePriceAtMonth(assumptions, buyMonth);
  const downPayment = purchasePrice * home.downPaymentPct;
  const closingCosts = purchasePrice * home.closingCostPct;
  const loanAmount = purchasePrice - downPayment;
  const piPayment = monthlyPayment(loanAmount, mortgageRate, termMonths);
  // PMI is quoted against the original loan, not the current balance.
  const pmiFullMonthly = (loanAmount * home.pmiAnnualPct) / 12;
  // A small down payment can also carry a one-off premium at closing.
  const needsMortgageInsurance =
    purchasePrice > 0 && loanAmount / purchasePrice > home.pmiRemovedAtLtv;
  const upfrontPmi = needsMortgageInsurance ? loanAmount * home.pmiUpfrontPct : 0;

  // Down-payment assistance reduces the cash you need on the day, but until it
  // is forgiven it is a lien -- so it does NOT add to net worth at closing.
  const assistanceRaw =
    !home.assistanceEnabled || home.assistanceRepayment === 'none'
      ? 0
      : purchasePrice * home.assistancePctOfPrice;
  const assistanceAmount =
    home.assistanceMaxAmount === null
      ? assistanceRaw
      : Math.min(assistanceRaw, home.assistanceMaxAmount);
  const assistanceTermMonths = Math.max(1, Math.round(home.assistanceTermYears * 12));

  let cash = savings.cashBalance;
  let investments = savings.investmentBalance;
  let retirementBalance = retirement.currentBalance;

  const results: MonthlyResult[] = [];

  for (let m = 1; m <= months; m++) {
    const jobLossActive = isJobLossActive(m, scenario, jl);
    const ownsHome = buyMonth !== null && m >= buyMonth;
    const isPurchaseMonth = buyMonth !== null && m === buyMonth;

    // --- Income ----------------------------------------------------------
    const baseIncome = compound(income.monthlyTakeHome, incomeGrowth, m - 1);

    // A bonus is a lump, not a monthly average. Which projection months are
    // Januaries depends on when the projection starts.
    const calendarMonth = ((income.calendarStartMonth - 1 + (m - 1)) % 12) + 1;
    const bonusDue =
      income.annualBonusNet > 0 && calendarMonth === income.annualBonusMonth
        ? compound(income.annualBonusNet, incomeGrowth, m - 1)
        : 0;

    // Both are employment income, so both take the job-loss haircut. If you are
    // not there in January, there is no bonus.
    const grossThisMonth = baseIncome + bonusDue;
    const netIncome = jobLossActive ? grossThisMonth * jl.incomeReplacementPct : grossThisMonth;
    const bonusIncome = jobLossActive ? bonusDue * jl.incomeReplacementPct : bonusDue;

    // --- A partner returning to work --------------------------------------
    // Kept apart from the main salary: it starts on its own schedule, brings
    // its own costs, and usually survives the other earner losing their job.
    const { secondIncome: second } = assumptions;
    const secondActive = second.enabled && m >= second.startMonth;
    const secondRaw = secondActive
      ? second.growsWithIncome
        ? compound(second.monthlyTakeHome, incomeGrowth, m - 1)
        : second.monthlyTakeHome
      : 0;
    const secondIncome =
      secondActive && second.affectedByJobLoss && jobLossActive
        ? secondRaw * jl.incomeReplacementPct
        : secondRaw;

    // Childcare and the rest stop at school age, not when the job does.
    const costsRunning =
      secondActive &&
      (second.additionalCostsEndMonth === null || m <= second.additionalCostsEndMonth);
    const grossCareCosts = costsRunning
      ? compound(second.additionalCostsMonthly, inflation, m - 1)
      : 0;

    // A Dependent Care FSA pays childcare out of pre-tax income, so it saves
    // your marginal rate -- but only on what you actually spend, and only up to
    // the election.
    const fsaMonthlyCap = second.dependentCareFsaAnnual / 12;
    const dependentCareTaxSaving =
      grossCareCosts > 0
        ? Math.min(grossCareCosts, fsaMonthlyCap) * second.dependentCareFsaTaxRate
        : 0;
    const secondIncomeCosts = grossCareCosts - dependentCareTaxSaving;

    // --- A co-resident's contribution ------------------------------------
    // Deliberately NOT reduced during a job loss: their income does not depend
    // on your job. That independence is most of its value.
    const { coResident } = assumptions;
    const coResidentActive =
      coResident.enabled &&
      (!coResident.requiresHomePurchase || ownsHome) &&
      (coResident.endMonth === null || m <= coResident.endMonth);
    const coResidentIncome = coResidentActive
      ? coResident.growsWithInflation
        ? compound(coResident.monthlyAmount, inflation, m - 1)
        : coResident.monthlyAmount
      : 0;

    // --- Living expenses (housing excluded, handled below) ----------------
    const baseExpenses = compound(
      expenses.fixedMonthly + expenses.variableMonthly,
      inflation,
      m - 1,
    );
    const totalExpenses = jobLossActive ? baseExpenses * (1 - jl.expenseCutPct) : baseExpenses;

    // Fixed commitments. Deliberately outside both the inflation and the
    // job-loss cut above -- see TimedObligation for why.
    const obligations = obligationsDue(assumptions, m);

    // --- Housing: rent, then PITI + PMI, plus upkeep on the side -----------
    let housingPayment: number;
    let pmiPayment = 0;
    let homeMaintenance = 0;
    let homeValue = 0;
    let mortgageBalance = 0;
    if (ownsHome) {
      const paymentsMade = m - (buyMonth as number) + 1;
      // Once the loan is repaid the payment drops to escrow only. This only
      // shows up on horizons long enough to outlive the mortgage -- which is
      // exactly what the retirement-age view is for.
      const stillRepaying = paymentsMade <= termMonths;
      homeValue = compound(purchasePrice, appreciation, m - (buyMonth as number));
      mortgageBalance = remainingBalance(loanAmount, mortgageRate, termMonths, paymentsMade);

      // PMI falls away once enough of the house is actually yours. Note this
      // happens sooner when the home appreciates, not just as you pay down.
      const ltv = homeValue > 0 ? mortgageBalance / homeValue : 0;
      pmiPayment = ltv > home.pmiRemovedAtLtv ? pmiFullMonthly : 0;

      housingPayment =
        (stillRepaying ? piPayment : 0) + home.taxInsuranceHoaMonthly + pmiPayment;
      // Upkeep tracks what the house is worth, so it grows with appreciation.
      homeMaintenance = (homeValue * home.maintenanceAnnualPct) / 12;
    } else {
      housingPayment = compound(expenses.currentRentMonthly, inflation, m - 1);
    }
    // What is still owed on any down-payment assistance. Forgiven assistance
    // melts away over its term; deferred assistance sits there until you sell.
    // Either way it is a second lien, so equity has to be net of it.
    let assistanceOutstanding = 0;
    if (ownsHome && assistanceAmount > 0) {
      const monthsHeld = m - (buyMonth as number) + 1;
      if (home.assistanceRepayment === 'forgiven' || home.assistanceRepayment === 'amortised') {
        assistanceOutstanding =
          assistanceAmount * Math.max(0, 1 - monthsHeld / assistanceTermMonths);
      } else if (home.assistanceRepayment === 'deferred') {
        assistanceOutstanding = assistanceAmount;
      }
    }

    const homeEquity = ownsHome ? homeValue - mortgageBalance - assistanceOutstanding : 0;

    // --- Retirement -------------------------------------------------------
    const contributionsPaused = jobLossActive && jl.pauseRetirementContributions;
    // Contributions track pay rises unless explicitly held flat.
    const contributionScale = retirement.contributionsGrowWithIncome
      ? compound(1, incomeGrowth, m - 1)
      : 1;
    // Diverting the HSA to the deposit lowers what goes in each month.
    const baseEmployee = retirement.pauseHsaMax
      ? retirement.pausedEmployeeMonthly
      : retirement.employeeMonthly;
    const employeeContribution = contributionsPaused ? 0 : baseEmployee * contributionScale;
    const employerMatch = contributionsPaused
      ? 0
      : retirement.employerMatchMonthly * contributionScale;

    // Employer money that arrives once a year -- profit share, HSA seed. Lands
    // in one calendar month, not smeared, and stops if you are not there.
    const employerLump =
      !contributionsPaused &&
      retirement.employerAnnualLump > 0 &&
      calendarMonth === retirement.employerAnnualLumpMonth
        ? retirement.employerAnnualLump * contributionScale
        : 0;

    const employerContribution = employerMatch + employerLump;

    // --- Money coming back OUT of the HSA ---------------------------------
    // The HSA sits inside the retirement balance, so spending from it moves
    // money from long-term compounding into present-day cash. Never more than
    // the balance holds.
    // Timed either to the purchase (the usual case -- it exists to bolster cash
    // at closing) or to a fixed month.
    const reimbursementMonth = retirement.hsaReimbursementAtPurchase
      ? buyMonth
      : retirement.hsaReimbursementMonth;
    const hsaReimbursed =
      retirement.hsaTakeReimbursement &&
      retirement.hsaReimbursement > 0 &&
      reimbursementMonth !== null &&
      m === reimbursementMonth
        ? retirement.hsaReimbursement
        : 0;
    const hsaMedicalPaid = retirement.hsaPayMedical ? retirement.hsaMedicalMonthly : 0;

    retirementBalance =
      retirementBalance * (1 + retirementReturn) + employeeContribution + employerContribution;

    const drawnFromHsa = Math.min(hsaReimbursed + hsaMedicalPaid, Math.max(retirementBalance, 0));
    retirementBalance -= drawnFromHsa;

    // --- Cash, investments, and the sweep between them --------------------
    const netCashFlow =
      netIncome +
      coResidentIncome +
      secondIncome -
      secondIncomeCosts +
      // Medical paid from the HSA is spending you no longer fund from cash.
      drawnFromHsa -
      totalExpenses -
      obligations -
      housingPayment -
      homeMaintenance -
      employeeContribution;
    const purchaseOutflow = isPurchaseMonth
      ? downPayment + closingCosts + upfrontPmi - assistanceAmount
      : 0;
    const assistanceReceived = isPurchaseMonth ? assistanceAmount : 0;

    // 1. Each pool earns its own return on last month's closing balance.
    cash = cash * (1 + cashReturn);
    investments = investments * (1 + investmentReturn);

    // 2. This month's cash flow lands, and the house money leaves.
    cash += netCashFlow - purchaseOutflow;

    // 3. If cash went short, sell investments to cover it. If investments run
    //    out too, cash stays negative -- deliberately NOT clamped.
    if (cash < 0 && investments > 0) {
      const sold = Math.min(investments, -cash);
      investments -= sold;
      cash += sold;
    }

    // 4. Sweep anything above the emergency buffer into investments.
    const bufferTarget =
      savings.cashBufferMonths *
      (totalExpenses + obligations + housingPayment + homeMaintenance + secondIncomeCosts);
    if (cash > bufferTarget) {
      const excess = cash - bufferTarget;
      cash -= excess;
      investments += excess;
    }

    const liquidSavings = cash + investments;

    results.push({
      month: m,
      year: Math.ceil(m / 12),
      netIncome,
      bonusIncome,
      coResidentIncome,
      secondIncome,
      secondIncomeCosts,
      dependentCareTaxSaving,
      hsaMedicalPaid: Math.min(hsaMedicalPaid, drawnFromHsa),
      hsaReimbursed: Math.min(hsaReimbursed, drawnFromHsa),
      totalExpenses,
      obligations,
      housingPayment,
      pmiPayment,
      homeMaintenance,
      jobLossActive,
      ownsHome,
      netCashFlow,
      employeeContribution,
      employerContribution,
      cashBalance: cash,
      investmentBalance: investments,
      liquidSavings,
      age: ageAtMonth(assumptions, m),
      retirementBalance,
      homeValue,
      mortgageBalance,
      homeEquity,
      netWorth: liquidSavings + retirementBalance + homeEquity,
      purchaseOutflow,
      assistanceReceived,
      assistanceOutstanding,
    });
  }

  return results;
}

/**
 * Turn a raw projection into the handful of numbers the dashboard actually
 * shows: when we can afford the house, whether we could afford the one we
 * bought, and how thin the cash gets along the way.
 *
 * "Readiness" is measured against a shadow run of the same scenario in which we
 * never buy. That answers the question a person actually asks -- "when will we
 * have enough saved up?" -- without the answer being distorted by the purchase
 * we are testing.
 */
export function summarizeScenario(
  assumptions: Assumptions,
  scenario: ScenarioConfig,
  months: number,
  milestoneAges: number[] = [],
): ScenarioSummary {
  const monthsResult = runProjection(assumptions, scenario, months);

  const neverBuy = runProjection(assumptions, { ...scenario, buyMonth: null }, months);

  let readinessMonth: number | null = null;
  for (const row of neverBuy) {
    if (row.liquidSavings >= cashRequiredToBuy(assumptions, row.month)) {
      readinessMonth = row.month;
      break;
    }
  }
  const readinessCashRequired = cashRequiredToBuy(assumptions, readinessMonth ?? months);

  // Did the cash actually clear on the month we bought?
  let fundedAtPurchase = true;
  if (scenario.buyMonth !== null) {
    const buyRow = monthsResult[scenario.buyMonth - 1];
    fundedAtPurchase = buyRow !== undefined && buyRow.liquidSavings >= 0;
  }

  let minCashBuffer = Infinity;
  let minCashBufferMonth = 0;
  for (const row of monthsResult) {
    if (row.liquidSavings < minCashBuffer) {
      minCashBuffer = row.liquidSavings;
      minCashBufferMonth = row.month;
    }
  }
  if (!Number.isFinite(minCashBuffer)) {
    minCashBuffer = 0;
    minCashBufferMonth = 0;
  }

  const netWorthAtYear: Record<number, number> = {};
  for (const year of [1, 3, 5]) {
    const row = monthsResult[year * 12 - 1];
    if (row) netWorthAtYear[year] = row.netWorth;
  }

  // --- Where things stand at each retirement milestone ---------------------
  const netWorthAtAge: Record<number, number> = {};
  const retirementAtAge: Record<number, number> = {};
  const homeEquityAtAge: Record<number, number> = {};
  const investmentsAtAge: Record<number, number> = {};
  for (const age of milestoneAges) {
    const m = monthForAge(assumptions, age, months);
    if (m === null) continue;
    const row = monthsResult[m - 1];
    if (!row) continue;
    netWorthAtAge[age] = row.netWorth;
    retirementAtAge[age] = row.retirementBalance;
    homeEquityAtAge[age] = row.homeEquity;
    investmentsAtAge[age] = row.investmentBalance;
  }

  // --- Mortgage life: payoff month, interest paid, total housing outlay -----
  let mortgagePaidOffMonth: number | null = null;
  let totalInterestPaid = 0;
  let totalHousingPaid = 0;
  let totalMaintenancePaid = 0;
  let totalPmiPaid = 0;
  let totalObligationsPaid = 0;
  let assistanceReceived = 0;
  let totalCoResidentIncome = 0;
  let totalSecondIncome = 0;
  let totalSecondIncomeCosts = 0;
  let pmiEndsMonth: number | null = null;
  let everPaidPmi = false;
  let previousBalance = 0;
  const loanShare = 1 - assumptions.home.downPaymentPct;
  const mortgageMonthlyRate = monthlyNominal(assumptions.home.mortgageRateAnnual);
  for (const row of monthsResult) {
    totalHousingPaid += row.housingPayment;
    totalMaintenancePaid += row.homeMaintenance;
    totalPmiPaid += row.pmiPayment;
    totalObligationsPaid += row.obligations;
    assistanceReceived += row.assistanceReceived;
    totalCoResidentIncome += row.coResidentIncome;
    totalSecondIncome += row.secondIncome;
    totalSecondIncomeCosts += row.secondIncomeCosts;
    if (row.pmiPayment > 0) everPaidPmi = true;
    else if (everPaidPmi && pmiEndsMonth === null && row.ownsHome) pmiEndsMonth = row.month;
    if (row.ownsHome) {
      // On the purchase month the opening balance is the original loan; after
      // that it is simply last month's closing balance.
      const opening = row.purchaseOutflow > 0 ? row.homeValue * loanShare : previousBalance;
      totalInterestPaid += opening * mortgageMonthlyRate;
      previousBalance = row.mortgageBalance;
      if (row.mortgageBalance === 0 && mortgagePaidOffMonth === null && opening > 0) {
        mortgagePaidOffMonth = row.month;
      }
    }
  }

  const last = monthsResult[monthsResult.length - 1];

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    color: scenario.color,
    months: monthsResult,
    readinessMonth,
    readinessCashRequired,
    fundedAtPurchase,
    minCashBuffer,
    minCashBufferMonth,
    goesNegative: minCashBuffer < 0,
    netWorthAtYear,
    netWorthAtAge,
    retirementAtAge,
    homeEquityAtAge,
    investmentsAtAge,
    mortgagePaidOffMonth,
    totalInterestPaid,
    totalHousingPaid,
    totalMaintenancePaid,
    totalPmiPaid,
    totalObligationsPaid,
    assistanceReceived,
    totalCoResidentIncome,
    totalSecondIncome,
    totalSecondIncomeCosts,
    pmiEndsMonth,
    endingNetWorth: last ? last.netWorth : 0,
  };
}

/** Run every enabled scenario through the engine. */
export function runAllScenarios(
  assumptions: Assumptions,
  scenarios: ScenarioConfig[],
  months: number,
  milestoneAges: number[] = [],
): ScenarioSummary[] {
  return scenarios
    .filter((s) => s.enabled)
    .map((s) => summarizeScenario(assumptions, s, months, milestoneAges));
}
