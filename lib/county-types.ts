export interface CountyRules {
  name: string;
  region: string;
  cad: { name: string; website: string; phone: string; cadSearchUrl?: string };
  minAcres: number;
  minHives: number;
  additionalHivesPer: number;
  avgTaxRate: number;
  agProductivityValue: number;
  notes: string;
  hiveScaleRule?: string;
  rulesSource?: 'supabase' | 'local';
}
