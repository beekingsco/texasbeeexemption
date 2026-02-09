export interface County {
  name: string;
  region: string;
  cad: {
    name: string;
    website: string;
    phone: string;
    cadPlatform?: 'trueAutomation' | 'tyler' | 'custom' | 'unknown';
    cadSearchUrl?: string;
    cadClientId?: string;
    lookupSupported?: boolean;
  };
  minAcres: number;
  minHives: number;
  additionalHivesPer: number;
  avgTaxRate: number;
  agProductivityValue: number;
  notes: string;
}

export interface PropertyData {
  propertyId: string;
  ownerName: string;
  address: string;
  marketValue: number;
  assessedValue: number;
  acres: number | null;
  estimatedTax: number | null;
}

export interface PropertyLookupResult {
  found: boolean;
  properties?: PropertyData[];
  error?: string;
  cadSearchUrl?: string;
}

export interface CalculationResult {
  county: County;
  acres: number;
  currentAnnualTax: number;
  agValue: number;
  agAnnualTax: number;
  annualSavings: number;
  fiveYearSavings: number;
  tenYearSavings: number;
  requiredHives: number;
  packageCost: number;
  roiYears: number;
}
