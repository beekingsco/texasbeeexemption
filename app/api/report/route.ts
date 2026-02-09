import { NextRequest, NextResponse } from 'next/server';
import countiesData from '@/data/texas-counties.json';
import suppliersData from '@/data/texas-nuc-suppliers.json';

interface County {
  name: string;
  region: string;
  cad: { name: string; website: string; phone: string };
  minAcres: number;
  minHives: number;
  additionalHivesPer: number;
  avgTaxRate: number;
  agProductivityValue: number;
  notes: string;
}

interface Supplier {
  name: string;
  county: string;
  region: string;
  city: string;
  contact: {
    phone: string;
    email: string;
    website: string;
    facebook: string;
  };
  nucTypes: string[];
  priceRange: string;
  season: string;
  notes: string;
}

// Map county regions to supplier regions
const regionMapping: Record<string, string[]> = {
  'Central TX': ['Central', 'Southeast'],
  'East TX': ['East', 'North Central', 'Southeast'],
  'Gulf Coast': ['Gulf Coast', 'Southeast', 'Central'],
  'Hill Country': ['Hill Country', 'Central', 'South'],
  'North TX': ['North Central', 'East', 'Central'],
  'Panhandle': ['Panhandle', 'North Central', 'West'],
  'South TX': ['South', 'Gulf Coast', 'Central'],
  'West TX': ['West', 'Panhandle', 'Central'],
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const countyName = searchParams.get('county');
  const acresStr = searchParams.get('acres');
  const propertyValueStr = searchParams.get('propertyValue');
  const taxRateStr = searchParams.get('taxRate');
  const name = searchParams.get('name') || 'Property Owner';
  const email = searchParams.get('email') || '';

  if (!countyName) {
    return NextResponse.json({ error: 'County is required' }, { status: 400 });
  }

  const counties = countiesData as County[];
  const county = counties.find(
    (c) => c.name.toLowerCase() === countyName.toLowerCase()
  );

  if (!county) {
    return NextResponse.json({ error: 'County not found' }, { status: 404 });
  }

  const acres = acresStr ? parseFloat(acresStr) : 10;
  const propertyValue = propertyValueStr ? parseFloat(propertyValueStr) : 300000;
  const taxRate = taxRateStr ? parseFloat(taxRateStr) : county.avgTaxRate;

  // Calculations
  const effectiveTaxRate = taxRate / 100;
  const homesteadAcres = Math.min(1, acres);
  const agEligibleAcres = Math.max(0, acres - homesteadAcres);
  const perAcreLandValue = acres > 0 ? (propertyValue * 0.6) / acres : 0; // estimate 60% land
  const homesteadValue = propertyValue * 0.4 + homesteadAcres * perAcreLandValue; // improvements + 1 acre
  const currentTaxes = propertyValue * effectiveTaxRate;
  const homesteadTaxes = homesteadValue * effectiveTaxRate;
  const agTaxes = agEligibleAcres * county.agProductivityValue * effectiveTaxRate;
  const totalWithAg = homesteadTaxes + agTaxes;
  const annualSavings = Math.max(0, currentTaxes - totalWithAg);

  let requiredHives = county.minHives;
  if (agEligibleAcres > county.minAcres) {
    requiredHives += Math.ceil(
      (agEligibleAcres - county.minAcres) / county.additionalHivesPer
    );
  }

  // Equipment costs
  const hiveCost = 197;
  const nucCost = 260;
  const totalUpfront = requiredHives * (hiveCost + nucCost);
  const annualMaintenance = requiredHives * 75;
  const honeyRevenue = requiredHives * 30 * 20;
  const netAnnualBenefit = annualSavings - annualMaintenance + honeyRevenue;
  const roiMonths =
    netAnnualBenefit > 0 ? Math.ceil((totalUpfront / netAnnualBenefit) * 12) : 0;

  // Supplier matching
  const suppliers = suppliersData as Supplier[];
  const matchedRegions = regionMapping[county.region] || ['Central'];
  const nearbySuppliers = suppliers.filter((s) =>
    matchedRegions.includes(s.region)
  );

  return NextResponse.json({
    county,
    calculations: {
      acres,
      propertyValue,
      taxRate,
      effectiveTaxRate,
      homesteadAcres,
      agEligibleAcres,
      homesteadValue,
      currentTaxes,
      homesteadTaxes,
      agTaxes,
      totalWithAg,
      annualSavings,
      requiredHives,
      totalUpfront,
      annualMaintenance,
      honeyRevenue,
      netAnnualBenefit,
      roiMonths,
      fiveYearSavings: annualSavings * 5,
      tenYearSavings: annualSavings * 10,
      hiveCost,
      nucCost,
    },
    personalInfo: {
      name,
      email,
    },
    suppliers: nearbySuppliers,
    generatedAt: new Date().toISOString(),
  });
}
