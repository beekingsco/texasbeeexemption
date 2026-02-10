import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ensureDB, isPostgresConfigured } from '@/lib/db';
import { readJSON, writeJSON, forwardToWebhook } from '@/lib/storage';
import { notifyAdmin } from '@/lib/notify';

interface Contact {
  id: string;
  address: string;
  county: string;
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
}

function scoreContact(c: Contact): { score: number; tier: 'hot' | 'warm' | 'curious' | 'unknown'; tags: string[] } {
  let score = 0;
  const tags: string[] = [];

  if (c.acres && c.acres >= 5) { score += 15; tags.push('qualifying-acreage'); }
  if (c.acres && c.acres >= 10) { score += 10; tags.push('large-property'); }
  if (c.marketValue && c.marketValue >= 100000) { score += 10; tags.push('high-value'); }
  if (c.estimatedSavings && c.estimatedSavings >= 3000) { score += 15; tags.push('high-savings'); }
  if (c.ownerName && c.ownerName.length > 0) { score += 5; }

  if (c.viewedResults) { score += 10; }
  if (c.viewedDetails) { score += 5; }
  if (c.adjustedEstimate) { score += 15; tags.push('customized-estimate'); }
  if (c.startedSignup) { score += 20; tags.push('started-signup'); }
  if (c.completedSignup) { score += 25; tags.push('completed-signup'); }
  if (c.viewedGuide) { score += 10; tags.push('viewed-guide'); }
  if (c.timeOnResultsMs > 30000) { score += 10; tags.push('engaged-reader'); }
  if (c.timeOnResultsMs > 60000) { score += 10; tags.push('deep-engagement'); }
  if (c.searchCount > 1) { score += 10; tags.push('repeat-searcher'); }

  if (c.referrer) {
    if (c.referrer.includes('facebook') || c.referrer.includes('instagram')) { tags.push('social-media'); }
    if (c.referrer.includes('google') || c.referrer.includes('bing')) { tags.push('search-engine'); score += 5; }
    if (c.referrer.includes('zillow') || c.referrer.includes('realtor') || c.referrer.includes('redfin')) { 
      tags.push('real-estate-referral'); score += 15; 
    }
  }

  const ua = c.userAgent.toLowerCase();
  if (ua.includes('bot') || ua.includes('crawl') || ua.includes('spider') || ua.includes('headless')) {
    score = Math.max(0, score - 50);
    tags.push('bot-suspected');
  }

  let tier: 'hot' | 'warm' | 'curious' | 'unknown' = 'unknown';
  if (score >= 60) tier = 'hot';
  else if (score >= 30) tier = 'warm';
  else if (score >= 10) tier = 'curious';

  return { score, tier, tags };
}

// Convert DB row to Contact object
function rowToContact(row: Record<string, unknown>): Contact {
  return {
    id: row.id as string,
    address: (row.address as string) || '',
    county: (row.county as string) || '',
    lat: row.lat as number | null,
    lng: row.lng as number | null,
    ownerName: (row.owner_name as string) || '',
    acres: row.acres as number | null,
    marketValue: row.market_value as number | null,
    landValue: row.land_value as number | null,
    improvementValue: row.improvement_value as number | null,
    estimatedSavings: row.estimated_savings as number | null,
    requiredHives: row.required_hives as number | null,
    searchCount: (row.search_count as number) || 1,
    viewedResults: (row.viewed_results as boolean) || false,
    viewedDetails: (row.viewed_details as boolean) || false,
    adjustedEstimate: (row.adjusted_estimate as boolean) || false,
    startedSignup: (row.started_signup as boolean) || false,
    completedSignup: (row.completed_signup as boolean) || false,
    viewedGuide: (row.viewed_guide as boolean) || false,
    timeOnResultsMs: (row.time_on_results_ms as number) || 0,
    score: (row.score as number) || 0,
    tier: (row.tier as 'hot' | 'warm' | 'curious' | 'unknown') || 'unknown',
    tags: row.tags ? (row.tags as string).split(',').filter(Boolean) : [],
    referrer: (row.referrer as string) || '',
    userAgent: (row.user_agent as string) || '',
    sessionId: (row.session_id as string) || '',
    firstSeen: row.first_seen ? new Date(row.first_seen as string).toISOString() : new Date().toISOString(),
    lastSeen: row.last_seen ? new Date(row.last_seen as string).toISOString() : new Date().toISOString(),
    email: (row.email as string) || '',
    phone: (row.phone as string) || '',
    firstName: (row.first_name as string) || '',
    lastName: (row.last_name as string) || '',
  };
}

