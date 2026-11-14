import type { SupabaseClient } from "@supabase/supabase-js";
import type { BankAccount, Category, Expense, Household, Member, Tracker } from "./types";

// Shared queries, used by the server page (initial load) and the client (refetch after reconnect).

export const EXPENSE_COLUMNS =
  "id, household_id, tracker_id, category_id, name, budgeted_cents, actual_cents, owner_id, due_date, created_by, updated_by, created_at, updated_at";

export async function fetchHousehold(sb: SupabaseClient, householdId: string): Promise<Household | null> {
  const { data } = await sb.from("households").select("id, name, code, owner_id, updated_at").eq("id", householdId).maybeSingle();
  return (data as Household) ?? null;
}

type MemberRow = {
  user_id: string;
  role: Member["role"];
  joined_at: string;
  profiles: { display_name: string; avatar_url: string | null } | null;
};

export async function fetchMembers(sb: SupabaseClient, householdId: string): Promise<Member[]> {
  const { data } = await sb
    .from("household_members")
    .select("user_id, role, joined_at, profiles(display_name, avatar_url)")
    .eq("household_id", householdId)
    .order("joined_at", { ascending: true });
  const rows = (data ?? []) as unknown as MemberRow[];
  return rows
    .map((r) => ({
      user_id: r.user_id,
      role: r.role,
      joined_at: r.joined_at,
      display_name: r.profiles?.display_name ?? "Member",
      avatar_url: r.profiles?.avatar_url ?? null,
    }))
    .sort((a, b) => (a.role === b.role ? a.joined_at.localeCompare(b.joined_at) : a.role === "owner" ? -1 : 1));
}

export async function fetchCategories(sb: SupabaseClient, householdId: string): Promise<Category[]> {
  const { data } = await sb
    .from("categories")
    .select("id, household_id, name, color, updated_by, created_at, updated_at")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });
  return (data ?? []) as Category[];
}

export async function fetchTrackers(sb: SupabaseClient, householdId: string): Promise<Tracker[]> {
  const { data } = await sb
    .from("trackers")
    .select("id, household_id, year, month, created_at")
    .eq("household_id", householdId)
    .order("year", { ascending: true })
    .order("month", { ascending: true });
  return (data ?? []) as Tracker[];
}

export async function fetchExpenses(sb: SupabaseClient, trackerId: string): Promise<Expense[] | null> {
  const { data, error } = await sb
    .from("expenses")
    .select(EXPENSE_COLUMNS)
    .eq("tracker_id", trackerId)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return null;
  return (data ?? []).map(normalizeExpense);
}

/**
 * A month's expenses found by year and month instead of tracker id, so the server page can fetch
 * them alongside the trackers list instead of after it. No tracker for the month gives [].
 */
export async function fetchMonthExpenses(
  sb: SupabaseClient,
  householdId: string,
  year: number,
  month: number,
): Promise<Expense[] | null> {
  const { data, error } = await sb
    .from("expenses")
    .select(`${EXPENSE_COLUMNS}, trackers!inner(year, month)`)
    .eq("household_id", householdId)
    .eq("trackers.year", year)
    .eq("trackers.month", month)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return null;
  return (data ?? []).map((row: Record<string, unknown>) => {
    const { trackers: _tracker, ...rest } = row;
    return normalizeExpense(rest);
  });
}

/** bigint columns can arrive as strings; keep them as numbers of centavos. */
export function normalizeExpense(row: Record<string, unknown>): Expense {
  return {
    ...(row as unknown as Expense),
    budgeted_cents: Number(row.budgeted_cents ?? 0),
    actual_cents: Number(row.actual_cents ?? 0),
  };
}

/* ---------- Profile accounts (PRD §6.7). RLS returns only the caller's own rows. ---------- */

export const BANK_ACCOUNT_COLUMNS = "id, name, balance_cents, color, created_at, updated_at";

export async function fetchBankAccounts(sb: SupabaseClient): Promise<BankAccount[] | null> {
  const { data, error } = await sb.from("bank_accounts").select(BANK_ACCOUNT_COLUMNS).order("created_at", { ascending: true });
  if (error) return null;
  return (data ?? []).map(normalizeBankAccount);
}

export function normalizeBankAccount(row: Record<string, unknown>): BankAccount {
  return { ...(row as unknown as BankAccount), balance_cents: Number(row.balance_cents ?? 0) };
}
