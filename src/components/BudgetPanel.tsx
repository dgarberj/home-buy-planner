import { useMemo } from 'react';
import type { BudgetItem } from '../model/types';
import { budgetSurplus, deriveBudgetTotals, deriveObligations, isObligation } from '../lib/derive';
import { money } from '../lib/format';
import { useStore } from '../store/useStore';
import { Button, Card, DateInput, InfoTip, INLINE_INPUT, MoneyInput } from './ui';

/**
 * The monthly budget: every recurring dollar in and out, editable in place.
 *
 * This is the panel that gets touched most often, so it is designed for fast
 * scanning and editing -- grouped by kind, running totals per group, and a
 * single "left over each month" number that answers the real question.
 */

const GROUPS: { type: BudgetItem['type']; title: string; hint: string; accent: string }[] = [
  {
    type: 'income',
    title: 'Money in',
    hint: 'Take-home pay after tax and deductions — what actually arrives in the bank.',
    accent: 'text-emerald-700',
  },
  {
    type: 'fixed',
    title: 'Fixed costs',
    hint: 'Same amount every month: rent, insurance, car and loan payments, subscriptions.',
    accent: 'text-slate-700',
  },
  {
    type: 'variable',
    title: 'Variable costs',
    hint: 'Spending that moves around month to month: groceries, dining, shopping, travel.',
    accent: 'text-slate-700',
  },
];

