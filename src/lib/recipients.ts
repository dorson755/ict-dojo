const PLAIN_ADDRESS = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

/** Parses a comma-separated recipient list. Returns null if empty or any entry is not a plain address. */
export function parseRecipients(value: string | undefined): string[] | null {
  if (!value) return null;
  const entries = value.split(',').map((entry) => entry.trim()).filter(Boolean);
  if (entries.length === 0) return null;
  if (!entries.every((entry) => PLAIN_ADDRESS.test(entry))) return null;
  return [...new Set(entries)];
}