// ── Postgres-backed functions ──

async function pgFindContact(address: string | null, sessionId: string | null): Promise<Contact | null> {
  if (address) {
    const result = await sql`SELECT * FROM contacts WHERE address = ${address} LIMIT 1`;
    if (result.rows.length > 0) return rowToContact(result.rows[0]);
  }
  if (sessionId) {
    const result = await sql`SELECT * FROM contacts WHERE session_id = ${sessionId} AND completed_signup = false LIMIT 1`;
    if (result.rows.length > 0) return rowToContact(result.rows[0]);
  }
  return null;
}

async function pgUpsertContact(contact: Contact): Promise<void> {
  const tagsStr = contact.tags.join(',');
  await sql`
    INSERT INTO contacts (id, address, county, lat, lng, owner_name, acres, market_value, land_value,
      improvement_value, estimated_savings, required_hives, search_count, viewed_results, viewed_details,
      adjusted_estimate, started_signup, completed_signup, viewed_guide, time_on_results_ms, score, tier,
      tags, referrer, user_agent, session_id, first_seen, last_seen, email, phone, first_name, last_name)
    VALUES (${contact.id}, ${contact.address}, ${contact.county}, ${contact.lat}, ${contact.lng},
      ${contact.ownerName}, ${contact.acres}, ${contact.marketValue}, ${contact.landValue},
      ${contact.improvementValue}, ${contact.estimatedSavings}, ${contact.requiredHives},
      ${contact.searchCount}, ${contact.viewedResults}, ${contact.viewedDetails},
      ${contact.adjustedEstimate}, ${contact.startedSignup}, ${contact.completedSignup},
      ${contact.viewedGuide}, ${contact.timeOnResultsMs}, ${contact.score}, ${contact.tier},
      ${tagsStr}, ${contact.referrer}, ${contact.userAgent}, ${contact.sessionId},
      ${contact.firstSeen}, ${contact.lastSeen}, ${contact.email}, ${contact.phone},
      ${contact.firstName}, ${contact.lastName})
    ON CONFLICT (id) DO UPDATE SET
      address = ${contact.address}, county = ${contact.county}, lat = ${contact.lat}, lng = ${contact.lng},
      owner_name = ${contact.ownerName}, acres = ${contact.acres}, market_value = ${contact.marketValue},
      land_value = ${contact.landValue}, improvement_value = ${contact.improvementValue},
      estimated_savings = ${contact.estimatedSavings}, required_hives = ${contact.requiredHives},
      search_count = ${contact.searchCount}, viewed_results = ${contact.viewedResults},
      viewed_details = ${contact.viewedDetails}, adjusted_estimate = ${contact.adjustedEstimate},
      started_signup = ${contact.startedSignup}, completed_signup = ${contact.completedSignup},
      viewed_guide = ${contact.viewedGuide}, time_on_results_ms = ${contact.timeOnResultsMs},
      score = ${contact.score}, tier = ${contact.tier}, tags = ${tagsStr},
      last_seen = ${contact.lastSeen}, email = ${contact.email}, phone = ${contact.phone},
      first_name = ${contact.firstName}, last_name = ${contact.lastName}
  `;
}

async function pgGetAllContacts(): Promise<Contact[]> {
  const result = await sql`SELECT * FROM contacts ORDER BY score DESC`;
  return result.rows.map(rowToContact);
}

// ── JSON file-backed functions (fallback) ──

async function readContacts(): Promise<Contact[]> {
  return readJSON<Contact[]>('contacts.json', []);
}

