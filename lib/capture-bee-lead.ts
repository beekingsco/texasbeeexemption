import { recordSearchFollowUp } from '@/lib/address-search-log';
import { findBeeLeadByEmail, saveBeeLead, updateBeeLead, type BeeLead } from '@/lib/bee-store';
import { leadAlertIdempotencyKey } from '@/lib/lead-alert';
import { leadAttribution } from '@/lib/lead-source';
import {
  contactLeadBlockReason,
  resultsUnlockBlockReason,
  shouldDeliverNewLeadAlert,
} from '@/lib/lead-qualification';
import { notifyFromRequest } from '@/lib/notify';
import { splitPersonName } from '@/lib/results-unlock';

type HeaderReader = { get(name: string): string | null };
type CookieReader = { get(name: string): { value: string } | undefined };

export type CaptureIntent = 'guide' | 'results_unlock' | 'report_checkout';

export class LeadInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LeadInputError';
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  return null;
}

/**
 * Inserts a lead, or updates the existing row for that email.
 * A new lead sends one alert to chris@beekings.com. A repeat search does not.
 */
export async function captureBeeLead(
  req: { headers: HeaderReader; cookies: CookieReader },
  body: Record<string, unknown>,
  intent: CaptureIntent,
): Promise<{ id: string; created: boolean; email: string }> {
  const email = asString(body.email).toLowerCase();
  const explicitFirst = asString(body.firstName);
  const explicitLast = asString(body.lastName);
  const combined = splitPersonName(asString(body.name));
  const firstName = explicitFirst || combined.firstName;
  const lastName = explicitLast || combined.lastName;
  const name = `${firstName} ${lastName}`.trim();
  const address = asString(body.address);
  const phone = asString(body.phone);
  const county = asString(body.county);
  const state = asString(body.state);

  if (intent === 'guide') {
    if (!firstName || !lastName || !email) {
      throw new LeadInputError('First name, last name, and email are required');
    }
    const blockReason = contactLeadBlockReason({ firstName, lastName, email, address });
    if (blockReason) throw new LeadInputError(blockReason);
  } else {
    const blockReason = resultsUnlockBlockReason({ name, email });
    if (blockReason) throw new LeadInputError(blockReason);
  }

  const attribution = leadAttribution(req);
  const channel = intent === 'results_unlock'
    ? 'results-gate'
    : intent === 'report_checkout'
      ? 'report-unlock'
      : (asString(body.source) || 'calculator');

  const lat = asNumber(body.lat);
  const lng = asNumber(body.lng);
  const acres = asNumber(body.acres);
  const appraisedValue = asNumber(body.appraisedValue) ?? asNumber(body.propertyValue);
  const estimatedSavings = asNumber(body.estimatedSavings);
  const parcelData = asRecord(body.parcelData);
  const parcelId = parcelData && typeof parcelData.propertyId === 'string' ? parcelData.propertyId : null;

  const searchId = await recordSearchFollowUp({
    email,
    phone: phone || null,
    savings: estimatedSavings,
    headers: req.headers,
    lat,
    lng,
    county,
    acres,
    marketValue: appraisedValue,
    parcelId,
  });

  const alertData = {
    name: name || undefined,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email,
    phone: phone || undefined,
    address: address || undefined,
    county: county || undefined,
    state: state || undefined,
    acres: acres ?? undefined,
    estimatedSavings: estimatedSavings ?? undefined,
    ...(intent === 'report_checkout' ? { tier: 'report_unlock' } : {}),
    idempotencyKey: leadAlertIdempotencyKey(email),
  };

  const existing = await findBeeLeadByEmail(email);
  if (existing) {
    const alreadyAlerted = shouldDeliverNewLeadAlert({
      name: `${existing.firstName} ${existing.lastName}`.trim(),
      firstName: existing.firstName,
      lastName: existing.lastName,
      email: existing.email,
      address: existing.address,
    });
    await updateBeeLead(existing.id, {
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      phone: phone || undefined,
      address: address || undefined,
      county: county || undefined,
      state: state || undefined,
      lat,
      lng,
      acres,
      appraisedValue,
      estimatedSavings,
      parcelData,
      channel,
      addressSearchId: searchId || undefined,
    });
    // A paid unlock of a lead that never qualified for an alert (no street yet)
    // still needs one email. Repeat searches do not.
    if (intent === 'report_checkout' && !alreadyAlerted) {
      await notifyFromRequest(req, 'new_lead_captured', alertData);
    }
    return { id: existing.id, created: false, email };
  }

  const lead: BeeLead = {
    id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    firstName,
    lastName,
    email,
    phone,
    address,
    county,
    state,
    lat,
    lng,
    acres,
    appraisedValue,
    estimatedSavings,
    parcelData,
    source: attribution.source,
    entry: attribution.entryLabel,
    channel,
    agentRef: asString(body.agentRef) || undefined,
    addressSearchId: searchId || undefined,
    createdAt: new Date().toISOString(),
  };
  await saveBeeLead(lead);

  const deliver = intent === 'report_checkout'
    || shouldDeliverNewLeadAlert({
      name: name || undefined,
      firstName,
      lastName,
      email,
      address,
    });

  if (deliver) {
    await notifyFromRequest(req, 'new_lead_captured', alertData);
  }

  return { id: lead.id, created: true, email };
}