function Row({ item, dated = false }: { item: BudgetItem; dated?: boolean }) {
  const { updateBudgetItem, removeBudgetItem } = useStore();

  return (
    <tr className="group border-b border-slate-100 last:border-0">
      <td className="py-1 pr-2">
        <input
          value={item.label}
          onChange={(e) => updateBudgetItem(item.id, { label: e.target.value })}
          className={`${INLINE_INPUT} text-slate-900`}
        />
      </td>
      <td className="py-1 pr-2">
        <input
          value={item.category}
          onChange={(e) => updateBudgetItem(item.id, { category: e.target.value })}
          className={`${INLINE_INPUT} text-slate-500`}
        />
      </td>
      <td className="py-1 pr-2">
        <MoneyInput
          variant="inline"
          align="right"
          step={10}
          value={item.amount}
          onChange={(amount) => updateBudgetItem(item.id, { amount })}
        />
      </td>
      {dated && (
        <>
          <td className="py-1 pr-2">
            <DateInput
              type="month"
              variant="inline"
              value={item.startsOn ?? ''}
              onChange={(v) => updateBudgetItem(item.id, { startsOn: v || undefined })}
            />
          </td>
          <td className="py-1 pr-2">
            <DateInput
              type="month"
              variant="inline"
              value={item.endsOn ?? ''}
              onChange={(v) => updateBudgetItem(item.id, { endsOn: v || undefined })}
            />
          </td>
        </>
      )}
      <td className="py-1 pl-1 text-right">
        <button
          type="button"
          onClick={() => removeBudgetItem(item.id)}
          title={`Remove ${item.label}`}
          className="rounded-md px-2 py-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

function Group({
  title,
  hint,
  items,
  total,
  onAdd,
  dated = false,
  addLabel = '+ Add line',
}: {
  title: string;
  hint: string;
  items: BudgetItem[];
  total: number;
  onAdd: () => void;
  dated?: boolean;
  addLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-3 py-2">
        <h4 className="flex items-center text-xs font-semibold uppercase tracking-wider text-slate-600">
          {title}
          <InfoTip text={hint} />
        </h4>
        <span className="text-sm font-semibold tabular-nums text-slate-900">
          {money(total)}
          <span className="ml-1 text-xs font-normal text-slate-400">/mo</span>
        </span>
      </div>
      <div className={`px-2 py-1 ${dated ? 'overflow-x-auto' : ''}`}>
        {items.length === 0 ? (
          <p className="px-2 py-3 text-sm text-slate-400">Nothing here yet.</p>
        ) : (
          <table className={`w-full table-fixed ${dated ? 'min-w-[560px]' : ''}`}>
            <colgroup>
              {dated ? (
                <>
                  <col className="w-[30%]" />
                  <col className="w-[13%]" />
                  <col className="w-[15%]" />
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                  <col className="w-[6%]" />
                </>
              ) : (
                <>
                  <col className="w-[44%]" />
                  <col className="w-[26%]" />
                  <col className="w-[22%]" />
                  <col className="w-[8%]" />
                </>
              )}
            </colgroup>
            {dated && (
              <thead>
                <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-2 pb-1">What</th>
                  <th className="px-2 pb-1">Category</th>
                  <th className="px-2 pb-1 text-right">Amount</th>
                  <th className="px-2 pb-1">Starts</th>
                  <th className="px-2 pb-1">Ends</th>
                  <th />
                </tr>
              </thead>
            )}
            <tbody>
              {items.map((item) => (
                <Row key={item.id} item={item} dated={dated} />
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="border-t border-slate-100 px-3 py-2">
        <Button size="sm" variant="ghost" onClick={onAdd}>
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

export default function BudgetPanel() {
  const { budget, addBudgetItem } = useStore();
  const startDate = useStore((s) => s.settings.startDate);

  const totals = useMemo(() => deriveBudgetTotals(budget), [budget]);
  const rentItems = budget.filter((b) => b.isRent && !isObligation(b));
  const obligationItems = budget.filter((b) => isObligation(b));
  // Only what is due right now counts towards this month's surplus.
  const obligationsTotal = useMemo(
    () =>
      deriveObligations(budget, startDate)
        .filter((o) => o.startMonth <= 1 && (o.endMonth === null || o.endMonth >= 1))
        .reduce((sum, o) => sum + o.monthlyAmount, 0),
    [budget, startDate],
  );
  const surplus = budgetSurplus(totals) - obligationsTotal;

  return (
    <Card
      title="Monthly budget"
      subtitle="Every recurring dollar in and out. Edit any number directly — the projection updates as you type."
      right={
        <div className="text-right">
          <div className="whitespace-nowrap text-xs font-medium uppercase tracking-wide text-slate-500">
            Left over each month
          </div>
          <div
            className={`whitespace-nowrap text-2xl font-semibold tabular-nums ${
              surplus < 0 ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {money(surplus)}
          </div>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {GROUPS.map((g) => (
          <Group
            key={g.type}
            title={g.title}
            hint={g.hint}
            items={budget.filter((b) => b.type === g.type && !b.isRent && !isObligation(b))}
            total={
              g.type === 'income' ? totals.income : g.type === 'fixed' ? totals.fixed : totals.variable
            }
            onAdd={() => addBudgetItem({ type: g.type, label: 'New item' })}
          />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Group
          title="Rent (goes away when you buy)"
          hint="Rent is tracked on its own because it is replaced by the mortgage payment the month you buy. Everything else carries on."
          items={rentItems}
          total={totals.rent}
          onAdd={() => addBudgetItem({ type: 'fixed', label: 'Rent', category: 'Housing', isRent: true })}
        />
        <Group
          dated
          addLabel="+ Add commitment"
          title="Commitments with an end date"
          hint="A lease, a loan, or a court-ordered or contractual payment with a known end date. These are modelled differently from ordinary expenses: they never inflate, and they are NOT cut during a job loss — you cannot unilaterally stop paying a court-ordered obligation. The month one ends, cash flow steps up for good."
          items={obligationItems}
          total={obligationsTotal}
          onAdd={() =>
            addBudgetItem({
              type: 'fixed',
              label: 'New commitment',
              category: 'Family',
              endsOn: new Date(new Date().setFullYear(new Date().getFullYear() + 5))
                .toISOString()
                .slice(0, 7),
            })
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <span>
          In <strong className="tabular-nums text-emerald-700">{money(totals.income)}</strong>
        </span>
        <span aria-hidden>−</span>
        <span>
          Out{' '}
          <strong className="tabular-nums text-slate-900">
            {money(totals.fixed + totals.variable + totals.rent + obligationsTotal)}
          </strong>
        </span>
        <span aria-hidden>=</span>
        <span>
          Left over{' '}
          <strong className={`tabular-nums ${surplus < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
            {money(surplus)}
          </strong>
        </span>
        <span className="text-xs text-slate-400">
          Retirement contributions come out of this — set them in Assumptions.
        </span>
      </div>
    </Card>
  );
}
