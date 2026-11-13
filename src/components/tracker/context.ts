"use client";

import { createContext, useContext } from "react";
import type { Category, CopySource, DeleteImpact, Expense, Tracker } from "@/lib/types";
import type { TrackerState } from "./store";

export type SortKey = "category" | "owner" | "due" | "created" | "budget" | "actual" | "remaining";
export type Sort = { key: SortKey; dir: "asc" | "desc" };
export type ViewMode = "table" | "list";

/** The tracker's rearrangeable rows, below the header (Settings dialog). */
export type RowId = "month" | "totals" | "summary" | "expenses";
export const ROWS_DEFAULT: RowId[] = ["month", "totals", "summary", "expenses"];
export const ROW_INFO: Record<RowId, { name: string; detail: string }> = {
  month: { name: "Month", detail: "Month switcher and Add expense" },
  totals: { name: "Month totals", detail: "Budgeted, Actual spent, Remaining" },
  summary: { name: "Budget vs actual and Category summary", detail: "Chart and per-category totals" },
  expenses: { name: "Expenses", detail: "Every expense this month" },
};
/** A saved order is valid only if it holds each row exactly once. */
export const isRowOrder = (v: unknown): v is RowId[] =>
  Array.isArray(v) && v.length === ROWS_DEFAULT.length && ROWS_DEFAULT.every((r) => v.includes(r));

export type DialogState =
  | { kind: "rename" }
  | { kind: "members" }
  | { kind: "leave" }
  | { kind: "invite" }
  | { kind: "category"; id?: string }
  | { kind: "deleteCategory"; id: string }
  | { kind: "expense"; id?: string }
  | { kind: "deleteExpense"; id: string }
  | { kind: "copy"; source: CopySource }
  | { kind: "settings" }
  | { kind: "deleteTracker"; id: string }
  | { kind: "deleteHousehold" };

export interface ExpenseInput {
  name: string;
  category_id: string;
  owner_id: string;
  budgeted_cents: number;
  actual_cents: number;
  due_date: string;
}

export interface Ops {
  renameHousehold(name: string): Promise<string | null>;
  resetCode(): Promise<string | null>;
  leave(): Promise<string | null>;
  deleteHousehold(): Promise<string | null>;
  ownedExpenseCount(): Promise<number>;
  signOut(): Promise<void>;
  saveCategory(input: { name: string; color: string }, original?: Category): Promise<string | null>;
  categoryImpact(id: string): Promise<DeleteImpact | null>;
  deleteCategory(cat: Category, impact: DeleteImpact | null): Promise<string | null>;
  saveExpense(input: ExpenseInput, original?: Expense): Promise<string | null>;
  deleteExpense(expense: Expense): Promise<string | null>;
  startCreateTracker(): Promise<void>;
  deleteTracker(tracker: Tracker): Promise<string | null>;
  createTracker(ids: string[], includeActual: boolean): Promise<string | null>;
}

export interface TrackerCtx {
  state: TrackerState;
  me: string;
  month: string;
  tracker: Tracker | undefined;
  /** Expenses of the month being viewed; undefined while loading. */
  expenses: Expense[] | undefined;
  ownerId: string;
  online: Set<string>;
  connected: boolean;
  copyHint: string | null;
  ops: Ops;
  memberIndex(id: string): number;
  memberName(id: string): string;
  ownerLabel(id: string): string;
  /** Who deleted an item, if a member announced it. */
  deletedBy(id: string): string | null;
  open(d: DialogState): void;
  close(): void;
  toast(msg: string): void;
  goMonth(k: string): void;
  filterCat: string;
  setFilterCat(v: string): void;
  sort: Sort;
  setSort(s: Sort): void;
  view: ViewMode;
  setView(v: ViewMode): void;
  split: number;
  setSplit(v: number, persist?: boolean): void;
  rows: RowId[];
  setRows(v: RowId[]): void;
}

export const Ctx = createContext<TrackerCtx | null>(null);
export const useTracker = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTracker outside TrackerApp");
  return c;
};

export const SPLIT_MIN = 28;
export const SPLIT_MAX = 70;
export const SPLIT_DEFAULT = 42;
