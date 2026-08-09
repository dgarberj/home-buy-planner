import type { MonthlyResult } from '../model/types';
import { monthLabel } from './format';

const COLUMNS: { key: keyof MonthlyResult; header: string }[] = [
  { key: 'month', header: 'Month' },
  { key: 'year', header: 'Year' },
  { key: 'age', header: 'Age' },
  { key: 'netIncome', header: 'Net income' },
  { key: 'totalExpenses', header: 'Living expenses' },
  { key: 'secondIncome', header: 'Second income' },
  { key: 'secondIncomeCosts', header: 'Childcare & work costs' },
  { key: 'coResidentIncome', header: 'Co-resident income' },
  { key: 'obligations', header: 'Commitments' },
  { key: 'housingPayment', header: 'Housing payment' },
  { key: 'pmiPayment', header: 'PMI (in housing)' },
  { key: 'homeMaintenance', header: 'Upkeep' },
  { key: 'netCashFlow', header: 'Net cash flow' },
  { key: 'purchaseOutflow', header: 'Purchase outflow' },
  { key: 'cashBalance', header: 'Cash buffer' },
  { key: 'investmentBalance', header: 'Investments' },
  { key: 'liquidSavings', header: 'Total liquid' },
  { key: 'retirementBalance', header: 'Retirement' },
  { key: 'homeValue', header: 'Home value' },
  { key: 'mortgageBalance', header: 'Mortgage balance' },
  { key: 'homeEquity', header: 'Home equity' },
  { key: 'netWorth', header: 'Net worth' },
  { key: 'jobLossActive', header: 'Job loss' },
  { key: 'ownsHome', header: 'Owns home' },
];

export function projectionToCsv(
  rows: MonthlyResult[],
  startDate: string,
  scenarioName: string,
): string {
  const header = ['Scenario', 'Date', ...COLUMNS.map((c) => c.header)].join(',');
  const lines = rows.map((row) => {
    const cells = COLUMNS.map((c) => {
      const v = row[c.key];
      if (typeof v === 'boolean') return v ? 'yes' : 'no';
      return typeof v === 'number' ? v.toFixed(2) : String(v);
    });
    return [`"${scenarioName.replace(/"/g, '""')}"`, monthLabel(startDate, row.month), ...cells].join(
      ',',
    );
  });
  return [header, ...lines].join('\n');
}

/** Trigger a browser download of a text file. */
export function downloadText(filename: string, contents: string, mime = 'text/plain') {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
