import { NextRequest, NextResponse } from 'next/server';
import countiesData from '@/data/texas-counties.json';
import productsData from '@/data/amazon-products.json';

interface County {
  name: string;
  region: string;
  minAcres: number;
  minHives: number;
  additionalHivesPer: number;
  avgTaxRate: number;
  agProductivityValue: number;
}

interface Product {
  name: string;
  asin: string;
  price: number;
  rating: number;
  reviews: number;
  amazonUrl: string;
  image: string;
  description: string;
  recommended: boolean;
  tier: string;
  brand: string;
  perHive: boolean;
  qtyFixed?: number;
  qtyPer?: number;
  includesHive?: boolean;
}

interface TierItem {
  category: string;
  productIndex: number;
  perHive?: boolean;
  qty?: number;
}

interface ShoppingListItem {
  product: Product;
  category: string;
  categoryLabel: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface TierResult {
  label: string;
  emoji: string;
  description: string;
  color: string;
  items: ShoppingListItem[];
  totalCost: number;
  roiMonths: number;
}

function calculateRequiredHives(county: County, acres: number): number {
  const homesteadAcres = Math.min(1, acres);
  const agEligibleAcres = Math.max(0, acres - homesteadAcres);
  let requiredHives = county.minHives;
  if (agEligibleAcres > county.minAcres) {
    requiredHives += Math.ceil((agEligibleAcres - county.minAcres) / county.additionalHivesPer);
  }
  return requiredHives;
}

function calculateAnnualSavings(county: County, acres: number, propertyValue: number): number {
  const effectiveTaxRate = county.avgTaxRate / 100;
  const homesteadAcres = Math.min(1, acres);
  const agEligibleAcres = Math.max(0, acres - homesteadAcres);
  const perAcreLandValue = acres > 0 ? (propertyValue * 0.6) / acres : 0;
  const homesteadValue = propertyValue * 0.4 + homesteadAcres * perAcreLandValue;
  const currentTaxes = propertyValue * effectiveTaxRate;
  const homesteadTaxes = homesteadValue * effectiveTaxRate;
  const agTaxes = agEligibleAcres * county.agProductivityValue * effectiveTaxRate;
  const totalWithAg = homesteadTaxes + agTaxes;
  return Math.max(0, currentTaxes - totalWithAg);
}

function buildTierList(tierKey: string, hiveCount: number): ShoppingListItem[] {
  const tiers = productsData.shoppingListTiers as Record<string, { label: string; emoji: string; description: string; color: string; items: TierItem[] }>;
  const tier = tiers[tierKey];
  if (!tier) return [];

  const categories = productsData.categories as Record<string, { label: string; products: Product[] }>;
  const items: ShoppingListItem[] = [];

  for (const tierItem of tier.items) {
    const cat = categories[tierItem.category];
    if (!cat) continue;
    const product = cat.products[tierItem.productIndex];
    if (!product) continue;

    let quantity: number;
    if (tierItem.perHive) {
      quantity = hiveCount;
    } else if (tierItem.qty !== undefined) {
      quantity = tierItem.qty;
    } else if (product.qtyFixed !== undefined) {
      quantity = product.qtyFixed;
    } else if (product.qtyPer !== undefined) {
      quantity = product.qtyPer * hiveCount;
    } else {
      quantity = 1;
    }

    items.push({
      product,
      category: tierItem.category,
      categoryLabel: cat.label,
      quantity,
      unitPrice: product.price,
      totalPrice: Math.round(product.price * quantity * 100) / 100,
    });
  }

  return items;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const countyName = searchParams.get('county') || '';
  const acres = parseFloat(searchParams.get('acres') || '10');
  const propertyValue = parseFloat(searchParams.get('propertyValue') || '300000');

  const counties = countiesData as County[];
  const county = counties.find(c => c.name.toLowerCase() === countyName.toLowerCase());

  if (!county) {
    return NextResponse.json({ error: 'County not found' }, { status: 404 });
  }

  const requiredHives = calculateRequiredHives(county, acres);
  const annualSavings = calculateAnnualSavings(county, acres, propertyValue);

  const tierKeys = ['budget', 'recommended', 'premium'] as const;
  const tiers = productsData.shoppingListTiers as Record<string, { label: string; emoji: string; description: string; color: string; items: TierItem[] }>;
  const result: Record<string, TierResult> = {};

  for (const key of tierKeys) {
    const tierDef = tiers[key];
    const items = buildTierList(key, requiredHives);
    const totalCost = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const annualMaintenance = requiredHives * 75;
    const netAnnualBenefit = annualSavings - annualMaintenance;
    const roiMonths = netAnnualBenefit > 0 ? Math.ceil((totalCost / netAnnualBenefit) * 12) : 0;

    result[key] = {
      label: tierDef.label,
      emoji: tierDef.emoji,
      description: tierDef.description,
      color: tierDef.color,
      items,
      totalCost: Math.round(totalCost * 100) / 100,
      roiMonths,
    };
  }

  return NextResponse.json({
    county: county.name,
    acres,
    propertyValue,
    requiredHives,
    annualSavings: Math.round(annualSavings),
    tiers: result,
    affiliateTag: productsData.affiliateTag,
  });
}
