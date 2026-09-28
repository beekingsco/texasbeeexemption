import localCounties from '@/data/texas-counties.json';
import type { CountyRules } from '@/lib/county-types';
import { additionalAcresPerHive } from '@/lib/hive-requirement';
import { supabaseSelect, warnIfSupabaseServiceKeyMissing } from '@/lib/supabase-rest';

const CACHE_MS = 60 * 60 * 1000;

type Cache = { expires: number; counties: CountyRules[]; source: 'supabase' | 'local' };
let cache: Cache | null = null;

type BeeRow = {
  county?: string;
  min_acres?: number | string | null;
  hives_at_min?: number | string | null;
  hive_scale_rule?: string | null;
  notes?: string | null;
};

type AgRow = {
  county?: string;
  representative_combined_rate?: number | string | null;
  ag_native_pasture_per_ac?: number | string | null;
  ag_improved_pasture_per_ac?: number | string | null;
  notes?: string | null;
};

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function localFallback(): CountyRules[] {
  return (localCounties as CountyRules[]).map((county) => ({
    ...county,
    rulesSource: 'local',
  }));
}

function merge(beeRows: BeeRow[], agRows: AgRow[]): CountyRules[] {
  const bee = new Map<string, BeeRow>();
  for (const row of beeRows) {
    const name = (row.county || '').trim();
    if (!name || name.startsWith('_')) continue;
    bee.set(name.toLowerCase(), row);
  }
  const ag = new Map<string, AgRow>();
  for (const row of agRows) {
    const name = (row.county || '').trim();
    if (!name) continue;
    ag.set(name.toLowerCase(), row);
  }

  return (localCounties as CountyRules[]).map((county) => {
    const key = county.name.toLowerCase();
    const rule = bee.get(key);
    const rates = ag.get(key);
    const minAcres = asNumber(rule?.min_acres);
    const minHives = asNumber(rule?.hives_at_min);
    const taxRate = asNumber(rates?.representative_combined_rate);
    const agValue = asNumber(rates?.ag_native_pasture_per_ac) ?? asNumber(rates?.ag_improved_pasture_per_ac);
    const hiveScaleRule = (rule?.hive_scale_rule || '').trim();
    const step = additionalAcresPerHive(hiveScaleRule);
    const notes = [county.notes, rule?.notes, rates?.notes].filter(Boolean).join(' ').trim();
    return {
      ...county,
      minAcres: minAcres ?? county.minAcres,
      minHives: minHives ?? county.minHives,
      additionalHivesPer: step ?? county.additionalHivesPer,
      avgTaxRate: taxRate ?? county.avgTaxRate,
      agProductivityValue: agValue ?? county.agProductivityValue,
      notes,
      hiveScaleRule: hiveScaleRule || undefined,
      rulesSource: rule || rates ? 'supabase' : 'local',
    };
  });
}

export async function loadTexasCounties(): Promise<{ counties: CountyRules[]; source: 'supabase' | 'local' }> {
  if (cache && Date.now() < cache.expires) {
    return { counties: cache.counties, source: cache.source };
  }
  if (warnIfSupabaseServiceKeyMissing('county rules')) {
    const counties = localFallback();
    cache = { expires: Date.now() + 5 * 60 * 1000, counties, source: 'local' };
    return { counties, source: 'local' };
  }

  try {
    const [beeRows, agRows] = await Promise.all([
      supabaseSelect(
        'county_bee_rules',
        'select=county,min_acres,hives_at_min,hive_scale_rule,notes&state=eq.TX&limit=500',
      ),
      supabaseSelect(
        'county_ag_reference',
        'select=county,representative_combined_rate,ag_native_pasture_per_ac,ag_improved_pasture_per_ac,notes&state=eq.TX&limit=500',
      ),
    ]);
    if (!beeRows || !agRows || beeRows.length === 0) {
      throw new Error('county tables returned no rows');
    }
    const counties = merge(beeRows as BeeRow[], agRows as AgRow[]);
    const source = counties.some((county) => county.rulesSource === 'supabase') ? 'supabase' : 'local';
    cache = { expires: Date.now() + (source === 'supabase' ? CACHE_MS : 5 * 60 * 1000), counties, source };
    return { counties, source };
  } catch (error) {
    console.warn('county rules fell back to local texas-counties.json', error);
    const counties = localFallback();
    cache = { expires: Date.now() + 5 * 60 * 1000, counties, source: 'local' };
    return { counties, source: 'local' };
  }
}
