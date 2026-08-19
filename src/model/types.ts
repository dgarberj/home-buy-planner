/**
 * Domain types for the household financial model.
 *
 * Split by theme across `./types/*` -- this file is just the barrel so every
 * existing `from "../model/types"` import keeps working unchanged. See the
 * submodules for the actual definitions and their doc comments:
 *
 *  - `./types/income`         income, expenses, retirement, savings
 *  - `./types/household`      obligations, co-resident income, second income,
 *                              household composition
 *  - `./types/home`           home purchase, job loss, drawdown, and the
 *                              top-level `Assumptions` bundle
 *  - `./types/budget-scenario` budget items, balance snapshots, scenario config
 *  - `./types/results`        monthly projection output and scenario summaries
 */

export type {
  IncomeAssumptions,
  ExpenseAssumptions,
  RetirementAssumptions,
  SavingsAssumptions,
} from "./types/income";

export type {
  TimedObligation,
  CoResidentIncome,
  SecondIncome,
  HouseholdAssumptions,
} from "./types/household";

export type {
  HomePurchaseAssumptions,
  JobLossAssumptions,
  DrawdownAssumptions,
  Assumptions,
} from "./types/home";

export type {
  BudgetItem,
  BalanceSnapshot,
  ScenarioConfig,
} from "./types/budget-scenario";

export type { MonthlyResult, ScenarioSummary } from "./types/results";
