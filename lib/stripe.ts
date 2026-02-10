import Stripe from 'stripe';

// Lazy init — avoid crashing at build time if env var isn't available during static page collection
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// For backward compat — throws at runtime not import time
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as Record<string | symbol, unknown>)[prop];
  },
});

/* ─── Pricing tiers ─── */
export const TIERS = {
  single: {
    name: 'BeeExemption — Single Property Report',
    description: 'One-time personalized property tax savings report',
    price: 1499, // cents
    mode: 'payment' as const,
  },
  unlimited: {
    name: 'BeeExemption — Unlimited Consumer',
    description: 'Monthly unlimited access — any county, any address',
    price: 2999,
    mode: 'subscription' as const,
    interval: 'month' as const,
  },
  agent: {
    name: 'BeeExemption — Agent Partner (1 County)',
    description: 'Annual agent license — one county, white-label reports',
    price: 29700,
    mode: 'subscription' as const,
    interval: 'year' as const,
    trialDays: 7,
  },
  agent_state: {
    name: 'BeeExemption — Agent Partner (Entire State)',
    description: 'Annual agent license — statewide access, white-label reports',
    price: 49700,
    mode: 'subscription' as const,
    interval: 'year' as const,
    trialDays: 7,
  },
} as const;

export type TierKey = keyof typeof TIERS;

/* ─── Find or create a Stripe product + price ─── */
const priceCache: Record<string, string> = {};

export async function getOrCreatePrice(tierKey: TierKey): Promise<string> {
  if (priceCache[tierKey]) return priceCache[tierKey];

  const tier = TIERS[tierKey];
  const lookupKey = `beeexemption_${tierKey}`;

  // Check if price with this lookup_key already exists
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  if (existing.data.length > 0 && existing.data[0].active) {
    priceCache[tierKey] = existing.data[0].id;
    return existing.data[0].id;
  }

  // Search for existing product by metadata
  const products = await stripe.products.list({ limit: 100, active: true });
  let product = products.data.find(p => p.metadata?.tier_key === tierKey);

  if (!product) {
    product = await stripe.products.create({
      name: tier.name,
      description: tier.description,
      metadata: { tier_key: tierKey },
    });
  }

  // Create price
  const priceData: Stripe.PriceCreateParams = {
    product: product.id,
    unit_amount: tier.price,
    currency: 'usd',
    lookup_key: lookupKey,
  };

  if (tier.mode === 'subscription') {
    priceData.recurring = {
      interval: (tier as typeof TIERS['unlimited']).interval,
    };
  }

  const price = await stripe.prices.create(priceData);
  priceCache[tierKey] = price.id;
  return price.id;
}
