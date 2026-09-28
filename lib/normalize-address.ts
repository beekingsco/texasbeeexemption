/** Lowercase address key used to spot the same search a second time. */
export function normalizeAlertAddress(address: string | null | undefined): string {
  return (address || '')
    .replace(/, usa$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
