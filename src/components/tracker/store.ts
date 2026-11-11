import type { Category, Expense, Household, Member, Tracker } from "@/lib/types";

export interface TrackerState {
  household: Household;
  members: Member[];
  categories: Category[];
  trackers: Tracker[];
  /** Expenses per tracker id, for the trackers loaded so far. */
  expenses: Record<string, Expense[]>;
}

export type Action =
  | { type: "household"; patch: Partial<Household> }
  | { type: "members"; members: Member[] }
  | { type: "removeMember"; userId: string }
  | { type: "upsertCategory"; category: Category }
  | { type: "removeCategory"; id: string }
  | { type: "upsertTracker"; tracker: Tracker }
  | { type: "removeTracker"; id: string }
  | { type: "setExpenses"; trackerId: string; expenses: Expense[] }
  | { type: "upsertExpense"; expense: Expense; force?: boolean }
  | { type: "removeExpense"; id: string }
  | { type: "reset"; household: Household; members: Member[]; categories: Category[]; trackers: Tracker[]; keep: Record<string, Expense[]> };

const byCreated = (a: { created_at: string }, b: { created_at: string }) => a.created_at.localeCompare(b.created_at);
const byMonth = (a: Tracker, b: Tracker) => a.year - b.year || a.month - b.month;

export function reducer(state: TrackerState, action: Action): TrackerState {
  switch (action.type) {
    case "household":
      return { ...state, household: { ...state.household, ...action.patch } };
    case "members":
      return { ...state, members: action.members };
    case "removeMember":
      return { ...state, members: state.members.filter((m) => m.user_id !== action.userId) };
    case "upsertCategory": {
      const exists = state.categories.some((c) => c.id === action.category.id);
      const categories = exists
        ? state.categories.map((c) => (c.id === action.category.id ? { ...c, ...action.category } : c))
        : [...state.categories, action.category].sort(byCreated);
      return { ...state, categories };
    }
    case "removeCategory": {
      if (!state.categories.some((c) => c.id === action.id)) return state;
      const expenses: Record<string, Expense[]> = {};
      for (const [k, list] of Object.entries(state.expenses)) expenses[k] = list.filter((e) => e.category_id !== action.id);
      return { ...state, categories: state.categories.filter((c) => c.id !== action.id), expenses };
    }
    case "upsertTracker": {
      if (state.trackers.some((t) => t.id === action.tracker.id)) return state;
      return { ...state, trackers: [...state.trackers, action.tracker].sort(byMonth) };
    }
    case "removeTracker": {
      if (!state.trackers.some((t) => t.id === action.id)) return state;
      const { [action.id]: _gone, ...expenses } = state.expenses;
      return { ...state, trackers: state.trackers.filter((t) => t.id !== action.id), expenses };
    }
    case "setExpenses":
      return { ...state, expenses: { ...state.expenses, [action.trackerId]: action.expenses } };
    case "upsertExpense": {
      const e = action.expense;
      const list = state.expenses[e.tracker_id];
      // Months that aren't loaded yet will fetch fresh data when opened.
      if (!list && !action.force) return state;
      const current = list ?? [];
      const next = current.some((x) => x.id === e.id) ? current.map((x) => (x.id === e.id ? e : x)) : [...current, e];
      return { ...state, expenses: { ...state.expenses, [e.tracker_id]: next } };
    }
    case "removeExpense": {
      let changed = false;
      const expenses: Record<string, Expense[]> = {};
      for (const [k, list] of Object.entries(state.expenses)) {
        const next = list.filter((e) => e.id !== action.id);
        if (next.length !== list.length) changed = true;
        expenses[k] = next;
      }
      return changed ? { ...state, expenses } : state;
    }
    case "reset":
      return {
        household: action.household,
        members: action.members,
        categories: action.categories,
        trackers: action.trackers,
        expenses: action.keep,
      };
  }
}

export function findExpense(state: TrackerState, id: string): Expense | undefined {
  for (const list of Object.values(state.expenses)) {
    const e = list.find((x) => x.id === id);
    if (e) return e;
  }
  return undefined;
}
