export interface HiveCounty {
  minAcres: number;
  minHives: number;
  additionalHivesPer: number;
  hiveScaleRule?: string | null;
}

interface HiveBand {
  min: number;
  max: number;
  hives: number;
}

/** Acres covered by each extra hive, when the county rule says so. */
export function additionalAcresPerHive(rule: string | null | undefined): number | null {
  if (!rule) return null;
  const additional = rule.match(/additional\s+(\d+(?:\.\d+)?)\s+acres/i);
  if (additional) return parseFloat(additional[1]);
  if (/1\s+hive\s+per\s+acre/i.test(rule)) return 1;
  return null;
}

function steppedBands(rule: string): HiveBand[] {
  const bands: HiveBand[] = [];
  const pattern = /(\d+)\s+hives?\s+for\s+(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s+acres/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(rule))) {
    bands.push({
      hives: parseInt(match[1], 10),
      min: parseFloat(match[2]),
      max: parseFloat(match[3]),
    });
  }
  return bands;
}

/**
 * Hive count for ag-eligible acres.
 * Uses the shared county rule text when it is a step schedule or a
 * "N hives per X acres" rule, otherwise the county's minimum plus one
 * hive per additionalHivesPer acres.
 */
export function requiredHivesFor(county: HiveCounty, agEligibleAcres: number): number {
  const acres = Number.isFinite(agEligibleAcres) ? Math.max(0, agEligibleAcres) : 0;
  const rule = county.hiveScaleRule || '';
  const bands = steppedBands(rule);
  if (bands.length >= 2) {
    const sorted = [...bands].sort((a, b) => a.min - b.min);
    for (const band of sorted) {
      if (acres <= band.max) return band.hives;
    }
    return sorted[sorted.length - 1].hives;
  }

  const perGroup = rule.match(/(\d+)\s+hives?\s+per\s+(?:each\s+)?(\d+(?:\.\d+)?)\s+acres/i);
  if (perGroup && !/additional/i.test(rule)) {
    const hives = parseInt(perGroup[1], 10);
    const acresEach = parseFloat(perGroup[2]);
    if (hives > 0 && acresEach > 0) {
      const basis = Math.max(acres, county.minAcres || 0);
      const groups = Math.max(1, Math.ceil(basis / acresEach));
      return Math.max(county.minHives || hives, groups * hives);
    }
  }

  let required = county.minHives || 0;
  const step = county.additionalHivesPer > 0 ? county.additionalHivesPer : 5;
  if (acres > county.minAcres) {
    required += Math.ceil((acres - county.minAcres) / step);
  }
  return required;
}
