export interface Coupon {
  code: string;            // e.g. "FREE3M"
  description: string;
  type: 'trial_extension' | 'percent_off' | 'fixed_off' | 'always_free';
  trialDays?: number;      // for trial_extension
  percentOff?: number;     // for percent_off
  fixedOff?: number;       // for fixed_off
  maxCounties: number;     // max counties per account using this coupon
  maxRedemptions: number;  // total times this coupon can be used (0 = unlimited)
  redemptions: number;     // current redemption count
  redeemedBy: string[];    // agent IDs that used this code
  enabled: boolean;
  createdAt: string;
  expiresAt?: string;      // optional expiration date
}
