// Where a form should go back to after saving. The address comes from
// the link (e.g. /ledger/new?from=/), so only accept paths inside this app.
export function safeReturnPath(value: unknown): string {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/ledger";
}
