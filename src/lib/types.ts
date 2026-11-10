export type Role = "owner" | "member";

export interface Household {
  id: string;
  name: string;
  code: string;
  owner_id: string;
  updated_at: string;
}

export interface Member {
  user_id: string;
  role: Role;
  joined_at: string;
  display_name: string;
  avatar_url: string | null;
}

export interface Category {
  id: string;
  household_id: string;
  name: string;
  color: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tracker {
  id: string;
  household_id: string;
  year: number;
  month: number;
  created_at: string;
}

export interface Expense {
  id: string;
  household_id: string;
  tracker_id: string;
  category_id: string;
  name: string;
  budgeted_cents: number;
  actual_cents: number;
  owner_id: string;
  due_date: string; // YYYY-MM-DD
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CopySourceExpense {
  id: string;
  name: string;
  budgeted_cents: number;
  actual_cents: number;
  owner_id: string;
  due_date: string;
}

export interface CopySource {
  tracker_id: string;
  year: number;
  month: number;
  categories: { id: string; name: string; color: string; expenses: CopySourceExpense[] }[];
}

export interface DeleteImpact {
  expense_count: number;
  month_count: number;
  budgeted_cents: number;
  actual_cents: number;
}

export interface InitialData {
  me: string;
  household: Household;
  members: Member[];
  categories: Category[];
  trackers: Tracker[];
  initialMonth: string | null;
  initialExpenses: Expense[] | null;
}
