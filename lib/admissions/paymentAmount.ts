const MAX_KOBO = 999_999_999_999;

/** Convert a plain naira amount to integer kobo without floating-point math. */
export function parseNairaToKobo(value: string): number | null {
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0") || "0");
  const kobo = whole * 100 + fraction;
  if (!Number.isSafeInteger(kobo) || kobo <= 0 || kobo > MAX_KOBO) return null;
  return kobo;
}

export function koboToDecimal(kobo: number): string {
  if (!Number.isSafeInteger(kobo) || kobo <= 0 || kobo > MAX_KOBO) {
    throw new Error("Amount must be a positive whole number of kobo.");
  }
  return `${Math.floor(kobo / 100)}.${String(kobo % 100).padStart(2, "0")}`;
}
