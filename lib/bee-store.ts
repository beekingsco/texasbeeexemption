import { supabaseInsert, supabasePatchById, supabaseSelect } from '@/lib/supabase-rest';

const LEADS = 'bee_exemption_leads';
const CONTACTS = 'bee_exemption_contacts';

export interface BeeLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  county: string;
  state: string;
  lat: number | null;
  lng: number | null;
  acres: number | null;
  appraisedValue: number | null;
  estimatedSavings: number | null;
  parcelData: Record<string, unknown> | null;
  source: string;
  entry?: string;
  channel?: string;
  agentRef?: string;
  createdAt: string;
}

export interface BeeContact {
  id: string;
  address: string;
  county: string;
  state: string;
  lat: number | null;
  lng: number | null;
  ownerName: string;
  acres: number | null;
  marketValue: number | null;
  landValue: number | null;
  improvementValue: number | null;
  estimatedSavings: number | null;
  requiredHives: number | null;
  searchCount: number;
  viewedResults: boolean;
  viewedDetails: boolean;
  adjustedEstimate: boolean;
  startedSignup: boolean;
  completedSignup: boolean;
  viewedGuide: boolean;
  timeOnResultsMs: number;
  score: number;
  tier: 'hot' | 'warm' | 'curious' | 'unknown';
  tags: string[];
  referrer: string;
  userAgent: string;
  sessionId: string;
  firstSeen: string;
  lastSeen: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  parcelStatus: string;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function bool(value: unknown): boolean {
  return value === true || value === 'true';
}

function leadRow(lead: BeeLead): Record<string, unknown> {
  return {
    id: lead.id,
    first_name: lead.firstName,
    last_name: lead.lastName,
    email: lead.email,
    phone: lead.phone || '',
    address: lead.address || '',
    county: lead.county || '',
    state: lead.state || '',
    lat: lead.lat,
    lng: lead.lng,
    acres: lead.acres,
    appraised_value: lead.appraisedValue,
    estimated_savings: lead.estimatedSavings,
    parcel_data: lead.parcelData,
    source: lead.source,
    entry: lead.entry || null,
    channel: lead.channel || null,
    agent_ref: lead.agentRef || null,
    created_at: lead.createdAt,
  };
}

function leadFromRow(row: Record<string, unknown>): BeeLead {
  const parcel = row.parcel_data;
  return {
    id: text(row.id),
    firstName: text(row.first_name),
    lastName: text(row.last_name),
    email: text(row.email),
    phone: text(row.phone),
    address: text(row.address),
    county: text(row.county),
    state: text(row.state),
    lat: num(row.lat),
    lng: num(row.lng),
    acres: num(row.acres),
    appraisedValue: num(row.appraised_value),
    estimatedSavings: num(row.estimated_savings),
    parcelData: parcel && typeof parcel === 'object' ? parcel as Record<string, unknown> : null,
    source: text(row.source),
    entry: text(row.entry) || undefined,
    channel: text(row.channel) || undefined,
    agentRef: text(row.agent_ref) || undefined,
    createdAt: text(row.created_at) || new Date().toISOString(),
  };
}

function contactRow(contact: BeeContact): Record<string, unknown> {
  return {
    id: contact.id,
    address: contact.address,
    county: contact.county,
    state: contact.state || '',
    lat: contact.lat,
    lng: contact.lng,
    owner_name: contact.ownerName,
    acres: contact.acres,
    market_value: contact.marketValue,
    land_value: contact.landValue,
    improvement_value: contact.improvementValue,
    estimated_savings: contact.estimatedSavings,
    required_hives: contact.requiredHives,
    search_count: contact.searchCount,
    viewed_results: contact.viewedResults,
    viewed_details: contact.viewedDetails,
    adjusted_estimate: contact.adjustedEstimate,
    started_signup: contact.startedSignup,
    completed_signup: contact.completedSignup,
    viewed_guide: contact.viewedGuide,
    time_on_results_ms: contact.timeOnResultsMs,
    score: contact.score,
    tier: contact.tier,
    tags: contact.tags.join(','),
    referrer: contact.referrer,
    user_agent: contact.userAgent,
    session_id: contact.sessionId,
    first_seen: contact.firstSeen,
    last_seen: contact.lastSeen,
    email: contact.email,
    phone: contact.phone,
    first_name: contact.firstName,
    last_name: contact.lastName,
    parcel_status: contact.parcelStatus || '',
  };
}

function contactFromRow(row: Record<string, unknown>): BeeContact {
  const tier = text(row.tier);
  const safeTier = tier === 'hot' || tier === 'warm' || tier === 'curious' ? tier : 'unknown';
  return {
    id: text(row.id),
    address: text(row.address),
    county: text(row.county),
    state: text(row.state),
    lat: num(row.lat),
    lng: num(row.lng),
    ownerName: text(row.owner_name),
    acres: num(row.acres),
    marketValue: num(row.market_value),
    landValue: num(row.land_value),
    improvementValue: num(row.improvement_value),
    estimatedSavings: num(row.estimated_savings),
    requiredHives: num(row.required_hives),
    searchCount: num(row.search_count) || 1,
    viewedResults: bool(row.viewed_results),
    viewedDetails: bool(row.viewed_details),
    adjustedEstimate: bool(row.adjusted_estimate),
    startedSignup: bool(row.started_signup),
    completedSignup: bool(row.completed_signup),
    viewedGuide: bool(row.viewed_guide),
    timeOnResultsMs: num(row.time_on_results_ms) || 0,
    score: num(row.score) || 0,
    tier: safeTier,
    tags: text(row.tags).split(',').filter(Boolean),
    referrer: text(row.referrer),
    userAgent: text(row.user_agent),
    sessionId: text(row.session_id),
    firstSeen: text(row.first_seen) || new Date().toISOString(),
    lastSeen: text(row.last_seen) || new Date().toISOString(),
    email: text(row.email),
    phone: text(row.phone),
    firstName: text(row.first_name),
    lastName: text(row.last_name),
    parcelStatus: text(row.parcel_status),
  };
}

export async function saveBeeLead(lead: BeeLead): Promise<void> {
  const saved = await supabaseInsert(LEADS, leadRow(lead));
  if (!saved) {
    throw new Error('Could not save lead. SUPABASE_SERVICE_ROLE_KEY may be missing, or the bee_exemption_leads migration has not been applied.');
  }
}

export async function listBeeLeads(): Promise<BeeLead[]> {
  const rows = await supabaseSelect(LEADS, 'select=*&order=created_at.desc&limit=1000');
  if (!rows) {
    throw new Error('Could not read leads from Supabase.');
  }
  return rows.map(leadFromRow);
}

async function selectOne(filter: string): Promise<BeeContact | null> {
  const rows = await supabaseSelect(CONTACTS, `select=*&${filter}&limit=1`);
  if (!rows) return null;
  return rows[0] ? contactFromRow(rows[0]) : null;
}

export async function findBeeContactBySession(sessionId: string): Promise<BeeContact | null> {
  return selectOne(`session_id=eq.${encodeURIComponent(sessionId)}&order=last_seen.desc`);
}

export async function findBeeContact(address: string | null, sessionId: string | null): Promise<BeeContact | null> {
  if (address) {
    const byAddress = await selectOne(`address=eq.${encodeURIComponent(address)}`);
    if (byAddress) return byAddress;
  }
  if (sessionId) {
    const bySession = await selectOne(
      `session_id=eq.${encodeURIComponent(sessionId)}&completed_signup=eq.false&order=last_seen.desc`,
    );
    if (bySession) return bySession;
  }
  return null;
}

export async function saveBeeContact(contact: BeeContact): Promise<void> {
  const existing = await selectOne(`id=eq.${encodeURIComponent(contact.id)}`);
  if (existing) {
    const updated = await supabasePatchById(CONTACTS, contact.id, contactRow(contact));
    if (!updated) throw new Error('Could not update contact.');
    return;
  }
  const saved = await supabaseInsert(CONTACTS, contactRow(contact));
  if (!saved) {
    throw new Error('Could not save contact. SUPABASE_SERVICE_ROLE_KEY may be missing, or the bee_exemption_contacts migration has not been applied.');
  }
}

export async function listBeeContacts(): Promise<BeeContact[]> {
  const rows = await supabaseSelect(CONTACTS, 'select=*&order=score.desc&limit=1000');
  if (!rows) throw new Error('Could not read contacts from Supabase.');
  return rows.map(contactFromRow);
}