async function writeContacts(contacts: Contact[]): Promise<void> {
  await writeJSON('contacts.json', contacts);
}

// ── POST — track a search or update engagement ──
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const usePg = isPostgresConfigured();
    if (usePg) await ensureDB();

    if (action === 'search') {
      const { address, county, lat, lng, ownerName, acres, marketValue, landValue,
              improvementValue, estimatedSavings, requiredHives, sessionId, referrer } = body;

      let contact: Contact | null | undefined;

      if (usePg) {
        contact = await pgFindContact(address || null, sessionId || null);
      } else {
        const contacts = await readContacts();
        contact = contacts.find(c => 
          (address && c.address === address) || 
          (sessionId && c.sessionId === sessionId && !c.completedSignup)
        );
      }

      if (contact) {
        contact.searchCount += 1;
        contact.lastSeen = new Date().toISOString();
        if (address) contact.address = address;
        if (county) contact.county = county;
        if (lat) contact.lat = lat;
        if (lng) contact.lng = lng;
        if (ownerName) contact.ownerName = ownerName;
        if (acres) contact.acres = acres;
        if (marketValue) contact.marketValue = marketValue;
        if (landValue) contact.landValue = landValue;
        if (improvementValue) contact.improvementValue = improvementValue;
        if (estimatedSavings) contact.estimatedSavings = estimatedSavings;
        if (requiredHives) contact.requiredHives = requiredHives;
      } else {
        contact = {
          id: `ct_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          address: address || '',
          county: county || '',
          lat: lat || null,
          lng: lng || null,
          ownerName: ownerName || '',
          acres: acres || null,
          marketValue: marketValue || null,
          landValue: landValue || null,
          improvementValue: improvementValue || null,
          estimatedSavings: estimatedSavings || null,
          requiredHives: requiredHives || null,
          searchCount: 1,
          viewedResults: false,
          viewedDetails: false,
          adjustedEstimate: false,
          startedSignup: false,
          completedSignup: false,
          viewedGuide: false,
          timeOnResultsMs: 0,
          score: 0,
          tier: 'unknown',
          tags: [],
          referrer: referrer || req.headers.get('referer') || '',
          userAgent: (req.headers.get('user-agent') || '').slice(0, 200),
          sessionId: sessionId || '',
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          email: '',
          phone: '',
          firstName: '',
          lastName: '',
        };
      }

      const scoring = scoreContact(contact);
      contact.score = scoring.score;
      contact.tier = scoring.tier;
      contact.tags = scoring.tags;

      if (usePg) {
        await pgUpsertContact(contact);
      } else {
        const contacts = await readContacts();
        const idx = contacts.findIndex(c => c.id === contact!.id);
        if (idx >= 0) contacts[idx] = contact;
        else contacts.push(contact);
        await writeContacts(contacts);
      }

      await forwardToWebhook('contact_search', contact as unknown as Record<string, unknown>);

      // Fire admin notification (non-blocking)
      notifyAdmin('address_searched', {
        address: contact.address,
        county: contact.county,
        acres: contact.acres || undefined,
        estimatedSavings: contact.estimatedSavings || undefined,
      });

      return NextResponse.json({ ok: true, id: contact.id, tier: contact.tier });
    }

    if (action === 'engage') {
      const { sessionId, event, timeMs } = body;

      if (usePg) {
        const result = await sql`SELECT * FROM contacts WHERE session_id = ${sessionId} LIMIT 1`;
        if (result.rows.length > 0) {
          const contact = rowToContact(result.rows[0]);
          contact.lastSeen = new Date().toISOString();
          if (event === 'viewed_results') contact.viewedResults = true;
          if (event === 'viewed_details') contact.viewedDetails = true;
          if (event === 'adjusted_estimate') contact.adjustedEstimate = true;
          if (event === 'started_signup') contact.startedSignup = true;
          if (event === 'completed_signup') contact.completedSignup = true;
          if (event === 'viewed_guide') contact.viewedGuide = true;
          if (event === 'time_on_results' && timeMs) contact.timeOnResultsMs += timeMs;
          const scoring = scoreContact(contact);
          contact.score = scoring.score;
          contact.tier = scoring.tier;
          contact.tags = scoring.tags;
          await pgUpsertContact(contact);
        }
      } else {
        const contacts = await readContacts();
        const contact = contacts.find(c => c.sessionId === sessionId);
        if (contact) {
          contact.lastSeen = new Date().toISOString();
          if (event === 'viewed_results') contact.viewedResults = true;
          if (event === 'viewed_details') contact.viewedDetails = true;
          if (event === 'adjusted_estimate') contact.adjustedEstimate = true;
          if (event === 'started_signup') contact.startedSignup = true;
          if (event === 'completed_signup') contact.completedSignup = true;
          if (event === 'viewed_guide') contact.viewedGuide = true;
          if (event === 'time_on_results' && timeMs) contact.timeOnResultsMs += timeMs;
          const scoring = scoreContact(contact);
          contact.score = scoring.score;
          contact.tier = scoring.tier;
          contact.tags = scoring.tags;
          await writeContacts(contacts);
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'identify') {
      const { sessionId, firstName, lastName, email, phone } = body;

      if (usePg) {
        const result = await sql`SELECT * FROM contacts WHERE session_id = ${sessionId} LIMIT 1`;
        if (result.rows.length > 0) {
          const contact = rowToContact(result.rows[0]);
          if (firstName) contact.firstName = firstName;
          if (lastName) contact.lastName = lastName;
          if (email) contact.email = email;
          if (phone) contact.phone = phone;
          contact.completedSignup = true;
          contact.lastSeen = new Date().toISOString();
          const scoring = scoreContact(contact);
          contact.score = scoring.score;
          contact.tier = scoring.tier;
          contact.tags = scoring.tags;
          await pgUpsertContact(contact);
        }
      } else {
        const contacts = await readContacts();
        const contact = contacts.find(c => c.sessionId === sessionId);
        if (contact) {
          if (firstName) contact.firstName = firstName;
          if (lastName) contact.lastName = lastName;
          if (email) contact.email = email;
          if (phone) contact.phone = phone;
          contact.completedSignup = true;
          contact.lastSeen = new Date().toISOString();
          const scoring = scoreContact(contact);
          contact.score = scoring.score;
          contact.tier = scoring.tier;
          contact.tags = scoring.tags;
          await writeContacts(contacts);
        }
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Contact tracking error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// ── GET — view contacts (admin, requires key) ──
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('key') !== 'beekings2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const usePg = isPostgresConfigured();
  if (usePg) await ensureDB();

  let contacts: Contact[];
  if (usePg) {
    contacts = await pgGetAllContacts();
  } else {
    contacts = await readContacts();
  }

  const tier = searchParams.get('tier');
  const format = searchParams.get('format');

  let filtered = tier ? contacts.filter(c => c.tier === tier) : contacts;
  filtered = filtered.sort((a, b) => b.score - a.score);

  // CSV export
  if (format === 'csv') {
    const headers = 'Owner Name,Address,County,Acres,Market Value,Est. Savings,Score,Tier,Email,Phone,First Seen,Last Seen,Tags';
    const rows = filtered.map(c => 
      [c.ownerName, c.address, c.county, c.acres || '', c.marketValue || '', c.estimatedSavings || '',
       c.score, c.tier, c.email, c.phone, c.firstSeen, c.lastSeen, c.tags.join(';')
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    return new NextResponse(csv, {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=beekings-contacts.csv' },
    });
  }

  // Summary stats
  const stats = {
    total: contacts.length,
    hot: contacts.filter(c => c.tier === 'hot').length,
    warm: contacts.filter(c => c.tier === 'warm').length,
    curious: contacts.filter(c => c.tier === 'curious').length,
    withEmail: contacts.filter(c => c.email).length,
    avgScore: contacts.length > 0 ? Math.round(contacts.reduce((s, c) => s + c.score, 0) / contacts.length) : 0,
  };

  return NextResponse.json({ stats, contacts: filtered });
}
