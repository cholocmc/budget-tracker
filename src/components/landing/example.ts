import type { StatusKey } from "@/lib/format";

// The Santos household's example month for the landing page (PRD §6.1). Every card that uses it is tagged
// "Example data"; the people, categories, and amounts are made up. Amounts are whole pesos.

export const MEMBERS = [
  { name: "Ana", initial: "A", color: "#22D88F" },
  { name: "Migs", initial: "M", color: "#F2B53C" },
];

/** Categories with their monthly allocation (`alloc`), budgeted (`b`), and actual (`a`) totals. */
export const CATEGORIES = [
  { id: "rent", name: "Rent", color: "#7B6CF0", alloc: 18000, b: 18000, a: 18000 },
  { id: "groceries", name: "Groceries", color: "#16B8C9", alloc: 14000, b: 12000, a: 7350 },
  { id: "tuition", name: "Tuition", color: "#3FA7F5", alloc: 9500, b: 9500, a: 4750 },
  { id: "utilities", name: "Utilities", color: "#EF6F8E", alloc: 6000, b: 6500, a: 7120 },
  { id: "transport", name: "Transport", color: "#9BD93B", alloc: 5000, b: 4000, a: 2600 },
];

/** This month's expenses. Per category they add up to the totals above. */
export const EXPENSES: { name: string; b: number; a: number; status: StatusKey }[] = [
  { name: "Rent", b: 18000, a: 18000, status: "settled" },
  { name: "Groceries, week 1", b: 3000, a: 3000, status: "settled" },
  { name: "Groceries, week 2", b: 3000, a: 3000, status: "settled" },
  { name: "Groceries, week 3", b: 3000, a: 1350, status: "partial" },
  { name: "Groceries, week 4", b: 3000, a: 0, status: "upcoming" },
  { name: "Tuition", b: 9500, a: 4750, status: "partial" },
  { name: "Meralco", b: 4000, a: 4620, status: "over" },
  { name: "Water", b: 1000, a: 1000, status: "settled" },
  { name: "Internet", b: 1500, a: 1500, status: "settled" },
  { name: "Fuel", b: 2000, a: 2000, status: "settled" },
  { name: "Grab rides", b: 1000, a: 600, status: "partial" },
  { name: "Autosweep load", b: 1000, a: 0, status: "overdue" },
];

/** Budgeted and actual totals for the five months before this one, oldest first. */
export const PAST_MONTHS = [
  { b: 46500, a: 44100 },
  { b: 47000, a: 48250 },
  { b: 48500, a: 46900 },
  { b: 48500, a: 47300 },
  { b: 50000, a: 49150 },
];
