import { NextRequest, NextResponse } from 'next/server';
import { readJSON, writeJSON, forwardToWebhook } from '@/lib/storage';

interface Contact {
  id: string;
  // Property info (from search + TNRIS)
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
  // Engagement tracking
  searchCount: number;
  viewedResults: boolean;
  viewedDetails: boolean;
  adjustedEstimate: boolean;
  startedSignup: boolean;
  completedSignup: boolean;
  viewedGuide: boolean;
  timeOnResultsMs: number;
  // Lead scoring
  score: number;
  tier: 'hot' | 'warm' | 'curious' | 'unknown';
  tags: string[];
  // Meta
  referrer: string;
  userAgent: string;
  sessionId: string;
  firstSeen: string;
  lastSeen: string;
  // Contact info (if provided via signup)
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
}

function scoreContact(c: Contact): { score: number; tier: 'hot' | 'warm' | 'curious' | 'unknown'; tags: string[] } {
  let score = 0;
  const tags: string[] = [];

  // Property signals
  if (c.acres && c.acres >= 5) { score += 15; tags.push('qualifying-acreage'); }
  if (c.acres && c.acres >= 10) { score += 10; tags.push('large-property'); }
  if (c.marketValue && c.marketValue >= 100000) { score += 10; tags.push('high-value'); }
  if (c.estimatedSavings && c.estimatedSavings >= 3000) { score += 15; tags.push('high-savings'); }
  if (c.ownerName && c.ownerName.length > 0) { score += 5; } // valid property found

  // Engagement signals
  if (c.viewedResults) { score += 10; }
  if (c.viewedDetails) { score += 5; }
  if (c.adjustedEstimate) { score += 15; tags.push('customized-estimate'); }
  if (c.startedSignup) { score += 20; tags.push('started-signup'); }
  if (c.completedSignup) { score += 25; tags.push('completed-signup'); }
  if (c.viewedGuide) { score += 10; tags.push('viewed-guide'); }
  if (c.timeOnResultsMs > 30000) { score += 10; tags.push('engaged-reader'); }
  if (c.timeOnResultsMs > 60000) { score += 10; tags.push('deep-engagement'); }
  if (c.searchCount > 1) { score += 10; tags.push('repeat-searcher'); }

  // Referrer signals
  if (c.referrer) {
    if (c.referrer.includes('facebook') || c.referrer.includes('instagram')) { tags.push('social-media'); }
    if (c.referrer.includes('google') || c.referrer.includes('bing')) { tags.push('search-engine'); score += 5; }
    if (c.referrer.includes('zillow') || c.referrer.includes('realtor') || c.referrer.includes('redfin')) { 
      tags.push('real-estate-referral'); score += 15; 
    }
  }

  // User agent signals (bot detection)
  const ua = c.userAgent.toLowerCase();
  if (ua.includes('bot') || ua.includes('crawl') || ua.includes('spider') || ua.includes('headless')) {
    score = Math.max(0, score - 50);
    tags.push('bot-suspected');
  }

  // Tier classification
  let tier: 'hot' | 'warm' | 'curious' | 'unknown' = 'unknown';
  if (score >= 60) tier = 'hot';
  else if (score >= 30) tier = 'warm';
  else if (score >= 10) tier = 'curious';

  return { score, tier, tags };
}

async function readContacts(): Promise<Contact[]> {
  return readJSON<Contact[]>('contacts.json', []);
}

async function writeContacts(contacts: Contact[]): Promise<void> {
  await writeJSON('contacts.json', contacts);
}

// POST — track a search or update engagement
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    const contacts = await readContacts();

    if (action === 'search') {
      // New address search — create or update contact
      const { address, county, lat, lng, ownerName, acres, marketValue, landValue,
              improvementValue, estimatedSavings, requiredHives, sessionId, referrer } = body;

      // Find existing by address or sessionId
      let contact = contacts.find(c => 
        (address && c.address === address) || 
        (sessionId && c.sessionId === sessionId && !c.completedSignup)
      );

      if (contact) {
        // Update existing
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
        // Create new
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
        contacts.push(contact);
      }

      // Re-score
      const scoring = scoreContact(contact);
      contact.score = scoring.score;
      contact.tier = scoring.tier;
      contact.tags = scoring.tags;

      await writeContacts(contacts);
      await forwardToWebhook('contact_search', contact as unknown as Record<string, unknown>);
      return NextResponse.json({ ok: true, id: contact.id, tier: contact.tier });
    }

    if (action === 'engage') {
      // Update engagement signals
      const { sessionId, event, timeMs } = body;
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
      return NextResponse.json({ ok: true });
    }

    if (action === 'identify') {
      // Attach contact info from signup form
      const { sessionId, firstName, lastName, email, phone } = body;
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
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Contact tracking error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// GET — view contacts (admin, requires key)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('key') !== 'beekings2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contacts = await readContacts();
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
