/** Lowercase address key used to spot the same search a second time. */
export function normalizeAlertAddress(address: string | null | undefined): string {
  return (address || '')
    .toLowerCase()
    .replace(/,?\s*usa$/, '')
    .replace(/[.,#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
