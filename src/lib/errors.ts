type MaybeError = { message?: string; code?: string } | null | undefined;

const MESSAGES: Record<string, string> = {
  ALREADY_IN_HOUSEHOLD: "You already belong to a household. Leave it first to create or join another one.",
  INVALID_NAME: "Enter a household name with at least 2 characters.",
  INVALID_CODE_FORMAT: "Household codes have 8 characters, like K7QM-XR4D.",
  NOT_FOUND: "No household uses this code. It may have been reset, so ask a member for the latest one.",
  RATE_LIMITED: "Too many code attempts. Wait a few minutes, then try again.",
  OWNER_CANNOT_LEAVE: "You own this household, so you can't leave it.",
  NOT_IN_HOUSEHOLD: "You're no longer in this household.",
  NOT_AUTHENTICATED: "Your session ended. Sign in again.",
  DUE_DATE_OUT_OF_MONTH: "Pick a due date inside this tracker's month.",
  OWNER_NOT_MEMBER: "That owner is no longer in the household. Pick another owner.",
  HOUSEHOLD_MISMATCH: "That category or tracker belongs to a different household.",
  TRACKER_NOT_FOUND: "This month's tracker no longer exists.",
  INVALID_MONTH: "Pick a month between 2000 and 2100.",
};

/** The stable error code raised by our Postgres functions (or "UNIQUE" for unique violations). */
export function errorCode(err: MaybeError): string | null {
  if (!err) return null;
  const text = err.message ?? "";
  const known = Object.keys(MESSAGES).find((k) => text.includes(k));
  if (known) return known;
  if (err.code === "23505") return "UNIQUE";
  return err.code ?? null;
}

export function errorMessage(err: MaybeError, fallback = "Something went wrong. Try again."): string {
  const code = errorCode(err);
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (err && /Failed to fetch|NetworkError|Load failed/i.test(err.message ?? "")) {
    return "You're offline. Check your connection and try again.";
  }
  return fallback;
}

export const codeMessage = (code: string) => MESSAGES[code] ?? "Something went wrong. Try again.";
